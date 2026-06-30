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
import { formatDateForBackend, parseOracleToTimeInput, type ServiceError } from '../../services/common';
import { useSnackbar } from '../../context/SnackbarContext';

/** A permit/license the employee added to their declaration (one LICENSE_TIMES row). */
interface DeclaredLicense {
  id: string;
  typeId: string;
  typeName: string;
  totalMinutes: number;
  /** End of this license's stored range, used to stack the next one without overlapping. */
  endDate: Date;
}

/** Parses a canonical 'YYYY-MM-DD HH:MM:SS' timestamp (as returned by /license). */
function parseCanonical(s: string): Date {
  return new Date(s.replace(' ', 'T'));
}

const MONTHS: Record<string, number> = {
  JAN: 1, ENE: 1, FEB: 2, MAR: 3, APR: 4, ABR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, AGO: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12, DIC: 12,
};
const pad = (n: number) => String(n).padStart(2, '0');

function oracleDateOnly(oracleStr: string | null | undefined): string {
  if (!oracleStr) return '';
  const datePart = oracleStr.trim().toUpperCase().split(/\s+/)[0];
  const [dd, mon, yy] = datePart.split('-');
  if (dd && mon && yy && MONTHS[mon]) {
    let year = parseInt(yy, 10);
    if (year < 100) year += 2000;
    return `${year}-${pad(MONTHS[mon])}-${pad(parseInt(dd, 10))}`;
  }
  const d = new Date(oracleStr);
  return isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatHM(total: number): string {
  if (total <= 0) return '0 min';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m > 0) return `${h} h ${m} min`;
  return h > 0 ? `${h} h` : `${m} min`;
}

export default function DeclarationLicenses() {
  const location = useLocation();
  const snackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [declarationId, setDeclarationId] = useState<string | null>(null);
  const [shiftStart, setShiftStart] = useState('');
  const [shiftDate, setShiftDate] = useState('');

  const [types, setTypes] = useState<LicenseType[]>([]);
  const [licenses, setLicenses] = useState<DeclaredLicense[]>([]);

  const [typeId, setTypeId] = useState('');
  const [horas, setHoras] = useState('');
  const [minutos, setMinutos] = useState('');
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

        const [declaration, typeList, existing] = await Promise.all([
          declarationService.getDeclarationById(declId),
          employeeLicenseService.getLicenseTypes(),
          licenseService.getLicensesByDeclaration(declId),
        ]);
        if (!active) return;

        setDeclarationId(declId);
        setShiftStart(parseOracleToTimeInput(declaration.shift_starts_at));
        setShiftDate(oracleDateOnly(declaration.shift_starts_at));
        setTypes(typeList);
        setLicenses(
          existing.map((l) => {
            const end = parseCanonical(l.ends_at);
            return {
              id: l.license_time_id,
              typeId: l.license_type_id,
              typeName: l.license_type_name ?? l.license_type_id,
              totalMinutes: Math.round((end.getTime() - parseCanonical(l.starts_at).getTime()) / 60000),
              endDate: end,
            };
          }),
        );
      } catch (error) {
        if (active) snackbar.error((error as ServiceError).message ?? 'Error al cargar las licencias.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const num = (s: string) => Math.max(0, Math.trunc(Number(s)) || 0);
  const totalMinutes = num(horas) * 60 + num(minutos);

  /**
   * Builds the [starts_at, ends_at] range for a new license. Licenses are
   * stacked sequentially starting at the shift start so that no two of the
   * user's licenses overlap in time (LICENSE_TIMES enforces this per user via
   * TRG_LICENSE_TIMES_CHECK_OVERLAP).
   */
  const buildRange = (minutesTotal: number): { starts_at: string; ends_at: string; endDate: Date } => {
    const shiftAnchor = new Date(`${shiftDate}T${shiftStart}:00`);
    const latestEnd = licenses.reduce(
      (max, l) => (l.endDate.getTime() > max ? l.endDate.getTime() : max),
      shiftAnchor.getTime(),
    );
    const start = new Date(latestEnd);
    const end = new Date(latestEnd);
    end.setMinutes(end.getMinutes() + minutesTotal);
    return { starts_at: formatDateForBackend(start), ends_at: formatDateForBackend(end), endDate: end };
  };

  const validate = (): boolean => {
    const next: { typeId?: string; time?: string } = {};
    if (!typeId) next.typeId = 'Seleccione el tipo de permiso/licencia.';
    if (totalMinutes <= 0) next.time = 'Indique una duración mayor a 0.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleAdd = async () => {
    if (!validate() || !declarationId) return;
    setIsSubmitting(true);
    try {
      const { endDate, ...range } = buildRange(totalMinutes);
      const created = await licenseService.createLicense({
        declaration_id: declarationId,
        license_type_id: typeId,
        ...range,
      });
      const type = types.find((t) => t.id === typeId);
      setLicenses((prev) => [
        ...prev,
        {
          id: created.license_time_id,
          typeId,
          typeName: created.license_type_name ?? type?.name ?? typeId,
          totalMinutes,
          endDate,
        },
      ]);
      setTypeId('');
      setHoras('');
      setMinutos('');
      setErrors({});
      snackbar.success('Permiso/licencia registrado correctamente.');
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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems="flex-start">
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
              value={horas}
              onChange={(e) => {
                setHoras(e.target.value);
                if (errors.time) setErrors((p) => ({ ...p, time: undefined }));
              }}
              error={!!errors.time}
              helperText={errors.time}
              size="small"
              inputProps={{ min: 0 }}
              sx={{ width: { xs: '100%', sm: 110 }, backgroundColor: 'white' }}
            />
            <TextField
              label="Minutos"
              type="number"
              value={minutos}
              onChange={(e) => {
                setMinutos(e.target.value);
                if (errors.time) setErrors((p) => ({ ...p, time: undefined }));
              }}
              size="small"
              inputProps={{ min: 0, max: 59 }}
              sx={{ width: { xs: '100%', sm: 110 }, backgroundColor: 'white' }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              disabled={isSubmitting}
              sx={{ backgroundColor: '#2c2c2c', '&:hover': { backgroundColor: '#1a1a1a' } }}
            >
              Agregar
            </Button>
          </Stack>

          {licenses.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              No has registrado permisos ni licencias.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {licenses.map((l) => (
                <Box
                  key={l.id}
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 1, px: 2, py: 1 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography>{l.typeName}</Typography>
                    <Chip label={formatHM(l.totalMinutes)} size="small" variant="outlined" />
                  </Box>
                  <IconButton size="small" onClick={() => remove(l.id)} sx={{ color: '#d32f2f' }}>
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
