require('dotenv').config();
const RoomModel = require('./src/models/room.model');
const UserModel = require('./src/models/user.model');
const { v4: uuidv4 } = require('uuid');

async function testCreate() {
  try {
    const user = await UserModel.findByUsername('Robin');
    if (!user) return console.log('User Robin not found');
    
    const code = uuidv4().substring(0, 6).toUpperCase();
    console.log(`Creating room with code ${code} for host ${user.id}`);
    
    const roomId = await RoomModel.create({ 
      code, 
      host_id: user.id, 
      max_players: 4, 
      difficulty: 'mixed', 
      num_questions: 10 
    });
    console.log(`Room created with ID: ${roomId}`);
    
    await RoomModel.addPlayer(roomId, user.id);
    console.log('Host added to room');
    
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    process.exit();
  }
}
testCreate();
