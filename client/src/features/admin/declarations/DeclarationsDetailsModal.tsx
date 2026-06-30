import {useEffect, useMemo, useState} from 'react';

import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';

import {useSnackbar} from '../../../context/SnackbarContext';
import {
  STATUS_COLORS,
  STATUS_TRANSLATIONS,
  STATUS_TRANSITIONS,
} from '../../../services/declarationConstants';
import type {
  Declaration,
  DeclarationStatus,
  JobFunction,
} from '../../../services/declarationsService';
import {declarationService} from '../../../services/declarationsService';
import type {ServiceError} from '../../../services/common';
import {
  formatOracleDate,
  formatOracleTime,
  parseOracleToTimeInput
} from '../../../services/common';
import ModalForm from '../../../components/modals/ModalForm';
import {
  officialFunctionService,
  type OfficialFunction,
} from '../../../services/officialFunctionService';

interface AdminDeclarationDetailModalProps {
  open: boolean;
  declaration: Declaration | null;
  onClose: () => void;
  onStatusChange: () => void;
  loading: boolean;
}

function calcTotalDeclaredHours(jobFunctions: JobFunction[]): number {
  let total = 0;
  for (const jf of jobFunctions) {
    if (!jf.starts_at || !jf.ends_at) continue;
    const start = parseOracleToTimeInput(jf.starts_at);
    const end = parseOracleToTimeInput(jf.ends_at);
    if (!start || !end) continue;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let dailyHours = (eh * 60 + em - (sh * 60 + sm)) / 60;
    if (dailyHours < 0) dailyHours += 24;
    let multiplier = 0;
    const freq = jf.frequency?.toLowerCase() || '';
    if (freq.includes('diario') || freq === 'diario') multiplier = 5;
    else if (freq.includes('semanal') || freq === 'semanal') multiplier = 1;
    else if (freq.includes('quincenal')) multiplier = 2;
    else if (freq.includes('mensual')) multiplier = 4;
    else if (freq.includes('anual')) multiplier = 0.02;
    else multiplier = 1; // por defecto semanal
    total += dailyHours * multiplier;
  }
  return Math.round(total * 100) / 100;
}

function calcWeeklyShiftHours(
  startOracle: string | undefined,
  endOracle: string | undefined,
): number {
  if (!startOracle || !endOracle) return 0;
  const startHHMM = parseOracleToTimeInput(startOracle);
  const endHHMM = parseOracleToTimeInput(endOracle);
  if (!startHHMM || !endHHMM) return 0;
  const [sh, sm] = startHHMM.split(':').map(Number);
  const [eh, em] = endHHMM.split(':').map(Number);
  let dailyHours = (eh * 60 + em - (sh * 60 + sm)) / 60;
  if (dailyHours < 0) dailyHours += 24;
  return dailyHours * 5;
}

type FunctionLabel = {
  label: string;
  chipColor: 'primary' | 'secondary' | 'warning' | 'default';
};

function resolveFunctionLabel(
  jf: JobFunction,
  officialFnsForJob: OfficialFunction[],
): FunctionLabel {
  if (jf.function_type === 'custom') {
    return {label: 'Personalizada', chipColor: 'secondary'};
  }
  if (jf.function_type === 'official') {
    const isOwnJob = officialFnsForJob.some(
      (f) => f.id === jf.official_function_id,
    );
    return isOwnJob
      ? {label: 'Propia del Cargo', chipColor: 'primary'}
      : {label: 'De otro Cargo', chipColor: 'warning'};
  }
  return {label: 'Oficial', chipColor: 'default'};
}

