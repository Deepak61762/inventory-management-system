const db = require('../db/connection');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// POST /api/auth/register
// Anyone can register as STAFF freely. Registering as ADMIN requires
// providing the correct ADMIN_ACCESS_KEY (set in .env, known only to
// whoever controls this deployment) - this stops random visitors from
// giving themselves admin access just by picking "Admin" in a dropdown.
const register = async (req, res) => {
  const { username, password, role, accessKey } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'username, password, and role are required' });
  }
  if (!['ADMIN', 'STAFF'].includes(role)) {
    return res.status(400).json({ error: 'role must be ADMIN or STAFF' });
  }

  if (role === 'ADMIN') {
    if (!accessKey || accessKey !== process.env.ADMIN_ACCESS_KEY) {
      return res.status(403).json({ error: 'Invalid or missing admin access key' });
    }
  }

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [username, passwordHash, role]
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'This account has been deactivated. Contact an admin.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Record this login for the audit trail
    db.query('INSERT INTO login_history (user_id) VALUES (?)', [user.id])
      .catch(err => console.error('Failed to record login history:', err));

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, username: user.username, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
};

// GET /api/auth/login-history (ADMIN only)
const getLoginHistory = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT lh.id, lh.login_at, u.username, u.role
      FROM login_history lh
      JOIN users u ON lh.user_id = u.id
      ORDER BY lh.login_at DESC
      LIMIT 200
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch login history' });
  }
};

// GET /api/auth/users (ADMIN only)
// Lists every user so the admin can pick who to reset a password for.
const getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, username, role, is_active, created_at FROM users ORDER BY username');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// PUT /api/auth/users/:id/reset-password (ADMIN only)
// Lets an admin directly set a new password for any user (typically used
// when a STAFF member forgets their password and asks the admin for help).
// Admins themselves have no self-service reset - if an admin forgets their
// own password, they need to register a fresh admin account with the
// access key, since there's no "admin of the admin" to reset it for them.
const adminResetPassword = async (req, res) => {
  const { newPassword } = req.body;
  const targetUserId = req.params.id;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'newPassword must be at least 6 characters' });
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const [result] = await db.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, targetUserId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

// PUT /api/auth/users/:id/deactivate (ADMIN only)
// Requires the ADMIN_ACCESS_KEY as a confirmation step. Instead of deleting
// the row outright, this just flips is_active to 0 - the account can no
// longer log in, but their stock_transactions and login_history rows stay
// intact and correctly attributed, since the user row itself still exists.
// Only STAFF accounts can be deactivated this way.
const deactivateUser = async (req, res) => {
  const { accessKey } = req.body;
  const targetUserId = req.params.id;

  if (!accessKey || accessKey !== process.env.ADMIN_ACCESS_KEY) {
    return res.status(403).json({ error: 'Invalid or missing admin access key' });
  }

  try {
    const [rows] = await db.query('SELECT role FROM users WHERE id = ?', [targetUserId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (rows[0].role !== 'STAFF') {
      return res.status(403).json({ error: 'Only staff accounts can be deactivated this way' });
    }

    await db.query('UPDATE users SET is_active = 0 WHERE id = ?', [targetUserId]);
    res.json({ message: 'User deactivated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
};

// PUT /api/auth/users/:id/reactivate (ADMIN only)
const reactivateUser = async (req, res) => {
  const targetUserId = req.params.id;
  try {
    const [result] = await db.query('UPDATE users SET is_active = 1 WHERE id = ?', [targetUserId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User reactivated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reactivate user' });
  }
};

// DELETE /api/auth/login-history (ADMIN only)
// Wipes the entire login history log. This is a destructive, irreversible
// action - there's no confirmation step here beyond requiring ADMIN role,
// since it doesn't affect any other data (unlike deleting a user or product).
const clearLoginHistory = async (req, res) => {
  try {
    await db.query('DELETE FROM login_history');
    res.json({ message: 'Login history cleared' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to clear login history' });
  }
};

module.exports = { register, login, getLoginHistory, clearLoginHistory, getAllUsers, adminResetPassword, deactivateUser, reactivateUser };
