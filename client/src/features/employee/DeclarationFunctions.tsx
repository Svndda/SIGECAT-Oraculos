import { useEffect, useState } from 'react';
import {
  Box, Paper, Stack, Typography, Autocomplete, TextField, Button, IconButton, Chip,
  MenuItem, CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useLocation } from 'react-router-dom';
import { employeeFunctionService, type CatalogFunction } from '../../services/employeeFunctionService';
import { jobFunctionService } from '../../services/jobFunctionService';
import { declarationService } from '../../services/declarationsService';
import { parseOracleToTimeInput, type ServiceError } from '../../services/common';
import ModalForm from '../../components/modals/ModalForm';
import { useSnackbar } from '../../context/SnackbarContext';

/** Frequencies accepted by JOB_FUNCTIONS.frequency. */
const FREQUENCIES = ['Diario', 'Semanal', 'Quincenal', 'Mensual', 'Trimestral', 'Semestral'];

interface CustomFunctionForm {
  name: string;
  description: string;
}

const EMPTY_CUSTOM_FORM: CustomFunctionForm = { name: '', description: '' };

/** A function the employee declared, mirroring one JOB_FUNCTIONS row. */
interface DeclaredFunction {
  jobFunctionId: string;
  officialFunctionId: string | null;
  customFunctionId: string | null;
  name: string;
  description: string | null;
  isCustom: boolean;
  frequency: string;
  /** "HH:MM" within the shift's day. */
  startTime: string;
  endTime: string;
  justification: string;
}

