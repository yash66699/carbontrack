const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { sendPasswordResetEmail, sendWelcomeEmail } = require('../services/email');

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateAccessToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

function validationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  return null;
}

// ── POST /api/auth/register ───────────────────────────────────────────────────

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
  const err = validationErrors(req, res);
  if (err) return;

  const { name, email, password } = req.body;

  try {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
      [name, email, passwordHash]
    );

    const user = result.rows[0];
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Send welcome email (don't await — don't block the response)
    sendWelcomeEmail(email, name);

    res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email, createdAt: user.created_at },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────

router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  const err = validationErrors(req, res);
  if (err) return;

  const { email, password } = req.body;

  try {
    const result = await db.query(
      'SELECT id, name, email, password_hash, created_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      user: { id: user.id, name: user.name, email: user.email, createdAt: user.created_at },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const result = await db.query('SELECT id FROM users WHERE id = $1', [decoded.userId]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'User not found' });

    const newAccessToken = generateAccessToken(decoded.userId);
    res.json({ accessToken: newAccessToken });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────

router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
], async (req, res) => {
  const err = validationErrors(req, res);
  if (err) return;

  const { email } = req.body;

  try {
    const result = await db.query('SELECT id, name FROM users WHERE email = $1', [email]);

    // Always return success — don't reveal if email exists (security)
    if (result.rows.length === 0) {
      return res.json({ message: 'If an account exists, a reset link has been sent.' });
    }

    const user = result.rows[0];
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Remove any old tokens for this user first
    await db.query('DELETE FROM reset_tokens WHERE user_id = $1', [user.id]);

    // Save new token
    await db.query(
      'INSERT INTO reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail(email, user.name, resetLink);

    res.json({ message: 'If an account exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────

router.post('/reset-password', [
  body('token').notEmpty().withMessage('Token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
  const err = validationErrors(req, res);
  if (err) return;

  const { token, password } = req.body;

  try {
    const result = await db.query(
      'SELECT rt.id, rt.user_id, rt.expires_at, rt.used FROM reset_tokens rt WHERE rt.token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    const resetToken = result.rows[0];

    if (resetToken.used) {
      return res.status(400).json({ error: 'This reset link has already been used' });
    }

    if (new Date() > new Date(resetToken.expires_at)) {
      return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, resetToken.user_id]);
    await db.query('UPDATE reset_tokens SET used = true WHERE id = $1', [resetToken.id]);

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

const { requireAuth } = require('../middleware/auth');

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;