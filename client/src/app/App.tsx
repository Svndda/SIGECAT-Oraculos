import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Screen1 from './pages/Screen1';
import Screen2 from './pages/Screen2';
import Screen3 from './pages/Screen3';
import LoginPage from './pages/auth/LoginPage';
import PasswordRecoveryPage from './pages/auth/PasswordRecoveryPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
import OrganizacionPage from './pages/admin/OrganizacionPage';
import UsuariosPage from './pages/admin/UsuariosPage';
import AjustesPage from './pages/admin/AjustesPage';
import { RecordsProvider } from '../context/RecordsContext';
import { AuthProvider } from '../context/AuthContext';
import PrivateRoute from '../components/PrivateRoute';


function App() {
  return (
    <AuthProvider>
      <RecordsProvider>
        <BrowserRouter>
          <Routes>

            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/recuperar-contrasena" element={<PasswordRecoveryPage />} />

            {/* Protected routes */}
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Screen1 />} />
                <Route path="screen2" element={<Screen2 />} />
                <Route path="screen3" element={<Screen3 />} />
                <Route path="cambiar-contrasena" element={<ChangePasswordPage />} />
                <Route path="organizacion" element={<OrganizacionPage />} />
                <Route path="usuarios" element={<UsuariosPage />} />
                <Route path="ajustes" element={<AjustesPage />} />
              </Route>
            </Route>

          </Routes>
        </BrowserRouter>
      </RecordsProvider>
    </AuthProvider>
  );
}

export default App;
