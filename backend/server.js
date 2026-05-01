require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const db = require('./src/config/db');
const { initSocketHandler } = require('./src/socket/socket.handler');

// Route imports
const authRoutes = require('./src/routes/auth.routes');
const lobbyRoutes = require('./src/routes/lobby.routes');
const gameRoutes = require('./src/routes/game.routes');

const app = express();
const httpServer = http.createServer(app);

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:4200',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:4200',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── REST Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/lobby', lobbyRoutes);
app.use('/api/game', gameRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── Global error handler ───────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── DB + Socket bootstrap ──────────────────────────────────────────────────────
(async () => {
  const MAX_RETRIES = 5;
  let retries = 0;
  let connected = false;

  while (retries < MAX_RETRIES && !connected) {
    try {
      console.log(`📡 Attempting to connect to MySQL (Attempt ${retries + 1}/${MAX_RETRIES}) at ${process.env.DB_HOST}:${process.env.DB_PORT}...`);
      const conn = await db.getConnection();
      console.log('✅ MySQL connected');
      conn.release();
      connected = true;

      initSocketHandler(io);
      console.log('✅ Socket.IO initialised');

      const PORT = process.env.PORT || 3000;
      httpServer.listen(PORT, () => {
        console.log(`🚀 QueryQuest backend running on port ${PORT}`);
      });
    } catch (err) {
      retries++;
      console.error(`❌ Connection failed (Attempt ${retries}/${MAX_RETRIES}):`, err.message);
      if (retries < MAX_RETRIES) {
        console.log('Waiting 5 seconds before retrying...');
        await new Promise(res => setTimeout(res, 5000));
      } else {
        console.error('💥 All connection attempts failed. Exiting.');
        process.exit(1);
      }
    }
  }
})();
