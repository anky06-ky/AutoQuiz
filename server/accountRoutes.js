import { Router } from 'express';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { AVATARS, hashPassword, isPasswordHash, normalizeUsername, publicAccount, validatePassword, validateProfile, verifyPassword } from '../src/utils/account.js';

const tokenDigest = (token) => createHash('sha256').update(token).digest('hex');
const run = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

export function createAccountRouter(repository, isReady = () => true) {
  const router = Router();
  router.use((req, res, next) => isReady() ? next() : res.status(503).json({ error: 'Máy chủ tài khoản chưa kết nối được cơ sở dữ liệu.' }));

  // A small per-process limit bounds expensive password verification. No
  // forwarded headers are trusted here; deployments can add gateway limits.
  const attempts = new Map();
  function rateLimit(req, res, next) {
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
    const key = req.ip;
    const entry = attempts.get(key) || { count: 0, until: now + 60000 };
    if (++entry.count > 20 || attempts.size > 10000) return res.status(429).json({ error: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau một phút.' });
    attempts.set(key, entry);
    next();
  }

  const requireUser = run(async (req, res, next) => {
    const token = req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    const account = token ? await repository.findSession(tokenDigest(token)) : null;
    if (!account || account.status === 'locked') return res.status(401).json({ error: 'Phiên đăng nhập hết hạn hoặc tài khoản đã bị khóa. Hãy đăng nhập lại.' });
    req.account = account;
    req.tokenHash = tokenDigest(token);
    next();
  });
  const requireAdmin = (req, res, next) => req.account.role === 'admin' ? next() : res.status(403).json({ error: 'Chỉ quản trị viên mới được quản lý tài khoản.' });

  async function startSession(account, res) {
    const token = randomBytes(32).toString('hex');
    await repository.createSession(tokenDigest(token), account.id, new Date(Date.now() + 12 * 60 * 60 * 1000));
    res.set('Cache-Control', 'no-store').json({ user: publicAccount(account), token });
  }

  async function createAccount(input, role = 'user') {
    const username = normalizeUsername(input.username);
    validatePassword(input.password);
    const profile = validateProfile({ displayName: input.displayName?.trim() || username, avatar: input.avatar || AVATARS[0] });
    if (await repository.findByUsername(username)) throw new Error('Tên đăng nhập đã tồn tại!');
    return repository.create({ id: randomUUID(), username, password: await hashPassword(input.password), ...profile, role });
  }

  router.post('/auth/register', rateLimit, run(async (req, res) => {
    const account = await createAccount(req.body || {});
    await startSession(account, res);
  }));
  router.post('/auth/login', rateLimit, run(async (req, res) => {
    const username = normalizeUsername(req.body?.username);
    const account = await repository.findByUsername(username);
    if (!account || !(await verifyPassword(req.body?.password, account.password))) return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng!' });
    if (account.status === 'locked') return res.status(403).json({ error: 'Tài khoản đã bị khóa. Hãy liên hệ quản trị viên.' });
    if (!isPasswordHash(account.password)) {
      const encoded = await hashPassword(req.body.password);
      const changed = await repository.replacePassword(account.id, account.password, encoded);
      if (!changed) return res.status(409).json({ error: 'Tài khoản đã thay đổi. Hãy đăng nhập lại.' });
      account.password = encoded;
    }
    // Re-read after hashing: a concurrent lock must take effect immediately.
    const current = await repository.findById(account.id);
    if (!current || current.password !== account.password) return res.status(409).json({ error: 'Tài khoản đã thay đổi. Hãy đăng nhập lại.' });
    if (current.status === 'locked') return res.status(403).json({ error: 'Tài khoản đã bị khóa.' });
    await startSession(current, res);
  }));

  router.get('/auth/me', requireUser, (req, res) => res.set('Cache-Control', 'no-store').json(publicAccount(req.account)));
  router.post('/auth/logout', requireUser, run(async (req, res) => { await repository.deleteSession(req.tokenHash); res.json({ success: true }); }));
  router.put('/account/me', requireUser, run(async (req, res) => {
    const profile = validateProfile(req.body);
    res.json(publicAccount(await repository.updateProfile(req.account.id, profile)));
  }));
  router.put('/account/password', requireUser, rateLimit, run(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    validatePassword(newPassword);
    if (currentPassword === newPassword) throw new Error('Mật khẩu mới cần khác mật khẩu hiện tại.');
    if (!(await verifyPassword(currentPassword, req.account.password))) return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng.' });
    await repository.changePassword(req.account.id, req.account.password, await hashPassword(newPassword));
    res.json({ success: true });
  }));

  router.get('/admin/accounts', requireUser, requireAdmin, run(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search.slice(0, 100) : '';
    const role = ['user', 'admin'].includes(req.query.role) ? req.query.role : '';
    const status = ['active', 'locked'].includes(req.query.status) ? req.query.status : '';
    const parsedPage = Number(req.query.page);
    const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 1000000) : 1;
    const result = await repository.list({ search, role, status, page, pageSize: 20 });
    res.set('Cache-Control', 'no-store').json({ ...result, accounts: result.accounts.map(publicAccount) });
  }));
  router.post('/admin/accounts', requireUser, requireAdmin, rateLimit, run(async (req, res) => {
    const role = req.body?.role || 'user';
    if (!['user', 'admin'].includes(role)) throw new Error('Quyền tài khoản không hợp lệ.');
    res.status(201).json(publicAccount(await createAccount(req.body || {}, role)));
  }));
  router.patch('/admin/accounts/:id', requireUser, requireAdmin, run(async (req, res) => {
    const { role, status } = req.body || {};
    if ((!role && !status) || (role && !['user', 'admin'].includes(role)) || (status && !['active', 'locked'].includes(status))) throw new Error('Quyền hoặc trạng thái không hợp lệ.');
    res.json(publicAccount(await repository.updateAccess(req.account.id, req.params.id, { role, status })));
  }));

  // Existing quiz/history endpoints also reject expired or locked identities.
  router.use(['/quizzes', '/history', '/leaderboard'], requireUser);

  router.use((err, req, res, _next) => {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại!' });
    if (err.code || err.sql) return res.status(500).json({ error: 'Không cập nhật được tài khoản. Hãy thử lại.' });
    res.status(400).json({ error: err.message || 'Dữ liệu không hợp lệ.' });
  });
  return router;
}
