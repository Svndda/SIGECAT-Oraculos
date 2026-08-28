import {
  Container,
  Box,
  Button,
  Typography,
  Stack,
  Alert,
  CircularProgress,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { declarationService } from '../../services/declarationsService';
import { restTimeService } from '../../services/restTimeService';
import { licenseService } from '../../services/licenseService';
import { type ServiceError } from '../../services/common';
import DeclarationLicenses from '../../features/employee/DeclarationLicenses';
import DeclarationRestTimes from '../../features/employee/DeclarationRestTimes';
import { useSnackbar } from '../../context/SnackbarContext';
import { calcTotalDeclaredHours, calcWeeklyShiftHours, sumDurationsInHours } from '../../utils/declarationExport';

export default function AdditionalInformationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const snackbar = useSnackbar();

  const [declarationId, setDeclarationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [justification, setJustification] = useState('');
  const [justificationRequired, setJustificationRequired] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ justification?: string; }>({});
  const [isSaving, setIsSaving] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = async (id: string) => {
    const [decl, lic, rest] = await Promise.all([
      declarationService.getDeclarationById(id),
      licenseService.getLicensesByDeclaration(id),
      restTimeService.getRestTimesByDeclaration(id),
    ]);

    const shiftStart = decl.shift_starts_at;
    const shiftEnd = decl.shift_ends_at;
    const weeklyShiftHours = calcWeeklyShiftHours(shiftStart, shiftEnd);

    const functionHours = calcTotalDeclaredHours(decl.job_functions || []);
    const licenseHours = sumDurationsInHours(lic);
    const restHours = sumDurationsInHours(rest);
    const totalReportedHours = functionHours + licenseHours + restHours;

    const required = totalReportedHours > weeklyShiftHours;

    setJustificationRequired(required);
    if (!required) {
      setJustification('');
      setValidationErrors({});
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stateId = (location.state as { declarationId?: string } | null)?.declarationId;
        let id = stateId ?? null;
        if (!id) {
          const incomplete = await declarationService.checkIncomplete();
          id = incomplete.has_incomplete ? incomplete.declaration_id ?? null : null;
        }
        if (!id) {
          if (active) setError('No se encontró una declaración activa.');
          setLoading(false);
          return;
        }

        setDeclarationId(id);
        await loadData(id);
        setLoading(false);
      } catch (err) {
        if (active) {
          setError((err as ServiceError).message ?? 'Error al cargar la información.');
          setLoading(false);
        }
      }
    })();
    return () => { active = false; };
  }, [location.state, refreshKey]);

  const handleDataChange = () => {
    if (declarationId) {
      setRefreshKey((prev) => prev + 1);
    }
  };

  const validate = (): boolean => {
    const errors: { justification?: string } = {};
    if (justificationRequired && !justification.trim()) {
      errors.justification = 'La justificación es obligatoria cuando se usa tiempo adicional a la jornada.';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleComplete = async () => {
    if (!declarationId) {
      snackbar.error('No se encontró la declaración.');
      return;
    }
    if (!validate()) {
      snackbar.error('Corrija los errores antes de continuar.');
      return;
    }

    setIsSaving(true);
    try {
      if (justification.trim()) {
        await declarationService.updateJustification(declarationId, {
          justification: justification.trim(),
        });
      }
      await declarationService.changeStatus(declarationId, { status: 'Completed' });
      snackbar.success('Declaración completada exitosamente.');
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      snackbar.error((err as ServiceError).message ?? 'Error al completar la declaración.');
    } finally {
      setIsSaving(false);
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

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Alert severity="error">{error}</Alert>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/work-hours')} sx={{ mt: 2 }}>
            Volver
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 'bold', color: '#12457d', textAlign: 'center' }}>
          Información Adicional
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 4, color: '#666', textAlign: 'center' }}>
          Permisos, licencias y tiempos de descanso
        </Typography>

        {justificationRequired && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Se requiere justificación porque la suma de tiempos excede la jornada laboral semanal.
            Debes indicar si tu jefatura inmediata tiene conocimiento de este tiempo adicional.
          </Alert>
        )}

        <DeclarationLicenses onDataChange={handleDataChange} />
        <DeclarationRestTimes onDataChange={handleDataChange} />

        {justificationRequired && (
          <Box sx={{ mt: 4 }}>
            <TextField
              label="Justificación (tiempo adicional a la jornada)"
              multiline
              rows={4}
              fullWidth
              value={justification}
              onChange={(e) => {
                setJustification(e.target.value);
                if (validationErrors.justification) {
                  setValidationErrors({});
                }
              }}
              error={!!validationErrors.justification}
              helperText={
                validationErrors.justification ||
                'Indique si la jefatura inmediata tiene conocimiento de que utiliza tiempo adicional a su jornada laboral semanal.'
              }
              required
            />
          </Box>
        )}

        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={2} sx={{ justifyContent: 'center', mt: 4 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/work-hours')} sx={{ color: '#12457d', borderColor: '#12457d' }}>
            Atrás
          </Button>
          <Button
            variant="contained"
            endIcon={<CheckCircleIcon />}
            onClick={handleComplete}
            disabled={isSaving || (justificationRequired && !justification.trim())}
            sx={{ backgroundColor: '#2c2c2c', '&:hover': { backgroundColor: '#1a1a1a' } }}
          >
            {isSaving ? 'Guardando...' : 'Completar'}
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}