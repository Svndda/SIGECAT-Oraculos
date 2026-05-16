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
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { authService } from '../../../services/authService';
import type { ServiceError } from '../../../services/authService';
import ModalError from '../../../components/modals/ModalError';
import ModalSuccess from '../../../components/modals/ModalSuccess';
import Header from '../../../components/Header';
import { validateInstitutionalEmail, validatePassword } from '../../../utils/validation';

export default function PasswordRecoveryPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; newPassword?: string; confirmPassword?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState({ open: false, title: '', message: '' });
  const [successOpen, setSuccessOpen] = useState(false);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    const emailError = validateInstitutionalEmail(email);
    if (emailError) newErrors.email = emailError;
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
      await authService.recoverPassword(email, newPassword);
      setSuccessOpen(true);
    } catch (error) {
      const serviceError = error as ServiceError;
      setModalError({
        open: true,
        title: 'Error al recuperar contraseña',
        message: serviceError.message ?? 'Error del servidor. Intente de nuevo más tarde.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setSuccessOpen(false);
    navigate('/login');
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5' }}>
      <Header />

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: { xs: 3, sm: 6 }, px: 2 }}>
        <Paper sx={{ p: { xs: 3, sm: 5 }, maxWidth: 440, width: '100%', borderRadius: 2, boxShadow: 3 }}>
          <Stack spacing={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" fontWeight="bold" color="#12457d">
                Recuperar Contraseña
              </Typography>
              <Typography variant="body2" color="#666" sx={{ mt: 0.5 }}>
                Ingrese su correo y establezca una nueva contraseña
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: '#12457d' }}>
                    Correo institucional
                  </Typography>
                  <TextField
                    fullWidth
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@ucr.ac.cr"
                    variant="outlined"
                    size="small"
                    error={!!errors.email}
                    helperText={errors.email}
                    sx={{ backgroundColor: 'white' }}
                  />
                </Box>

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
                    'Recuperar contraseña'
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

      <ModalError
        open={modalError.open}
        title={modalError.title}
        message={modalError.message}
        onClose={() => setModalError((prev) => ({ ...prev, open: false }))}
      />
      <ModalSuccess
        open={successOpen}
        title="Contraseña actualizada"
        message="Su contraseña ha sido actualizada exitosamente. Puede iniciar sesión con su nueva contraseña."
        onClose={handleSuccessClose}
      />
    </Box>
  );
}
