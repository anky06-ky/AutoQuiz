export function resolveAccessChange(actorId, target, changes, activeAdminIds) {
  if (!activeAdminIds.includes(actorId)) throw new Error('Bạn không còn quyền quản trị.');
  if (!target) throw new Error('Không tìm thấy tài khoản.');
  const role = changes.role || target.role;
  const status = changes.status || target.status;
  if (!['admin', 'user'].includes(role) || !['active', 'locked'].includes(status)) throw new Error('Quyền hoặc trạng thái không hợp lệ.');
  if (actorId === target.id && (role !== 'admin' || status !== 'active')) throw new Error('Không thể tự khóa hoặc gỡ quyền admin của chính mình.');
  if (target.role === 'admin' && target.status === 'active' && (role !== 'admin' || status !== 'active') && activeAdminIds.length <= 1) throw new Error('Phải giữ ít nhất một admin đang hoạt động.');
  return { role, status };
}
