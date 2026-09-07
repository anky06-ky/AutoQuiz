import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { createLocalAccounts, USERS_KEY } from '../src/services/localAccounts.js';
import { hashPassword, verifyPassword, publicAccount } from '../src/utils/account.js';
import { createAccountRouter } from '../server/accountRoutes.js';
import { resolveAccessChange } from '../server/accountPolicy.js';
import { bootstrapAdmin } from '../server/bootstrapAdmin.js';

const legacy = { id: 'legacy', username: 'learner', displayName: 'Người học', avatar: '🦊', password: 'old-pass', role: 'user', status: 'active' };
function storageOf(accounts = [legacy]) {
  const data = new Map([[USERS_KEY, JSON.stringify(accounts)], ['autoquiz_custom_quizzes', 'preserve-quizzes'], ['autoquiz_history', 'preserve-history']]);
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

test('password hashes are salted, verify correctly and do not contain plaintext', async () => {
  const first = await hashPassword('example-password');
  const second = await hashPassword('example-password');
  assert.notEqual(first, second);
  assert.ok(!first.includes('example-password'));
  assert.equal(await verifyPassword('example-password', first), true);
  assert.equal(await verifyPassword('wrong-password', first), false);
  assert.equal(await verifyPassword('anything', 'aq-pbkdf2-sha256$999999999$bad$bad'), false);
});

test('legacy login upgrades credentials while keeping user identity and quiz data', async () => {
  const storage = storageOf();
  const accounts = createLocalAccounts(storage);
  await assert.rejects(accounts.login('learner', 'incorrect'));
  assert.equal(JSON.parse(storage.getItem(USERS_KEY))[0].password, 'old-pass');
  const account = await accounts.login(' LEARNER ', 'old-pass');
  assert.equal(account.id, legacy.id);
  assert.equal(account.password, undefined);
  assert.match(JSON.parse(storage.getItem(USERS_KEY))[0].password, /^aq-pbkdf2/);
  assert.equal(storage.getItem('autoquiz_custom_quizzes'), 'preserve-quizzes');
  assert.equal(storage.getItem('autoquiz_history'), 'preserve-history');
});

test('profile edits validate fields, cannot grant local admin, and keep username and credentials', () => {
  const storage = storageOf();
  const accounts = createLocalAccounts(storage);
  const updated = accounts.updateProfile('legacy', { displayName: '  Tên mới  ', avatar: '🐼', role: 'admin', username: 'changed', password: 'changed' });
  assert.equal(updated.displayName, 'Tên mới');
  assert.equal(updated.username, 'learner');
  assert.equal(updated.role, 'user');
  assert.equal(JSON.parse(storage.getItem(USERS_KEY))[0].password, 'old-pass');
  assert.throws(() => accounts.updateProfile('legacy', { displayName: '', avatar: '🐼' }));
  assert.throws(() => accounts.updateProfile('legacy', { displayName: 'Valid', avatar: 'https://example.com/image' }));
});

test('changing a local password requires the old password and invalidates old credentials', async () => {
  const storage = storageOf();
  const accounts = createLocalAccounts(storage);
  await assert.rejects(accounts.changePassword('legacy', 'wrong-pass', 'new-password'));
  assert.equal(JSON.parse(storage.getItem(USERS_KEY))[0].password, 'old-pass');
  await accounts.changePassword('legacy', 'old-pass', 'new-password');
  await assert.rejects(accounts.login('learner', 'old-pass'));
  assert.ok((await accounts.login('learner', 'new-password')).passwordChangedAt);
  assert.equal(storage.getItem('autoquiz_history'), 'preserve-history');
});

test('corrupt storage and failed writes do not silently erase accounts', async () => {
  const storage = storageOf();
  const accounts = createLocalAccounts(storage);
  storage.setItem(USERS_KEY, '{invalid');
  await assert.rejects(accounts.register('other', 'new-password', 'Other'));
  assert.equal(storage.getItem(USERS_KEY), '{invalid');
  storage.setItem(USERS_KEY, JSON.stringify([legacy]));
  storage.setItem = () => { throw new Error('quota'); };
  assert.throws(() => accounts.updateProfile('legacy', { displayName: 'New', avatar: '🐼' }));
  assert.equal(JSON.parse(storage.getItem(USERS_KEY))[0].displayName, legacy.displayName);
});

test('public profiles omit passwords, tokens and unexpected properties', () => {
  assert.equal(publicAccount({ ...legacy, token: 'private', secret: 'hidden' }).password, undefined);
  assert.equal(publicAccount({ ...legacy, token: 'private' }).token, undefined);
});

test('access policy rejects self-demotion, self-lock and revoked administrators', () => {
  const admin = { id: 'admin', role: 'admin', status: 'active' };
  assert.throws(() => resolveAccessChange('admin', admin, { status: 'locked' }, ['admin']));
  assert.throws(() => resolveAccessChange('admin', admin, { role: 'user' }, ['admin']));
  assert.throws(() => resolveAccessChange('revoked', legacy, { role: 'admin' }, ['admin']));
  assert.deepEqual(resolveAccessChange('admin', legacy, { status: 'locked' }, ['admin']), { role: 'user', status: 'locked' });
});

test('bootstrap creates the first admin without storing the supplied plaintext password', async () => {
  const calls = [];
  const connection = {
    beginTransaction: async () => calls.push(['begin']),
    query: async (sql, values = []) => {
      calls.push([sql, values]);
      if (sql.includes("role = 'admin'")) return [[]];
      if (sql.startsWith('SELECT id FROM users WHERE username')) return [[]];
      return [{ affectedRows: 1 }];
    },
    commit: async () => calls.push(['commit']), rollback: async () => calls.push(['rollback']), release: () => calls.push(['release']),
  };
  const created = await bootstrapAdmin({ getConnection: async () => connection }, { username: ' ADMIN06 ', password: 'bootstrap-password' }, async () => 'encoded-password');
  assert.equal(created, true);
  const insert = calls.find(([sql]) => typeof sql === 'string' && sql.startsWith('INSERT INTO users'));
  assert.equal(insert[1][1], 'admin06');
  assert.equal(insert[1][2], 'encoded-password');
  assert.ok(!JSON.stringify(insert).includes('bootstrap-password'));
  assert.ok(calls.some(([action]) => action === 'commit'));
  assert.ok(!calls.some(([action]) => action === 'rollback'));
});

test('bootstrap leaves an existing active administrator unchanged', async () => {
  let encoded = false;
  const connection = {
    beginTransaction: async () => {},
    query: async () => [[{ id: 'existing-admin' }]],
    commit: async () => {}, rollback: async () => {}, release: () => {},
  };
  const created = await bootstrapAdmin({ getConnection: async () => connection }, { username: 'admin06', password: 'bootstrap-password' }, async () => { encoded = true; return 'encoded'; });
  assert.equal(created, false);
  assert.equal(encoded, false);
  assert.equal(await bootstrapAdmin({ getConnection: async () => { throw new Error('should not connect'); } }, { username: 'admin06' }), false);
});

async function apiFixture(t) {
  const accounts = new Map([
    ['admin', { ...legacy, id: 'admin', username: 'admin06', role: 'admin', password: await hashPassword('admin-test-password') }],
    ['legacy', { ...legacy, password: await hashPassword('learner-test-password') }],
  ]);
  const sessions = new Map();
  const repository = {
    findByUsername: async (username) => structuredClone([...accounts.values()].find((item) => item.username === username)),
    findById: async (id) => structuredClone(accounts.get(id)),
    create: async (account) => { const created = { ...account, status: 'active' }; accounts.set(account.id, created); return created; },
    createSession: async (hash, userId, expiresAt) => sessions.set(hash, { userId, expiresAt }),
    findSession: async (hash) => {
      const session = sessions.get(hash);
      return session && session.expiresAt > new Date() ? structuredClone(accounts.get(session.userId)) : null;
    },
    deleteSession: async (hash) => sessions.delete(hash),
    updateProfile: async (id, profile) => { const updated = { ...accounts.get(id), ...profile }; accounts.set(id, updated); return updated; },
    list: async ({ search, role, status, page, pageSize }) => {
      const found = [...accounts.values()].filter((item) => (!search || item.username.includes(search)) && (!role || item.role === role) && (!status || item.status === status));
      return { accounts: found, total: found.length, page, pageSize };
    },
    updateAccess: async (actorId, id, changes) => {
      const target = accounts.get(id);
      const updated = { ...target, ...resolveAccessChange(actorId, target, changes, [...accounts.values()].filter((item) => item.role === 'admin' && item.status === 'active').map((item) => item.id)) };
      accounts.set(id, updated);
      if (updated.status === 'locked' || updated.role !== target.role) for (const [key, session] of sessions) if (session.userId === id) sessions.delete(key);
      return updated;
    },
    changePassword: async (id, previous, password) => {
      assert.equal(accounts.get(id).password, previous);
      accounts.set(id, { ...accounts.get(id), password });
      for (const [key, session] of sessions) if (session.userId === id) sessions.delete(key);
    },
  };
  const app = express(); app.use(express.json()); app.use('/api', createAccountRouter(repository));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  async function request(path, { token, body, method = 'GET' } = {}) {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: res.status, data: await res.json() };
  }
  async function login(username, password) {
    const result = await request('/auth/login', { method: 'POST', body: { username, password } });
    assert.equal(result.status, 200);
    assert.equal(result.data.user.password, undefined);
    return result.data.token;
  }
  return { request, login, accounts, sessions };
}

