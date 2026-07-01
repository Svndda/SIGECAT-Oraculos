import { useEffect, useMemo, useState } from 'react';
import {
  Box, Paper, Stack, Typography, Tabs, Tab, Accordion, AccordionSummary,
  AccordionDetails, Button, IconButton, Chip, TextField, MenuItem, CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useLocation } from 'react-router-dom';
import { officialFunctionService, type OfficialFunction } from '../../services/officialFunctionService';
import { customFunctionService, type CustomFunction } from '../../services/customFunctionService';
import { employeeFunctionService } from '../../services/employeeFunctionService';
import { jobFunctionService } from '../../services/jobFunctionService';
import { declarationService } from '../../services/declarationsService';
import { formatDateForBackend, parseOracleToTimeInput, type ServiceError } from '../../services/common';
import ModalForm from '../../components/modals/ModalForm';
import { useSnackbar } from '../../context/SnackbarContext';

/** Frequencies accepted by JOB_FUNCTIONS.frequency (the "Período"). */
const FREQUENCIES = ['Diario', 'Semanal', 'Quincenal', 'Mensual', 'Trimestral', 'Semestral'];

/**
 * Occurrences per week implied by each frequency, used to roll a single
 * reported range up to a weekly load. A 5 h "Diario" function therefore
 * reports 25 h/week (5 work days). Months are taken as ~4 weeks.
 */
const FREQUENCY_PER_WEEK: Record<string, number> = {
  Diario: 5,
  Semanal: 1,
  Quincenal: 1 / 2,
  Mensual: 1 / 4,
  Trimestral: 1 / 13,
  Semestral: 1 / 26,
};

/** A function shown in a tab (an official function or one of the user's custom). */
interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  kind: 'official' | 'custom';
}

/** The time an employee reported for a function (one JOB_FUNCTIONS row). */
interface Report {
  jobFunctionId: string;
  frequency: string;
  /** Start/end of the function within the shift day, 'HH:MM'. */
  startTime: string;
  endTime: string;
  justification: string;
}

interface CustomFunctionForm {
  name: string;
  description: string;
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

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Minutes between two 'HH:MM' times (same shift day; wraps past midnight). */
function durationMinutes(start: string, end: string): number {
  if (!start || !end) return 0;
  let diff = toMinutes(end) - toMinutes(start);
  if (diff < 0) diff += 24 * 60;
  return diff;
}

function formatHM(total: number): string {
  if (total <= 0) return '0 min';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m > 0) return `${h} h ${m} min`;
  return h > 0 ? `${h} h` : `${m} min`;
}

