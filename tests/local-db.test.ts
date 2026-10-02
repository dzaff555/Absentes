import test from 'node:test';
import assert from 'node:assert/strict';

(async () => {
  process.env.USE_LOCAL_DATA = 'true';
  process.env.NO_DATABASE = 'true';

  const { testConnection, query } = await import('../src/lib/database/db');

  test('local data mode works without MySQL', async () => {
    const connection = await testConnection();
    assert.equal(connection.connected, true);

    const users = await query<any[]>(
      'SELECT id, username, email, password, role, status FROM users WHERE username = ? OR email = ? LIMIT 1',
      ['admin', 'admin@dailyattendance.local']
    );

    assert.ok(users.length >= 1);
    assert.equal(users[0].username, 'admin');
  });
})();
