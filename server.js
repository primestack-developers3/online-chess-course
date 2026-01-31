const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const cors = require('cors');

const DB_PATH = path.join(__dirname, 'data', 'users.db');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

function openDb() {
  const dir = require('path').dirname(DB_PATH);
  const fs = require('fs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return new sqlite3.Database(DB_PATH);
}

const db = openDb();
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

app.post('/api/signup', async (req, res) => {
  const { name, email, username, password } = req.body || {};
  if (!name || !email || !username || !password) return res.status(400).json({ error: 'Missing fields' });
  if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Password too short' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO users (name, email, username, password_hash) VALUES (?, ?, ?, ?)');
    stmt.run(name, email.toLowerCase(), username.toLowerCase(), hash, function (err) {
      if (err) {
        if (err.message && err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Email or username already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ id: this.lastID });
    });
    stmt.finalize();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});