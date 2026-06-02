import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Paper,
  InputAdornment,
  Stack,
  Pagination,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { unitService } from '../../../services/unitService';
import type { Unit } from '../../../services/unitService';
import type { PageMeta, ServiceError } from '../../../services/common';
import ModalError from '../../../components/modals/ModalError';

const LIMIT = 10;

/** Oracle default timestamps look like "28-MAY-26 05.34.02.776554 PM"; show the date part. */
function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return dateStr.split(' ')[0];
}

function belongsTo(unit: Unit): string {
  if (unit.section_id) return 'Sección';
  if (unit.department_id) return 'Departamento';
  return '—';
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalError, setModalError] = useState({ open: false, title: '', message: '' });

  // Debounce the search input into appliedFilter and reset to page 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setAppliedFilter(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    unitService
      .getUnits({ page, limit: LIMIT, filter: appliedFilter })
      .then((res) => {
        if (!active) return;
        setUnits(res.data);
        setMeta(res.meta);
      })
      .catch((error) => {
        if (!active) return;
        const e = error as ServiceError;
        setModalError({ open: true, title: 'Error al cargar', message: e.message ?? 'Error del servidor.' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [page, appliedFilter]);

  const totalPages = meta?.total_pages ?? 1;

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, minHeight: '100%' }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, color: '#1a1a1a' }}>
        Unidades
      </Typography>

      {/* Toolbar */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 3 }}>
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre"
          size="small"
          sx={{ width: { xs: '100%', sm: 280 }, backgroundColor: 'white', borderRadius: 1 }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon sx={{ color: '#999', fontSize: 20 }} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ minWidth: 720 }}>
          {/* Table header */}
          <Box sx={{ display: 'flex', alignItems: 'center', px: 2.5, py: 1.25, mb: 1 }}>
            {COLS.map((col) => (
              <Typography
                key={col.label}
                variant="caption"
                fontWeight={700}
                sx={{ flex: col.flex, color: '#555', textTransform: 'none', fontSize: '0.8rem' }}
              >
                {col.label}
              </Typography>
            ))}
          </Box>

          {/* Rows */}
          <Stack spacing={1.5}>
            {units.map((unit) => (
              <Paper
                key={unit.id}
                elevation={0}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 2.5,
                  py: 1.75,
                  border: '1px solid #ebebeb',
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2" sx={{ flex: COLS[0].flex, color: '#333' }}>
                  {unit.name}
                </Typography>
                <Typography
                  variant="body2"
                  noWrap
                  sx={{ flex: COLS[1].flex, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', pr: 2 }}
                >
                  {unit.description ?? '—'}
                </Typography>
                <Typography variant="body2" sx={{ flex: COLS[2].flex, color: '#333' }}>
                  {belongsTo(unit)}
                </Typography>
                <Typography variant="body2" sx={{ flex: COLS[3].flex, color: '#555' }}>
                  {formatDate(unit.created_at)}
                </Typography>
              </Paper>
            ))}
            {!loading && units.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
                No se encontraron unidades.
              </Typography>
            )}
          </Stack>
        </Box>
      </Box>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}

      <ModalError
        open={modalError.open}
        title={modalError.title}
        message={modalError.message}
        onClose={() => setModalError((p) => ({ ...p, open: false }))}
      />
    </Box>
  );
}

const COLS = [
  { label: 'Nombre', flex: '0 0 26%' },
  { label: 'Descripción', flex: '1' },
  { label: 'Pertenece a', flex: '0 0 16%' },
  { label: 'Fecha de creación', flex: '0 0 20%' },
];
