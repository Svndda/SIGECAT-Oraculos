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
} from '../../services/common';
import {
  STATUS_COLORS,
  STATUS_TRANSLATIONS,
} from '../../services/declarationConstants';
import type {
  Declaration,
  JobFunction,
} from '../../services/declarationsService';

interface EmployeeDeclarationDetailModalProps {
  open: boolean;
  declaration: Declaration | null;
  onClose: () => void;
  loading?: boolean;
}

export default function EmployeeDeclarationDetailModal({
  open,
  declaration,
  onClose,
  loading = false,
}: EmployeeDeclarationDetailModalProps) {
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1, pt: 2 }}>
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
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ color: statusColor }}
              >
                {translatedStatus}
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={40} />
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
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1.5}>
                    <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                      Puesto
                    </Typography>
                    <Typography variant="h6" fontWeight={500}>
                      {job?.job_code ? `(${job.job_code}) ` : ''}
                      {job?.name ?? '—'}
                    </Typography>
                    <Divider sx={{ my: 0.5 }} />
                    <Stack direction="row" spacing={4}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Número de Plaza
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {job_position?.job_position_number ?? '—'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Jornada
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {job_position?.job_shift ?? '—'}
                        </Typography>
                      </Box>
                    </Stack>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Descripción
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {job_position?.description ?? '—'}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>

                {/* Columna derecha: Horario y creación */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                        Horario Laboral
                      </Typography>
                      <Stack direction="row" spacing={4} sx={{ mt: 0.5 }}>
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
                    <Divider />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
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
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                Justificación
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
                {justification || 'Sin justificación'}
              </Typography>
            </Paper>

            {job_functions && job_functions.length > 0 && (
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
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                  Funciones Declaradas ({job_functions.length})
                </Typography>
                <TableContainer sx={{ mt: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { fontWeight: 600, color: 'text.secondary' } }}>
                        <TableCell>Función</TableCell>
                        <TableCell>Horario</TableCell>
                        <TableCell>Frecuencia</TableCell>
                        <TableCell>Tiempo</TableCell>
                        <TableCell>Extras</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {job_functions.map((jf: JobFunction) => (
                        <TableRow
                          key={jf.job_function_id}
                          sx={{
                            '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                            '&:last-child td, &:last-child th': { border: 0 },
                          }}
                        >
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                  label={jf.function_type === 'official' ? 'Oficial' : 'Personalizada'}
                                  size="small"
                                  color={jf.function_type === 'official' ? 'primary' : 'secondary'}
                                  variant="outlined"
                                  sx={{ fontSize: '0.65rem', height: 20 }}
                                />
                                <Typography variant="body2" fontWeight={500}>
                                  {jf.function_name || '—'}
                                </Typography>
                              </Stack>
                              <Typography variant="caption" color="text.secondary">
                                {jf.function_description || 'Sin descripción'}
                              </Typography>
                              {jf.justification && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                  Justif: {jf.justification}
                                </Typography>
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatOracleTime(jf.starts_at)} - {formatOracleTime(jf.ends_at)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={jf.frequency || '—'}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 22 }}
                            />
                          </TableCell>
                          <TableCell>
                            {jf.expected_time !== undefined && jf.expected_time !== null
                              ? `${jf.expected_time} h`
                              : '—'}
                          </TableCell>
                          <TableCell>
                            {jf.overtime ? 'Sí' : 'No'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
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
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                  Historial de Estados
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 1 }}>
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
                        <Stack direction="row" justifyContent="space-between" width="100%">
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

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" color="primary" sx={{ borderRadius: 20 }}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}