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
} from '@mui/material';
import {
  formatOracleDate,
  formatOracleTime,
  parseOracleToTimeInput,
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
import html2canvas from "html2canvas";
import {jsPDF} from "jspdf";

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

/**
 * Sums the expected_time of every declared job function.
 * expected_time is treated as hours (weekly basis).
 */
function calcTotalDeclaredHours(jobFunctions: JobFunction[]): number {
  return jobFunctions.reduce((sum, jf) => sum + (jf.expected_time ?? 0), 0);
}

/**
 * Derives the weekly shift hours from the Oracle-format start/end strings.
 * Assumes a 5-day work week. Returns 0 when times cannot be parsed.
 */
function calcWeeklyShiftHours(
  startOracle: string | undefined,
  endOracle: string | undefined,
): number {
  if (!startOracle || !endOracle) return 0;
  const startHHMM = parseOracleToTimeInput(startOracle); // "HH:MM"
  const endHHMM = parseOracleToTimeInput(endOracle);
  if (!startHHMM || !endHHMM) return 0;
  const [sh, sm] = startHHMM.split(':').map(Number);
  const [eh, em] = endHHMM.split(':').map(Number);
  const dailyHours = Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
  return dailyHours * 5;
}

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
  const contentRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    const element = contentRef.current;
    if (!element) return;

    const originalStyle = element.style.cssText;

    // Force the view to expand
    element.style.overflow = "visible";
    element.style.maxHeight = "none";
    element.style.height = "auto";

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(
          "declaration-content"
        );
        if (clonedElement) {
          clonedElement.style.overflow = "visible";
          clonedElement.style.maxHeight = "none";
        }
      }
    });

    element.style.cssText = originalStyle;

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`declaracion_plaza#${job_position?.job_position_number || 'export'}.pdf`);
  };

  useEffect(() => {
    const jobId = declaration?.job?.job_id;
    if (!open || !jobId) {
      setOfficialFnsForJob([]);
      return;
    }
    setLoadingOfficialFns(true);
    officialFunctionService
      .getOfficialFunctions({job_id: jobId, limit: 100})
      .then((r) => setOfficialFnsForJob(
        r.data.filter((f) => f.is_deleted === 0))
      )
      .catch(() => setOfficialFnsForJob([]))
      .finally(() => setLoadingOfficialFns(false));
  }, [open, declaration?.job?.job_id]);

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

  const totalDeclaredHours = calcTotalDeclaredHours(job_functions);
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{pb: 1, pt: 2}}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
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
          {/* Position and Job Hours */}
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
              {/* job info */}
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

              {/* schedule and creation date */}
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

          {/* Justification */}
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
              {/* Section header + weekly hours */}
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

                {/* Weekly hours badge */}
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
            </Paper>
          )}

          {/* Status history */}
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