test('API rejects anonymous and ordinary-user admin access; registration cannot request admin role', async (t) => {
  const { request, login } = await apiFixture(t);
  assert.equal((await request('/admin/accounts')).status, 401);
  assert.equal((await request('/quizzes')).status, 401);
  const token = await login('learner', 'learner-test-password');
  assert.equal((await request('/admin/accounts', { token })).status, 403);
  assert.equal((await request('/admin/accounts/admin', { token, method: 'PATCH', body: { role: 'user' } })).status, 403);
  const registered = await request('/auth/register', { method: 'POST', body: { username: 'new-person', password: 'registration-password', role: 'admin' } });
  assert.equal(registered.status, 200);
  assert.equal(registered.data.user.role, 'user');
});

test('profile API only updates the signed-in user and ignores privilege fields', async (t) => {
  const { request, login, accounts } = await apiFixture(t);
  const token = await login('learner', 'learner-test-password');
  const updated = await request('/account/me', { token, method: 'PUT', body: { id: 'admin', displayName: 'New name', avatar: '🐼', role: 'admin', status: 'active' } });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.id, 'legacy');
  assert.equal(updated.data.role, 'user');
  assert.equal(accounts.get('admin').displayName, legacy.displayName);
});

test('admin can list accounts and lock a user, which invalidates that user session immediately', async (t) => {
  const { request, login } = await apiFixture(t);
  const userToken = await login('learner', 'learner-test-password');
  const token = await login('admin06', 'admin-test-password');
  const list = await request('/admin/accounts?search=learner', { token });
  assert.equal(list.status, 200); assert.equal(list.data.total, 1);
  assert.equal(list.data.accounts[0].password, undefined);
  assert.equal((await request('/admin/accounts/legacy', { token, method: 'PATCH', body: { status: 'locked' } })).status, 200);
  assert.equal((await request('/auth/me', { token: userToken })).status, 401);
  assert.equal((await request('/history', { token: userToken, method: 'POST', body: { score: 100 } })).status, 401);
  assert.equal((await request('/auth/login', { method: 'POST', body: { username: 'learner', password: 'learner-test-password' } })).status, 403);
  assert.equal((await request('/admin/accounts/admin', { token, method: 'PATCH', body: { role: 'user' } })).status, 400);
});

test('password API verifies current credentials and revokes all sessions after success', async (t) => {
  const { request, login } = await apiFixture(t);
  const first = await login('learner', 'learner-test-password');
  const second = await login('learner', 'learner-test-password');
  assert.equal((await request('/account/password', { token: first, method: 'PUT', body: { currentPassword: 'wrong-password', newPassword: 'replacement-password' } })).status, 400);
  assert.equal((await request('/auth/me', { token: second })).status, 200);
  assert.equal((await request('/account/password', { token: first, method: 'PUT', body: { currentPassword: 'learner-test-password', newPassword: 'replacement-password' } })).status, 200);
  assert.equal((await request('/auth/me', { token: first })).status, 401);
  assert.equal((await request('/auth/me', { token: second })).status, 401);
  assert.ok(await login('learner', 'replacement-password'));
});
