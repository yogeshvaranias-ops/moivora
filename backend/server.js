require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

if (!process.env.JWT_SECRET) { console.error('JWT_SECRET missing in .env'); process.exit(1); }
const app = express();
app.use(express.json({ limit: '2mb' }));

const db = mysql.createPool({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 3306, ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, waitForConnections: true, connectionLimit: 10, dateStrings: true
});
const h = fn => (req, res) => fn(req, res).catch(e => { console.error(e); res.status(500).json({ message: 'Server error. Check the backend console.' }); });

const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const okPw = v => typeof v === 'string' && v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v);
const normMobile = v => String(v || '').replace(/[\s-]/g, '').replace(/^\+91/, '');
function normalize(id) {
  id = String(id || '').trim().toLowerCase();
  if (isEmail(id)) return id;
  const m = normMobile(id);
  return /^[6-9]\d{9}$/.test(m) ? m : null;
}
const sign = u => jwt.sign({ id: u.id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

/* ---------- auth ---------- */
app.post('/api/auth/register', h(async (req, res) => {
  const name = String(req.body.name || '').trim(), identifier = normalize(req.body.identifier), password = req.body.password;
  if (name.length < 2) return res.status(400).json({ message: 'Enter your full name.' });
  if (!identifier) return res.status(400).json({ message: 'Enter a valid email or 10-digit mobile number.' });
  if (!okPw(password)) return res.status(400).json({ message: 'Password needs 8+ characters with a letter and a number.' });
  try {
    const [[{ n }]] = await db.query('SELECT COUNT(*) AS n FROM users');
    const role = n === 0 ? 'admin' : 'user';
    const [r] = await db.query('INSERT INTO users (full_name, identifier, password_hash, role) VALUES (?,?,?,?)', [name, identifier, await bcrypt.hash(password, 10), role]);
    res.status(201).json({ token: sign({ id: r.insertId, role }), name });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'This email/mobile is already registered.' });
    throw e;
  }
}));
app.post('/api/auth/login', h(async (req, res) => {
  const identifier = normalize(req.body.identifier), password = req.body.password;
  if (!identifier || typeof password !== 'string') return res.status(400).json({ message: 'Enter email/mobile and password.' });
  const [rows] = await db.query('SELECT * FROM users WHERE identifier = ?', [identifier]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(password, u.password_hash))) return res.status(401).json({ message: 'Invalid email/mobile or password.' });
  res.json({ token: sign(u), name: u.full_name });
}));
function auth(req, res, next) {
  try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ message: 'Please login again.' }); }
}
app.get('/api/auth/me', auth, h(async (req, res) => {
  const [rows] = await db.query('SELECT id, full_name, identifier, role FROM users WHERE id = ?', [req.user.id]);
  rows[0] ? res.json(rows[0]) : res.status(401).json({ message: 'User not found' });
}));

/* ---------- events ---------- */
const TYPES = ['Wedding','Reception','Engagement','Birthday','Housewarming','Puberty Ceremony','Baby Shower','Ear Piercing Ceremony','Temple Festival','Family Function','Custom Event'];
const STATUS = ['Upcoming','Ongoing','Completed','Cancelled'];
function cleanEvent(b) {
  const v = {
    name: String(b.name || '').trim(), type: b.type, event_date: b.event_date, event_time: String(b.event_time || '').slice(0, 5),
    location: String(b.location || '').trim(), host_name: String(b.host_name || '').trim(), contact: normMobile(b.contact),
    description: String(b.description || '').trim().slice(0, 2000) || null, status: b.status || 'Upcoming', image: b.image || null
  };
  let err = null;
  if (v.name.length < 2) err = 'Enter the event name.';
  else if (!TYPES.includes(v.type)) err = 'Select a valid event type.';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(v.event_date || '') || isNaN(Date.parse(v.event_date))) err = 'Enter a valid event date.';
  else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.event_time)) err = 'Enter a valid event time.';
  else if (v.location.length < 2) err = 'Enter the event location.';
  else if (v.host_name.length < 2) err = 'Enter the host name.';
  else if (!/^[6-9]\d{9}$/.test(v.contact)) err = 'Enter a valid 10-digit contact number.';
  else if (!STATUS.includes(v.status)) err = 'Select a valid status.';
  else if (v.image && (!/^data:image\/(jpeg|png|webp);base64,/.test(v.image) || v.image.length > 1500000)) err = 'Image must be JPG/PNG/WebP under ~1 MB.';
  return [err, v];
}
const COLS = ['name','type','event_date','event_time','location','host_name','contact','description','status','image'];

