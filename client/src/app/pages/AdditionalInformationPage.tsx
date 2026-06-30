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
import {useEffect, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {declarationService} from '../../services/declarationsService';
import {restTimeService} from '../../services/restTimeService';
import {licenseService} from '../../services/licenseService';
import {type ServiceError} from '../../services/common';
import DeclarationLicenses from '../../features/employee/DeclarationLicenses';
import DeclarationRestTimes from '../../features/employee/DeclarationRestTimes';
import {useSnackbar} from '../../context/SnackbarContext';

function parseTimestamp(s: string): Date {
  let clean = s.replace('T', ' ');
  let d = new Date(clean);
  if (!isNaN(d.getTime())) return d;

  const parts = clean.trim().split(/\s+/);
  if (parts.length < 2) {
    d = new Date(s);
    if (!isNaN(d.getTime())) return d;
    throw new Error('Invalid date format');
  }

  const datePart = parts[0];
  const timePart = parts[1];
  const ampm = parts.length > 2 ? parts[2] : '';

  let day: number, month: number, year: number;

  // Parse date part (DD-MON-YYYY or YYYY-MM-DD)
  const dateSegments = datePart.split('-');
  if (dateSegments.length !== 3) throw new Error('Invalid date part');
  if (dateSegments[0].length === 4 && !isNaN(parseInt(dateSegments[0], 10))) {
    // YYYY-MM-DD
    year = parseInt(dateSegments[0], 10);
    month = parseInt(dateSegments[1], 10) - 1;
    day = parseInt(dateSegments[2], 10);
  } else {
    // DD-MON-YYYY
    day = parseInt(dateSegments[0], 10);
    const monthStr = dateSegments[1].toUpperCase();
    const MONTHS: Record<string, number> = {
      JAN: 0, ENE: 0, FEB: 1, MAR: 2, APR: 3, ABR: 3, MAY: 4, JUN: 5,
      JUL: 6, AUG: 7, AGO: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11, DIC: 11
    };
    month = MONTHS[monthStr];
    if (month === undefined) throw new Error('Invalid month');
    year = parseInt(dateSegments[2], 10);
    if (year < 100) year += 2000;
  }

  let hour: number, minute: number, second: number = 0;

  // Parse time part (HH.MM.SS... or HH:MM:SS)
  const dotParts = timePart.split('.');
  if (dotParts.length >= 3) {
    hour = parseInt(dotParts[0], 10);
    minute = parseInt(dotParts[1], 10);
    second = parseInt(dotParts[2], 10);
  } else {
    const colonParts = timePart.split(':');
    if (colonParts.length >= 3) {
      hour = parseInt(colonParts[0], 10);
      minute = parseInt(colonParts[1], 10);
      second = parseInt(colonParts[2], 10);
    } else {
      throw new Error('Invalid time format');
    }
  }

  if (ampm) {
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
  }

  return new Date(year, month, day, hour, minute, second);
}

function durationMinutes(start: string, end: string): number {
  const startDate = parseTimestamp(start);
  const endDate = parseTimestamp(end);
  return Math.round((endDate.getTime() - startDate.getTime()) / 60000);
}

function isTimeOutsideShift(time: string, shiftStart: string, shiftEnd: string): boolean {
  const t = parseTimestamp(time);
  const s = parseTimestamp(shiftStart);
  const e = parseTimestamp(shiftEnd);
  return t < s || t > e;
}

export default function AdditionalInformationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const snackbar = useSnackbar();

  const [declarationId, setDeclarationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [justification, setJustification] = useState('');
  const [justificationRequired, setJustificationRequired] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    justification?: string;
  }>({});
  const [isSaving, setIsSaving] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = async (id: string) => {
    const [decl, lic, rest] = await Promise.all([
      declarationService.getDeclarationById(id),
      licenseService.getLicensesByDeclaration(id),
      restTimeService.getRestTimesByDeclaration(id),
    ]);

    const shiftStartVal = decl.shift_starts_at;
    const shiftEndVal = decl.shift_ends_at;
    const shiftDur = durationMinutes(shiftStartVal, shiftEndVal);

    let required = false;

    for (const fn of decl.job_functions || []) {
      if (
        isTimeOutsideShift(fn.starts_at, shiftStartVal, shiftEndVal) ||
        isTimeOutsideShift(fn.ends_at, shiftStartVal, shiftEndVal)
      ) {
        required = true;
        break;
      }
    }

    const totalFunctions = (decl.job_functions || []).reduce(
      (acc, fn) => acc + durationMinutes(fn.starts_at, fn.ends_at),
      0
    );
    const totalLicenses = lic.reduce(
      (acc, l) => acc + durationMinutes(l.starts_at, l.ends_at),
      0
    );
    const totalRests = rest.reduce(
      (acc, r) => acc + durationMinutes(r.starts_at, r.ends_at),
      0
    );
    const totalAll = totalFunctions + totalLicenses + totalRests;
    if (totalAll > shiftDur) {
      required = true;
    }

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
        const stateId = (location.state as {
          declarationId?: string
        } | null)?.declarationId;
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
    return () => {
      active = false;
    };
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
      await declarationService.changeStatus(declarationId, {status: 'Completed'});
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
        <Box sx={{display: 'flex', justifyContent: 'center', py: 8}}>
          <CircularProgress size={40}/>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{py: 4}}>
          <Alert severity="error">{error}</Alert>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon/>}
            onClick={() => navigate('/work-hours')}
            sx={{mt: 2}}
          >
            Volver
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{py: 4}}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            mb: 1,
            fontWeight: 'bold',
            color: '#12457d',
            textAlign: 'center',
          }}
        >
          Información Adicional
        </Typography>
        <Typography variant="subtitle1"
                    sx={{mb: 4, color: '#666', textAlign: 'center'}}>
          Permisos, licencias y tiempos de descanso
        </Typography>

        {justificationRequired && (
          <Alert severity="warning" sx={{mb: 3}}>
            Se requiere justificación porque alguna función está fuera del
            horario de la jornada
            o la suma de tiempos excede la jornada laboral. Debes indicar si tu
            jefatura inmediata
            tiene conocimiento de este tiempo adicional.
          </Alert>
        )}

        <DeclarationLicenses onDataChange={handleDataChange}/>
        <DeclarationRestTimes onDataChange={handleDataChange}/>

        {justificationRequired && (
          <Box sx={{mt: 4}}>
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
                'Indique si la jefatura inmediata tiene conocimiento de que utiliza tiempo adicional a su jornada laboral.'
              }
              required
            />
          </Box>
        )}

        <Stack direction={{xs: 'column-reverse', sm: 'row'}} spacing={2}
               sx={{justifyContent: 'center', mt: 4}}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon/>}
            onClick={() => navigate('/work-hours')}
            sx={{color: '#12457d', borderColor: '#12457d'}}
          >
            Atrás
          </Button>
          <Button
            variant="contained"
            endIcon={<CheckCircleIcon/>}
            onClick={handleComplete}
            disabled={isSaving || (justificationRequired && !justification.trim())}
            sx={{
              backgroundColor: '#2c2c2c',
              '&:hover': {backgroundColor: '#1a1a1a'},
            }}
          >
            {isSaving ? 'Guardando...' : 'Completar'}
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}