require('dotenv').config();
const db = require('./src/config/db');
async function check() {
  try {
    const [users] = await db.query('SELECT id, username FROM users');
    console.log('Users:', users);
    const [rooms] = await db.query('SELECT * FROM rooms');
    console.log('Rooms:', rooms);
    const [players] = await db.query('SELECT * FROM room_players');
    console.log('Room Players:', players);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}
check();
