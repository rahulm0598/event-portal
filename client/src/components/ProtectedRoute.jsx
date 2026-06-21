import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, admin = false }) {
  const { doctor } = useAuth();
  if (!doctor) return <Navigate to="/login" replace />;
  if (admin && doctor.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}
