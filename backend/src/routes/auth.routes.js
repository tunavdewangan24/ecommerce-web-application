const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findUserByEmail, createUser, publicUser } = require('../db/store');
const { protect } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'demo_secret', { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'Email is already registered.' });
    }

    const user = await createUser({ name, email, password, role: 'user' });
    const token = signToken(user);
    return res.status(201).json({ user, token });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const userRecord = await findUserByEmail(email);
    if (!userRecord) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, userRecord.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = publicUser(userRecord);
    const token = signToken(user);
    return res.json({ user, token });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/me', protect, (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;
