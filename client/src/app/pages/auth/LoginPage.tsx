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
import { useAuth } from '../../../context/AuthContext';
import ModalError from '../../../components/modals/ModalError';
import Header from '../../../components/Header';
import { validateInstitutionalEmail } from '../../../utils/validation';
import type { ServiceError } from '../../../services/authService';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState({ open: false, title: '', message: '' });

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    const emailError = validateInstitutionalEmail(email);
    if (emailError) newErrors.email = emailError;
    if (!password) newErrors.password = 'La contraseña es requerida.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (error) {
      const serviceError = error as ServiceError;
      setModalError({
        open: true,
        title: 'Error al iniciar sesión',
        message: serviceError.message ?? 'Error desconocido.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5' }}>
      <Header />

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6, px: 2 }}>
        <Paper sx={{ p: 5, maxWidth: 440, width: '100%', borderRadius: 2, boxShadow: 3 }}>
          <Stack spacing={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" fontWeight="bold" color="#12457d">
                Iniciar Sesión
              </Typography>
              <Typography variant="body2" color="#666" sx={{ mt: 0.5 }}>
                Sistema de Gestión de Cargas de Trabajo
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
                    autoComplete="email"
                    sx={{ backgroundColor: 'white' }}
                  />
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: '#12457d' }}>
                    Contraseña
                  </Typography>
                  <TextField
                    fullWidth
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    variant="outlined"
                    size="small"
                    error={!!errors.password}
                    helperText={errors.password}
                    autoComplete="current-password"
                    sx={{ backgroundColor: 'white' }}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
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
                    'Iniciar sesión'
                  )}
                </Button>

                <Box sx={{ textAlign: 'center' }}>
                  <Link
                    component={RouterLink}
                    to="/recuperar-contrasena"
                    variant="body2"
                    sx={{ color: '#12457d', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                  >
                    ¿Olvidó su contraseña?
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
    </Box>
  );
}
