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
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { userService } from '../../services/userService.ts';
import { authService } from '../../services/authService.ts';
import type { ServiceError } from '../../services/common.ts';
import { useSnackbar } from '../../context/SnackbarContext';
import { validatePassword } from '../../utils/validation.ts';
import PasswordStrengthFeedback from '../../components/PasswordStrengthFeedback.tsx';

export default function SettingsPage() {
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [profileInfo, setProfileInfo] = useState({
    first_name: '',
    last_name: '',
    email: '',
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const snackbar = useSnackbar();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await userService.getProfile();
        setProfileInfo({
          first_name: profile.first_name,
          last_name: [profile.first_last_name, profile.second_last_name]
            .filter(Boolean)
            .join(' '),
          email: profile.email,
        });
      } catch (err) {
        const serviceError = err as ServiceError;
        snackbar.error(serviceError.message ?? 'No se pudo cargar el perfil.');
      } finally {
        setLoadingInitial(false);
      }
    };
    loadProfile();
  }, [snackbar]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const passwordsMatch =
    passwords.confirmPassword === '' ||
    passwords.newPassword === passwords.confirmPassword;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      snackbar.error('Todos los campos de contraseña son requeridos.');
      return;
    }

    const pwdError = validatePassword(passwords.newPassword);
    if (pwdError) {
      snackbar.error(pwdError);
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      snackbar.error('Las contraseñas nuevas no coinciden.');
      return;
    }

    setIsSubmittingPassword(true);
    try {
      await authService.changePassword(passwords.currentPassword, passwords.newPassword);
      snackbar.success('Su contraseña ha sido cambiada de forma segura.');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const serviceError = err as ServiceError;
      snackbar.error(serviceError.message ?? 'Error al cambiar la contraseña.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const eyeButton = (show: boolean, setShow: (v: boolean) => void, label: string) => (
    <InputAdornment position="end">
      <IconButton
        size="small"
        onClick={() => setShow(!show)}
        edge="end"
        aria-label={show ? `Ocultar ${label}` : `Mostrar ${label}`}
      >
        {show ? <VisibilityOff /> : <Visibility />}
      </IconButton>
    </InputAdornment>
  );

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
          Revise su información personal y gestione sus credenciales de acceso.
        </Typography>

        <Stack spacing={4}>
          <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, border: '1px solid #ebebeb', borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 3, color: '#12457d' }}>
              Información Personal
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: '#12457d' }}>Nombre</Typography>
                <Typography variant="body1" sx={{ color: '#1a1a1a' }}>{profileInfo.first_name}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: '#12457d' }}>Apellidos</Typography>
                <Typography variant="body1" sx={{ color: '#1a1a1a' }}>{profileInfo.last_name}</Typography>
              </Grid>
              <Grid size={12}>
                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: '#12457d' }}>Correo Institucional</Typography>
                <Typography variant="body1" sx={{ color: '#1a1a1a' }}>{profileInfo.email}</Typography>
              </Grid>
            </Grid>
          </Paper>

          <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, border: '1px solid #ebebeb', borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 3, color: '#12457d' }}>
              Seguridad de la Cuenta
            </Typography>
            <Box component="form" onSubmit={handlePasswordSubmit} noValidate>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: '#12457d' }}>Contraseña Actual</Typography>
                  <TextField
                    fullWidth
                    type={showCurrent ? 'text' : 'password'}
                    size="small"
                    name="currentPassword"
                    value={passwords.currentPassword}
                    onChange={handlePasswordChange}
                    slotProps={{ input: { endAdornment: eyeButton(showCurrent, setShowCurrent, 'contraseña actual') } }}
                  />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: '#12457d' }}>Nueva Contraseña</Typography>
                  <TextField
                    fullWidth
                    type={showNew ? 'text' : 'password'}
                    size="small"
                    name="newPassword"
                    value={passwords.newPassword}
                    onChange={handlePasswordChange}
                    slotProps={{ input: { endAdornment: eyeButton(showNew, setShowNew, 'nueva contraseña') } }}
                  />
                  <PasswordStrengthFeedback password={passwords.newPassword} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: '#12457d' }}>Confirmar Nueva Contraseña</Typography>
                  <TextField
                    fullWidth
                    type={showConfirm ? 'text' : 'password'}
                    size="small"
                    name="confirmPassword"
                    value={passwords.confirmPassword}
                    onChange={handlePasswordChange}
                    error={!passwordsMatch}
                    helperText={!passwordsMatch ? 'Las contraseñas no coinciden.' : undefined}
                    slotProps={{ input: { endAdornment: eyeButton(showConfirm, setShowConfirm, 'confirmación de contraseña') } }}
                  />
                </Box>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmittingPassword}
                  sx={{ backgroundColor: '#2c2c2c', '&:hover': { backgroundColor: '#1a1a1a' }, alignSelf: 'flex-start' }}
                >
                  {isSubmittingPassword ? <CircularProgress size={22} sx={{ color: 'white' }} /> : 'Cambiar Contraseña'}
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Stack>
      </Box>
    </Container>
  );
}
