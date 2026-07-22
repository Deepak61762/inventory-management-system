const jwt = require('jsonwebtoken');

// Runs before any protected route. Checks the Authorization header
// for a valid JWT. If valid, attaches the decoded user info to req.user
// so later code (controllers) can know who is making the request.
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization']; // expected format: "Bearer <token>"

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username, role }
    next(); // move on to the actual route handler
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Use after verifyToken on routes that only ADMIN should access,
// e.g. deleting products or managing suppliers.
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { verifyToken, requireAdmin };
