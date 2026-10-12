import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import ProductsPage from './pages/ProductsPage';
import MakerPage from './pages/MakerPage';
import CheckerPage from './pages/CheckerPage';
import SuperAdminPage from './pages/SuperAdminPage';
import type { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function RoleRoute({ role, children }: { role: string; children: ReactNode }) {
  const { isAuthenticated, role: userRole } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (userRole && userRole !== role) {
    if (userRole === 'checker') return <Navigate to="/checker" replace />;
    if (userRole === 'superadmin') return <Navigate to="/admin" replace />;
    return <Navigate to="/maker" replace />;
  }
  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <>{children}</>;
  if (role === 'checker') return <Navigate to="/checker" replace />;
  if (role === 'superadmin') return <Navigate to="/admin" replace />;
  return <Navigate to="/maker" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      {/* Maker routes */}
      <Route
        path="/maker"
        element={
          <RoleRoute role="maker">
            <MakerPage />
          </RoleRoute>
        }
      />
      <Route
        path="/maker/products"
        element={
          <RoleRoute role="maker">
            <ProductsPage readOnly />
          </RoleRoute>
        }
      />
      {/* Checker routes */}
      <Route
        path="/checker"
        element={
          <RoleRoute role="checker">
            <CheckerPage />
          </RoleRoute>
        }
      />
      <Route
        path="/checker/products"
        element={
          <RoleRoute role="checker">
            <ProductsPage readOnly />
          </RoleRoute>
        }
      />
      {/* SuperAdmin routes */}
      <Route
        path="/admin"
        element={
          <RoleRoute role="superadmin">
            <SuperAdminPage />
          </RoleRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <RoleRoute role="superadmin">
            <ProductsPage />
          </RoleRoute>
        }
      />
      {/* Legacy / catch-all */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RoleRedirect />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RoleRedirect() {
  const { role } = useAuth();
  if (role === 'checker') return <Navigate to="/checker" replace />;
  if (role === 'superadmin') return <Navigate to="/admin" replace />;
  return <Navigate to="/maker" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
