import { NextResponse } from 'next/server';
import { getDatabaseConfig, hasDatabaseEnv } from '@/lib/database/config';
import { testConnection } from '@/lib/database/db';

export async function GET() {
  try {
    const dbConfig = getDatabaseConfig();
    const connection = await testConnection();

    return NextResponse.json({
      ok: connection.connected,
      mode: hasDatabaseEnv() ? 'database' : 'local-demo',
      database: {
        host: dbConfig.host ? 'configured' : 'missing',
        port: dbConfig.port,
        name: dbConfig.database,
        user: dbConfig.user ? 'configured' : 'missing',
      },
      message: connection.connected
        ? 'Database connection is healthy.'
        : connection.error || 'Database connection failed.',
    }, {
      status: connection.connected ? 200 : 503,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Database configuration is incomplete or unreachable.',
      },
      { status: 503 }
    );
  }
}
