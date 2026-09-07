import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { accountRequest } from '../services/api';
import './Account.css';
import './AdminAccounts.css';

const EMPTY = { accounts: [], total: 0, page: 1, pageSize: 20 };
const NEW_ACCOUNT = { username: '', displayName: '', password: '', role: 'user' };

export default function AdminAccounts() {
  const { user } = useAuth();
  const allowed = user?.authSource === 'server' && user?.role === 'admin';
  const [data, setData] = useState(EMPTY);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ search: '', role: '', status: '', page: 1 });
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState('');
  const [newAccount, setNewAccount] = useState(NEW_ACCOUNT);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    setLoading(true); setError('');
    accountRequest(`/admin/accounts?${new URLSearchParams(filters)}`)
      .then((result) => { if (active) setData(result); })
      .catch((err) => { if (active) { setData(EMPTY); setError(err.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed, filters, refresh]);

  function setFilter(key, value) { setFilters((previous) => ({ ...previous, [key]: value, page: 1 })); }

  async function changeAccess(account, changes) {
    const action = changes.role ? (changes.role === 'admin' ? 'cấp quyền quản trị cho' : 'gỡ quyền quản trị của') : (changes.status === 'locked' ? 'khóa' : 'mở khóa');
    if (!window.confirm(`Bạn muốn ${action} tài khoản @${account.username}?${changes.status === 'locked' ? ' Các phiên đăng nhập của tài khoản này sẽ kết thúc.' : ''}`)) return;
    setPending(account.id); setError(''); setNotice('');
    try {
      await accountRequest(`/admin/accounts/${encodeURIComponent(account.id)}`, { method: 'PATCH', body: JSON.stringify(changes) });
      setNotice(`Đã cập nhật tài khoản @${account.username}.`);
      setRefresh((value) => value + 1);
    } catch (err) { setError(err.message); }
    finally { setPending(''); }
  }

  async function createAccount(event) {
    event.preventDefault(); setPending('create'); setCreateError(''); setNotice('');
    try {
      const created = await accountRequest('/admin/accounts', { method: 'POST', body: JSON.stringify(newAccount) });
      setNotice(`Đã tạo tài khoản @${created.username}.`);
      setNewAccount(NEW_ACCOUNT); setRefresh((value) => value + 1);
    } catch (err) { setCreateError(err.message); }
    finally { setPending(''); }
  }

  if (!allowed) return (
    <div className="page" id="admin-accounts-page"><div className="container"><div className="glass-card admin-unavailable">
      <span aria-hidden="true">🛡️</span><h1>Quản lý tài khoản</h1>
      <p className="text-secondary">{user?.authSource === 'server' ? 'Tài khoản của bạn chưa có quyền quản trị.' : 'Quản trị người dùng cần tài khoản admin trên máy chủ. Tài khoản lưu trên trình duyệt chỉ quản lý được hồ sơ cá nhân.'}</p>
      <Link to="/account" className="btn btn-primary">Về tài khoản cá nhân</Link>
    </div></div></div>
  );

  const pageCount = Math.max(1, Math.ceil(data.total / data.pageSize));
  return (
    <div className="page" id="admin-accounts-page"><div className="container">
      <header className="account-heading"><div><p className="account-eyebrow">QUẢN TRỊ HỆ THỐNG</p><h1>Quản lý tài khoản</h1><p className="text-secondary">Quản lý quyền truy cập và trạng thái của người dùng.</p></div><Link to="/account" className="btn btn-secondary">Tài khoản cá nhân</Link></header>
      {notice && <p className="account-message success" role="status">{notice}</p>}
      <details className="glass-card admin-create"><summary>+ Tạo tài khoản</summary>
        <form onSubmit={createAccount}>
          <div className="admin-create-fields">
            <label className="account-field">Tên đăng nhập<input className="input" value={newAccount.username} maxLength={50} required autoComplete="off" onChange={(event) => setNewAccount({ ...newAccount, username: event.target.value })} /></label>
            <label className="account-field">Tên hiển thị<input className="input" value={newAccount.displayName} maxLength={100} required onChange={(event) => setNewAccount({ ...newAccount, displayName: event.target.value })} /></label>
            <label className="account-field">Mật khẩu ban đầu<input className="input" type="password" value={newAccount.password} minLength={8} maxLength={128} required autoComplete="new-password" onChange={(event) => setNewAccount({ ...newAccount, password: event.target.value })} /></label>
            <label className="account-field">Vai trò<select className="input" value={newAccount.role} onChange={(event) => setNewAccount({ ...newAccount, role: event.target.value })}><option value="user">Người dùng</option><option value="admin">Quản trị viên</option></select></label>
          </div>
          {createError && <p className="account-message error" role="alert">{createError}</p>}
          <div className="account-form-footer"><button className="btn btn-primary" disabled={Boolean(pending)}>{pending === 'create' ? 'Đang tạo…' : 'Tạo tài khoản'}</button></div>
        </form>
      </details>
      <section className="glass-card admin-directory" aria-label="Danh sách tài khoản">
        <form className="admin-toolbar" onSubmit={(event) => { event.preventDefault(); setFilter('search', searchInput.trim()); }}>
          <label className="admin-search"><span className="sr-only">Tìm tên đăng nhập hoặc tên hiển thị</span><input type="search" className="input" placeholder="Tìm tên đăng nhập hoặc tên hiển thị…" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} maxLength={100} /></label>
          <button className="btn btn-secondary">Tìm kiếm</button>
          <label><span className="sr-only">Lọc vai trò</span><select className="input" value={filters.role} onChange={(event) => setFilter('role', event.target.value)}><option value="">Tất cả vai trò</option><option value="admin">Quản trị viên</option><option value="user">Người dùng</option></select></label>
          <label><span className="sr-only">Lọc trạng thái</span><select className="input" value={filters.status} onChange={(event) => setFilter('status', event.target.value)}><option value="">Tất cả trạng thái</option><option value="active">Đang hoạt động</option><option value="locked">Đã khóa</option></select></label>
        </form>
        {error && <div className="account-message error" role="alert">{error} <button className="btn btn-ghost" onClick={() => setRefresh((value) => value + 1)}>Tải lại</button></div>}
        {loading ? <p className="admin-empty" role="status">Đang tải tài khoản…</p> : (
          <>
            <p className="admin-result-count">{data.total} tài khoản phù hợp</p>
            {!data.accounts.length ? <p className="admin-empty">Không có tài khoản phù hợp với bộ lọc.</p> : <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{data.accounts.map((account) => {
              const self = account.id === user.id;
              return <tr key={account.id}>
                <td><div className="admin-person"><span aria-hidden="true">{account.avatar}</span><div><strong>{account.displayName}</strong><span className="text-secondary">@{account.username}{self ? ' · Bạn' : ''}</span></div></div></td>
                <td>{account.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}</td>
                <td><span className={`badge ${account.status === 'locked' ? 'badge-error' : 'badge-success'}`}>{account.status === 'locked' ? 'Đã khóa' : 'Hoạt động'}</span></td>
                <td><div className="admin-row-actions"><button className="btn btn-secondary" disabled={self || Boolean(pending)} title={self ? 'Không thể đổi quyền của chính mình' : undefined} onClick={() => changeAccess(account, { role: account.role === 'admin' ? 'user' : 'admin' })}>{account.role === 'admin' ? 'Gỡ quyền admin' : 'Cấp quyền admin'}</button><button className={`btn btn-ghost ${account.status === 'active' ? 'admin-lock' : ''}`} disabled={self || Boolean(pending)} onClick={() => changeAccess(account, { status: account.status === 'locked' ? 'active' : 'locked' })}>{pending === account.id ? 'Đang lưu…' : account.status === 'locked' ? 'Mở khóa' : 'Khóa'}</button></div></td>
              </tr>;
            })}</tbody></table></div>}
            <nav className="admin-pagination" aria-label="Phân trang tài khoản"><button className="btn btn-secondary" disabled={data.page <= 1} onClick={() => setFilters({ ...filters, page: data.page - 1 })}>← Trước</button><span>Trang {data.page}/{pageCount}</span><button className="btn btn-secondary" disabled={data.page >= pageCount} onClick={() => setFilters({ ...filters, page: data.page + 1 })}>Sau →</button></nav>
          </>
        )}
      </section>
    </div></div>
  );
}
