export const AVATARS = ['🦊', '🐱', '🐼', '🦁', '🐯', '🐻', '🦄', '🐲', '🦅', '🐬', '🦋', '🌟', '🚀', '💎', '🎯', '⚡'];
const HASH_PREFIX = 'aq-pbkdf2-sha256';
const ITERATIONS = 600000; // OWASP PBKDF2-HMAC-SHA256 guidance.
const encoder = new TextEncoder();
const hex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

export function normalizeUsername(value) {
  const username = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!username || username.length > 50) throw new Error('Tên đăng nhập cần từ 1 đến 50 ký tự.');
  return username;
}

export function validatePassword(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128) {
    throw new Error('Mật khẩu mới cần từ 8 đến 128 ký tự.');
  }
  return value;
}

export function validateProfile(input) {
  const displayName = typeof input?.displayName === 'string' ? input.displayName.trim() : '';
  if (!displayName || displayName.length > 100) throw new Error('Tên hiển thị cần từ 1 đến 100 ký tự.');
  if (!AVATARS.includes(input?.avatar)) throw new Error('Hãy chọn ảnh đại diện trong danh sách.');
  return { displayName, avatar: input.avatar };
}

export function publicAccount(account) {
  return {
    id: account.id, username: account.username, displayName: account.displayName,
    avatar: account.avatar || '⚡', createdAt: account.createdAt,
    role: account.role === 'admin' ? 'admin' : 'user',
    status: account.status === 'locked' ? 'locked' : 'active',
    passwordChangedAt: account.passwordChangedAt || null,
  };
}

export function isPasswordHash(value) {
  return typeof value === 'string' && value.startsWith(`${HASH_PREFIX}$`);
}

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `${HASH_PREFIX}$${ITERATIONS}$${hex(salt)}$${hex(await derive(password, salt, ITERATIONS))}`;
}

export async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || !password || password.length > 128 || typeof stored !== 'string') return false;
  // Legacy accounts are upgraded only after a successful password check.
  if (!isPasswordHash(stored)) return password === stored;
  const parts = stored.split('$');
  const iterations = Number(parts[1]);
  if (parts.length !== 4 || !Number.isInteger(iterations) || iterations < 100000 || iterations > 1000000 || !/^[a-f0-9]{32}$/.test(parts[2]) || !/^[a-f0-9]{64}$/.test(parts[3])) return false;
  const salt = Uint8Array.from(parts[2].match(/../g), (pair) => parseInt(pair, 16));
  const actual = hex(await derive(password, salt, iterations));
  let difference = 0;
  for (let index = 0; index < actual.length; index++) difference |= actual.charCodeAt(index) ^ parts[3].charCodeAt(index);
  return difference === 0;
}
