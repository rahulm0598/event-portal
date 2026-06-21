import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

import Events from './pages/Events.jsx';
import EventDetail from './pages/EventDetail.jsx';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import Scanner from './pages/Scanner.jsx';
import Checkin from './pages/Checkin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AllRegistrations from './pages/AllRegistrations.jsx';

export default function App() {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="grid h-screen place-items-center bg-ink text-slate-500">
        <div className="animate-pulse text-sm tracking-widest">LOADING…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Events />} />
        <Route path="/events/:id" element={<Wrap><EventDetail /></Wrap>} />
        <Route path="/register/:token" element={<Register />} />
        <Route path="/login" element={<Wrap><Login /></Wrap>} />
        <Route path="/checkin/:token" element={<Checkin />} />
        <Route path="/scan" element={<ProtectedRoute admin><Wrap><Scanner /></Wrap></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute admin><Wrap><AdminDashboard /></Wrap></ProtectedRoute>} />
        <Route path="/admin/registrations" element={<ProtectedRoute admin><Wrap><AllRegistrations /></Wrap></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ErrorBoundary>
    </div>
  );
}

function Wrap({ children }) {
  return <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>;
}
