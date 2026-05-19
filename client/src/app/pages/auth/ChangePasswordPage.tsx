import { useState } from 'react';
import {
  Container,
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Stack,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { authService } from '../../../services/authService';
import type { ServiceError } from '../../../services/authService';
import ModalError from '../../../components/modals/ModalError';
import ModalSuccess from '../../../components/modals/ModalSuccess';
import { validatePassword } from '../../../utils/validation';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState({ open: false, title: '', message: '' });
  const [successOpen, setSuccessOpen] = useState(false);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!currentPassword) newErrors.currentPassword = 'La contraseña actual es requerida.';
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
      await authService.changePassword(currentPassword, newPassword);
      setSuccessOpen(true);
    } catch (error) {
      const serviceError = error as ServiceError;
      const message =
        serviceError.code === 'INVALID_CREDENTIALS'
          ? 'La contraseña actual es incorrecta.'
          : 'Error del servidor. Intente de nuevo más tarde.';
      setModalError({ open: true, title: 'Error al cambiar contraseña', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setSuccessOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 'bold', color: '#12457d', textAlign: 'center' }}>
          Cambiar Contraseña
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 4, color: '#666', textAlign: 'center' }}>
          Actualice su contraseña de acceso
        </Typography>

        <Paper sx={{ p: { xs: 2.5, sm: 4 }, backgroundColor: '#f9f9fd' }}>
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: '#12457d' }}>
                  Contraseña actual
                </Typography>
                <TextField
                  fullWidth
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  variant="outlined"
                  size="small"
                  error={!!errors.currentPassword}
                  helperText={errors.currentPassword}
                  autoComplete="current-password"
                  sx={{ backgroundColor: 'white' }}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setShowCurrent(!showCurrent)}
                            edge="end"
                            aria-label={showCurrent ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          >
                            {showCurrent ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Box>

              <Box sx={{ height: '1px', bgcolor: '#e0e0e0' }} />

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
                  autoComplete="new-password"
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
                  Confirmar nueva contraseña
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
                  autoComplete="new-password"
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
                  'Cambiar contraseña'
                )}
              </Button>
            </Stack>
          </Box>
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
        message="Su contraseña ha sido cambiada exitosamente."
        onClose={handleSuccessClose}
      />
    </Container>
  );
}