export default function DeclarationsDetailsModal(
  {
    open,
    declaration,
    onClose,
    onStatusChange,
    loading,
  }: AdminDeclarationDetailModalProps) {
  const snackbar = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [localDeclaration, setLocalDeclaration] = useState<Declaration | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<DeclarationStatus | ''>('');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [officialFnsForJob, setOfficialFnsForJob] = useState<OfficialFunction[]>([]);
  const [loadingOfficialFns, setLoadingOfficialFns] = useState(false);

  useEffect(() => {
    if (declaration) setLocalDeclaration(declaration);
  }, [declaration]);

  useEffect(() => {
    if (!open) {
      setSelectedStatus('');
      setStatusDialogOpen(false);
      setIsChangingStatus(false);
      setStatusError(null);
    }
  }, [open]);

  useEffect(() => {
    let isMounted = true;
    const jobId = localDeclaration?.job_position?.job_id;

    if (!open || !jobId) {
      setTimeout(() => {
        if (isMounted) setOfficialFnsForJob([]);
      }, 0);
      return;
    }

    setTimeout(() => {
      if (isMounted) setLoadingOfficialFns(true);
    }, 0);

    officialFunctionService
      .getOfficialFunctions({job_id: jobId, limit: 100})
      .then((r) => {
        if (isMounted) {
          setOfficialFnsForJob(r.data.filter((f) => !f.is_deleted));
        }
      })
      .catch(() => {
        if (isMounted) {
          setOfficialFnsForJob([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingOfficialFns(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [open, localDeclaration?.job_position?.job_id]);

  const validNextStatuses = useMemo(() => {
    if (!localDeclaration) return [];
    const current = localDeclaration.current_status;
    return STATUS_TRANSITIONS[current as keyof typeof STATUS_TRANSITIONS] ?? [];
  }, [localDeclaration]);

  const handleOpenStatusChange = () => {
    setSelectedStatus('');
    setStatusError(null);
    setStatusDialogOpen(true);
  };

  const handleStatusChangeConfirm = async () => {
    if (!localDeclaration || !selectedStatus) return;

    setIsChangingStatus(true);
    setStatusError(null);

    try {
      await declarationService.changeStatus(localDeclaration.declaration_id, {
        status: selectedStatus as DeclarationStatus,
      });

      const updated = await declarationService.getDeclarationById(
        localDeclaration.declaration_id,
        true
      );
      setLocalDeclaration(updated);
      setStatusDialogOpen(false);
      snackbar.success('Estado actualizado correctamente');
      onStatusChange();
    } catch (error) {
      const e = error as ServiceError;
      setStatusError(e.message ?? 'Error al cambiar el estado.');
      snackbar.error(e.message ?? 'Error al cambiar el estado.');
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleCloseStatusDialog = () => {
    if (isChangingStatus) return;
    setStatusDialogOpen(false);
    setSelectedStatus('');
    setStatusError(null);
  };

  if (!localDeclaration && !loading) return null;

  const {
    job_position,
    job,
    shift_starts_at,
    shift_ends_at,
    justification,
    current_status,
    created_at,
    status_history,
    job_functions = [],
    user,
  } = localDeclaration || {};

  const translatedStatus = current_status
    ? STATUS_TRANSLATIONS[current_status as keyof typeof STATUS_TRANSLATIONS]
    : '';
  const statusColor = current_status
    ? STATUS_COLORS[current_status as keyof typeof STATUS_COLORS]
    : '#757575';

  const isStatusEligibleForChange = ['completed', 'revision'].includes(
    current_status?.toLowerCase() ?? ''
  );
  const canChangeStatus = isStatusEligibleForChange && validNextStatuses.length > 0;

  const totalDeclaredHours = calcTotalDeclaredHours(job_functions);
  const weeklyShiftHours = calcWeeklyShiftHours(shift_starts_at, shift_ends_at);
  const shiftHoursKnown = weeklyShiftHours > 0;
  const isHoursExceeded = shiftHoursKnown && totalDeclaredHours > weeklyShiftHours;

  const declaredOfficialIds = new Set(
    job_functions
      .filter((jf) => jf.function_type === 'official' && jf.official_function_id)
      .map((jf) => jf.official_function_id as string),
  );

  const catalogFunctions = officialFnsForJob.filter(
    (fn) => !declaredOfficialIds.has(fn.id),
  );

  const showFunctionsSection =
    job_functions.length > 0 || catalogFunctions.length > 0 || loadingOfficialFns;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
              PaperProps={{
                sx: {
                  m: {xs: 1, sm: 4},
                  width: {xs: 'calc(100% - 16px)', sm: 'auto'}
                }
              }}>
        <DialogTitle sx={{pb: 1, pt: 2}}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
            flexWrap="wrap"
          >
            <Typography variant="h6" fontWeight={600}>
              Detalles de la Declaración
            </Typography>
            <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>
              {current_status && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    bgcolor: statusColor + '10',
                    px: 2,
                    py: 0.5,
                    borderRadius: 20,
                    border: `1px solid ${statusColor}30`,
                  }}
                >
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: statusColor,
                      display: 'inline-block',
                    }}
                  />
                  <Typography variant="body2" fontWeight={600}
                              sx={{color: statusColor}}>
                    {translatedStatus}
                  </Typography>
                </Box>
              )}
              {canChangeStatus && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleOpenStatusChange}
                  size="small"
                >
                  Cambiar Estado
                </Button>
              )}
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{pt: 3}}>
          {loading ? (
            <Box sx={{display: 'flex', justifyContent: 'center', py: 6}}>
              <CircularProgress size={40}/>
            </Box>
          ) : (
            <Stack spacing={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  bgcolor: 'background.default',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Grid container spacing={3}>
                  <Grid size={{xs: 12, md: 6}}>
                    <Stack spacing={1.5}>
                      <Typography variant="overline" color="text.secondary"
                                  sx={{letterSpacing: 1}}>
                        Puesto
                      </Typography>
                      <Typography variant="h6" fontWeight={500}>
                        {job?.job_code ? `(${job.job_code}) ` : ''}
                        {job?.name ?? '—'}
                      </Typography>
                      <Stack direction="row" spacing={4}>
                        <Box>
                          <Typography variant="caption" color="text.secondary"
                                      display="block">
                            Número de Plaza
                          </Typography>
                          <Typography variant="body2" fontWeight={500}>
                            {job_position?.job_position_number ?? '—'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary"
                                      display="block">
                            Jornada
                          </Typography>
                          <Typography variant="body2" fontWeight={500}>
                            {job_position?.job_shift ?? '—'}
                          </Typography>
                        </Box>
                      </Stack>
                      {job_position?.description && (
                        <Box>
                          <Typography variant="caption" color="text.secondary"
                                      display="block">
                            Descripción
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {job_position.description}
                          </Typography>
                        </Box>
                      )}

                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {[
                            user?.first_name,
                            user?.second_name,
                            user?.first_last_name,
                            user?.second_last_name,
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user?.email}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>

                  <Grid size={{xs: 12, md: 6}}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="overline" color="text.secondary"
                                    sx={{letterSpacing: 1}}>
                          Horario Laboral
                        </Typography>
                        <Stack direction="row" spacing={4} sx={{mt: 0.5}}>
                          <Box>
                            <Typography variant="caption"
                                        color="text.secondary">
                              Inicio
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {formatOracleTime(shift_starts_at ?? '')}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption"
                                        color="text.secondary">
                              Fin
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {formatOracleTime(shift_ends_at ?? '')}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                      <Divider/>
                      <Box>
                        <Typography variant="caption" color="text.secondary"
                                    display="block">
                          Fecha de creación
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {formatOracleDate(created_at ?? '', true)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                </Grid>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  bgcolor: 'background.default',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="overline" color="text.secondary"
                            sx={{letterSpacing: 1}}>
                  Justificación
                </Typography>
                <Typography variant="body2"
                            sx={{whiteSpace: 'pre-wrap', mt: 0.5}}>
                  {justification || 'Sin justificación'}
                </Typography>
              </Paper>

              {showFunctionsSection && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    bgcolor: 'background.default',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Stack
                    direction={{xs: 'column', sm: 'row'}}
                    justifyContent="space-between"
                    alignItems={{xs: 'flex-start', sm: 'center'}}
                    flexWrap="wrap"
                    gap={1}
                    sx={{mb: 2}}
                  >
                    <Typography
                      variant="overline"
                      color="text.secondary"
                      sx={{letterSpacing: 1}}
                    >
                      Funciones Declaradas ({job_functions.length})
                    </Typography>

                    <Stack direction="row" alignItems="center" spacing={1}
                           flexWrap="wrap">
                      <Typography variant="caption" color="text.secondary">
                        Horas semanales declaradas:
                      </Typography>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          px: 1.5,
                          py: 0.25,
                          borderRadius: 10,
                          border: '1px solid',
                          borderColor: isHoursExceeded ? 'error.main' : 'divider',
                          bgcolor: isHoursExceeded ? 'error.main' + '10' : 'transparent',
                        }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          color={isHoursExceeded ? 'error.main' : 'text.primary'}
                        >
                          {Number(totalDeclaredHours)}
                        </Typography>
                        {shiftHoursKnown && (
                          <Typography variant="body2" color="text.secondary"
                                      fontWeight={400}>
                            /{' '}
                            {weeklyShiftHours % 1 === 0
                              ? weeklyShiftHours
                              : weeklyShiftHours.toFixed(1)}{' '}
                            h
                          </Typography>
                        )}
                      </Box>
                      {isHoursExceeded && (
                        <Chip
                          label="Excede jornada"
                          size="small"
                          color="error"
                          variant="filled"
                          sx={{fontSize: '0.65rem', height: 20}}
                        />
                      )}
                    </Stack>
                  </Stack>

                  {isMobile ? (
                    <Stack spacing={1.5}>
                      {/* Funciones declaradas */}
                      {job_functions.map((jf: JobFunction) => {
                        const {
                          label,
                          chipColor
                        } = resolveFunctionLabel(jf, officialFnsForJob);
                        return (
                          <Paper
                            key={jf.job_function_id}
                            elevation={0}
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              border: '1px solid',
                              borderColor: 'divider'
                            }}
                          >
                            <Stack direction="row" spacing={1}
                                   alignItems="center" sx={{mb: 0.5}}>
                              <Chip
                                label={label}
                                size="small"
                                color={chipColor}
                                variant="outlined"
                                sx={{fontSize: '0.65rem', height: 20}}
                              />
                              <Typography variant="body2" fontWeight={500}>
                                {jf.function_name || '—'}
                              </Typography>
                            </Stack>
                            <Typography variant="caption" color="text.secondary"
                                        sx={{display: 'block'}}>
                              {jf.function_description || 'Sin descripción'}
                            </Typography>
                            {jf.justification && (
                              <Typography variant="caption"
                                          color="text.secondary"
                                          sx={{
                                            fontStyle: 'italic',
                                            display: 'block'
                                          }}>
                                Justif: {jf.justification}
                              </Typography>
                            )}
                            <Box sx={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 1.5,
                              mt: 1
                            }}>
                              <Typography variant="caption">
                                <strong>Horario:</strong>{' '}
                                {formatOracleTime(jf.starts_at)} - {formatOracleTime(jf.ends_at)}
                              </Typography>
                              <Typography variant="caption">
                                <strong>Frecuencia:</strong> {jf.frequency || '—'}
                              </Typography>
                              <Typography variant="caption">
                                <strong>Extras:</strong> {jf.overtime ? 'Sí' : 'No'}
                              </Typography>
                            </Box>
                          </Paper>
                        );
                      })}

                      {/* Catálogo de funciones no declaradas */}
                      {!loadingOfficialFns && catalogFunctions.map((fn) => (
                        <Paper
                          key={fn.id}
                          elevation={0}
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'action.hover',
                            opacity: 0.8
                          }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center"
                                 sx={{mb: 0.5}}>
                            <Chip
                              label="Propia del Cargo"
                              size="small"
                              color="info"
                              variant="outlined"
                              sx={{fontSize: '0.65rem', height: 20}}
                            />
                            <Typography variant="body2" fontWeight={500}>
                              {fn.name}
                            </Typography>
                          </Stack>
                          <Typography variant="caption" color="text.secondary"
                                      sx={{display: 'block'}}>
                            {fn.description || 'Sin descripción'}
                          </Typography>
                        </Paper>
                      ))}
                      {loadingOfficialFns && (
                        <Stack direction="row" justifyContent="center"
                               alignItems="center" spacing={1} sx={{py: 2}}>
                          <CircularProgress size={16}/>
                          <Typography variant="caption" color="text.secondary">
                            Cargando funciones del cargo…
                          </Typography>
                        </Stack>
                      )}
                    </Stack>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{
                            '& th': {
                              fontWeight: 600,
                              color: 'text.secondary'
                            }
                          }}>
                            <TableCell>Función</TableCell>
                            <TableCell>Tiempo</TableCell>
                            <TableCell>Frecuencia</TableCell>
                            <TableCell>Extras</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {job_functions.map((jf: JobFunction) => {
                            const {
                              label,
                              chipColor
                            } = resolveFunctionLabel(jf, officialFnsForJob);
                            return (
                              <TableRow
                                key={jf.job_function_id}
                                sx={{
                                  '&:nth-of-type(odd)': {bgcolor: 'action.hover'},
                                  '&:last-child td, &:last-child th': {border: 0},
                                }}
                              >
                                <TableCell>
                                  <Stack spacing={0.5}>
                                    <Stack direction="row" spacing={1}
                                           alignItems="center">
                                      <Chip
                                        label={label}
                                        size="small"
                                        color={chipColor}
                                        variant="outlined"
                                        sx={{
                                          fontSize: '0.65rem',
                                          height: 20,
                                          flexShrink: 0
                                        }}
                                      />
                                      <Typography variant="body2"
                                                  fontWeight={500}>
                                        {jf.function_name || '—'}
                                      </Typography>
                                    </Stack>
                                    <Typography variant="caption"
                                                color="text.secondary">
                                      {jf.function_description || 'Sin descripción'}
                                    </Typography>
                                    {jf.justification && (
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{fontStyle: 'italic'}}
                                      >
                                        Justif: {jf.justification}
                                      </Typography>
                                    )}
                                  </Stack>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">
                                    {formatOracleTime(jf.starts_at)} –{' '}
                                    {formatOracleTime(jf.ends_at)}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={jf.frequency || '—'}
                                    size="small"
                                    variant="outlined"
                                    sx={{fontSize: '0.7rem', height: 22}}
                                  />
                                </TableCell>
                                <TableCell>{jf.overtime ? 'Sí' : 'No'}</TableCell>
                              </TableRow>
                            );
                          })}

                          {loadingOfficialFns && (
                            <TableRow>
                              <TableCell colSpan={5} align="center"
                                         sx={{py: 3}}>
                                <Stack direction="row" justifyContent="center"
                                       alignItems="center" spacing={1}>
                                  <CircularProgress size={16}/>
                                  <Typography variant="caption"
                                              color="text.secondary">
                                    Cargando funciones del cargo…
                                  </Typography>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          )}

                          {!loadingOfficialFns &&
                            catalogFunctions.map((fn) => (
                              <TableRow
                                key={fn.id}
                                sx={{
                                  bgcolor: 'action.hover',
                                  opacity: 0.8,
                                  '&:last-child td, &:last-child th': {border: 0},
                                }}
                              >
                                <TableCell>
                                  <Stack spacing={0.5}>
                                    <Stack direction="row" spacing={1}
                                           alignItems="center">
                                      <Chip
                                        label="Propia del Cargo"
                                        size="small"
                                        color="info"
                                        variant="outlined"
                                        sx={{
                                          fontSize: '0.65rem',
                                          height: 20,
                                          flexShrink: 0
                                        }}
                                      />
                                      <Typography variant="body2"
                                                  fontWeight={500}>
                                        {fn.name}
                                      </Typography>
                                    </Stack>
                                    <Typography variant="caption"
                                                color="text.secondary">
                                      {fn.description || 'Sin descripción'}
                                    </Typography>
                                  </Stack>
                                </TableCell>
                                <TableCell>—</TableCell>
                                <TableCell>—</TableCell>
                                <TableCell>—</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Paper>
              )}

              {/* Historial de estados */}
              {status_history && status_history.length > 0 && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    bgcolor: 'background.default',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="overline" color="text.secondary"
                              sx={{letterSpacing: 1}}>
                    Historial de Estados
                  </Typography>
                  <Stack spacing={1.5} sx={{mt: 1}}>
                    {status_history.map((entry, index) => {
                      const histStatus = entry.status_value;
                      const histTranslated =
                        STATUS_TRANSLATIONS[histStatus as keyof typeof STATUS_TRANSLATIONS] || histStatus;
                      const histColor = STATUS_COLORS[histStatus as keyof typeof STATUS_COLORS] || '#757575';
                      const isLast = index === status_history.length - 1;

                      return (
                        <Box
                          key={entry.declaration_status_id || index}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            position: 'relative',
                            pb: isLast ? 0 : 1.5,
                            '&:not(:last-child)::after': {
                              content: '""',
                              position: 'absolute',
                              left: 5,
                              top: 20,
                              bottom: 0,
                              width: 2,
                              bgcolor: 'divider',
                            },
                          }}
                        >
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: histColor,
                              border: `2px solid ${histColor}40`,
                              flexShrink: 0,
                              zIndex: 1,
                            }}
                          />
                          <Stack direction="row" justifyContent="space-between"
                                 width="100%">
                            <Typography variant="body2" fontWeight={500}>
                              {histTranslated}
                            </Typography>
                            <Typography variant="caption"
                                        color="text.secondary">
                              {formatOracleDate(entry.created_at, true)}
                            </Typography>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                </Paper>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{p: 2}}>
          <Button onClick={onClose} variant="contained" color="primary"
                  sx={{borderRadius: 20}}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <ModalForm
        open={statusDialogOpen}
        title="Cambiar Estado de la Declaración"
        onClose={handleCloseStatusDialog}
        onConfirm={handleStatusChangeConfirm}
        confirmLabel="Aplicar Cambio"
        isSubmitting={isChangingStatus}
        confirmDisabled={!selectedStatus || isChangingStatus}
      >
        <Box sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
          <Typography variant="body2" color="text.secondary">
            Al confirmar, la declaración pasará del estado{' '}
            <strong>{translatedStatus}</strong> al seleccionado:
          </Typography>

          <Box sx={{mt: 1}}>
            <Typography variant="body2" sx={{mb: 1, fontWeight: 500}}>
              Nuevo estado
            </Typography>
            <Select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as DeclarationStatus);
                setStatusError(null);
              }}
              fullWidth
              disabled={isChangingStatus}
              size="small"
              displayEmpty
            >
              <MenuItem value="" disabled></MenuItem>
              {validNextStatuses.map((s) => (
                <MenuItem key={s} value={s}>
                  {STATUS_TRANSLATIONS[s as keyof typeof STATUS_TRANSLATIONS] ?? s}
                </MenuItem>
              ))}
            </Select>
          </Box>

          {statusError && (
            <Typography variant="body2" color="error">
              {statusError}
            </Typography>
          )}
        </Box>
      </ModalForm>
    </>
  );
}