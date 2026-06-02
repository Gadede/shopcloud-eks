const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'shopcloud-secret-change-in-production';
let users = [
  // Pre-seeded demo user (password: demo1234)
  { id: 'u0', name: 'Demo User', email: 'demo@shopcloud.com', passwordHash: '$2a$10$rE2GqhOLQc3mTUxH3OkUgeTa6/t2VfhPQRwc3.O9gVxmrZ8BLAHF', createdAt: new Date().toISOString() },
];

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
};

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'user-service' }));

// Register
app.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (users.find(u => u.email === email)) return res.status(409).json({ error: 'Email already registered' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: uuidv4(), name, email, passwordHash, createdAt: new Date().toISOString() };
  users.push(user);
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ user: { id: user.id, name: user.name, email: user.email }, token });
});

// Login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
});

// Get current user profile
app.get('/users/me', auth, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt });
});

// Get user by ID (internal service call)
app.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email });
});

// Update profile
app.put('/users/me', auth, (req, res) => {
  const idx = users.findIndex(u => u.id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  const { name, email } = req.body;
  if (name) users[idx].name = name;
  if (email) users[idx].email = email;
  res.json({ id: users[idx].id, name: users[idx].name, email: users[idx].email });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`User service running on port ${PORT}`));
