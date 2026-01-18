import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { TenantList } from './pages/TenantList';
import { TenantDetail } from './pages/TenantDetail';
import { UserList } from './pages/UserList';
import { SystemSettings } from './pages/SystemSettings';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TenantProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="tenants" element={<TenantList />} />
              <Route path="tenants/:id" element={<TenantDetail />} />
              <Route path="users" element={<UserList />} />
              <Route path="settings" element={<SystemSettings />} />
            </Route>
          </Routes>
        </TenantProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
