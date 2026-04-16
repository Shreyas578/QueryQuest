const jwt = require('jsonwebtoken');

/**
 * Express middleware — verifies Bearer JWT from Authorization header.
 * Attaches decoded payload to req.user on success.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  console.log('[AuthMiddleware] Header:', authHeader);
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Optional auth — attaches user if token present, but doesn't block the request.
 */
const optionalAuth = (req, _res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    } catch (_) {
      // silently ignore invalid token
    }
  }
  next();
};

module.exports = { authenticate, optionalAuth };
