// Creates the database + tables:  npm run setup  (the server also does this on start)
require('dotenv').config();
const mysql = require('mysql2/promise');
const { ensureSchema } = require('./schema');
(async () => {
  try {
    const c = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 3306, user: process.env.DB_USER, password: process.env.DB_PASSWORD, ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined });
    const db = process.env.DB_NAME || 'moivora';
    await c.query(`CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4`);
    await c.query(`USE \`${db}\``);
    await ensureSchema(c);
    console.log('Database "' + db + '" ready: users, events, contributions, expenses.');
    await c.end();
  } catch (e) { console.error('Setup failed:', e.code || '', e.message); process.exit(1); }
})();
