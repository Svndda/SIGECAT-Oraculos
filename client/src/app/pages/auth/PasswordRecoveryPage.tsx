import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Stack,
  Link,
  CircularProgress,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { authService } from '../../../services/authService';
import type { ServiceError } from '../../../services/authService';
import ModalError from '../../../components/modals/ModalError';
import ModalSuccess from '../../../components/modals/ModalSuccess';
import Header from '../../../components/Header';
import { validateInstitutionalEmail } from '../../../utils/validation';

export default function PasswordRecoveryPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState({ open: false, title: '', message: '' });
  const [successOpen, setSuccessOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateInstitutionalEmail(email);
    if (err) {
      setEmailError(err);
      return;
    }
    setEmailError('');
    setIsSubmitting(true);
    try {
      await authService.requestPasswordRecovery(email);
      setSuccessOpen(true);
    } catch (error) {
      const serviceError = error as ServiceError;
      setModalError({
        open: true,
        title: 'Error al enviar solicitud',
        message: serviceError.message ?? 'Error del servidor. Intente de nuevo más tarde.',
      });
    } finally {
      setIsSubmitting(false);
    }
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
                Ingrese su correo institucional y le enviaremos un enlace para restablecer su contraseña.
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
                    error={!!emailError}
                    helperText={emailError}
                    sx={{ backgroundColor: 'white' }}
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
                    'Enviar instrucciones'
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
        title="Correo enviado"
        message="Si su correo está registrado, recibirá un enlace para restablecer su contraseña. Revise su bandeja de entrada."
        onClose={() => setSuccessOpen(false)}
      />
    </Box>
  );
}
