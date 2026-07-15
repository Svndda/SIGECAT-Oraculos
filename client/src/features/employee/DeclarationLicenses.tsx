import { useEffect, useState } from 'react';
import {
  Box, Paper, Stack, Typography, TextField, MenuItem, Button, IconButton, Chip,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useLocation } from 'react-router-dom';
import { employeeLicenseService, type LicenseType } from '../../services/employeeLicenseService';
import { licenseService } from '../../services/licenseService';
import { declarationService } from '../../services/declarationsService';
import { type ServiceError } from '../../services/common';
import { useSnackbar } from '../../context/SnackbarContext';

interface DeclaredLicense {
  id: string;
  typeId: string;
  typeName: string;
  totalMinutes: number;
}

function formatHM(total: number): string {
  if (total <= 0) return '0 min';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m > 0) return `${h} h ${m} min`;
  return h > 0 ? `${h} h` : `${m} min`;
}

interface DeclarationLicensesProps {
  onDataChange?: () => void;
}

export default function DeclarationLicenses({ onDataChange }: DeclarationLicensesProps) {
  const location = useLocation();
  const snackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [declarationId, setDeclarationId] = useState<string | null>(null);

  const [types, setTypes] = useState<LicenseType[]>([]);
  const [licenses, setLicenses] = useState<DeclaredLicense[]>([]);

  const [typeId, setTypeId] = useState('');
  const [durationHours, setDurationHours] = useState<string | number>('');
  const [durationMinutes, setDurationMinutes] = useState<string | number>('');
  const [errors, setErrors] = useState<{ typeId?: string; time?: string }>({});
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

        const [, typeList, existing] = await Promise.all([
          declarationService.getDeclarationById(declId),
          employeeLicenseService.getLicenseTypes(),
          licenseService.getLicensesByDeclaration(declId),
        ]);
        if (!active) return;

        setDeclarationId(declId);
        setTypes(typeList);
        setLicenses(
          existing.map((l) => ({
            id: l.license_time_id,
            typeId: l.license_type_id,
            typeName: l.license_type_name ?? l.license_type_id,
            totalMinutes: l.duration_minutes,
          })),
        );
      } catch (error) {
        if (active) snackbar.error((error as ServiceError).message ?? 'Error al cargar las licencias.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [location.state, snackbar]);

  const totalInputMinutes = (Number(durationHours) || 0) * 60 + (Number(durationMinutes) || 0);

  const validate = (): boolean => {
    const next: { typeId?: string; time?: string } = {};
    if (!typeId) next.typeId = 'Seleccione el tipo de permiso/licencia.';
    if (totalInputMinutes <= 0) {
      next.time = 'Debe indicar una duración mayor a 0.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleAdd = async () => {
    if (!validate() || !declarationId) return;
    setIsSubmitting(true);
    try {
      const created = await licenseService.createLicense({
        declaration_id: declarationId,
        license_type_id: typeId,
        duration_minutes: totalInputMinutes,
      });
      const type = types.find((t) => t.id === typeId);
      setLicenses((prev) => [
        ...prev,
        {
          id: created.license_time_id,
          typeId,
          typeName: created.license_type_name ?? type?.name ?? typeId,
          totalMinutes: totalInputMinutes,
        },
      ]);
      setTypeId('');
      setDurationHours('');
      setDurationMinutes('');
      setErrors({});
      snackbar.success('Permiso/licencia registrado correctamente.');
      onDataChange?.();
    } catch (error) {
      snackbar.error((error as ServiceError).message ?? 'Error del servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await licenseService.deleteLicense(id);
      setLicenses((prev) => prev.filter((l) => l.id !== id));
      snackbar.success('Permiso/licencia eliminado.');
      onDataChange?.();
    } catch (error) {
      snackbar.error((error as ServiceError).message ?? 'No se pudo eliminar la licencia.');
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
        Permisos y licencias
      </Typography>

      {!declarationId ? (
        <Typography variant="body2" color="text.secondary">
          No hay una declaración activa. Iniciá la declaración desde el formulario del cargo para registrar permisos o licencias.
        </Typography>
      ) : (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 1 }} alignItems="flex-start">
            <TextField
              select
              label="Tipo de permiso/licencia"
              value={typeId}
              onChange={(e) => {
                setTypeId(e.target.value);
                if (errors.typeId) setErrors((p) => ({ ...p, typeId: undefined }));
              }}
              error={!!errors.typeId}
              helperText={errors.typeId}
              size="small"
              sx={{ flex: 1, minWidth: { xs: '100%', sm: 220 }, backgroundColor: 'white' }}
            >
              {types.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
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
              Duración: {formatHM(totalInputMinutes)}
            </Typography>
          )}

          {licenses.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              No has registrado permisos ni licencias.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {licenses.map((l) => (
                <Box
                  key={l.id}
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    backgroundColor: 'white', borderRadius: 1, px: 2, py: 1
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography>{l.typeName}</Typography>
                    <Chip label={formatHM(l.totalMinutes)} size="small" variant="outlined" />
                  </Box>
                  <IconButton size="small" onClick={() => remove(l.id)} aria-label="Eliminar licencia" sx={{ color: '#d32f2f' }}>
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