import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-center">
        <div className="loading-spinner">
          <span className="animate-float" style={{ fontSize: '3rem' }} role="img" aria-label="Linh vật gấu trúc">🐼</span>
          <p className="text-secondary" style={{ marginTop: '1rem' }}>Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
