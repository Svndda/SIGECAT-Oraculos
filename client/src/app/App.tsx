import {
  BrowserRouter,
  Route,
  Routes,
} from 'react-router-dom';

import PrivateRoute from '../components/PrivateRoute';
import RoleRoute from '../components/RoleRoute.tsx';
import {AuthProvider} from '../context/AuthContext';
import {SnackbarProvider} from '../context/SnackbarContext';
import {AccessibilityProvider} from '../context/AccessibilityContext';
import MainLayout from '../layouts/MainLayout';
import AccessDeniedPage from './pages/AccessDeniedPage.tsx';
import AreasPage from './pages/admin/AreasPage.tsx';
import DepartmentsPage from './pages/admin/DepartmentsPage';
import JobsPage from './pages/admin/JobPage.tsx';
import JobPositionsPage from './pages/admin/JobPositionsPage';
import FunctionsPage from './pages/admin/FunctionsPage.tsx';
import CustomFunctionsPage from './pages/admin/CustomFunctionsPage.tsx';
import SectionsPage from './pages/admin/SectionsPage.tsx';
import UnitsPage from './pages/admin/UnitsPage';
import UsersPage from './pages/admin/UsersPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
import LoginPage from './pages/auth/LoginPage';
import PasswordRecoveryPage from './pages/auth/PasswordRecoveryPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import EmployeeDeclarationsPage from './pages/EmployeeDeclarationsPage.tsx';
import EmployeeFormPage from './pages/EmployeeFormPage';
import SettingsPage from './pages/SettingsPage.tsx';
import WorkHoursPage from './pages/WorkHoursPage';
import EmployeeRecordPage from "./pages/EmployeeRecordPage.tsx";
import DeclarationsPage from "./pages/admin/DeclarationsPage";
import LogsPage from './pages/admin/LogsPage.tsx';

function App() {
  return (
    <AuthProvider>
      <SnackbarProvider>
        <AccessibilityProvider>
        <BrowserRouter>
          <Routes>

            {/* Public routes */}
            <Route path="/login" element={<LoginPage/>}/>
            <Route path="/recuperar-contrasena"
                   element={<PasswordRecoveryPage/>}/>
            <Route path="/recuperar-contrasena/nueva"
                   element={<ResetPasswordPage/>}/>
            <Route path="/acceso_denegado" element={<AccessDeniedPage/>}/>

            {/* Protected routes */}
            <Route element={<PrivateRoute/>}>
              <Route path="/" element={<MainLayout/>}>
                <Route index element={<EmployeeDeclarationsPage/>}/>
                <Route path="declaracion-registro"
                       element={<EmployeeRecordPage/>}/>
                <Route path="employee-form" element={<EmployeeFormPage/>}/>
                <Route path="work-hours" element={<WorkHoursPage/>}/>
                <Route path="cambiar-contrasena"
                       element={<ChangePasswordPage/>}/>
                <Route path="ajustes" element={<SettingsPage/>}/>

                <Route element={<RoleRoute allowedRoles={['ADMIN']}/>}>
                  <Route path="areas" element={<AreasPage/>}/>
                  <Route path="unidades" element={<UnitsPage/>}/>
                  <Route path="secciones" element={<SectionsPage/>}/>
                  <Route path="departamentos" element={<DepartmentsPage/>}/>
                  <Route path="cargos" element={<JobsPage/>}/>
                  <Route path="funciones" element={<FunctionsPage/>}/>
                  <Route path="funciones-personalizadas"
                         element={<CustomFunctionsPage/>}/>
                  <Route path="plazas" element={<JobPositionsPage/>}/>
                  <Route path="usuarios" element={<UsersPage/>}/>
                  <Route path="declaraciones" element={<DeclarationsPage/>}/>
                  <Route path="registros" element={<LogsPage/>}/>
                </Route>
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
        </AccessibilityProvider>
      </SnackbarProvider>
    </AuthProvider>
  );
}

export default App;
