import { randomUUID } from 'node:crypto';
import { AVATARS, hashPassword, normalizeUsername, validatePassword } from '../src/utils/account.js';

export async function bootstrapAdmin(pool, input = {}, encodePassword = hashPassword) {
  if (!input.password) return false;
  if (!input.username) throw new Error('Cần đặt BOOTSTRAP_ADMIN_USERNAME khi dùng BOOTSTRAP_ADMIN_PASSWORD.');

  const username = normalizeUsername(input.username);
  validatePassword(input.password);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [activeAdmins] = await connection.query("SELECT id FROM users WHERE role = 'admin' AND status = 'active' ORDER BY id FOR UPDATE");
    if (activeAdmins.length) {
      await connection.commit();
      return false;
    }

    const encoded = await encodePassword(input.password);
    const [accounts] = await connection.query('SELECT id FROM users WHERE username = ? FOR UPDATE', [username]);
    if (accounts[0]) {
      await connection.query("UPDATE users SET password = ?, role = 'admin', status = 'active', passwordChangedAt = NOW(3) WHERE id = ?", [encoded, accounts[0].id]);
      await connection.query('DELETE FROM auth_sessions WHERE userId = ?', [accounts[0].id]);
    } else {
      await connection.query("INSERT INTO users (id, username, password, displayName, avatar, role, status) VALUES (?, ?, ?, 'Quản trị viên', ?, 'admin', 'active')", [randomUUID(), username, encoded, AVATARS[0]]);
    }
    await connection.commit();
    return true;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
