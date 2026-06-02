import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import EmployeeRecordPage from './pages/EmployeeRecordPage';
import EmployeeFormPage from './pages/EmployeeFormPage';
import WorkHoursPage from './pages/WorkHoursPage';
import LoginPage from './pages/auth/LoginPage';
import PasswordRecoveryPage from './pages/auth/PasswordRecoveryPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
import OrganizationPage from './pages/admin/OrganizationPage';
import UnitsPage from './pages/admin/UnitsPage';
import JobPositionsPage from './pages/admin/JobPositionsPage';
import UsersPage from './pages/admin/UsersPage';
import SettingsPage from './pages/admin/SettingsPage';
import { RecordsProvider } from '../context/RecordsContext';
import { AuthProvider } from '../context/AuthContext';
import PrivateRoute from '../components/PrivateRoute';
import DepartmentsPage from './pages/admin/DepartmentsPage';
import RoleRoute from "../components/RoleRoute.tsx";
import AccessDeniedPage from "./pages/AccessDeniedPage.tsx";


function App() {
  return (
    <AuthProvider>
      <RecordsProvider>
        <BrowserRouter>
          <Routes>

            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/recuperar-contrasena" element={<PasswordRecoveryPage />} />
            <Route path="/recuperar-contrasena/nueva" element={<ResetPasswordPage />} />
            <Route path="/acceso_denegado" element={<AccessDeniedPage />} />

            {/* Protected routes */}
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<EmployeeRecordPage />} />
                <Route path="employee-form" element={<EmployeeFormPage />} />
                <Route path="work-hours" element={<WorkHoursPage />} />
                <Route path="cambiar-contrasena" element={<ChangePasswordPage />} />

                <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
                  <Route path="organizacion" element={<OrganizationPage />} />
                  <Route path="unidades" element={<UnitsPage />} />
                  <Route path="departamentos" element={<DepartmentsPage />} />
                  <Route path="plazas" element={<JobPositionsPage />} />
                  <Route path="usuarios" element={<UsersPage />} />
                  <Route path="ajustes" element={<SettingsPage />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </RecordsProvider>
    </AuthProvider>
  );
}

export default App;
