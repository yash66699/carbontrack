const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/goals
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM goals WHERE user_id = $1', [req.user.id]);
    res.json({ goal: result.rows[0] || null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch goal' });
  }
});

// POST /api/goals — create or update goal
router.post('/', requireAuth, [
  body('percentage').isFloat({ gt: 0, lt: 100 }).withMessage('Percentage must be between 1 and 99'),
  body('baselineEmissions').isFloat({ min: 0 }).withMessage('Baseline must be 0 or greater'),
  body('targetEmissions').isFloat({ min: 0 }).withMessage('Target must be 0 or greater'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { percentage, baselineEmissions, targetEmissions } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO goals (user_id, percentage, baseline_emissions, target_emissions)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         percentage = EXCLUDED.percentage,
         baseline_emissions = EXCLUDED.baseline_emissions,
         target_emissions = EXCLUDED.target_emissions,
         set_at = now()
       RETURNING *`,
      [req.user.id, percentage, baselineEmissions, targetEmissions]
    );
    res.json({ goal: result.rows[0] });
  } catch (error) {
    console.error('Save goal error:', error);
    res.status(500).json({ error: 'Failed to save goal' });
  }
});

// DELETE /api/goals
router.delete('/', requireAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM goals WHERE user_id = $1', [req.user.id]);
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

module.exports = router;