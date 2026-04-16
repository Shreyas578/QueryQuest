const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const RoomModel = require('../models/room.model');

// GET /api/game/history — user's match history
router.get('/history', authenticate, async (req, res) => {
  try {
    const db = require('../config/db');
    const [rows] = await db.query(
      `SELECT mh.*, r.code AS room_code, r.difficulty
       FROM match_history mh
       JOIN rooms r ON r.id = mh.room_id
       WHERE mh.user_id = ?
       ORDER BY mh.played_at DESC
       LIMIT 20`,
      [req.user.id]
    );
    res.json({ history: rows });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch history' });
  }
});

module.exports = router;
