const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function setup() {
  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
  const DB_USER = process.env.DB_USER || 'root';
  const DB_PASSWORD = process.env.DB_PASSWORD || '';
  const DB_NAME = process.env.DB_NAME || 'daily_attendance';

  console.log('🔄 Connecting to MySQL at', `${DB_HOST}:${DB_PORT}...`);

  try {
    // 1. Koneksi awal tanpa memilih database untuk membuat DB jika belum ada
    const adminConn = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
    });

    console.log('✅ Connected to MySQL server.');
    console.log(`📦 Creating database ${DB_NAME} if not exists...`);
    await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await adminConn.end();

    // 2. Koneksi ke database target
    const db = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      multipleStatements: true,
    });

    const sqlPath = path.join(__dirname, 'daily_attendance.sql');

    // JIKA FILE SQL DUMP ADA: Import langsung SQL Dump
    if (fs.existsSync(sqlPath)) {
      const sqlDump = fs.readFileSync(sqlPath, 'utf8');
      console.log('📝 Importing SQL dump from daily_attendance.sql...');
      
      // Hapus tabel lama sesuai urutan Relasi Foreign Key
      const tablesToDrop = [
        'chat_messages',
        'chat_group_members',
        'chat_groups',
        'attendance',
        'password_reset_tokens',
        'users'
      ];
      
      for (const table of tablesToDrop) {
        await db.query(`DROP TABLE IF EXISTS \`${table}\`;`);
      }

      await db.query(sqlDump);
      console.log('🎉 SQL dump imported successfully!');
    } else {
      // JIKA FILE SQL DUMP TIDAK ADA: Buat tabel secara tertulis/manual
      console.log('🛠 Creating tables manually...');

      // Tabel Users (Disesuaikan dengan versi SQL)
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          email VARCHAR(100) NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          role ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
          status ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
          attendance_role ENUM('CSOT', 'PPKA', 'MASINIS', 'PKD', 'PJL') NOT NULL DEFAULT 'CSOT',
          profile_photo LONGTEXT NULL,
          roblox_username VARCHAR(100) NULL,
          discord_username VARCHAR(100) NULL,
          profile_completed TINYINT(1) NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_users_username (username),
          INDEX idx_users_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Tabel Attendance
      await db.query(`
        CREATE TABLE IF NOT EXISTS attendance (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          name VARCHAR(100) NOT NULL,
          attendance_role ENUM('CSOT', 'PPKA', 'MASINIS', 'PKD', 'PJL') NOT NULL DEFAULT 'CSOT',
          discord_username VARCHAR(100) NOT NULL,
          roblox_username VARCHAR(100) NOT NULL,
          attendance_date DATE NOT NULL,
          attendance_time TIME NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'Hadir',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT unique_user_daily_attendance UNIQUE (user_id, attendance_date),
          INDEX idx_attendance_date (attendance_date),
          INDEX idx_attendance_user_date (user_id, attendance_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Tabel Chat Groups
      await db.query(`
        CREATE TABLE IF NOT EXISTS chat_groups (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description VARCHAR(255) NULL,
          created_by INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Tabel Chat Group Members
      await db.query(`
        CREATE TABLE IF NOT EXISTS chat_group_members (
          id INT AUTO_INCREMENT PRIMARY KEY,
          group_id INT NOT NULL,
          user_id INT NOT NULL,
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Tabel Chat Messages
      await db.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          group_id INT NOT NULL,
          user_id INT NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Tabel Password Reset Tokens
      await db.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          token VARCHAR(255) NOT NULL UNIQUE,
          expires_at DATETIME NOT NULL,
          used BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_reset_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_token (token)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }

    // 3. Seed akun Admin & User jika belum ada di database
    console.log('🌱 Checking seed accounts...');
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@dailyattendance.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const [existingAdmin] = await db.query('SELECT id FROM users WHERE username = ? OR email = ?', [adminUsername, adminEmail]);
    if (existingAdmin.length === 0) {
      const hash = await bcrypt.hash(adminPassword, 10);
      await db.query(
        'INSERT INTO users (username, email, password, role, status, profile_completed) VALUES (?, ?, ?, ?, ?, ?)',
        [adminUsername, adminEmail, hash, 'ADMIN', 'ACTIVE', 1]
      );
      console.log(`✅ Default admin created: ${adminUsername} / ${adminPassword}`);
    } else {
      console.log('ℹ️ Admin user already exists.');
    }

    const [existingUser] = await db.query('SELECT id FROM users WHERE username = ?', ['user']);
    if (existingUser.length === 0) {
      const userHash = await bcrypt.hash('user123', 10);
      await db.query(
        'INSERT INTO users (username, email, password, role, status, profile_completed) VALUES (?, ?, ?, ?, ?, ?)',
        ['user', 'user@dailyattendance.local', userHash, 'USER', 'ACTIVE', 1]
      );
      console.log('✅ Demo user created: user / user123');
    }

    await db.end();
    console.log('🎉 Database setup completed successfully!');
  } catch (err) {
    console.error('❌ Database setup error:', err.message);
    process.exit(1);
  }
}

setup();