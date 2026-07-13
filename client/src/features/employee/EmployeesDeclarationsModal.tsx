import {useEffect, useRef, useState} from 'react';
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
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  formatOracleDate,
  formatOracleTime,
} from '../../services/common';
import {
  STATUS_COLORS,
  STATUS_TRANSLATIONS,
} from '../../services/declarationConstants';
import type {
  Declaration,
  JobFunction,
} from '../../services/declarationsService';
import {
  officialFunctionService,
  type OfficialFunction,
} from '../../services/officialFunctionService';
import {
  restTimeService,
  REST_TYPE_LABELS,
  type RestTimeResponse
} from '../../services/restTimeService';
import {
  licenseService,
  type LicenseResponse
} from '../../services/licenseService';
import {
  calcTotalDeclaredHours,
  calcWeeklyShiftHours,
  sumDurationsInHours,
  exportDeclarationCsv,
  exportElementToPdf,
  declarationPdfFilename,
} from '../../utils/declarationExport';

interface EmployeeDeclarationDetailModalProps {
  open: boolean;
  declaration: Declaration | null;
  onClose: () => void;
  loading?: boolean;
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

export default function EmployeeDeclarationDetailModal(
  {
    open,
    declaration,
    onClose,
    loading = false,
  }: EmployeeDeclarationDetailModalProps) {
  const [officialFnsForJob, setOfficialFnsForJob] = useState<OfficialFunction[]>([]);
  const [loadingOfficialFns, setLoadingOfficialFns] = useState(false);
  const [restTimes, setRestTimes] = useState<RestTimeResponse[]>([]);
  const [licenseTimes, setLicenseTimes] = useState<LicenseResponse[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleExportPDF = async () => {
    const element = contentRef.current;
    if (!element || !declaration) return;
    await exportElementToPdf(element, declarationPdfFilename(declaration));
  };

  useEffect(() => {
    let isMounted = true;
    const jobId = declaration?.job_position?.job_id;
    const declId = declaration?.declaration_id;

    if (!open || !jobId) {
      setTimeout(() => {
        if (isMounted) {
          setOfficialFnsForJob([]);
          setRestTimes([]);
          setLicenseTimes([]);
        }
      }, 0);
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingOfficialFns(true);
    setLoadingExtra(true);

    // Fetch official functions
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

    // Fetch rest times and license times if declaration id exists
    if (declId) {
      Promise.all([
        restTimeService.getRestTimesByDeclaration(declId),
        licenseService.getLicensesByDeclaration(declId),
      ])
        .then(([rests, licenses]) => {
          if (isMounted) {
            setRestTimes(rests);
            setLicenseTimes(licenses);
          }
        })
        .catch(() => {
          if (isMounted) {
            setRestTimes([]);
            setLicenseTimes([]);
          }
        })
        .finally(() => {
          if (isMounted) {
            setLoadingExtra(false);
          }
        });
    } else {
      setRestTimes([]);
      setLicenseTimes([]);
      setLoadingExtra(false);
    }

    return () => {
      isMounted = false;
    };
  }, [open, declaration?.job_position?.job_id, declaration?.declaration_id]);

  if (!declaration && !loading) return null;

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
  } = declaration || {};

  const translatedStatus = current_status ? STATUS_TRANSLATIONS[current_status] : '';
  const statusColor = current_status ? STATUS_COLORS[current_status] : '#757575';

  const baseFunctionHours = calcTotalDeclaredHours(job_functions);
  const restHours = sumDurationsInHours(restTimes);
  const licenseHours = sumDurationsInHours(licenseTimes);
  const totalDeclaredHours = baseFunctionHours + restHours + licenseHours;
  const weeklyShiftHours = calcWeeklyShiftHours(shift_starts_at, shift_ends_at);
  const shiftHoursKnown = weeklyShiftHours > 0;
  const isHoursExceeded = shiftHoursKnown && totalDeclaredHours > weeklyShiftHours;

  const declaredOfficialIds = new Set(
    job_functions
      .filter((jf) => jf.function_type === 'official'
        && jf.official_function_id)
      .map((jf) => jf.official_function_id as string),
  );

  const catalogFunctions = officialFnsForJob.filter(
    (fn) => !declaredOfficialIds.has(fn.id),
  );

  const showFunctionsSection =
    job_functions.length > 0 || catalogFunctions.length > 0 || loadingOfficialFns;

  const hasExtraEntries = restTimes.length > 0 || licenseTimes.length > 0 || loadingExtra;

  const handleExportCSV = () => {
    if (!declaration) return;
    exportDeclarationCsv(declaration, restTimes, licenseTimes, officialFnsForJob);
  };

  return (
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
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{pt: 3}} ref={contentRef}
                     id="declaration-content">{loading ? (
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
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{letterSpacing: 1}}
                  >
                    Puesto
                  </Typography>
                  <Typography variant="h6" fontWeight={500}>
                    {job?.job_code ? `(${job.job_code}) ` : ''}
                    {job?.name ?? '—'}
                  </Typography>
                  <Divider sx={{my: 0.5}}/>
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
                  <Box>
                    <Typography variant="caption" color="text.secondary"
                                display="block">
                      Descripción
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {job_position?.description ?? '—'}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>

              <Grid size={{xs: 12, md: 6}}>
                <Stack spacing={2}>
                  <Box>
                    <Typography
                      variant="overline"
                      color="text.secondary"
                      sx={{letterSpacing: 1}}
                    >
                      Horario Laboral
                    </Typography>
                    <Stack direction="row" spacing={4} sx={{mt: 0.5}}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Inicio
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {formatOracleTime(shift_starts_at)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Fin
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {formatOracleTime(shift_ends_at)}
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
                      {formatOracleDate(created_at, true)}
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
                  {job_functions.map((jf: JobFunction) => {
                    const {label, chipColor} = resolveFunctionLabel(jf, officialFnsForJob);
                    return (
                      <Paper
                        key={jf.job_function_id}
                        elevation={0}
                        sx={{p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider'}}
                      >
                        <Stack direction="row" spacing={1} alignItems="center" sx={{mb: 0.5}}>
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
                        <Typography variant="caption" color="text.secondary" sx={{display: 'block'}}>
                          {jf.function_description || 'Sin descripción'}
                        </Typography>
                        {jf.justification && (
                          <Typography variant="caption" color="text.secondary"
                                      sx={{fontStyle: 'italic', display: 'block'}}>
                            Justif: {jf.justification}
                          </Typography>
                        )}
                        <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1}}>
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
                      <Stack direction="row" spacing={1} alignItems="center" sx={{mb: 0.5}}>
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
                      <Typography variant="caption" color="text.secondary" sx={{display: 'block'}}>
                        {fn.description || 'Sin descripción'}
                      </Typography>
                    </Paper>
                  ))}

                  {loadingOfficialFns && (
                    <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} sx={{py: 2}}>
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
                                  <Typography variant="body2" fontWeight={500}>
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
                          <TableCell colSpan={5} align="center" sx={{py: 3}}>
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
                                  <Typography variant="body2" fontWeight={500}>
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

          {hasExtraEntries && (
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
              <Stack spacing={2}>
                <Typography variant="overline" color="text.secondary"
                            sx={{letterSpacing: 1}}>
                  Descansos y Licencias
                </Typography>

                {loadingExtra ? (
                  <Box sx={{display: 'flex', justifyContent: 'center', py: 2}}>
                    <CircularProgress size={24}/>
                  </Box>
                ) : (
                  <>
                    {restTimes.length > 0 && (
                      <>
                        <Typography variant="subtitle2" fontWeight={600}>
                          Descansos
                        </Typography>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{
                                '& th': {
                                  fontWeight: 600,
                                  color: 'text.secondary'
                                }
                              }}>
                                <TableCell>Tipo</TableCell>
                                <TableCell>Inicio</TableCell>
                                <TableCell>Fin</TableCell>
                                <TableCell>Duración (min)</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {restTimes.map((rt) => {
                                const start = new Date(rt.starts_at);
                                const end = new Date(rt.ends_at);
                                const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
                                return (
                                  <TableRow key={rt.rest_time_id}>
                                    <TableCell>{REST_TYPE_LABELS[rt.rest_type]}</TableCell>
                                    <TableCell>{formatOracleTime(rt.starts_at)}</TableCell>
                                    <TableCell>{formatOracleTime(rt.ends_at)}</TableCell>
                                    <TableCell>{minutes}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                        <Divider/>
                      </>
                    )}

                    {licenseTimes.length > 0 && (
                      <>
                        <Typography variant="subtitle2" fontWeight={600}>
                          Licencias
                        </Typography>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{
                                '& th': {
                                  fontWeight: 600,
                                  color: 'text.secondary'
                                }
                              }}>
                                <TableCell>Tipo</TableCell>
                                <TableCell>Inicio</TableCell>
                                <TableCell>Fin</TableCell>
                                <TableCell>Duración (min)</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {licenseTimes.map((lic) => {
                                const start = new Date(lic.starts_at);
                                const end = new Date(lic.ends_at);
                                const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
                                return (
                                  <TableRow key={lic.license_time_id}>
                                    <TableCell>{lic.license_type_name || '—'}</TableCell>
                                    <TableCell>{formatOracleTime(lic.starts_at)}</TableCell>
                                    <TableCell>{formatOracleTime(lic.ends_at)}</TableCell>
                                    <TableCell>{minutes}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </>
                    )}
                  </>
                )}
              </Stack>
            </Paper>
          )}

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
                  const histTranslated = STATUS_TRANSLATIONS[histStatus] || histStatus;
                  const histColor = STATUS_COLORS[histStatus] || '#757575';
                  const isLast = index === status_history.length - 1;

                  return (
                    <Box
                      key={entry.declaration_status_id}
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
                        <Typography variant="caption" color="text.secondary">
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
        <Button
          onClick={handleExportCSV}
          variant="outlined"
          color="primary"
          sx={{borderRadius: 20, mr: 1}}
        >
          Descargar CSV
        </Button>
        <Button
          onClick={handleExportPDF}
          variant="outlined"
          color="primary"
          sx={{borderRadius: 20, mr: 1}}
        >
          Descargar PDF
        </Button>
        <Button onClick={onClose} variant="contained" color="primary"
                sx={{borderRadius: 20}}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}