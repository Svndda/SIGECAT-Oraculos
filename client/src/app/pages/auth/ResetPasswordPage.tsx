import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Stack,
  Link,
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { authService } from '../../../services/authService';
import type { ServiceError } from '../../../services/authService';
import { tokenStorage } from '../../../services/tokenStorage';
import { useSnackbar } from '../../../context/SnackbarContext';
import Header from '../../../components/Header';
import { validatePassword } from '../../../utils/validation';
import PasswordStrengthFeedback from '../../../components/PasswordStrengthFeedback';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const snackbar = useSnackbar();

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    const pwdError = validatePassword(newPassword);
    if (pwdError) newErrors.newPassword = pwdError;
    if (!confirmPassword) newErrors.confirmPassword = 'Confirme la nueva contraseña.';
    else if (newPassword !== confirmPassword) newErrors.confirmPassword = 'Las contraseñas no coinciden.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await authService.resetPassword(token, newPassword, confirmPassword);
      // The backend already revokes every token for this user on reset; clear
      // any stale local session so this browser doesn't hold onto dead tokens.
      tokenStorage.clear();
      snackbar.success('Su contraseña ha sido actualizada exitosamente. Puede iniciar sesión con su nueva contraseña.');
      navigate('/login', { replace: true });
    } catch (error) {
      const serviceError = error as ServiceError;
      snackbar.error(serviceError.message ?? 'Error del servidor. Intente de nuevo más tarde.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5' }}>
        <Header />
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2 }}>
          <Paper sx={{ p: { xs: 3, sm: 5 }, maxWidth: 440, width: '100%', borderRadius: 2, boxShadow: 3 }}>
            <Stack spacing={2}>
              <Alert severity="error">
                El enlace de recuperación no es válido o ha expirado.
              </Alert>
              <Box sx={{ textAlign: 'center' }}>
                <Link
                  component={RouterLink}
                  to="/recuperar-contrasena"
                  variant="body2"
                  sx={{ color: '#12457d', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  Solicitar un nuevo enlace
                </Link>
              </Box>
            </Stack>
          </Paper>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5' }}>
      <Header />

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: { xs: 3, sm: 6 }, px: 2 }}>
        <Paper sx={{ p: { xs: 3, sm: 5 }, maxWidth: 440, width: '100%', borderRadius: 2, boxShadow: 3 }}>
          <Stack spacing={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" fontWeight="bold" color="#12457d">
                Nueva Contraseña
              </Typography>
              <Typography variant="body2" color="#666" sx={{ mt: 0.5 }}>
                Establezca una nueva contraseña para su cuenta.
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: '#12457d' }}>
                    Nueva contraseña
                  </Typography>
                  <TextField
                    fullWidth
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    variant="outlined"
                    size="small"
                    error={!!errors.newPassword}
                    helperText={errors.newPassword}
                    sx={{ backgroundColor: 'white' }}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => setShowNew(!showNew)}
                              edge="end"
                              aria-label={showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                              {showNew ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                  <PasswordStrengthFeedback password={newPassword} />
                  
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: '#12457d' }}>
                    Confirmar contraseña
                  </Typography>
                  <TextField
                    fullWidth
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    variant="outlined"
                    size="small"
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword}
                    sx={{ backgroundColor: 'white' }}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => setShowConfirm(!showConfirm)}
                              edge="end"
                              aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                              {showConfirm ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={isSubmitting}
                  sx={{
                    backgroundColor: '#2c2c2c',
                    '&:hover': { backgroundColor: '#1a1a1a' },
                    py: 1.2,
                    mt: 0.5,
                  }}
                >
                  {isSubmitting ? (
                    <CircularProgress size={22} sx={{ color: 'white' }} />
                  ) : (
                    'Restablecer contraseña'
                  )}
                </Button>

                <Box sx={{ textAlign: 'center' }}>
                  <Link
                    component={RouterLink}
                    to="/login"
                    variant="body2"
                    sx={{ color: '#12457d', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                  >
                    Volver al inicio de sesión
                  </Link>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
