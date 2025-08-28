import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// In-memory stores (replace with DB in production)
const users = [];
const tickets = [];

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'node', time: new Date().toISOString() });
});

// Auth
app.post('/api/auth/signup', (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  if (users.find(u => u.email === email)) return res.status(409).json({ error: 'Email exists' });
  users.push({ name, email, password, role: role || 'soldier' });
  res.json({ name, email, role: role || 'soldier' });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ name: user.name, email: user.email, role: user.role });
});

// Grievances
app.get('/api/grievances', (req, res) => {
  const { email } = req.query;
  if (email) return res.json(tickets.filter(t => t.owner === email));
  res.json(tickets);
});

app.post('/api/grievances', (req, res) => {
  const { subject, category, priority, description, owner } = req.body || {};
  if (!subject || !category || !priority || !description) return res.status(400).json({ error: 'Missing fields' });
  const ticket = {
    id: 'T' + Date.now().toString(36).toUpperCase(),
    subject, category, priority, description,
    status: 'Open', createdAt: new Date().toISOString(), owner: owner || 'guest'
  };
  tickets.unshift(ticket);
  res.json(ticket);
});

// Schemes (static)
const SCHEMES = [
  { name: 'Education Scholarship A', tags: ['education','family'] },
  { name: 'Medical Assistance B', tags: ['medical','veteran'] },
  { name: 'Housing Subsidy C', tags: ['housing','soldier'] },
  { name: 'Pension Support D', tags: ['pension','veteran'] },
];

app.get('/api/schemes', (_req, res) => {
  res.json(SCHEMES);
});

app.get('/api/schemes/suggest', (req, res) => {
  const { role } = req.query;
  if (!role) return res.json([]);
  res.json(SCHEMES.filter(s => s.tags.includes(String(role))));
});

app.listen(port, () => {
  console.log(`[NODE] Server listening on http://localhost:${port}`);
});

