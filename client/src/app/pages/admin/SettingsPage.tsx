import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Stack,
  CircularProgress,
  Grid,
} from '@mui/material';
import { jobPositionService } from '../../../services/jobPositionService';
import { userService, type UpdateProfilePayload } from '../../../services/userService';
import { authService } from '../../../services/authService';
import type { ServiceError } from '../../../services/common';
import ModalError from '../../../components/modals/ModalError';
import ModalSuccess from '../../../components/modals/ModalSuccess';
import { validateInstitutionalEmail } from '../../../utils/validation';

// Función para dividir "Juan Carlos" → { first_name: "Juan", second_name: "Carlos" }
const splitFullName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  return {
    first_name: parts[0] || '',
    second_name: parts.slice(1).join(' ') || '',
  };
};

// Dividir "González Pérez" → { first_last_name: "González", second_last_name: "Pérez" }
const splitFullLastName = (fullLastName: string) => {
  const parts = fullLastName.trim().split(/\s+/);
  return {
    first_last_name: parts[0] || '',
    second_last_name: parts.slice(1).join(' ') || '',
  };
};

export default function SettingsPage() {
  const [loadingInitial, setLoadingInitial] = useState(true);
  
  // Estados para Información Personal
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    second_name: '',
    first_last_name: '',
    second_last_name: '',
    email: '',
  });
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  // Estados para Número de Plaza
  const [plazaNumber, setPlazaNumber] = useState('');
  const [isSubmittingPlaza, setIsSubmittingPlaza] = useState(false);

  // Estados para Contraseña
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Modales y Errores
  const [modalError, setModalError] = useState({ open: false, title: '', message: '' });
  const [modalSuccess, setModalSuccess] = useState({ open: false, title: '', message: '' });

  // Cargar perfil al inicio
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await userService.getProfile();
        // Descomponer el nombre completo y apellidos completos
        const { first_name, second_name } = splitFullName(profile.first_name);
        const { first_last_name, second_last_name } = splitFullLastName(profile.last_name);
        setProfileForm({
          first_name,
          second_name,
          first_last_name,
          second_last_name,
          email: profile.email,
        });
      } catch (err) {
        const serviceError = err as ServiceError;
        setModalError({ open: true, title: 'Error', message: serviceError.message ?? 'No se pudo cargar el perfil.' });
      } finally {
        setLoadingInitial(false);
      }
    };
    loadProfile();
  }, []);

  // Handlers de Información Personal
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.first_name.trim() || !profileForm.first_last_name.trim() || !profileForm.second_last_name.trim()) {
       setModalError({ open: true, title: 'Validación', message: 'Los nombres y apellidos son requeridos.' });
       return;
    }
    const emailErr = validateInstitutionalEmail(profileForm.email);
    if (emailErr) {
       setModalError({ open: true, title: 'Validación', message: emailErr });
       return;
    }

    setIsSubmittingProfile(true);
    try {
      const payload: UpdateProfilePayload = {
        first_name: profileForm.first_name,
        second_name: profileForm.second_name || undefined,
        first_last_name: profileForm.first_last_name,
        second_last_name: profileForm.second_last_name,
        email: profileForm.email,
      };
      await userService.updateProfile(payload);
      setModalSuccess({ open: true, title: 'Perfil actualizado', message: 'Su información personal ha sido actualizada correctamente.' });
    } catch (err) {
      const serviceError = err as ServiceError;
      setModalError({ open: true, title: 'Error al actualizar perfil', message: serviceError.message ?? 'Error del servidor.' });
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  // Handlers de Número de Plaza
  const handlePlazaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plazaNumber.trim()) {
      setModalError({ open: true, title: 'Validación', message: 'El número de plaza es requerido.' });
      return;
    }
    setIsSubmittingPlaza(true);
    try {
      await jobPositionService.updateJobPosition(plazaNumber);
      setModalSuccess({ open: true, title: 'Número de plaza actualizado', message: 'Su número de plaza ha sido actualizado correctamente.' });
      setPlazaNumber('');
    } catch (err) {
      const serviceError = err as ServiceError;
      setModalError({ open: true, title: 'Error al actualizar', message: serviceError.message ?? 'Error del servidor.' });
    } finally {
      setIsSubmittingPlaza(false);
    }
  };

  // Handlers de Contraseña
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      setModalError({ open: true, title: 'Validación', message: 'Todos los campos de contraseña son requeridos.' });
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setModalError({ open: true, title: 'Validación', message: 'Las contraseñas nuevas no coinciden.' });
      return;
    }
    
    setIsSubmittingPassword(true);
    try {
      await authService.changePassword(passwords.currentPassword, passwords.newPassword);
      setModalSuccess({ open: true, title: 'Contraseña actualizada', message: 'Su contraseña ha sido cambiada de forma segura.' });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const serviceError = err as ServiceError;
      setModalError({ open: true, title: 'Error de seguridad', message: serviceError.message ?? 'Error al cambiar la contraseña.' });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  if (loadingInitial) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 1, color: '#1a1a1a' }}>
          Ajustes de Cuenta
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Administre su información personal, credenciales de acceso y asignaciones.
        </Typography>

        <Stack spacing={4}>
          <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, border: '1px solid #ebebeb', borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 3, color: '#12457d' }}>
              Información Personal
            </Typography>
            <Box component="form" onSubmit={handleProfileSubmit} noValidate>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: '#12457d' }}>Primer Nombre</Typography>
                  <TextField fullWidth size="small" name="first_name" value={profileForm.first_name} onChange={handleProfileChange} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: '#12457d' }}>Segundo Nombre</Typography>
                  <TextField fullWidth size="small" name="second_name" value={profileForm.second_name} onChange={handleProfileChange} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: '#12457d' }}>Primer Apellido</Typography>
                  <TextField fullWidth size="small" name="first_last_name" value={profileForm.first_last_name} onChange={handleProfileChange} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: '#12457d' }}>Segundo Apellido</Typography>
                  <TextField fullWidth size="small" name="second_last_name" value={profileForm.second_last_name} onChange={handleProfileChange} />
                </Grid>
                <Grid size={12}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: '#12457d' }}>Correo Institucional</Typography>
                  <TextField fullWidth size="small" name="email" type="email" value={profileForm.email} onChange={handleProfileChange} />
                </Grid>
              </Grid>
              <Button type="submit" variant="contained" disabled={isSubmittingProfile} sx={{ mt: 3, backgroundColor: '#2c2c2c', '&:hover': { backgroundColor: '#1a1a1a' } }}>
                {isSubmittingProfile ? <CircularProgress size={22} sx={{ color: 'white' }} /> : 'Guardar Información'}
              </Button>
            </Box>
          </Paper>

          <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, border: '1px solid #ebebeb', borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 3, color: '#12457d' }}>
              Asignación Laboral
            </Typography>
            <Box component="form" onSubmit={handlePlazaSubmit} noValidate>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: '#12457d' }}>Número de plaza</Typography>
                  <TextField fullWidth value={plazaNumber} onChange={(e) => setPlazaNumber(e.target.value)} placeholder="00333" size="small" />
                </Box>
                <Button type="submit" variant="contained" disabled={isSubmittingPlaza} sx={{ backgroundColor: '#2c2c2c', '&:hover': { backgroundColor: '#1a1a1a' }, alignSelf: 'flex-start' }}>
                  {isSubmittingPlaza ? <CircularProgress size={22} sx={{ color: 'white' }} /> : 'Actualizar Plaza'}
                </Button>
              </Stack>
            </Box>
          </Paper>

          <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, border: '1px solid #ebebeb', borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 3, color: '#12457d' }}>
              Seguridad de la Cuenta
            </Typography>
            <Box component="form" onSubmit={handlePasswordSubmit} noValidate>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: '#12457d' }}>Contraseña Actual</Typography>
                  <TextField fullWidth type="password" size="small" name="currentPassword" value={passwords.currentPassword} onChange={handlePasswordChange} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: '#12457d' }}>Nueva Contraseña</Typography>
                  <TextField fullWidth type="password" size="small" name="newPassword" value={passwords.newPassword} onChange={handlePasswordChange} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: '#12457d' }}>Confirmar Nueva Contraseña</Typography>
                  <TextField fullWidth type="password" size="small" name="confirmPassword" value={passwords.confirmPassword} onChange={handlePasswordChange} />
                </Box>
                <Button type="submit" variant="contained" disabled={isSubmittingPassword} sx={{ backgroundColor: '#2c2c2c', '&:hover': { backgroundColor: '#1a1a1a' }, alignSelf: 'flex-start' }}>
                  {isSubmittingPassword ? <CircularProgress size={22} sx={{ color: 'white' }} /> : 'Cambiar Contraseña'}
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Stack>
      </Box>

      <ModalError
        open={modalError.open}
        title={modalError.title}
        message={modalError.message}
        onClose={() => setModalError((p) => ({ ...p, open: false }))}
      />
      <ModalSuccess
        open={modalSuccess.open}
        title={modalSuccess.title}
        message={modalSuccess.message}
        onClose={() => setModalSuccess((p) => ({ ...p, open: false }))}
      />
    </Container>
  );
}