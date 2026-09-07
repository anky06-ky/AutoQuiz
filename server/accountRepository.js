import { resolveAccessChange } from './accountPolicy.js';

export function createAccountRepository(getPool) {
  return {
    async findByUsername(username) {
      const [rows] = await getPool().query('SELECT * FROM users WHERE username = ?', [username]);
      return rows[0];
    },
    async findById(id) {
      const [rows] = await getPool().query('SELECT * FROM users WHERE id = ?', [id]);
      return rows[0];
    },
    async create(account) {
      await getPool().query('INSERT INTO users (id, username, password, displayName, avatar, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [account.id, account.username, account.password, account.displayName, account.avatar, account.role, 'active']);
      return this.findById(account.id);
    },
    async replacePassword(id, previous, password) {
      const [result] = await getPool().query('UPDATE users SET password = ? WHERE id = ? AND BINARY password = ?', [password, id, previous]);
      return result.affectedRows > 0;
    },
    async createSession(tokenHash, userId, expiresAt) {
      await getPool().query('DELETE FROM auth_sessions WHERE expiresAt < NOW()', []);
      await getPool().query('INSERT INTO auth_sessions (tokenHash, userId, expiresAt) VALUES (?, ?, FROM_UNIXTIME(?))', [tokenHash, userId, expiresAt.getTime() / 1000]);
    },
    async findSession(tokenHash) {
      const [rows] = await getPool().query('SELECT users.* FROM auth_sessions JOIN users ON users.id = auth_sessions.userId WHERE auth_sessions.tokenHash = ? AND auth_sessions.expiresAt > NOW()', [tokenHash]);
      return rows[0];
    },
    async deleteSession(tokenHash) {
      await getPool().query('DELETE FROM auth_sessions WHERE tokenHash = ?', [tokenHash]);
    },
    async updateProfile(id, profile) {
      await getPool().query('UPDATE users SET displayName = ?, avatar = ? WHERE id = ?', [profile.displayName, profile.avatar, id]);
      return this.findById(id);
    },
    async changePassword(id, previous, password) {
      const connection = await getPool().getConnection();
      try {
        await connection.beginTransaction();
        const [result] = await connection.query('UPDATE users SET password = ?, passwordChangedAt = NOW(3) WHERE id = ? AND BINARY password = ?', [password, id, previous]);
        if (!result.affectedRows) throw new Error('Mật khẩu đã thay đổi. Hãy đăng nhập lại.');
        await connection.query('DELETE FROM auth_sessions WHERE userId = ?', [id]);
        await connection.commit();
      } catch (err) { await connection.rollback(); throw err; }
      finally { connection.release(); }
    },
    async list({ search, role, status, page, pageSize }) {
      const filters = ['(username LIKE ? OR displayName LIKE ?)'];
      const values = [`%${search}%`, `%${search}%`];
      if (role) { filters.push('role = ?'); values.push(role); }
      if (status) { filters.push('status = ?'); values.push(status); }
      const where = filters.join(' AND ');
      const [counts] = await getPool().query(`SELECT COUNT(*) AS total FROM users WHERE ${where}`, values);
      const total = Number(counts[0].total);
      const currentPage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
      const [accounts] = await getPool().query(`SELECT id, username, displayName, avatar, role, status, createdAt FROM users WHERE ${where} ORDER BY createdAt DESC, id LIMIT ? OFFSET ?`, [...values, pageSize, (currentPage - 1) * pageSize]);
      return { accounts, total, page: currentPage, pageSize };
    },
    async updateAccess(actorId, targetId, changes) {
      const connection = await getPool().getConnection();
      try {
        await connection.beginTransaction();
        // Serialize administrator changes so concurrent requests cannot remove
        // every active administrator or use a role revoked during this request.
        const [admins] = await connection.query("SELECT id FROM users WHERE role = 'admin' AND status = 'active' ORDER BY id FOR UPDATE");
        const [rows] = await connection.query('SELECT * FROM users WHERE id = ? FOR UPDATE', [targetId]);
        const target = rows[0];
        const { role, status } = resolveAccessChange(actorId, target, changes, admins.map((account) => account.id));
        await connection.query('UPDATE users SET role = ?, status = ? WHERE id = ?', [role, status, targetId]);
        if (status === 'locked' || role !== target.role) await connection.query('DELETE FROM auth_sessions WHERE userId = ?', [targetId]);
        await connection.commit();
        return { ...target, role, status };
      } catch (err) { await connection.rollback(); throw err; }
      finally { connection.release(); }
    },
  };
}