app.get('/api/events', auth, h(async (req, res) => {
  const [rows] = await db.query('SELECT * FROM events WHERE user_id = ? ORDER BY event_date DESC, event_time DESC', [req.user.id]);
  res.json(rows);
}));
app.get('/api/events/:id', auth, h(async (req, res) => {
  const [rows] = await db.query('SELECT * FROM events WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Event not found.' });
  const [[s]] = await db.query('SELECT COUNT(*) AS contributors, COALESCE(SUM(amount),0) AS moi FROM contributions WHERE event_id = ?', [req.params.id]);
  const [[x]] = await db.query('SELECT COALESCE(SUM(amount),0) AS expenses FROM expenses WHERE event_id = ?', [req.params.id]);
  res.json({ ...rows[0], contributors: s.contributors, moi: Number(s.moi), expenses: Number(x.expenses) });
}));
app.post('/api/events', auth, h(async (req, res) => {
  const [err, v] = cleanEvent(req.body);
  if (err) return res.status(400).json({ message: err });
  const [r] = await db.query(`INSERT INTO events (user_id, ${COLS.join(',')}) VALUES (?, ${COLS.map(() => '?').join(',')})`, [req.user.id, ...COLS.map(c => v[c])]);
  res.status(201).json({ id: r.insertId });
}));
app.put('/api/events/:id', auth, h(async (req, res) => {
  const [err, v] = cleanEvent(req.body);
  if (err) return res.status(400).json({ message: err });
  const [r] = await db.query(`UPDATE events SET ${COLS.map(c => c + ' = ?').join(',')} WHERE id = ? AND user_id = ?`, [...COLS.map(c => v[c]), req.params.id, req.user.id]);
  r.affectedRows ? res.json({ ok: true }) : res.status(404).json({ message: 'Event not found.' });
}));
app.delete('/api/events/:id', auth, h(async (req, res) => {
  const [r] = await db.query('DELETE FROM events WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  r.affectedRows ? res.json({ ok: true }) : res.status(404).json({ message: 'Event not found.' });
}));

/* ---------- dashboard (real data only) ---------- */
app.get('/api/dashboard', auth, h(async (req, res) => {
  const u = req.user.id;
  const [[ev]] = await db.query("SELECT COUNT(*) AS total, SUM(event_date >= CURDATE() AND status IN ('Upcoming','Ongoing')) AS upcoming FROM events WHERE user_id = ?", [u]);
  const [[mo]] = await db.query('SELECT COUNT(DISTINCT LOWER(contributor_name), COALESCE(mobile,\'\')) AS people, COALESCE(SUM(amount),0) AS moi FROM contributions WHERE user_id = ?', [u]);
  const [[ex]] = await db.query('SELECT COALESCE(SUM(amount),0) AS expenses FROM expenses WHERE user_id = ?', [u]);
  const moi = Number(mo.moi), expenses = Number(ex.expenses);

  const [mrows] = await db.query("SELECT DATE_FORMAT(contribution_date,'%Y-%m') AS m, SUM(amount) AS total FROM contributions WHERE user_id = ? AND contribution_date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 5 MONTH), '%Y-%m-01') GROUP BY m", [u]);
  const map = Object.fromEntries(mrows.map(r => [r.m, Number(r.total)]));
  const monthly = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    monthly.push({ label: d.toLocaleString('en-US', { month: 'short' }) + ' ' + String(d.getFullYear()).slice(2), total: map[key] || 0 });
  }
  const [byEvent] = await db.query('SELECT e.name, COALESCE(SUM(c.amount),0) AS total FROM events e LEFT JOIN contributions c ON c.event_id = e.id WHERE e.user_id = ? GROUP BY e.id HAVING total > 0 ORDER BY total DESC LIMIT 6', [u]);
  const [recentContributors] = await db.query('SELECT c.contributor_name AS name, c.amount, c.contribution_date AS date, e.name AS event FROM contributions c JOIN events e ON e.id = c.event_id WHERE c.user_id = ? ORDER BY c.contribution_date DESC, c.id DESC LIMIT 5', [u]);
  const [transactions] = await db.query("(SELECT 'credit' AS kind, contributor_name AS title, amount, contribution_date AS date, id FROM contributions WHERE user_id = ?) UNION ALL (SELECT 'debit', name, amount, expense_date, id FROM expenses WHERE user_id = ?) ORDER BY date DESC, id DESC LIMIT 6", [u, u]);
  const [upcoming] = await db.query("SELECT id, name, type, event_date, event_time, location FROM events WHERE user_id = ? AND event_date >= CURDATE() AND status IN ('Upcoming','Ongoing') ORDER BY event_date, event_time LIMIT 5", [u]);
  res.json({
    totals: { events: ev.total, contributors: mo.people, moi, expenses, balance: moi - expenses, upcoming: Number(ev.upcoming || 0) },
    monthly, byEvent: byEvent.map(r => ({ name: r.name, total: Number(r.total) })),
    recentContributors: recentContributors.map(r => ({ ...r, amount: Number(r.amount) })),
    transactions: transactions.map(r => ({ ...r, amount: Number(r.amount) })), upcoming
  });
}));

app.use(express.static(path.join(__dirname, '../frontend')));
const port = process.env.PORT || 5000;
app.listen(port, () => console.log('MOIVORA running at http://localhost:' + port));
