const db = require('../config/db');
const { ROOM_STATUS } = require('../config/constants');

const RoomModel = {
  async create({ code, host_id, max_players, difficulty, num_questions }) {
    const [result] = await db.query(
      `INSERT INTO rooms (\`code\`, host_id, \`status\`, max_players, difficulty, num_questions)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [code, host_id, ROOM_STATUS.WAITING, max_players, difficulty, num_questions]
    );
    return result.insertId;
  },

  async findByCode(code) {
    const [rows] = await db.query(
      `SELECT r.*, u.username AS host_name
       FROM rooms r
       JOIN users u ON u.id = r.host_id
       WHERE r.\`code\` = ? LIMIT 1`,
      [code]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await db.query('SELECT * FROM rooms WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async getWaitingRooms() {
    const [rows] = await db.query(
      `SELECT r.*, u.username AS host_name,
              (SELECT COUNT(*) FROM room_players rp WHERE rp.room_id = r.id) AS player_count
       FROM rooms r
       JOIN users u ON u.id = r.host_id
       WHERE r.\`status\` = ?
       HAVING player_count > 0 AND player_count < r.max_players
       ORDER BY r.created_at DESC
       LIMIT 20`,
      [ROOM_STATUS.WAITING]
    );
    return rows;
  },

  async updateStatus(roomId, status) {
    await db.query('UPDATE rooms SET `status` = ? WHERE id = ?', [status, roomId]);
  },

  async addPlayer(roomId, userId) {
    await db.query(
      'INSERT IGNORE INTO room_players (room_id, user_id) VALUES (?, ?)',
      [roomId, userId]
    );
  },

  async removePlayer(roomId, userId) {
    await db.query(
      'DELETE FROM room_players WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );
  },

  async getPlayers(roomId) {
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.elo_rating, u.avatar_color, u.avatar_url, rp.joined_at, rp.is_ready,
              (u.id = r.host_id) AS isHost
       FROM room_players rp
       JOIN users u ON u.id = rp.user_id
       JOIN rooms r ON r.id = rp.room_id
       WHERE rp.room_id = ?
       ORDER BY rp.joined_at ASC`,
      [roomId]
    );
    return rows;
  },

  async toggleReady(roomId, userId, isReady) {
    await db.query(
      'UPDATE room_players SET is_ready = ? WHERE room_id = ? AND user_id = ?',
      [isReady, roomId, userId]
    );
  },

  async areAllPlayersReady(roomId) {
    const [rows] = await db.query(
      'SELECT COUNT(*) AS total, SUM(is_ready) AS ready_count FROM room_players WHERE room_id = ?',
      [roomId]
    );
    const { total, ready_count } = rows[0];
    return total > 0 && parseInt(total) === parseInt(ready_count);
  },

  async getPlayerCount(roomId) {
    const [rows] = await db.query(
      'SELECT COUNT(*) AS cnt FROM room_players WHERE room_id = ?',
      [roomId]
    );
    return rows[0].cnt;
  },

  async saveMatchResult({ room_id, user_id, score, rank }) {
    await db.query(
      'INSERT INTO match_history (room_id, user_id, score, `rank`) VALUES (?, ?, ?, ?)',
      [room_id, user_id, score, rank]
    );
  },
};

module.exports = RoomModel;
