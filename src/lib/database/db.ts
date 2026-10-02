import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

// Configuration from environment variables
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'daily_attendance';
const HAS_MYSQL_ENV = Boolean(process.env.DB_HOST || process.env.DB_USER || process.env.DB_PORT || process.env.DB_PASSWORD || process.env.DB_NAME);
const USE_LOCAL_DATA =
  String(process.env.NO_DATABASE || process.env.USE_LOCAL_DATA || '').toLowerCase() === 'true' ||
  !HAS_MYSQL_ENV;

let pool: mysql.Pool | null = null;
let isInitialized = false;

type LocalUser = {
  id: number;
  username: string;
  email: string | null;
  password: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'DISABLED';
  attendance_role: 'CSOT' | 'PPKA' | 'MASINIS' | 'PKD' | 'PJL';
  profile_photo: string | null;
  roblox_username: string | null;
  discord_username: string | null;
  profile_completed: boolean;
  created_at: string;
  updated_at: string;
};

const localUsers: LocalUser[] = [];

async function ensureLocalSeed() {
  if (localUsers.length > 0) return;

  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  localUsers.push(
    {
      id: 1,
      username: process.env.ADMIN_USERNAME || 'admin',
      email: process.env.ADMIN_EMAIL || 'admin@dailyattendance.local',
      password: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      attendance_role: 'CSOT',
      profile_photo: null,
      roblox_username: null,
      discord_username: null,
      profile_completed: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      username: 'user',
      email: 'user@dailyattendance.local',
      password: userPassword,
      role: 'USER',
      status: 'ACTIVE',
      attendance_role: 'CSOT',
      profile_photo: null,
      roblox_username: 'demo-roblox',
      discord_username: 'demo-discord',
      profile_completed: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  );
}

function localQuery(sql: string, params: unknown[] = []): unknown[] {
  const normalizedSql = sql.replace(/\s+/g, ' ').trim();

  if (normalizedSql.startsWith('SELECT COUNT(*)')) {
    const total = localUsers.length;
    return [{ total }];
  }

  if (normalizedSql.includes('FROM users WHERE username = ? OR email = ? LIMIT 1')) {
    const [username, email] = params as [string, string];
    const match = localUsers.find((user) => user.username === username || user.email === email) || null;
    return match ? [match] : [];
  }

  if (normalizedSql.includes('FROM users WHERE id = ? LIMIT 1')) {
    const [id] = params as [number];
    const match = localUsers.find((user) => user.id === Number(id));
    return match ? [match] : [];
  }

  if (normalizedSql.includes('FROM users WHERE username = ? LIMIT 1')) {
    const [username] = params as [string];
    const match = localUsers.find((user) => user.username === username) || null;
    return match ? [match] : [];
  }

  if (normalizedSql.includes('SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1')) {
    const [username, email] = params as [string, string];
    const match = localUsers.find((user) => user.username === username || user.email === email) || null;
    return match ? [{ id: match.id }] : [];
  }

  if (normalizedSql.includes('SELECT attendance_role, profile_completed FROM users WHERE id = ? LIMIT 1')) {
    const [id] = params as [number];
    const match = localUsers.find((user) => user.id === Number(id));
    return match ? [{ attendance_role: match.attendance_role, profile_completed: match.profile_completed }] : [];
  }

  if (normalizedSql.includes('SELECT id FROM users WHERE username = ? LIMIT 1')) {
    const [username] = params as [string];
    const match = localUsers.find((user) => user.username === username) || null;
    return match ? [{ id: match.id }] : [];
  }

  if (normalizedSql.startsWith('INSERT INTO users')) {
    const [username, email, password, role, status, attendanceRole, profileCompleted, robloxUsername, discordUsername] = params as [
      string,
      string | null,
      string,
      string,
      string,
      string,
      boolean,
      string | null,
      string | null,
    ];
    const newUser: LocalUser = {
      id: localUsers.length ? Math.max(...localUsers.map((u) => u.id)) + 1 : 1,
      username,
      email,
      password,
      role: role as 'USER' | 'ADMIN',
      status: status as 'ACTIVE' | 'DISABLED',
      attendance_role: (attendanceRole || 'CSOT') as LocalUser['attendance_role'],
      profile_photo: null,
      roblox_username: robloxUsername ?? null,
      discord_username: discordUsername ?? null,
      profile_completed: Boolean(profileCompleted),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localUsers.push(newUser);
    return [{ insertId: newUser.id }];
  }

  if (normalizedSql.startsWith('UPDATE users SET')) {
    const [value, id] = params.slice(-2) as [string, number];
    const target = localUsers.find((user) => user.id === Number(id));
    if (!target) return [{ affectedRows: 0 }];

    if (normalizedSql.includes('password = ?')) {
      target.password = value as string;
    }
    target.updated_at = new Date().toISOString();
    return [{ affectedRows: 1 }];
  }

  return [];
}

async function ensureColumns(
  dbPool: mysql.Pool,
  migrations: { table: 'users' | 'attendance'; column: string; definition: string }[]
) {
  for (const migration of migrations) {
    const [columns] = await dbPool.query<mysql.RowDataPacket[]>(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [migration.table, migration.column]
    );

    if (columns.length > 0) continue;

    try {
      await dbPool.query(
        `ALTER TABLE \`${migration.table}\` ADD COLUMN \`${migration.column}\` ${migration.definition}`
      );
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
      if (code !== 'ER_DUP_FIELDNAME') throw error;
    }
  }
}

async function ensureProfilePhotoCapacity(dbPool: mysql.Pool) {
  const [columns] = await dbPool.query<mysql.RowDataPacket[]>(
    'SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    ['users', 'profile_photo']
  );
  const dataType = String(columns[0]?.DATA_TYPE || '').toLowerCase();

  if (dataType && dataType !== 'mediumtext' && dataType !== 'longtext') {
    await dbPool.query('ALTER TABLE users MODIFY COLUMN profile_photo LONGTEXT NULL');
  }
}

async function ensureEmailIsOptional(dbPool: mysql.Pool) {
  const [columns] = await dbPool.query<mysql.RowDataPacket[]>(
    'SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    ['users', 'email']
  );

  if (columns[0]?.IS_NULLABLE === 'NO') {
    await dbPool.query('ALTER TABLE users MODIFY COLUMN email VARCHAR(100) NULL');
  }
}

export function getDbPool(): mysql.Pool {
  if (USE_LOCAL_DATA) {
    return mysql.createPool({
      host: '127.0.0.1',
      port: 3306,
      user: 'local-demo',
      password: 'local-demo',
      database: 'local-demo',
    });
  }

  if (!pool) {
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  }
  return pool;
}

export async function initDatabase(): Promise<{ success: boolean; message: string }> {
  if (isInitialized) {
    return { success: true, message: 'Database already initialized' };
  }

  if (USE_LOCAL_DATA) {
    await ensureLocalSeed();
    isInitialized = true;
    return { success: true, message: 'Local demo database initialized successfully' };
  }

  try {
    const adminConn = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
    });

    await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await adminConn.end();

    const dbPool = getDbPool();

    await dbPool.query(`
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
        profile_completed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_users_username (username),
        INDEX idx_users_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await dbPool.query(`
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

    await ensureColumns(dbPool, [
      { table: 'users', column: 'attendance_role', definition: "ENUM('CSOT', 'PPKA', 'MASINIS', 'PKD', 'PJL') NOT NULL DEFAULT 'CSOT'" },
      { table: 'users', column: 'profile_photo', definition: 'LONGTEXT NULL' },
      { table: 'users', column: 'roblox_username', definition: 'VARCHAR(100) NULL' },
      { table: 'users', column: 'discord_username', definition: 'VARCHAR(100) NULL' },
      { table: 'users', column: 'profile_completed', definition: 'BOOLEAN NOT NULL DEFAULT FALSE' },
      { table: 'attendance', column: 'attendance_role', definition: "ENUM('CSOT', 'PPKA', 'MASINIS', 'PKD', 'PJL') NOT NULL DEFAULT 'CSOT'" },
    ]);
    await ensureProfilePhotoCapacity(dbPool);
    await ensureEmailIsOptional(dbPool);

    await dbPool.query(`
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

    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@dailyattendance.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const [existingAdmins]: [mysql.RowDataPacket[], unknown] = await dbPool.query(
      'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
      [adminUsername, adminEmail]
    );

    if (existingAdmins.length === 0) {
      const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
      await dbPool.query(
        'INSERT INTO users (username, email, password, role, status, attendance_role, profile_completed) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [adminUsername, adminEmail, hashedAdminPassword, 'ADMIN', 'ACTIVE', 'CSOT', true]
      );
      console.log(`[DB] Seeded initial admin account: ${adminUsername}`);
    }

    const [existingUsers]: [mysql.RowDataPacket[], unknown] = await dbPool.query(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      ['user']
    );

    if (existingUsers.length === 0) {
      const hashedUserPassword = await bcrypt.hash('user123', 10);
      await dbPool.query(
        'INSERT INTO users (username, email, password, role, status, attendance_role, profile_completed, roblox_username, discord_username) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['user', 'user@dailyattendance.local', hashedUserPassword, 'USER', 'ACTIVE', 'CSOT', true, 'demo-roblox', 'demo-discord']
      );
    }

    isInitialized = true;
    return { success: true, message: 'Database initialized and seeded successfully' };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to initialize database. Ensure MySQL is running on port 3306.';
    console.error('[DB Initialization Error]:', error);
    return { success: false, message };
  }
}

export async function query<T = unknown>(sql: string, params: unknown[] = []): Promise<T> {
  if (!isInitialized) {
    const initialization = await initDatabase();
    if (!initialization.success) {
      throw new Error(initialization.message);
    }
  }

  if (USE_LOCAL_DATA) {
    return localQuery(sql, params) as T;
  }

  const dbPool = getDbPool();
  const [results] = await dbPool.query(sql, params);
  return results as T;
}

export async function testConnection(): Promise<{ connected: boolean; error?: string }> {
  if (USE_LOCAL_DATA) {
    await ensureLocalSeed();
    return { connected: true };
  }

  try {
    const dbPool = getDbPool();
    const connection = await dbPool.getConnection();
    await connection.ping();
    connection.release();
    return { connected: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'MySQL connection failed. Ensure MySQL service is started (e.g., via Laragon or XAMPP).';
    return { connected: false, error: message };
  }
}
