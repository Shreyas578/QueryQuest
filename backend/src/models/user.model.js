const db = require('../config/db');

const UserModel = {
  async findByEmail(email) {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await db.query(
      'SELECT id, username, email, elo_rating, avatar_color, avatar_url, created_at FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  },

  async findByUsername(username) {
    const [rows] = await db.query(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [username]
    );
    return rows[0] || null;
  },

  async create({ username, email, password_hash }) {
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;
    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash, elo_rating, avatar_color, avatar_url) VALUES (?, ?, ?, 1000, ?, ?)',
      [username, email, password_hash, _randomColor(), avatarUrl]
    );
    return result.insertId;
  },

  async updateElo(userId, newElo) {
    await db.query('UPDATE users SET elo_rating = ? WHERE id = ?', [newElo, userId]);
  },

  async getLeaderboard(limit = 50) {
    const [rows] = await db.query(
      `SELECT id, username, elo_rating, avatar_color, avatar_url,
              (SELECT COUNT(*) FROM match_history WHERE user_id = users.id) AS matches_played
       FROM users ORDER BY elo_rating DESC LIMIT ?`,
      [limit]
    );
    return rows;
  },
};

function _randomColor() {
  const colors = ['#00d4ff', '#7b2fff', '#ff6b35', '#00ff88', '#ff2d78', '#ffd700'];
  return colors[Math.floor(Math.random() * colors.length)];
}

module.exports = UserModel;
