const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// PATCH /api/users/profile — update name
router.patch('/profile', requireAuth, [
  body('name').trim().notEmpty().withMessage('Name is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  try {
    const result = await db.query(
      'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name, email, created_at',
      [req.body.name, req.user.id]
    );
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PATCH /api/users/password — change password (when already logged in)
router.patch('/password', requireAuth, [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { currentPassword, newPassword } = req.body;

  try {
    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) return res.status(400).json({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

module.exports = router;