const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'data', 'match.db');
const db = new Database(dbPath);
const hash = bcrypt.hashSync('admin123', 10);
db.prepare('UPDATE admin_settings SET value = ? WHERE key = ?').run(hash, 'admin_password');
console.log('Admin password reset to admin123');
db.close();
