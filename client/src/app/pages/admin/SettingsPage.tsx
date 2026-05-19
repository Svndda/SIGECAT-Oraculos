import { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Stack,
  CircularProgress,
} from '@mui/material';
import { adminService } from '../../../services/adminService';
import type { ServiceError } from '../../../services/adminService';
import ModalError from '../../../components/modals/ModalError';
import ModalSuccess from '../../../components/modals/ModalSuccess';

export default function SettingsPage() {
  const [plazaNumber, setPlazaNumber] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState({ open: false, title: '', message: '' });
  const [successOpen, setSuccessOpen] = useState(false);

  const validate = (): boolean => {
    if (!plazaNumber.trim()) {
      setError('El número de plaza es requerido.');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await adminService.updatePlaza(plazaNumber);
      setSuccessOpen(true);
    } catch (err) {
      const serviceError = err as ServiceError;
      setModalError({
        open: true,
        title: 'Error al actualizar',
        message: serviceError.message ?? 'Error del servidor. Intente de nuevo más tarde.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 4 }}>
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 1, color: '#1a1a1a' }}>
          Ajustes
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Actualice su información de perfil
        </Typography>

        <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, border: '1px solid #ebebeb', borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 3, color: '#12457d' }}>
            Número de plaza
          </Typography>
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: '#12457d' }}>
                  Número de plaza
                </Typography>
                <TextField
                  fullWidth
                  value={plazaNumber}
                  onChange={(e) => {
                    setPlazaNumber(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="00333"
                  size="small"
                  error={!!error}
                  helperText={error}
                  sx={{ backgroundColor: 'white' }}
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
                  alignSelf: 'flex-start',
                  px: 4,
                }}
              >
                {isSubmitting ? <CircularProgress size={22} sx={{ color: 'white' }} /> : 'Guardar'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Box>

      <ModalError
        open={modalError.open}
        title={modalError.title}
        message={modalError.message}
        onClose={() => setModalError((p) => ({ ...p, open: false }))}
      />
      <ModalSuccess
        open={successOpen}
        title="Número de plaza actualizado"
        message="Su número de plaza ha sido actualizado correctamente."
        onClose={() => setSuccessOpen(false)}
      />
    </Container>
  );
}
