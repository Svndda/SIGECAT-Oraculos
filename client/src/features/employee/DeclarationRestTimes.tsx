import { useEffect, useState } from 'react';
import {
  Box, Paper, Stack, Typography, TextField, MenuItem, Button, IconButton, Chip,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useLocation } from 'react-router-dom';
import {
  restTimeService,
  REST_TYPES,
  REST_TIME_MAX_MINUTES,
  type RestType,
} from '../../services/restTimeService';
import { declarationService } from '../../services/declarationsService';
import { type ServiceError } from '../../services/common';
import { useSnackbar } from '../../context/SnackbarContext';

interface DeclaredRestTime {
  id: string;
  restType: RestType;
  totalMinutes: number;
}

const REST_TYPE_LABELS: Record<RestType, string> = {
  Breakfast: 'Desayuno',
  Coffee: 'Café',
  Dinner: 'Cena',
  Lunch: 'Almuerzo',
};

function formatHM(total: number): string {
  if (total <= 0) return '0 min';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m > 0) return `${h} h ${m} min`;
  return h > 0 ? `${h} h` : `${m} min`;
}

interface DeclarationRestTimesProps {
  onDataChange?: () => void;
}

export default function DeclarationRestTimes({ onDataChange }: DeclarationRestTimesProps) {
  const location = useLocation();
  const snackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [declarationId, setDeclarationId] = useState<string | null>(null);

  const [restTimes, setRestTimes] = useState<DeclaredRestTime[]>([]);

  const [restType, setRestType] = useState<RestType | ''>('');
  const [durationHours, setDurationHours] = useState<string | number>('');
  const [durationMinutes, setDurationMinutes] = useState<string | number>('');

  const [errors, setErrors] = useState<{
    restType?: string;
    time?: string
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stateId = (location.state as { declarationId?: string } | null)?.declarationId;
        let declId = stateId ?? null;
        if (!declId) {
          const incomplete = await declarationService.checkIncomplete();
          declId = incomplete.has_incomplete ? incomplete.declaration_id ?? null : null;
        }
        if (!declId) {
          if (active) setLoading(false);
          return;
        }

        const [, existing] = await Promise.all([
          declarationService.getDeclarationById(declId),
          restTimeService.getRestTimesByDeclaration(declId),
        ]);
        if (!active) return;

        setDeclarationId(declId);
        setRestTimes(
          existing.map((r) => ({
            id: r.rest_time_id,
            restType: r.rest_type,
            totalMinutes: r.duration_minutes,
          })),
        );
      } catch (error) {
        if (active) snackbar.error((error as ServiceError).message ?? 'Error al cargar los tiempos de descanso.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [location.state, snackbar]);

  const totalInputMinutes = (Number(durationHours) || 0) * 60 + (Number(durationMinutes) || 0);

  const validate = (): boolean => {
    const next: { restType?: string; time?: string } = {};
    if (!restType) {
      next.restType = 'Seleccione el tipo de descanso.';
    }

    if (totalInputMinutes <= 0) {
      next.time = 'Debe indicar una duración mayor a 0.';
    } else if (restType && totalInputMinutes > REST_TIME_MAX_MINUTES[restType]) {
      next.time = `La duración de '${REST_TYPE_LABELS[restType]}' no puede exceder ${REST_TIME_MAX_MINUTES[restType]} min.`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleAdd = async () => {
    if (!validate() || !declarationId || !restType) return;
    setIsSubmitting(true);
    try {
      const created = await restTimeService.createRestTime({
        declaration_id: declarationId,
        rest_type: restType,
        duration_minutes: totalInputMinutes,
      });
      setRestTimes((prev) => [
        ...prev,
        {
          id: created.rest_time_id,
          restType: created.rest_type,
          totalMinutes: totalInputMinutes,
        },
      ]);
      setRestType('');
      setDurationHours('');
      setDurationMinutes('');
      setErrors({});
      snackbar.success('Tiempo de descanso registrado correctamente.');
      onDataChange?.();
    } catch (error) {
      snackbar.error((error as ServiceError).message ?? 'Error del servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await restTimeService.deleteRestTime(id);
      setRestTimes((prev) => prev.filter((r) => r.id !== id));
      snackbar.success('Tiempo de descanso eliminado.');
      onDataChange?.();
    } catch (error) {
      snackbar.error((error as ServiceError).message ?? 'No se pudo eliminar el tiempo de descanso.');
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3, mb: 4, backgroundColor: '#f9f9fd', display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 4, backgroundColor: '#f9f9fd' }}>
      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: '#12457d' }}>
        Tiempos de descanso
      </Typography>

      {!declarationId ? (
        <Typography variant="body2" color="text.secondary">
          No hay una declaración activa. Iniciá la declaración desde el formulario del cargo para registrar tiempos de descanso.
        </Typography>
      ) : (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 1 }} alignItems="flex-start">
            <TextField
              select
              label="Tipo de descanso"
              value={restType}
              onChange={(e) => {
                setRestType(e.target.value as RestType);
                if (errors.restType) setErrors((p) => ({ ...p, restType: undefined }));
              }}
              error={!!errors.restType}
              helperText={errors.restType}
              size="small"
              sx={{ flex: 1, minWidth: { xs: '100%', sm: 220 }, backgroundColor: 'white' }}
            >
              {REST_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {REST_TYPE_LABELS[t]} (máx. {REST_TIME_MAX_MINUTES[t]} min)
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Horas"
              type="number"
              value={durationHours}
              onChange={(e) => {
                setDurationHours(e.target.value);
                if (errors.time) setErrors((p) => ({ ...p, time: undefined }));
              }}
              error={!!errors.time}
              size="small"
              inputProps={{ min: 0 }}
              sx={{ width: { xs: '100%', sm: 100 }, backgroundColor: 'white' }}
            />

            <TextField
              label="Minutos"
              type="number"
              value={durationMinutes}
              onChange={(e) => {
                setDurationMinutes(e.target.value);
                if (errors.time) setErrors((p) => ({ ...p, time: undefined }));
              }}
              error={!!errors.time}
              helperText={errors.time}
              size="small"
              inputProps={{ min: 0, max: 59 }}
              sx={{ width: { xs: '100%', sm: 100 }, backgroundColor: 'white' }}
            />

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              disabled={isSubmitting}
              sx={{ backgroundColor: '#2c2c2c', '&:hover': { backgroundColor: '#1a1a1a' }, minWidth: 120 }}
            >
              Agregar
            </Button>
          </Stack>

          {totalInputMinutes > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Total: {formatHM(totalInputMinutes)}
              {restType && ` (máx. ${REST_TIME_MAX_MINUTES[restType]} min)`}
            </Typography>
          )}

          {restTimes.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              No has registrado tiempos de descanso.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {restTimes.map((r) => (
                <Box
                  key={r.id}
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    backgroundColor: 'white', borderRadius: 1, px: 2, py: 1
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography>{REST_TYPE_LABELS[r.restType]}</Typography>
                    <Chip label={formatHM(r.totalMinutes)} size="small" variant="outlined" />
                  </Box>
                  <IconButton size="small" onClick={() => remove(r.id)} aria-label="Eliminar tiempo de descanso" sx={{ color: '#d32f2f' }}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          )}
        </>
      )}
    </Paper>
  );
}