import { initDatabase, getPool } from './db.js';
import { normalizeUsername } from '../src/utils/account.js';

try {
  const username = normalizeUsername(process.argv[2]);
  await initDatabase();
  const pool = getPool();
  if (!pool) throw new Error('Chưa kết nối được MySQL.');
  const [accounts] = await pool.query('SELECT id, username, status FROM users WHERE username = ?', [username]);
  if (!accounts.length) throw new Error(`Tài khoản ${username} chưa có trên máy chủ. Hãy đăng ký tài khoản này trên máy chủ rồi chạy lại lệnh.`);
  if (accounts[0].status !== 'active') throw new Error('Tài khoản đang bị khóa. Cần mở khóa trước khi cấp quyền.');
  await pool.query("UPDATE users SET role = 'admin' WHERE id = ?", [accounts[0].id]);
  await pool.query('DELETE FROM auth_sessions WHERE userId = ?', [accounts[0].id]);
  console.log(`Đã cấp quyền admin cho ${username}. Đăng nhập lại để sử dụng trang quản trị.`);
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally { await getPool()?.end(); }
