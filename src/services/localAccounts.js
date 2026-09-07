import { AVATARS, hashPassword, isPasswordHash, normalizeUsername, publicAccount, validatePassword, validateProfile, verifyPassword } from '../utils/account.js';

export const USERS_KEY = 'autoquiz_users';

export function createLocalAccounts(storage) {
  function read() {
    try {
      const value = JSON.parse(storage.getItem(USERS_KEY) || '[]');
      if (!Array.isArray(value) || value.some((account) => !account || typeof account.id !== 'string')) throw new Error();
      return value;
    } catch { throw new Error('Không đọc được danh sách tài khoản. Dữ liệu hiện tại được giữ nguyên.'); }
  }

  function write(accounts) {
    try { storage.setItem(USERS_KEY, JSON.stringify(accounts)); }
    catch { throw new Error('Không lưu được tài khoản vì bộ nhớ đầy hoặc bị chặn.'); }
  }

  function requireAccount(id) {
    const account = read().find((item) => item.id === id);
    if (!account) throw new Error('Tài khoản không còn tồn tại trên trình duyệt này. Hãy đăng nhập lại.');
    if (account.status === 'locked') throw new Error('Tài khoản đã bị khóa.');
    return account;
  }

  // Local identities have no system-wide administrative authority.
  const publicLocal = (account) => ({ ...publicAccount(account), role: 'user', authSource: 'local' });

  return {
    get(id) { return publicLocal(requireAccount(id)); },
    async register(usernameValue, password, displayName) {
      const username = normalizeUsername(usernameValue);
      validatePassword(password);
      const profile = validateProfile({ displayName: displayName?.trim() || username, avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)] });
      if (read().some((account) => account.username === username)) throw new Error('Tên đăng nhập đã tồn tại!');
      const encoded = await hashPassword(password);
      const accounts = read();
      if (accounts.some((account) => account.username === username)) throw new Error('Tên đăng nhập đã tồn tại!');
      const account = { id: crypto.randomUUID(), username, password: encoded, ...profile, createdAt: new Date().toISOString(), role: 'user', status: 'active' };
      write([...accounts, account]);
      return publicLocal(account);
    },
    async login(usernameValue, password) {
      const username = normalizeUsername(usernameValue);
      const account = read().find((item) => item.username === username);
      if (!account || !(await verifyPassword(password, account.password))) throw new Error('Tên đăng nhập hoặc mật khẩu không đúng!');
      if (account.status === 'locked') throw new Error('Tài khoản đã bị khóa.');
      if (!isPasswordHash(account.password)) {
        const encoded = await hashPassword(password);
        const current = requireAccount(account.id);
        if (current.password !== account.password) throw new Error('Tài khoản đã thay đổi. Hãy đăng nhập lại.');
        write(read().map((item) => item.id === account.id ? { ...item, password: encoded } : item));
      }
      return publicLocal(requireAccount(account.id));
    },
    updateProfile(id, input) {
      const profile = validateProfile(input);
      const account = { ...requireAccount(id), ...profile };
      write(read().map((item) => item.id === id ? account : item));
      return publicLocal(account);
    },
    async changePassword(id, currentPassword, newPassword) {
      validatePassword(newPassword);
      if (newPassword === currentPassword) throw new Error('Mật khẩu mới cần khác mật khẩu hiện tại.');
      const account = requireAccount(id);
      if (!(await verifyPassword(currentPassword, account.password))) throw new Error('Mật khẩu hiện tại không đúng.');
      const password = await hashPassword(newPassword);
      const latest = requireAccount(id);
      if (latest.password !== account.password) throw new Error('Mật khẩu đã thay đổi ở cửa sổ khác. Hãy đăng nhập lại.');
      write(read().map((item) => item.id === id ? { ...item, password, passwordChangedAt: new Date().toISOString() } : item));
    },
  };
}

export const localAccounts = createLocalAccounts({ getItem: (key) => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) });
