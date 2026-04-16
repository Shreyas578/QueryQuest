const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');

const signToken = (user) =>
  jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const AuthController = {
  // POST /api/auth/register
  async register(req, res) {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ error: 'All fields are required' });

    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    try {
      const existing = await UserModel.findByEmail(email);
      if (existing) return res.status(409).json({ error: 'Email already registered' });

      const takenName = await UserModel.findByUsername(username);
      if (takenName) return res.status(409).json({ error: 'Username already taken' });

      const password_hash = await bcrypt.hash(password, 12);
      const id = await UserModel.create({ username, email, password_hash });
      const user = { id, username, email };
      const token = signToken(user);

      res.status(201).json({ token, user });
    } catch (err) {
      console.error('[AuthController.register]', err);
      res.status(500).json({ error: 'Registration failed' });
    }
  },

  // POST /api/auth/login
  async login(req, res) {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    try {
      const user = await UserModel.findByEmail(email);
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return res.status(401).json({ error: 'Invalid credentials' });

      const token = signToken(user);
      const { password_hash, ...safeUser } = user;

      res.json({ token, user: safeUser });
    } catch (err) {
      console.error('[AuthController.login]', err);
      res.status(500).json({ error: 'Login failed' });
    }
  },

  // GET /api/auth/me
  async me(req, res) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user });
    } catch (err) {
      res.status(500).json({ error: 'Could not fetch user' });
    }
  },
};

module.exports = AuthController;
