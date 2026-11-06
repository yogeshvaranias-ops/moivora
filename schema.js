// Creates / upgrades all tables. Safe to run on every start.
async function ensureSchema(q) {
    await q.query(`CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY, full_name VARCHAR(100) NOT NULL,
      identifier VARCHAR(120) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin','user') NOT NULL DEFAULT 'user', is_active TINYINT(1) NOT NULL DEFAULT 1, last_login TIMESTAMP NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await q.query(`CREATE TABLE IF NOT EXISTS events (
      id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
      name VARCHAR(150) NOT NULL, type VARCHAR(40) NOT NULL,
      event_date DATE NOT NULL, event_time TIME NOT NULL,
      location VARCHAR(255) NOT NULL, host_name VARCHAR(100) NOT NULL, contact VARCHAR(15) NOT NULL,
      description TEXT NULL, image MEDIUMTEXT NULL,
      status ENUM('Upcoming','Ongoing','Completed','Cancelled') NOT NULL DEFAULT 'Upcoming',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_date (user_id, event_date),
      CONSTRAINT fk_ev_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
    await q.query(`CREATE TABLE IF NOT EXISTS contributions (
      id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, event_id INT NOT NULL,
      contributor_name VARCHAR(100) NOT NULL, mobile VARCHAR(15) NULL, place VARCHAR(100) NULL, relationship VARCHAR(60) NULL,
      amount DECIMAL(12,2) NOT NULL, payment_method ENUM('Cash','UPI','Bank Transfer','Other') NOT NULL DEFAULT 'Cash',
      contribution_date DATE NOT NULL, remarks VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_c_user (user_id, contribution_date), INDEX idx_c_event (event_id), INDEX idx_c_mobile (mobile),
      CONSTRAINT fk_c_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE)`);
    await q.query(`CREATE TABLE IF NOT EXISTS expenses (
      id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, event_id INT NULL,
      name VARCHAR(150) NOT NULL, category VARCHAR(60) NULL, amount DECIMAL(12,2) NOT NULL,
      expense_date DATE NOT NULL, description VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_x_user (user_id, expense_date),
      CONSTRAINT fk_x_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL)`);
    const [cols] = await q.query("SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'");
    const have = cols.map(r => r.c);
    if (!have.includes('is_active')) await q.query('ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1');
    if (!have.includes('last_login')) await q.query('ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL');
}
module.exports = { ensureSchema };