const MONTHS: Record<string, number> = {
  JAN: 1, ENE: 1, FEB: 2, MAR: 3, APR: 4, ABR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, AGO: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12, DIC: 12,
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Extracts 'YYYY-MM-DD' from an Oracle timestamp string ("24-JUN-26 08.00.00.000000 AM"). */
function oracleDateOnly(oracleStr: string | null | undefined): string {
  if (!oracleStr) return '';
  const datePart = oracleStr.trim().toUpperCase().split(/\s+/)[0];
  const [dd, mon, yy] = datePart.split('-');
  if (dd && mon && yy && MONTHS[mon]) {
    let year = parseInt(yy, 10);
    if (year < 100) year += 2000;
    return `${year}-${pad(MONTHS[mon])}-${pad(parseInt(dd, 10))}`;
  }
  // Fallback for ISO / other parseable formats.
  const d = new Date(oracleStr);
  return isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Whether [start, end] falls outside the shift window — these require a justification. */
function isOutsideShift(start: string, end: string, shiftStart: string, shiftEnd: string): boolean {
  if (!start || !end || !shiftStart || !shiftEnd) return false;
  return toMinutes(start) < toMinutes(shiftStart) || toMinutes(end) > toMinutes(shiftEnd);
}

function formatMinutes(total: number): string {
  if (total <= 0) return '0m';
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function DeclarationFunctions() {
  const location = useLocation();
  const snackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [declarationId, setDeclarationId] = useState<string | null>(null);
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');
  const [shiftDate, setShiftDate] = useState('');

  const [declared, setDeclared] = useState<DeclaredFunction[]>([]);

  const [catalog, setCatalog] = useState<CatalogFunction[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [selected, setSelected] = useState<CatalogFunction | null>(null);
  const [inputValue, setInputValue] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [customForm, setCustomForm] = useState<CustomFunctionForm>(EMPTY_CUSTOM_FORM);
  const [customErrors, setCustomErrors] = useState<Partial<Record<keyof CustomFunctionForm, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load the active declaration (router state, else the user's incomplete one) and
  // prefill any functions already saved on it.
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

        const declaration = await declarationService.getDeclarationById(declId);
        if (!active) return;

        setDeclarationId(declId);
        setShiftStart(parseOracleToTimeInput(declaration.shift_starts_at));
        setShiftEnd(parseOracleToTimeInput(declaration.shift_ends_at));
        setShiftDate(oracleDateOnly(declaration.shift_starts_at));
        setDeclared((declaration.job_functions ?? []).map((jf) => ({
          jobFunctionId: jf.job_function_id,
          officialFunctionId: jf.official_function_id,
          customFunctionId: jf.custom_function_id,
          name: jf.function_name ?? '—',
          description: jf.function_description ?? null,
          isCustom: jf.function_type === 'custom' || jf.custom_function_id != null,
          frequency: jf.frequency ?? 'Diario',
          startTime: parseOracleToTimeInput(jf.starts_at),
          endTime: parseOracleToTimeInput(jf.ends_at),
          justification: jf.justification ?? '',
        })));
      } catch (error) {
        if (active) snackbar.error((error as ServiceError).message ?? 'Error al cargar la declaración.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
    // Only re-run when the targeted declaration changes (snackbar is stable enough to omit).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const canCreateCustom = inputValue.trim() !== '' && !loadingCatalog && catalog.length === 0;

  const handleSearch = (query: string) => {
    setLoadingCatalog(true);
    employeeFunctionService.searchCatalog(query)
      .then(setCatalog)
      .catch((error) => snackbar.error((error as ServiceError).message ?? 'Error del servidor.'))
      .finally(() => setLoadingCatalog(false));
  };

  const buildTimestamp = (hhmm: string): string => `${shiftDate} ${hhmm}:00`;

  const addToDeclaration = async (fn: CatalogFunction) => {
    if (!declarationId) {
      snackbar.error('No hay una declaración activa.');
      return;
    }
    const already = declared.some((d) => (fn.is_custom ? d.customFunctionId : d.officialFunctionId) === fn.id);
    if (already) {
      snackbar.error('Esa función ya está en tu lista.');
      return;
    }
    try {
      const created = await jobFunctionService.createJobFunction({
        declaration_id: declarationId,
        official_function_id: fn.is_custom ? undefined : fn.id,
        custom_function_id: fn.is_custom ? fn.id : undefined,
        frequency: 'Diario',
        // Default the function range to the shift window (within shift → no justification needed).
        starts_at: buildTimestamp(shiftStart),
        ends_at: buildTimestamp(shiftEnd),
      });
      setDeclared((prev) => [...prev, {
        jobFunctionId: created.id,
        officialFunctionId: created.official_function_id,
        customFunctionId: created.custom_function_id,
        name: fn.name,
        description: fn.description,
        isCustom: fn.is_custom,
        frequency: created.frequency,
        startTime: parseOracleToTimeInput(created.starts_at) || shiftStart,
        endTime: parseOracleToTimeInput(created.ends_at) || shiftEnd,
        justification: created.justification ?? '',
      }]);
      setSelected(null);
      snackbar.success(`Función "${fn.name}" agregada a tu jornada.`);
    } catch (error) {
      snackbar.error((error as ServiceError).message ?? 'No se pudo agregar la función.');
    }
  };

  const removeFromDeclaration = async (d: DeclaredFunction) => {
    try {
      await jobFunctionService.deleteJobFunction(d.jobFunctionId);
      setDeclared((prev) => prev.filter((x) => x.jobFunctionId !== d.jobFunctionId));
      snackbar.success('Función eliminada de tu jornada.');
    } catch (error) {
      snackbar.error((error as ServiceError).message ?? 'No se pudo eliminar la función.');
    }
  };

  const setField = (jobFunctionId: string, field: 'startTime' | 'endTime' | 'frequency' | 'justification', value: string) => {
    setDeclared((prev) => prev.map((d) => (d.jobFunctionId === jobFunctionId ? { ...d, [field]: value } : d)));
  };

  // Persists the current values of a declared function (called on blur / select change).
  const persist = async (jobFunctionId: string) => {
    const d = declared.find((x) => x.jobFunctionId === jobFunctionId);
    if (!d || !d.startTime || !d.endTime) return;

    if (toMinutes(d.endTime) <= toMinutes(d.startTime)) {
      snackbar.error('La hora de fin debe ser posterior a la de inicio.');
      return;
    }
    const outside = isOutsideShift(d.startTime, d.endTime, shiftStart, shiftEnd);
    if (outside && d.justification.trim() === '') {
      // Hold the save until the (now required) justification is filled in.
      return;
    }
    try {
      await jobFunctionService.updateJobFunction(d.jobFunctionId, {
        frequency: d.frequency,
        starts_at: buildTimestamp(d.startTime),
        ends_at: buildTimestamp(d.endTime),
        justification: outside ? d.justification.trim() : '',
      });
    } catch (error) {
      snackbar.error((error as ServiceError).message ?? 'No se pudieron guardar los cambios.');
    }
  };

  const openCreate = () => {
    setCustomForm({ ...EMPTY_CUSTOM_FORM, name: inputValue.trim() });
    setCustomErrors({});
    setCreateOpen(true);
  };

  const setCustomField = (field: keyof CustomFunctionForm, value: string) => {
    setCustomForm((prev) => ({ ...prev, [field]: value }));
    if (customErrors[field]) setCustomErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateCustom = (): boolean => {
    const errors: Partial<Record<keyof CustomFunctionForm, string>> = {};
    if (!customForm.name.trim()) errors.name = 'El nombre es requerido.';
    if (!customForm.description.trim()) errors.description = 'La descripción es requerida.';
    setCustomErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateCustom = async () => {
    if (!validateCustom()) return;
    setIsSubmitting(true);
    try {
      const created = await employeeFunctionService.createCustomFunction({
        name: customForm.name,
        description: customForm.description,
      });
      setCreateOpen(false);
      await addToDeclaration(created);
    } catch (error) {
      snackbar.error((error as ServiceError).message ?? 'Error del servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalMinutes = declared.reduce(
    (sum, d) => sum + Math.max(0, toMinutes(d.endTime) - toMinutes(d.startTime)),
    0,
  );

  if (loading) {
    return (
      <Paper sx={{ p: 3, mb: 4, backgroundColor: '#f9f9fd', display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Paper>
    );
  }

  if (!declarationId) {
    return (
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 4, backgroundColor: '#f9f9fd' }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#12457d' }}>
          Funciones de la jornada
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No hay una declaración activa. Iniciá la declaración desde el formulario del puesto para agregar funciones.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 4, backgroundColor: '#f9f9fd' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#12457d' }}>
          Funciones de la jornada
        </Typography>
        {shiftStart && shiftEnd && (
          <Typography variant="caption" color="text.secondary">
            Jornada: {shiftStart} - {shiftEnd}
          </Typography>
        )}
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Autocomplete
          sx={{ flex: 1, backgroundColor: 'white' }}
          options={catalog}
          loading={loadingCatalog}
          value={selected}
          onChange={(_, value) => setSelected(value)}
          onInputChange={(_, value) => {
            setInputValue(value);
            handleSearch(value);
          }}
          getOptionLabel={(o) => o.name}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          noOptionsText="No se encontraron funciones en el catálogo."
          renderInput={(params) => (
            <TextField {...params} size="small" placeholder="Buscar función en el catálogo..." />
          )}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={!selected}
          onClick={() => selected && addToDeclaration(selected)}
          sx={{ backgroundColor: '#2c2c2c', '&:hover': { backgroundColor: '#1a1a1a' } }}
        >
          Agregar
        </Button>
      </Stack>

      {canCreateCustom && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'inline', mr: 1 }}>
            "{inputValue.trim()}" no está en el catálogo.
          </Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={openCreate} sx={{ color: '#12457d' }}>
            Crear función nueva
          </Button>
        </Box>
      )}

      {declared.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          Aún no has agregado funciones a tu jornada.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {declared.map((d) => {
            const outside = isOutsideShift(d.startTime, d.endTime, shiftStart, shiftEnd);
            const needsJustification = outside && d.justification.trim() === '';
            const minutes = Math.max(0, toMinutes(d.endTime) - toMinutes(d.startTime));
            return (
              <Paper key={d.jobFunctionId} variant="outlined" sx={{ p: 2, backgroundColor: 'white' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontWeight: 600 }}>{d.name}</Typography>
                      {d.isCustom && <Chip label="Personalizada" size="small" color="primary" variant="outlined" />}
                    </Box>
                    {d.description && (
                      <Typography variant="body2" color="text.secondary">{d.description}</Typography>
                    )}
                  </Box>
                  <IconButton size="small" onClick={() => removeFromDeclaration(d)} sx={{ color: '#d32f2f' }}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1.5 }} alignItems={{ sm: 'center' }}>
                  <TextField
                    label="Hora inicio"
                    type="time"
                    size="small"
                    value={d.startTime}
                    onChange={(e) => setField(d.jobFunctionId, 'startTime', e.target.value)}
                    onBlur={() => persist(d.jobFunctionId)}
                    inputProps={{ step: 300 }}
                    sx={{ width: 140 }}
                  />
                  <TextField
                    label="Hora fin"
                    type="time"
                    size="small"
                    value={d.endTime}
                    onChange={(e) => setField(d.jobFunctionId, 'endTime', e.target.value)}
                    onBlur={() => persist(d.jobFunctionId)}
                    inputProps={{ step: 300 }}
                    sx={{ width: 140 }}
                  />
                  <TextField
                    select
                    label="Frecuencia"
                    size="small"
                    value={d.frequency}
                    onChange={(e) => { setField(d.jobFunctionId, 'frequency', e.target.value); }}
                    onBlur={() => persist(d.jobFunctionId)}
                    sx={{ width: 160 }}
                  >
                    {FREQUENCIES.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                  </TextField>
                  <Typography variant="caption" color="text.secondary">
                    {formatMinutes(minutes)}
                  </Typography>
                </Stack>

                {outside && (
                  <TextField
                    label="Justificación (la función está fuera de la jornada)"
                    value={d.justification}
                    onChange={(e) => setField(d.jobFunctionId, 'justification', e.target.value)}
                    onBlur={() => persist(d.jobFunctionId)}
                    error={needsJustification}
                    helperText={needsJustification ? 'La justificación es obligatoria si la función se sale de la jornada.' : undefined}
                    size="small"
                    fullWidth
                    multiline
                    rows={2}
                    required
                    sx={{ mt: 1.5 }}
                  />
                )}
              </Paper>
            );
          })}
        </Stack>
      )}

      {declared.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, pt: 1, borderTop: '1px solid #e0e0e0' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#12457d' }}>
            Total declarado: {formatMinutes(totalMinutes)}
          </Typography>
        </Box>
      )}

      <ModalForm
        open={createOpen}
        title="Crear función nueva"
        confirmLabel="Crear"
        isSubmitting={isSubmitting}
        onClose={() => setCreateOpen(false)}
        onConfirm={handleCreateCustom}
      >
        <Stack spacing={2.5}>
          <TextField
            label="Nombre"
            value={customForm.name}
            onChange={(e) => setCustomField('name', e.target.value)}
            error={!!customErrors.name}
            helperText={customErrors.name}
            size="small"
            fullWidth
            required
          />
          <TextField
            label="Descripción"
            value={customForm.description}
            onChange={(e) => setCustomField('description', e.target.value)}
            error={!!customErrors.description}
            helperText={customErrors.description}
            size="small"
            fullWidth
            multiline
            rows={3}
            required
          />
        </Stack>
      </ModalForm>
    </Paper>
  );
}
