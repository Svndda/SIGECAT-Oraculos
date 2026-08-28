import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import RateReviewIcon from '@mui/icons-material/RateReview';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import StatCard from '../../features/admin/dashboard/StatCard';
import ChartCard from '../../features/admin/dashboard/ChartCard';
import DonutChart from '../../features/admin/dashboard/DonutChart';

import { employeeDashboardService } from '../../services/employeeDashboardService';
import type { EmployeeDashboardData } from '../../services/employeeDashboardService';
import type { ServiceError } from '../../services/common';
import { formatOracleDate } from '../../services/common';
import { STATUS_COLORS, STATUS_TRANSLATIONS } from '../../services/declarationConstants';
import type { Declaration, DeclarationStatus } from '../../services/declarationsService';
import { useSnackbar } from '../../context/SnackbarContext';
import { useAuth } from '../../context/AuthContext';

const STATUS_ORDER: DeclarationStatus[] = [
  'Revision',
  'Completed',
  'Approved',
  'Rejected',
  'Incomplete',
  'Abandoned',
];

export default function EmployeeDashboardPage() {
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState<EmployeeDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await employeeDashboardService.getDashboard());
    } catch (error) {
      snackbar.error((error as ServiceError).message ?? 'Error al cargar el panel.');
    } finally {
      setLoading(false);
    }
  }, [snackbar]);

  useEffect(() => {
    void load();
  }, [load]);

  const today = new Date().toLocaleDateString('es-CR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const statusSegments = STATUS_ORDER.map((status) => ({
    label: STATUS_TRANSLATIONS[status],
    value: data?.byStatus[status] ?? 0,
    color: STATUS_COLORS[status],
  }));

  const revisionCount = data?.byStatus.Revision ?? 0;
  const approvedCount = data?.byStatus.Approved ?? 0;
  const incompleteCount = data?.byStatus.Incomplete ?? 0;

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, minHeight: '100%', backgroundColor: '#f9f9fd' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#12457d' }}>
            {user ? `Hola, ${user.first_name}` : 'Mi panel'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', textTransform: 'capitalize' }}>
            <Box component="span" sx={{ textTransform: 'none' }}>Resumen de tus declaraciones — </Box>
            {today}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => navigate('/declaracion-registro')}
            sx={{ backgroundColor: '#12457d', textTransform: 'none', '&:hover': { backgroundColor: '#0e3762' } }}
          >
            Nueva declaración
          </Button>
          <Tooltip title="Actualizar">
            <span>
              <IconButton onClick={load} disabled={loading} aria-label="Actualizar panel" sx={{ color: '#12457d' }}>
                {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {/* Incomplete declaration nudge */}
      {data?.incomplete.has && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/')}>
              Ver mis declaraciones
            </Button>
          }
        >
          Tienes una declaración sin completar. Termínala para enviarla a revisión.
        </Alert>
      )}

      {/* KPI row */}
      <Grid container spacing={2.5} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Mis declaraciones"
            value={data?.total ?? 0}
            loading={loading}
            icon={<DescriptionIcon />}
            color="#12457d"
            caption="Total registradas"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="En revisión"
            value={revisionCount}
            loading={loading}
            icon={<RateReviewIcon />}
            color="#5376f3"
            caption={revisionCount > 0 ? 'En espera de aprobación' : 'Nada en revisión'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Aprobadas"
            value={approvedCount}
            loading={loading}
            icon={<CheckCircleIcon />}
            color="#2e7d32"
            caption="Declaraciones aprobadas"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Incompletas"
            value={incompleteCount}
            loading={loading}
            icon={<HourglassEmptyIcon />}
            color="#808080"
            caption={incompleteCount > 0 ? 'Pendientes de completar' : 'Nada pendiente'}
          />
        </Grid>
      </Grid>

      {/* Recent declarations + status distribution */}
      <Grid container spacing={2.5} sx={{ mt: 0 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <ChartCard
            title="Mis declaraciones recientes"
            subtitle="Las últimas que registraste"
            action={
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/')}
                sx={{ color: '#12457d', textTransform: 'none' }}
              >
                Ver todas
              </Button>
            }
            minHeight={260}
          >
            {loading ? (
              <ChartSkeleton />
            ) : (
              <RecentDeclarations declarations={data?.recent ?? []} />
            )}
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <ChartCard title="Mis declaraciones por estado" subtitle="Distribución actual" minHeight={260}>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <DonutChart
                segments={statusSegments}
                centerValue={data?.total ?? 0}
                centerLabel="Total"
              />
            )}
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}

function RecentDeclarations({ declarations }: { declarations: Declaration[] }) {
  if (declarations.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Aún no tienes declaraciones registradas.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {declarations.map((dec, i) => (
        <Box key={dec.declaration_id}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, py: 1.25 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
                {formatOracleDate(dec.shift_starts_at) !== '—'
                  ? formatOracleDate(dec.shift_starts_at)
                  : formatOracleDate(dec.created_at)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Registrada el {formatOracleDate(dec.created_at, true)}
              </Typography>
            </Box>
            <Chip
              size="small"
              label={STATUS_TRANSLATIONS[dec.current_status]}
              sx={{
                flexShrink: 0,
                color: '#fff',
                backgroundColor: STATUS_COLORS[dec.current_status],
                fontWeight: 500,
              }}
            />
          </Box>
          {i < declarations.length - 1 && <Divider />}
        </Box>
      ))}
    </Box>
  );
}

function ChartSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Skeleton variant="rounded" height={180} />
      <Skeleton width="60%" />
    </Box>
  );
}
