const jwt = require('jsonwebtoken');
const { findUserById, publicUser } = require('../db/store');

async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Login required.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'demo_secret');
    const user = await findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    req.user = publicUser(user);
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  return next();
}

module.exports = { protect, adminOnly };