export default function DeclarationFunctions() {
  const location = useLocation();
  const snackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [declarationId, setDeclarationId] = useState<string | null>(null);
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');
  const [shiftDate, setShiftDate] = useState('');
  const [plazaJobId, setPlazaJobId] = useState('');

  const [official, setOfficial] = useState<OfficialFunction[]>([]);
  const [custom, setCustom] = useState<CustomFunction[]>([]);
  /** Keyed by official_function_id / custom_function_id. */
  const [reports, setReports] = useState<Record<string, Report>>({});

  const [tab, setTab] = useState(0);

  // Report ("Reporte de Función") modal state.
  const [reportItem, setReportItem] = useState<CatalogItem | null>(null);
  const [frequency, setFrequency] = useState('Semanal');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // "Crear función nueva" (custom) modal state.
  const [createOpen, setCreateOpen] = useState(false);
  const [customForm, setCustomForm] = useState<CustomFunctionForm>({ name: '', description: '' });
  const [customErrors, setCustomErrors] = useState<Partial<Record<keyof CustomFunctionForm, string>>>({});

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

        const [declaration, off, cus] = await Promise.all([
          declarationService.getDeclarationById(declId),
          officialFunctionService.getOfficialFunctions({ limit: 100, status: 'active' }),
          customFunctionService.getCustomFunctions({ limit: 100, mine: true }),
        ]);
        if (!active) return;

        setDeclarationId(declId);
        setShiftStart(parseOracleToTimeInput(declaration.shift_starts_at));
        setShiftEnd(parseOracleToTimeInput(declaration.shift_ends_at));
        setShiftDate(oracleDateOnly(declaration.shift_starts_at));
        setPlazaJobId(declaration.job_position?.job_id ?? declaration.job?.job_id ?? '');
        setOfficial(off.data ?? []);
        setCustom(cus.data ?? []);

        const map: Record<string, Report> = {};
        for (const jf of declaration.job_functions ?? []) {
          const key = jf.official_function_id ?? jf.custom_function_id;
          if (!key) continue;
          map[key] = {
            jobFunctionId: jf.job_function_id,
            frequency: jf.frequency ?? 'Semanal',
            startTime: parseOracleToTimeInput(jf.starts_at),
            endTime: parseOracleToTimeInput(jf.ends_at),
            justification: jf.justification ?? '',
          };
        }
        setReports(map);
      } catch (error) {
        if (active) snackbar.error((error as ServiceError).message ?? 'Error al cargar la declaración.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const propias = useMemo(
    () => official.filter((f) => f.job_id === plazaJobId),
    [official, plazaJobId],
  );
  const otras = useMemo(
    () => official.filter((f) => f.job_id !== plazaJobId),
    [official, plazaJobId],
  );

  const shiftDurationMin = shiftStart && shiftEnd
    ? (toMinutes(shiftEnd) - toMinutes(shiftStart) + 24 * 60) % (24 * 60)
    : 0;

  /** Weekly minutes a single report contributes, scaled by its frequency. */
  const weeklyMinutes = (r: Pick<Report, 'startTime' | 'endTime' | 'frequency'>): number =>
    durationMinutes(r.startTime, r.endTime) * (FREQUENCY_PER_WEEK[r.frequency] ?? 1);

  const totalSemanalMin = Object.values(reports).reduce((sum, r) => sum + weeklyMinutes(r), 0);

  /**
   * Whether a [start, end] range falls (partly) outside the shift window.
   * Offsets are measured from the shift start, wrapping past midnight, so a
   * function that begins before the shift or ends after it is flagged.
   */
  const isOutsideShift = (start: string, end: string): boolean => {
    if (!start || !end || !shiftStart || !shiftEnd) return false;
    const duration = durationMinutes(start, end);
    if (duration <= 0) return false;
    const startOffset = (toMinutes(start) - toMinutes(shiftStart) + 24 * 60) % (24 * 60);
    return startOffset + duration > shiftDurationMin;
  };

  const buildRange = (start: string, end: string): { starts_at: string; ends_at: string } => {
    const starts = `${shiftDate} ${start}:00`;
    const endDate = new Date(`${shiftDate}T${start}:00`);
    endDate.setMinutes(endDate.getMinutes() + durationMinutes(start, end));
    return { starts_at: starts, ends_at: formatDateForBackend(endDate) };
  };

  const openReport = (item: CatalogItem) => {
    const existing = reports[item.id];
    setReportItem(item);
    if (existing) {
      setFrequency(existing.frequency);
      setStartTime(existing.startTime);
      setEndTime(existing.endTime);
      setJustification(existing.justification);
    } else {
      setFrequency('Semanal');
      setStartTime(shiftStart);
      setEndTime(shiftEnd);
      setJustification('');
    }
  };

  const reportTotal = durationMinutes(startTime, endTime);
  const reportOutside = isOutsideShift(startTime, endTime);

  const submitReport = async () => {
    if (!reportItem || !declarationId) return;
    if (!startTime || !endTime) {
      snackbar.error('Debe indicar la hora de inicio y la hora de fin.');
      return;
    }
    if (reportTotal <= 0) {
      snackbar.error('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }
    if (reportOutside && justification.trim() === '') {
      snackbar.error('La justificación es obligatoria si la función se sale de la jornada.');
      return;
    }
    setIsSubmitting(true);
    try {
      const range = buildRange(startTime, endTime);
      const existing = reports[reportItem.id];
      const justif = reportOutside ? justification.trim() : '';
      if (existing) {
        await jobFunctionService.updateJobFunction(existing.jobFunctionId, {
          frequency, ...range, justification: justif,
        });
        setReports((prev) => ({
          ...prev,
          [reportItem.id]: { ...existing, frequency, startTime, endTime, justification: justif },
        }));
      } else {
        const created = await jobFunctionService.createJobFunction({
          declaration_id: declarationId,
          official_function_id: reportItem.kind === 'official' ? reportItem.id : undefined,
          custom_function_id: reportItem.kind === 'custom' ? reportItem.id : undefined,
          frequency, ...range,
          justification: justif || undefined,
        });
        setReports((prev) => ({
          ...prev,
          [reportItem.id]: { jobFunctionId: created.id, frequency, startTime, endTime, justification: justif },
        }));
      }
      setReportItem(null);
      snackbar.success('Función reportada exitosamente.');
    } catch (error) {
      snackbar.error((error as ServiceError).message ?? 'No se pudo reportar la función.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeReport = async (item: CatalogItem) => {
    const existing = reports[item.id];
    if (!existing) return;
    try {
      await jobFunctionService.deleteJobFunction(existing.jobFunctionId);
      setReports((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      snackbar.success('Reporte eliminado.');
    } catch (error) {
      snackbar.error((error as ServiceError).message ?? 'No se pudo eliminar el reporte.');
    }
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
        name: customForm.name, description: customForm.description,
      });
      setCustom((prev) => [...prev, { id: created.id, user_id: '', name: created.name, description: created.description }]);
      setCreateOpen(false);
      setCustomForm({ name: '', description: '' });
      snackbar.success('Función personalizada creada.');
    } catch (error) {
      snackbar.error((error as ServiceError).message ?? 'Error del servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderList = (items: CatalogItem[], emptyMessage: string) => {
    if (items.length === 0) {
      return <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>{emptyMessage}</Typography>;
    }
    return (
      <Stack spacing={1}>
        {items.map((item) => {
          const report = reports[item.id];
          return (
            <Accordion key={item.id} disableGutters elevation={0}
                       sx={{ border: '1px solid #e0e0e0', borderRadius: 1, '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 1, gap: 1 }}>
                  <Typography sx={{ fontWeight: 500, flex: 1, minWidth: 0, wordBreak: 'break-word' }}>{item.name}</Typography>
                  {report ? (
                    <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0} onClick={(e) => e.stopPropagation()}>
                      <Chip size="small" color="primary" variant="outlined" label={`${report.startTime}–${report.endTime} · ${report.frequency}`} />
                      <IconButton size="small" onClick={() => openReport(item)} aria-label={`Editar reporte: ${item.name}`} sx={{ color: '#1a2b4a' }}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => removeReport(item)} aria-label={`Eliminar reporte: ${item.name}`} sx={{ color: '#d32f2f' }}><DeleteOutlineIcon fontSize="small" /></IconButton>
                    </Stack>
                  ) : (
                    <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); openReport(item); }}
                            sx={{ textTransform: 'none', flexShrink: 0 }}>
                      Reportar función
                    </Button>
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary">
                  {item.description || 'Sin descripción'}
                </Typography>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>
    );
  };

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
          Funciones a desarrollar
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No hay una declaración activa. Iniciá la declaración desde el formulario del cargo para reportar funciones.
        </Typography>
      </Paper>
    );
  }

  const customItems: CatalogItem[] = custom.map((c) => ({ id: c.id, name: c.name, description: c.description, kind: 'custom' }));
  const toItems = (list: OfficialFunction[]): CatalogItem[] =>
    list.map((f) => ({ id: f.id, name: f.name, description: f.description, kind: 'official' }));

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 4, backgroundColor: '#f9f9fd' }}>
      <Typography variant="body2" sx={{ mb: 1, color: '#444' }}>
        En la siguiente sección debe indicar las funciones que requieren el reporte de su carga de trabajo.
        Las de <strong>Apoyo Condicional</strong> son las funciones personalizadas que usted registre.
      </Typography>

      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#12457d', mb: 1 }}>
        TOTAL DE HORAS REPORTADAS SEMANALMENTE: {formatHM(totalSemanalMin)}
        {shiftStart && shiftEnd && (
          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            (Jornada: {shiftStart} - {shiftEnd})
          </Typography>
        )}
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #e0e0e0' }}
            variant="scrollable" scrollButtons="auto">
        <Tab label={`Propias del Cargo (${propias.length})`} sx={{ textTransform: 'none' }} />
        <Tab label={`De Otro Cargo (${otras.length})`} sx={{ textTransform: 'none' }} />
        <Tab label={`De Apoyo Condicional (${customItems.length})`} sx={{ textTransform: 'none' }} />
      </Tabs>

      {tab === 0 && renderList(toItems(propias), 'No hay funciones oficiales para este cargo.')}
      {tab === 1 && renderList(toItems(otras), 'No hay funciones oficiales de otros cargos.')}
      {tab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ color: '#12457d', textTransform: 'none' }}>
              Crear función nueva
            </Button>
          </Box>
          {renderList(customItems, 'Aún no has registrado funciones personalizadas.')}
        </Box>
      )}

      {/* Reporte de Función */}
      <ModalForm
        open={!!reportItem}
        title="Reporte de Función"
        confirmLabel="Reportar Función"
        isSubmitting={isSubmitting}
        onClose={() => setReportItem(null)}
        onConfirm={submitReport}
      >
        <Stack spacing={2}>
          <TextField label="Nombre de la Función" value={reportItem?.name ?? ''} size="small" fullWidth disabled />
          <TextField label="Descripción de la Función" value={reportItem?.description ?? ''} size="small" fullWidth multiline rows={2} disabled />
          <TextField select label="Período en el que se realiza la Función" value={frequency}
                     onChange={(e) => setFrequency(e.target.value)} size="small" fullWidth>
            {FREQUENCIES.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
          </TextField>
          <Stack direction="row" spacing={2}>
            <TextField label="Hora de inicio" type="time" value={startTime}
                       onChange={(e) => setStartTime(e.target.value)} size="small" fullWidth
                       InputLabelProps={{ shrink: true }} />
            <TextField label="Hora de fin" type="time" value={endTime}
                       onChange={(e) => setEndTime(e.target.value)} size="small" fullWidth
                       InputLabelProps={{ shrink: true }} />
          </Stack>
          <Typography variant="subtitle2" sx={{ color: '#12457d' }}>
            Duración: {formatHM(reportTotal)}
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              (aporta {formatHM(Math.round(weeklyMinutes({ startTime, endTime, frequency })))} semanales)
            </Typography>
          </Typography>
          {reportOutside && (
            <TextField label="Justificación (la función se sale de la jornada)" value={justification}
                       onChange={(e) => setJustification(e.target.value)} size="small" fullWidth multiline rows={2}
                       required error={justification.trim() === ''}
                       helperText={justification.trim() === '' ? 'Obligatoria si la función se sale de la jornada.' : undefined} />
          )}
        </Stack>
      </ModalForm>

      {/* Crear función nueva (custom) */}
      <ModalForm
        open={createOpen}
        title="Crear función nueva"
        confirmLabel="Crear"
        isSubmitting={isSubmitting}
        onClose={() => setCreateOpen(false)}
        onConfirm={handleCreateCustom}
      >
        <Stack spacing={2.5}>
          <TextField label="Nombre" value={customForm.name}
                     onChange={(e) => { setCustomForm((p) => ({ ...p, name: e.target.value })); setCustomErrors((p) => ({ ...p, name: undefined })); }}
                     error={!!customErrors.name} helperText={customErrors.name} size="small" fullWidth required />
          <TextField label="Descripción" value={customForm.description}
                     onChange={(e) => { setCustomForm((p) => ({ ...p, description: e.target.value })); setCustomErrors((p) => ({ ...p, description: undefined })); }}
                     error={!!customErrors.description} helperText={customErrors.description} size="small" fullWidth multiline rows={3} required />
        </Stack>
      </ModalForm>
    </Paper>
  );
}
