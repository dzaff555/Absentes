export type DatabaseConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

export function getDatabaseConfig(): DatabaseConfig {
  const host = (process.env.DB_HOST || '').trim();
  const port = Number(process.env.DB_PORT || '3306');
  const user = (process.env.DB_USER || '').trim();
  const password = process.env.DB_PASSWORD || '';
  const database = (process.env.DB_NAME || 'daily_attendance').trim();

  if (process.env.NODE_ENV === 'production') {
    const missing = [
      !host && 'DB_HOST',
      !user && 'DB_USER',
      !database && 'DB_NAME',
    ].filter(Boolean) as string[];

    if (missing.length > 0) {
      throw new Error(
        `Missing required database environment variables for production: ${missing.join(', ')}.`
      );
    }
  }

  return {
    host: host || 'localhost',
    port: Number.isFinite(port) ? port : 3306,
    user: user || 'root',
    password,
    database,
  };
}

export function hasDatabaseEnv(): boolean {
  return Boolean(
    process.env.DB_HOST ||
      process.env.DB_USER ||
      process.env.DB_PORT ||
      process.env.DB_PASSWORD ||
      process.env.DB_NAME
  );
}
