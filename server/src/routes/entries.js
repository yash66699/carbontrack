const express = require('express');
const { body, query, validationResult } = require('express-validator');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const VALID_CATEGORIES = ['Transportation', 'Energy', 'Diet', 'Waste', 'Shopping'];

// GET /api/entries — get all entries for the logged-in user
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, date, category, activity, value, emissions, source, created_at FROM entries WHERE user_id = $1 ORDER BY date DESC, created_at DESC',
      [req.user.id]
    );
    res.json({ entries: result.rows });
  } catch (error) {
    console.error('Get entries error:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// POST /api/entries — log a new emission entry
router.post('/', requireAuth, [
  body('date').isDate().withMessage('Valid date required'),
  body('category').isIn(VALID_CATEGORIES).withMessage('Invalid category'),
  body('activity').trim().notEmpty().withMessage('Activity is required'),
  body('value').isFloat({ gt: 0 }).withMessage('Value must be greater than 0'),
  body('emissions').isFloat({ min: 0 }).withMessage('Emissions must be 0 or greater'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { date, category, activity, value, emissions } = req.body;

  // Reject future dates
  if (new Date(date) > new Date()) {
    return res.status(400).json({ error: 'Date cannot be in the future' });
  }

  try {
    const result = await db.query(
      'INSERT INTO entries (user_id, date, category, activity, value, emissions) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.id, date, category, activity, value, emissions]
    );
    res.status(201).json({ entry: result.rows[0] });
  } catch (error) {
    console.error('Create entry error:', error);
    res.status(500).json({ error: 'Failed to save entry' });
  }
});

// DELETE /api/entries/:id — delete one entry
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM entries WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    res.json({ deleted: true });
  } catch (error) {
    console.error('Delete entry error:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

module.exports = router;