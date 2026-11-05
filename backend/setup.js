// Creates database + tables (safe to re-run):  npm run setup
require('dotenv').config();
const mysql = require('mysql2/promise');
(async () => {
  try {
    const c = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 3306, ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined, user: process.env.DB_USER, password: process.env.DB_PASSWORD });
    const db = process.env.DB_NAME || 'moivora';
    await c.query(`CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4`);
    await c.query(`USE \`${db}\``);
    await c.query(`CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY, full_name VARCHAR(100) NOT NULL,
      identifier VARCHAR(120) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin','user') NOT NULL DEFAULT 'user', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await c.query(`CREATE TABLE IF NOT EXISTS events (
      id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
      name VARCHAR(150) NOT NULL, type VARCHAR(40) NOT NULL,
      event_date DATE NOT NULL, event_time TIME NOT NULL,
      location VARCHAR(255) NOT NULL, host_name VARCHAR(100) NOT NULL, contact VARCHAR(15) NOT NULL,
      description TEXT NULL, image MEDIUMTEXT NULL,
      status ENUM('Upcoming','Ongoing','Completed','Cancelled') NOT NULL DEFAULT 'Upcoming',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_date (user_id, event_date),
      CONSTRAINT fk_ev_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
    await c.query(`CREATE TABLE IF NOT EXISTS contributions (
      id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, event_id INT NOT NULL,
      contributor_name VARCHAR(100) NOT NULL, mobile VARCHAR(15) NULL, place VARCHAR(100) NULL, relationship VARCHAR(60) NULL,
      amount DECIMAL(12,2) NOT NULL, payment_method ENUM('Cash','UPI','Bank Transfer','Other') NOT NULL DEFAULT 'Cash',
      contribution_date DATE NOT NULL, remarks VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_c_user (user_id, contribution_date), INDEX idx_c_event (event_id), INDEX idx_c_mobile (mobile),
      CONSTRAINT fk_c_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE)`);
    await c.query(`CREATE TABLE IF NOT EXISTS expenses (
      id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, event_id INT NULL,
      name VARCHAR(150) NOT NULL, category VARCHAR(60) NULL, amount DECIMAL(12,2) NOT NULL,
      expense_date DATE NOT NULL, description VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_x_user (user_id, expense_date),
      CONSTRAINT fk_x_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL)`);
    console.log('Database "' + db + '" ready: users, events, contributions, expenses.');
    await c.end();
  } catch (e) { console.error('Setup failed:', e.code || '', e.message); process.exit(1); }
})();
