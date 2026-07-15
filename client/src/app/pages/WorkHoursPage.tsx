import {
  Container,
  Box,
  Button,
  Typography,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { declarationService } from '../../services/declarationsService';
import type { ServiceError } from '../../services/common';
import DeclarationFunctions from '../../features/employee/DeclarationFunctions';

export default function WorkHoursPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [declarationId, setDeclarationId] = useState<string | null>(null);
  const [totalFunctionMinutes, setTotalFunctionMinutes] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        let id = (location.state as { declarationId?: string } | null)?.declarationId ?? null;
        if (!id) {
          const incomplete = await declarationService.checkIncomplete();
          id = incomplete.has_incomplete ? incomplete.declaration_id ?? null : null;
        }
        if (!id) {
          if (active) setError('No se encontró una declaración activa.');
          setLoading(false);
          return;
        }

        const decl = await declarationService.getDeclarationById(id);
        if (!active) return;

        setDeclarationId(id);
        let total = 0;
        if (decl.job_functions) {
          for (const fn of decl.job_functions) {
            total += (fn.duration_minutes || 0);
          }
        }
        setTotalFunctionMinutes(total);
        setLoading(false);
      } catch (err) {
        if (active) {
          setError((err as ServiceError).message ?? 'Error al cargar la declaración.');
          setLoading(false);
        }
      }
    })();
    return () => { active = false; };
  }, [location.state]);

  const handleContinue = () => {
    if (declarationId) {
      navigate('/additional-information', {
        state: { declarationId, totalFunctionMinutes },
      });
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={40} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 'bold', color: '#12457d', textAlign: 'center' }}>
          Cargas de Trabajo
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 4, color: '#666', textAlign: 'center' }}>
          Diagnóstico de Cargas de trabajo
        </Typography>

        <DeclarationFunctions />

        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error}
          </Alert>
        )}

        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={2} sx={{ justifyContent: 'center', mt: 4 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/employee-form')} sx={{ color: '#12457d', borderColor: '#12457d' }}>
            Atrás
          </Button>
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={handleContinue}
            disabled={!declarationId}
            sx={{ backgroundColor: '#2c2c2c', '&:hover': { backgroundColor: '#1a1a1a' } }}
          >
            Continuar
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}