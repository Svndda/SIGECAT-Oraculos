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
import { parseOracleToTimeInput, type ServiceError } from '../../services/common';
import ModalForm from '../../components/modals/ModalForm';
import { useSnackbar } from '../../context/SnackbarContext';

const FREQUENCIES = ['Diario', 'Semanal', 'Quincenal', 'Mensual', 'Trimestral', 'Semestral'];

const FREQUENCY_PER_WEEK: Record<string, number> = {
  Diario: 5, Semanal: 1, Quincenal: 1 / 2, Mensual: 1 / 4, Trimestral: 1 / 13, Semestral: 1 / 26,
};

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  kind: 'official' | 'custom';
}

interface Report {
  jobFunctionId: string;
  frequency: string;
  durationMinutes: number;
  overtimeMinutes: number;
  justification: string;
}

interface CustomFunctionForm {
  name: string;
  description: string;
}

function formatHM(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return '0 min';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
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
  const [plazaJobId, setPlazaJobId] = useState('');

  const [official, setOfficial] = useState<OfficialFunction[]>([]);
  const [custom, setCustom] = useState<CustomFunction[]>([]);
  const [reports, setReports] = useState<Record<string, Report>>({});

  const [tab, setTab] = useState(0);

  const [reportItem, setReportItem] = useState<CatalogItem | null>(null);
  const [frequency, setFrequency] = useState('Semanal');
  const [hours, setHours] = useState<number | ''>('');
  const [minutes, setMinutes] = useState<number | ''>('');
  const [otHours, setOtHours] = useState<number | ''>('');
  const [otMinutes, setOtMinutes] = useState<number | ''>('');
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
            durationMinutes: jf.duration_minutes || 0,
            overtimeMinutes: jf.overtime_minutes || 0,
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
  }, [location.state]);

  const propias = useMemo(() => official.filter((f) => f.job_id === plazaJobId), [official, plazaJobId]);
  const otras = useMemo(() => official.filter((f) => f.job_id !== plazaJobId), [official, plazaJobId]);

  const weeklyMinutes = (r: Pick<Report, 'durationMinutes' | 'frequency'>): number =>
    (r.durationMinutes || 0) * (FREQUENCY_PER_WEEK[r.frequency] ?? 1);

  const totalSemanalMin = Object.values(reports).reduce((sum, r) => sum + weeklyMinutes(r), 0);

  const openReport = (item: CatalogItem) => {
    const existing = reports[item.id];
    setReportItem(item);
    if (existing) {
      setFrequency(existing.frequency);
      setHours(Math.floor(existing.durationMinutes / 60) || '');
      setMinutes(existing.durationMinutes % 60 || '');
      setOtHours(Math.floor(existing.overtimeMinutes / 60) || '');
      setOtMinutes(existing.overtimeMinutes % 60 || '');
      setJustification(existing.justification);
    } else {
      setFrequency('Semanal');
      setHours(''); setMinutes('');
      setOtHours(''); setOtMinutes('');
      setJustification('');
    }
  };

  const reportTotalMinutes = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
  const reportOtMinutes = (Number(otHours) || 0) * 60 + (Number(otMinutes) || 0);

  const submitReport = async () => {
    if (!reportItem || !declarationId) return;
    if (reportTotalMinutes <= 0) {
      snackbar.error('Debe indicar un tiempo de duración válido (mayor a 0 minutos).');
      return;
    }
    if (reportOtMinutes > 0 && justification.trim() === '') {
      snackbar.error('La justificación es obligatoria si reporta tiempo adicional a su jornada.');
      return;
    }

    setIsSubmitting(true);
    try {
      const existing = reports[reportItem.id];
      const overtimeMinutes = reportOtMinutes > 0 ? reportOtMinutes : undefined;
      const justif = reportOtMinutes > 0 ? justification.trim() : undefined;

      if (existing) {
        await jobFunctionService.updateJobFunction(existing.jobFunctionId, {
          frequency,
          duration_minutes: reportTotalMinutes,
          overtime_minutes: overtimeMinutes,
          justification: justif,
        });
        setReports((prev) => ({
          ...prev,
          [reportItem.id]: {
            ...existing,
            frequency,
            durationMinutes: reportTotalMinutes,
            overtimeMinutes: reportOtMinutes,
            justification: justif || '',
          },
        }));
      } else {
        const created = await jobFunctionService.createJobFunction({
          declaration_id: declarationId,
          official_function_id: reportItem.kind === 'official' ? reportItem.id : undefined,
          custom_function_id: reportItem.kind === 'custom' ? reportItem.id : undefined,
          frequency,
          duration_minutes: reportTotalMinutes,
          overtime_minutes: overtimeMinutes,
          justification: justif,
        });
        setReports((prev) => ({
          ...prev,
          [reportItem.id]: {
            jobFunctionId: created.id,
            frequency,
            durationMinutes: reportTotalMinutes,
            overtimeMinutes: reportOtMinutes,
            justification: justif || '',
          },
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
                      <Chip size="small" color="primary" variant="outlined" label={`${formatHM(report.durationMinutes)} · ${report.frequency}`} />
                      <IconButton size="small" onClick={() => openReport(item)} aria-label={`Editar reporte: ${item.name}`} sx={{ color: '#1a2b4a' }}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => removeReport(item)} aria-label={`Eliminar reporte: ${item.name}`} sx={{ color: '#d32f2f' }}><DeleteOutlineIcon fontSize="small" /></IconButton>
                    </Stack>
                  ) : (
                    <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); openReport(item); }} sx={{ textTransform: 'none', flexShrink: 0 }}>
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
      <Paper sx={{ p: 3, mb: 4, backgroundColor: '#f9f9fd', display: 'flex', justifyContent: 'center' }}><CircularProgress size={28} /></Paper>
    );
  }

  if (!declarationId) {
    return (
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 4, backgroundColor: '#f9f9fd' }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#12457d' }}>Funciones a desarrollar</Typography>
        <Typography variant="body2" color="text.secondary">No hay una declaración activa.</Typography>
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
      </Typography>

      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#12457d', mb: 1 }}>
        TOTAL REPORTADO SEMANALMENTE: {formatHM(totalSemanalMin)}
        {shiftStart && shiftEnd && (
          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            (Jornada: {shiftStart} - {shiftEnd})
          </Typography>
        )}
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #e0e0e0' }} variant="scrollable" scrollButtons="auto">
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

          <TextField select label="Período" value={frequency} onChange={(e) => setFrequency(e.target.value)} size="small" fullWidth>
            {FREQUENCIES.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
          </TextField>

          <Typography variant="subtitle2" color="text.secondary">Duración de la función (Regular)</Typography>
          <Stack direction="row" spacing={2}>
            <TextField label="Horas" type="number" inputProps={{ min: 0 }} value={hours} onChange={(e) => setHours(e.target.value ? Number(e.target.value) : '')} size="small" fullWidth />
            <TextField label="Minutos" type="number" inputProps={{ min: 0, max: 59 }} value={minutes} onChange={(e) => setMinutes(e.target.value ? Number(e.target.value) : '')} size="small" fullWidth />
          </Stack>

          <Typography variant="subtitle2" color="text.secondary">Tiempo Adicional a la Jornada / Extras (Opcional)</Typography>
          <Stack direction="row" spacing={2}>
            <TextField label="Horas extra" type="number" inputProps={{ min: 0 }} value={otHours} onChange={(e) => setOtHours(e.target.value ? Number(e.target.value) : '')} size="small" fullWidth />
            <TextField label="Minutos extra" type="number" inputProps={{ min: 0, max: 59 }} value={otMinutes} onChange={(e) => setOtMinutes(e.target.value ? Number(e.target.value) : '')} size="small" fullWidth />
          </Stack>

          <Typography variant="subtitle2" sx={{ color: '#12457d' }}>
            Tiempo Total Ingresado: {formatHM(reportTotalMinutes + reportOtMinutes)}
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              (aporta {formatHM(Math.round(weeklyMinutes({ durationMinutes: reportTotalMinutes + reportOtMinutes, frequency })))} semanales)
            </Typography>
          </Typography>

          {reportOtMinutes > 0 && (
            <TextField label="Justificación (Uso de tiempo adicional)" value={justification} onChange={(e) => setJustification(e.target.value)} size="small" fullWidth multiline rows={2} required error={justification.trim() === ''} helperText={justification.trim() === '' ? 'Obligatoria si reporta tiempo adicional a su jornada.' : undefined} />
          )}
        </Stack>
      </ModalForm>

      <ModalForm open={createOpen} title="Crear función nueva" confirmLabel="Crear" isSubmitting={isSubmitting} onClose={() => setCreateOpen(false)} onConfirm={handleCreateCustom}>
        <Stack spacing={2.5}>
          <TextField label="Nombre" value={customForm.name} onChange={(e) => { setCustomForm((p) => ({ ...p, name: e.target.value })); setCustomErrors((p) => ({ ...p, name: undefined })); }} error={!!customErrors.name} helperText={customErrors.name} size="small" fullWidth required />
          <TextField label="Descripción" value={customForm.description} onChange={(e) => { setCustomForm((p) => ({ ...p, description: e.target.value })); setCustomErrors((p) => ({ ...p, description: undefined })); }} error={!!customErrors.description} helperText={customErrors.description} size="small" fullWidth multiline rows={3} required />
        </Stack>
      </ModalForm>
    </Paper>
  );
}