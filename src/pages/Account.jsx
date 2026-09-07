import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AVATARS, validatePassword } from '../utils/account';
import './Account.css';

export default function Account() {
  const { user, updateProfile, changePassword, getStats } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatar, setAvatar] = useState(user?.avatar || AVATARS[0]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [busy, setBusy] = useState('');
  const stats = getStats();
  const isServer = user?.authSource === 'server';
  const changed = displayName.trim() !== user?.displayName || avatar !== user?.avatar;

  async function saveProfile(event) {
    event.preventDefault();
    setBusy('profile'); setProfileMessage(''); setProfileError('');
    try {
      const updated = await updateProfile({ displayName, avatar });
      setDisplayName(updated.displayName);
      setProfileMessage('Đã cập nhật hồ sơ của bạn.');
    } catch (err) { setProfileError(err.message); }
    finally { setBusy(''); }
  }

  async function savePassword(event) {
    event.preventDefault(); setPasswordError('');
    try {
      validatePassword(newPassword);
      if (newPassword !== confirmPassword) throw new Error('Mật khẩu xác nhận chưa khớp.');
      setBusy('password');
      await changePassword(currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      navigate('/login', { replace: true, state: { message: 'Đã đổi mật khẩu. Đăng nhập lại bằng mật khẩu mới nhé.' } });
    } catch (err) { setPasswordError(err.message); }
    finally { setBusy(''); }
  }

  return (
    <div className="page" id="account-page"><div className="container">
      <header className="account-heading">
        <div><p className="account-eyebrow">CÀI ĐẶT CÁ NHÂN</p><h1>Tài khoản của bạn</h1><p className="text-secondary">Cập nhật hồ sơ và bảo vệ tài khoản.</p></div>
        <Link className="btn btn-secondary" to="/">← Trang chủ</Link>
      </header>
      <div className="account-layout">
        <aside className="glass-card account-overview">
          <span className="account-avatar-preview" aria-hidden="true">{user?.avatar}</span>
          <h2>{user?.displayName}</h2><p className="text-secondary">@{user?.username}</p>
          <span className="badge badge-info">{isServer && user?.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}</span>
          <dl className="account-facts">
            <div><dt>Loại tài khoản</dt><dd>{isServer ? 'Trực tuyến' : 'Trên trình duyệt này'}</dd></div>
            <div><dt>Bài đã làm</dt><dd>{stats.totalQuizzes}</dd></div>
            <div><dt>Điểm cao nhất</dt><dd>{stats.bestScore}%</dd></div>
            {user?.createdAt && <div><dt>Ngày tham gia</dt><dd>{new Date(user.createdAt).toLocaleDateString('vi-VN')}</dd></div>}
          </dl>
          {!isServer && <p className="account-hint">Hồ sơ và mật khẩu này chỉ áp dụng trên trình duyệt hiện tại.</p>}
          {isServer && user?.role === 'admin' && <Link to="/admin/accounts" className="btn btn-secondary">Quản lý tài khoản →</Link>}
          {!isServer && <Link to="/admin/accounts" className="btn btn-ghost">Thông tin quản trị hệ thống</Link>}
        </aside>
        <div className="account-forms">
          <form className="glass-card account-form" onSubmit={saveProfile}>
            <h2>Thông tin cá nhân</h2>
            <label className="account-field">Tên đăng nhập<input className="input" value={user?.username || ''} readOnly autoComplete="username" /><span className="account-hint">Tên đăng nhập được giữ cố định để nhận diện tài khoản.</span></label>
            <label className="account-field">Tên hiển thị<input className="input" value={displayName} maxLength={100} required onChange={(event) => { setDisplayName(event.target.value); setProfileMessage(''); }} autoComplete="nickname" /></label>
            <fieldset className="account-avatar-picker"><legend>Ảnh đại diện</legend><div className="account-avatar-grid">{AVATARS.map((item, index) => <label key={item} className={`account-avatar-choice ${avatar === item ? 'selected' : ''}`}><input type="radio" name="avatar" value={item} checked={avatar === item} onChange={() => { setAvatar(item); setProfileMessage(''); }} aria-label={`Ảnh đại diện ${index + 1}: ${item}`} /><span aria-hidden="true">{item}</span></label>)}</div></fieldset>
            {profileError && <p className="account-message error" role="alert">{profileError}</p>}
            {profileMessage && <p className="account-message success" role="status">{profileMessage}</p>}
            <div className="account-form-footer"><button className="btn btn-primary" disabled={Boolean(busy) || !changed}>{busy === 'profile' ? 'Đang lưu…' : 'Lưu hồ sơ'}</button></div>
          </form>
          <form className="glass-card account-form" onSubmit={savePassword}>
            <h2>Đổi mật khẩu</h2><p className="account-hint">Sau khi đổi, bạn cần đăng nhập lại. Bộ đề và lịch sử làm bài vẫn được giữ.</p>
            <input className="sr-only" autoComplete="username" value={user?.username || ''} readOnly aria-label="Tên đăng nhập đổi mật khẩu" />
            <label className="account-field">Mật khẩu hiện tại<input type="password" className="input" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required autoComplete="current-password" maxLength={128} /></label>
            <label className="account-field">Mật khẩu mới<input type="password" className="input" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} maxLength={128} autoComplete="new-password" /><span className="account-hint">Từ 8 đến 128 ký tự. Có thể dùng một cụm từ dễ nhớ.</span></label>
            <label className="account-field">Nhập lại mật khẩu mới<input type="password" className="input" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} maxLength={128} autoComplete="new-password" /></label>
            {passwordError && <p className="account-message error" role="alert">{passwordError}</p>}
            <div className="account-form-footer"><button className="btn btn-primary" disabled={Boolean(busy)}>{busy === 'password' ? 'Đang đổi…' : 'Đổi mật khẩu'}</button></div>
          </form>
        </div>
      </div>
    </div></div>
  );
}
