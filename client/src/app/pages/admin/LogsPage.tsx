import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

import { logService, type SystemLog } from '../../../services/logService';
import { userService, type AdminUser } from '../../../services/userService';
import {
  activityMeta,
  affectedLabel,
  contextRows,
  isBusinessEvent,
  SEVERITY_META,
  type Severity,
} from '../../../services/activityLog';
import { formatOracleDate, parseOracleDate, type ServiceError } from '../../../services/common';
import { useSnackbar } from '../../../context/SnackbarContext';

const PAGE_SIZE = 15;
/** How many recent business events to sample and classify on the client. */
const SAMPLE_SIZE = 300;

interface Actor {
  name: string;
  email: string | null;
}

/** Resolves the acting user of an entry from the id→user map. */
function resolveActor(log: SystemLog, users: Map<string, AdminUser>): Actor {
  if (!log.user_id) return { name: 'Sistema', email: null };
  const user = users.get(log.user_id);
  if (!user) return { name: 'Usuario eliminado', email: null };
  return { name: `${user.first_name} ${user.last_name}`.trim(), email: user.email };
}

export default function LogsPage() {
  const snackbar = useSnackbar();
  const theme = useTheme();
  // Below the table's comfortable width, switch to stacked cards so records are
  // read top-to-bottom instead of needing a horizontal scroll.
  const isCompact = useMediaQuery(theme.breakpoints.down('lg'));

  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [users, setUsers] = useState<Map<string, AdminUser>>(new Map());
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<SystemLog | null>(null);
  const [detail, setDetail] = useState<SystemLog | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [severity, setSeverity] = useState<Severity | ''>('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, userList] = await Promise.all([
        logService.listRecent(SAMPLE_SIZE),
        userService.getUsers().catch(() => [] as AdminUser[]),
      ]);
      setUsers(new Map(userList.map((u) => [u.id, u])));
      setLogs(rows.filter(isBusinessEvent));
    } catch (e) {
      snackbar.error((e as ServiceError).message);
    } finally {
      setLoading(false);
    }
  }, [snackbar]);

  useEffect(() => {
    void load();
  }, [load]);

  // Distinct action/entity options actually present in the sampled activity.
  const { actionOptions, entityOptions } = useMemo(() => {
    const actions = new Map<string, string>();
    const entities = new Map<string, string>();
    for (const log of logs) {
      const meta = activityMeta(log);
      if (meta.verb) actions.set(meta.verb, meta.actionLabel);
      if (meta.entitySlug) entities.set(meta.entitySlug, meta.entityLabel);
    }
    const sortByLabel = (a: [string, string], b: [string, string]) => a[1].localeCompare(b[1]);
    return {
      actionOptions: [...actions.entries()].sort(sortByLabel),
      entityOptions: [...entities.entries()].sort(sortByLabel),
    };
  }, [logs]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    return logs.filter((log) => {
      const meta = activityMeta(log);
      if (action && meta.verb !== action) return false;
      if (entity && meta.entitySlug !== entity) return false;
      if (severity && meta.severity !== severity) return false;

      if (term) {
        const actor = resolveActor(log, users);
        const haystack = `${log.message} ${actor.name} ${meta.entityLabel} ${affectedLabel(log) ?? ''}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      if (from || to) {
        const when = parseOracleDate(log.created_at);
        if (when) {
          if (from && when < from) return false;
          if (to && when > to) return false;
        }
      }
      return true;
    });
  }, [logs, users, action, entity, severity, search, dateFrom, dateTo]);

  // Reset to the first page whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [action, entity, severity, search, dateFrom, dateTo]);

  // Opening a record lazily loads its context (omitted from the list for speed).
  const openDetail = useCallback(async (log: SystemLog) => {
    setSelected(log);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await logService.get(log.id));
    } catch {
      setDetail(log); // fall back to the row without context
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setSelected(null);
    setDetail(null);
  }, []);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        Bitácora de actividad
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Registro de la actividad de negocio del sistema: creación, modificación y
        eliminación de declaraciones, usuarios y catálogos, además de los inicios
        de sesión.
      </Typography>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        sx={{ mb: 2 }}
        alignItems={{ xs: 'stretch', md: 'center' }}
        flexWrap="wrap"
        useFlexGap
      >
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Acción</InputLabel>
          <Select label="Acción" value={action} onChange={(e) => setAction(e.target.value)}>
            <MenuItem value="">Todas las acciones</MenuItem>
            {actionOptions.map(([value, label]) => (
              <MenuItem key={value} value={value}>{label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Entidad</InputLabel>
          <Select label="Entidad" value={entity} onChange={(e) => setEntity(e.target.value)}>
            <MenuItem value="">Todas las entidades</MenuItem>
            {entityOptions.map(([value, label]) => (
              <MenuItem key={value} value={value}>{label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Severidad</InputLabel>
          <Select
            label="Severidad"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as Severity | '')}
          >
            <MenuItem value="">Todas las severidades</MenuItem>
            {(['LOW', 'MEDIUM', 'HIGH'] as Severity[]).map((sev) => (
              <MenuItem key={sev} value={sev}>{SEVERITY_META[sev].label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="Buscar por usuario o descripción"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 220 }}
        />

        <TextField
          size="small"
          type="date"
          label="Desde"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          type="date"
          label="Hasta"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <Tooltip title="Actualizar">
          <span>
            <IconButton onClick={() => void load()} disabled={loading} aria-label="Actualizar bitácora">
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {isCompact ? (
        <Stack spacing={1.25}>
          {pageItems.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {loading ? 'Cargando…' : 'No hay actividad para los filtros seleccionados.'}
              </Typography>
            </Paper>
          ) : (
            pageItems.map((log) => {
              const meta = activityMeta(log);
              const actor = resolveActor(log, users);
              const sev = SEVERITY_META[meta.severity];
              return (
                <Paper key={log.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 0.75 }}>
                    <Typography variant="caption" color="text.secondary">
                      {formatOracleDate(log.created_at, true)}
                    </Typography>
                    <Chip size="small" label={sev.label} color={sev.color} />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.75 }}>
                    {log.message}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.75 }}>
                    <Chip size="small" label={meta.actionLabel} variant="outlined" />
                    <Chip size="small" label={meta.entityLabel} variant="outlined" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
                      {actor.name}
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<VisibilityOutlinedIcon />}
                      onClick={() => void openDetail(log)}
                      sx={{ textTransform: 'none', flexShrink: 0 }}
                    >
                      Detalle
                    </Button>
                  </Box>
                </Paper>
              );
            })
          )}
        </Stack>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha y hora</TableCell>
                <TableCell>Usuario</TableCell>
                <TableCell>Acción</TableCell>
                <TableCell>Entidad</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell align="center">Severidad</TableCell>
                <TableCell align="center">Detalles</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {loading ? 'Cargando…' : 'No hay actividad para los filtros seleccionados.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((log) => {
                  const meta = activityMeta(log);
                  const actor = resolveActor(log, users);
                  const sev = SEVERITY_META[meta.severity];
                  return (
                    <TableRow key={log.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {formatOracleDate(log.created_at, true)}
                      </TableCell>
                      <TableCell>{actor.name}</TableCell>
                      <TableCell>
                        <Chip size="small" label={meta.actionLabel} variant="outlined" />
                      </TableCell>
                      <TableCell>{meta.entityLabel}</TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>
                        <Typography variant="body2" noWrap title={log.message}>
                          {log.message}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip size="small" label={sev.label} color={sev.color} />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => void openDetail(log)}
                          aria-label="Ver detalle del registro"
                        >
                          <VisibilityOutlinedIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, value) => setPage(value)}
          color="primary"
        />
      </Box>

      <ActivityDetailModal
        log={selected}
        detail={detail}
        detailLoading={detailLoading}
        actor={selected ? resolveActor(selected, users) : null}
        onClose={closeDetail}
      />
    </Box>
  );
}

interface ActivityDetailModalProps {
  log: SystemLog | null;
  detail: SystemLog | null;
  detailLoading: boolean;
  actor: Actor | null;
  onClose: () => void;
}

function ActivityDetailModal({ log, detail, detailLoading, actor, onClose }: ActivityDetailModalProps) {
  const meta = log ? activityMeta(log) : null;
  // Affected-entity label and the details table come from the lazily loaded
  // full record (the list omits context), falling back to the row otherwise.
  const withContext = detail ?? log;
  const rows = withContext ? contextRows(withContext) : [];
  const affected = withContext ? affectedLabel(withContext) : null;

  return (
    <Dialog open={log !== null} onClose={onClose} maxWidth="sm" fullWidth>
      {log && meta && (
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              Detalle del registro de actividad
            </Typography>
            <IconButton size="small" onClick={onClose} aria-label="Cerrar">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Stack direction="row" spacing={2} justifyContent="space-around" sx={{ mb: 2 }}>
            <SummaryItem label="Acción">
              <Chip size="small" label={meta.actionLabel} variant="outlined" />
            </SummaryItem>
            <SummaryItem label="Entidad">
              <Chip size="small" label={meta.entityLabel} variant="outlined" />
            </SummaryItem>
            <SummaryItem label="Severidad">
              <Chip
                size="small"
                label={SEVERITY_META[meta.severity].label}
                color={SEVERITY_META[meta.severity].color}
              />
            </SummaryItem>
          </Stack>

          <Divider sx={{ mb: 2 }} />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
              mb: 2,
            }}
          >
            <Field label="Fecha y hora" value={formatOracleDate(log.created_at, true)} />
            <Field label="Usuario" value={actor?.name ?? '—'} />
            <Field label="Entidad afectada" value={detailLoading ? 'Cargando…' : (affected ?? '—')} />
            <Field label="Correo electrónico" value={actor?.email ?? '—'} />
          </Box>

          <Field label="Descripción" value={log.message} sx={{ mb: detailLoading || rows.length ? 2 : 0 }} />

          {detailLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                Cargando detalles…
              </Typography>
            </Box>
          ) : rows.length > 0 ? (
            <>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Detalles del evento
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Campo</TableCell>
                      <TableCell>Valor</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.label}>
                        <TableCell sx={{ fontWeight: 500, width: '40%' }}>{r.label}</TableCell>
                        <TableCell sx={{ wordBreak: 'break-word' }}>{r.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : null}
        </DialogContent>
      )}
    </Dialog>
  );
}

function SummaryItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

function Field({
  label,
  value,
  sx,
}: {
  label: string;
  value: string;
  sx?: object;
}) {
  return (
    <Box sx={sx}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}
