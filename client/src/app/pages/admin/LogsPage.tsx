import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Chip,
  Collapse,
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
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  logService,
  type LogFacets,
  type LogLevel,
  type SystemLog,
} from '../../../services/logService';
import type { ServiceError } from '../../../services/common';
import { useSnackbar } from '../../../context/SnackbarContext';
import { formatOracleDate } from '../../../services/common';

const LEVEL_COLORS: Record<LogLevel, 'default' | 'info' | 'warning' | 'error'> = {
  DEBUG: 'default',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'error',
};

const PAGE_SIZE = 20;

function LogRow({ log }: { log: SystemLog }) {
  const [open, setOpen] = useState(false);

  const hasDetail =
    log.context !== null ||
    log.ip_address !== null ||
    log.http_path !== null ||
    log.user_id !== null;

  return (
    <>
      <TableRow hover>
        <TableCell padding="checkbox">
          {hasDetail && (
            <IconButton
              size="small"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Ocultar detalle del registro' : 'Ver detalle del registro'}
              aria-expanded={open}
            >
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          )}
        </TableCell>
        <TableCell>
          <Chip
            size="small"
            label={log.level}
            color={LEVEL_COLORS[log.level]}
            variant={log.level === 'DEBUG' ? 'outlined' : 'filled'}
          />
        </TableCell>
        <TableCell>{log.category}</TableCell>
        <TableCell sx={{ maxWidth: 420 }}>
          <Typography variant="body2" noWrap title={log.message}>
            {log.message}
          </Typography>
        </TableCell>
        <TableCell>{log.action ?? '—'}</TableCell>
        <TableCell>
          {log.http_method ? `${log.http_method} ${log.status_code ?? ''}` : '—'}
        </TableCell>
        <TableCell>{formatOracleDate(log.created_at, true)}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell sx={{ py: 0, borderBottom: open ? undefined : 'none' }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 1 }}>
              <Stack spacing={0.5}>
                {log.user_id && (
                  <Typography variant="body2">
                    <strong>Usuario:</strong> {log.user_id}
                  </Typography>
                )}
                {log.ip_address && (
                  <Typography variant="body2">
                    <strong>IP:</strong> {log.ip_address}
                  </Typography>
                )}
                {log.http_path && (
                  <Typography variant="body2">
                    <strong>Ruta:</strong> {log.http_method} {log.http_path}
                  </Typography>
                )}
                {log.context && (
                  <Box
                    component="pre"
                    sx={{
                      mt: 1,
                      p: 1.5,
                      bgcolor: '#f5f5f5',
                      borderRadius: 1,
                      fontSize: 12,
                      overflowX: 'auto',
                    }}
                  >
                    {JSON.stringify(log.context, null, 2)}
                  </Box>
                )}
              </Stack>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function LogsPage() {
  const snackbar = useSnackbar();

  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [facets, setFacets] = useState<LogFacets>({ levels: [], categories: [] });
  const [level, setLevel] = useState<LogLevel | ''>('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await logService.list({
        page,
        limit: PAGE_SIZE,
        level: level || undefined,
        category: category || undefined,
        search: search.trim() || undefined,
      });
      setLogs(res.data);
      setTotalPages(Math.max(1, res.meta.total_pages));
    } catch (e) {
      snackbar.error((e as ServiceError).message);
    } finally {
      setLoading(false);
    }
  }, [page, level, category, search, snackbar]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    logService.facets().then(setFacets).catch(() => {});
  }, []);

  // Reset to first page whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [level, category, search]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        Registros del sistema
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Bitácora de auditoría de toda la actividad del sistema: autenticación,
        peticiones, errores y eventos de seguridad.
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems="center">
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Nivel</InputLabel>
          <Select
            label="Nivel"
            value={level}
            onChange={(e) => setLevel(e.target.value as LogLevel | '')}
          >
            <MenuItem value="">Todos</MenuItem>
            {facets.levels.map((lv) => (
              <MenuItem key={lv} value={lv}>{lv}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Categoría</InputLabel>
          <Select
            label="Categoría"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <MenuItem value="">Todas</MenuItem>
            {facets.categories.map((cat) => (
              <MenuItem key={cat} value={cat}>{cat}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="Buscar en el mensaje"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
        />

        <Tooltip title="Actualizar">
          <span>
            <IconButton onClick={() => void load()} disabled={loading} aria-label="Actualizar registros">
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>Nivel</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>Mensaje</TableCell>
              <TableCell>Acción</TableCell>
              <TableCell>Petición</TableCell>
              <TableCell>Fecha</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {loading ? 'Cargando…' : 'No hay registros para los filtros seleccionados.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => <LogRow key={log.id} log={log} />)
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, value) => setPage(value)}
          color="primary"
        />
      </Box>
    </Box>
  );
}
