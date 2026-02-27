import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import RetailerDashboard from './pages/RetailerDashboard';

// This component prevents users from seeing Login/Register if they are already logged in
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading-screen">Loading Session...</div>;

  if (user) {
    return <Navigate to={user.role === 'Admin' ? "/admin" : "/dashboard"} replace />;
  }

  return children;
};

// This component protects dashboard routes
const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading-screen">Verifying Session...</div>;

  if (!user) return <Navigate to="/login" replace />;

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'Admin' ? "/admin" : "/dashboard"} replace />;
  }

  return children;
};

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading-screen">Establishing Handshake...</div>;

  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />

      <Route path="/register" element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      } />

      <Route path="/admin/*" element={
        <ProtectedRoute role="Admin">
          <AdminDashboard />
        </ProtectedRoute>
      } />

      <Route path="/dashboard/*" element={
        <ProtectedRoute role="Customer">
          <RetailerDashboard />
        </ProtectedRoute>
      } />

      {/* Root path logic: If logged in, go to dashboard, else go to login */}
      <Route path="/" element={
        user ?
          <Navigate to={user.role === 'Admin' ? "/admin" : "/dashboard"} replace /> :
          <Navigate to="/login" replace />
      } />

      {/* 404 Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router basename='https://wholesale-order-system-ui.vercel.app/'>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
