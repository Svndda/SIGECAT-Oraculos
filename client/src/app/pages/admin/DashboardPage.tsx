import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  IconButton,
  Skeleton,
  Tooltip,
  Typography,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import RateReviewIcon from '@mui/icons-material/RateReview';
import WorkIcon from '@mui/icons-material/Work';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import BusinessIcon from '@mui/icons-material/Business';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import StatCard from '../../../features/admin/dashboard/StatCard';
import ChartCard from '../../../features/admin/dashboard/ChartCard';
import DonutChart from '../../../features/admin/dashboard/DonutChart';
import ColumnChart from '../../../features/admin/dashboard/ColumnChart';
import BarList from '../../../features/admin/dashboard/BarList';
import ActivityFeed from '../../../features/admin/dashboard/ActivityFeed';
import PendingReviewPanel from '../../../features/admin/dashboard/PendingReviewPanel';

import { dashboardService } from '../../../services/dashboardService';
import type { DashboardData } from '../../../services/dashboardService';
import type { ServiceError } from '../../../services/common';
import { STATUS_COLORS, STATUS_TRANSLATIONS } from '../../../services/declarationConstants';
import type { Declaration, DeclarationStatus } from '../../../services/declarationsService';
import { useSnackbar } from '../../../context/SnackbarContext';
import { useAuth } from '../../../context/AuthContext';

const STATUS_ORDER: DeclarationStatus[] = [
  'Revision',
  'Completed',
  'Approved',
  'Rejected',
  'Incomplete',
  'Abandoned',
];

export default function DashboardPage() {
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await dashboardService.getDashboard());
    } catch (error) {
      const e = error as ServiceError;
      snackbar.error(e.message ?? 'Error al cargar el panel.');
    } finally {
      setLoading(false);
    }
  }, [snackbar]);

  useEffect(() => {
    load();
  }, [load]);

  const today = new Date().toLocaleDateString('es-CR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const goToReviewQueue = () => navigate('/declaraciones?estado=Revision');
  const reviewDeclaration = (dec: Declaration) =>
    navigate(`/declaraciones?estado=Revision&open=${dec.declaration_id}`);

  const statusSegments = STATUS_ORDER.map((status) => ({
    label: STATUS_TRANSLATIONS[status],
    value: data?.declarations.byStatus[status] ?? 0,
    color: STATUS_COLORS[status],
  }));

  const orgItems = [
    { label: 'Áreas', value: data?.org.areas ?? 0, color: '#12457d', icon: <CorporateFareIcon fontSize="small" /> },
    { label: 'Departamentos', value: data?.org.departments ?? 0, color: '#1f6fb2', icon: <BusinessIcon fontSize="small" /> },
    { label: 'Secciones', value: data?.org.sections ?? 0, color: '#f19b29', icon: <ViewModuleIcon fontSize="small" /> },
    { label: 'Unidades', value: data?.org.units ?? 0, color: '#006a6a', icon: <AccountTreeIcon fontSize="small" /> },
  ];

  const revisionCount = data?.declarations.byStatus.Revision ?? 0;

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, minHeight: '100%', backgroundColor: '#f9f9fd' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#12457d' }}>
            Panel de administración
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', textTransform: 'capitalize' }}>
            {user ? `Hola, ${user.first_name}. ` : ''}
            <Box component="span" sx={{ textTransform: 'none' }}>Resumen del sistema — </Box>
            {today}
          </Typography>
        </Box>
        <Tooltip title="Actualizar">
          <span>
            <IconButton onClick={load} disabled={loading} aria-label="Actualizar panel" sx={{ color: '#12457d' }}>
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* KPI row */}
      <Grid container spacing={2.5} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Usuarios"
            value={data?.users.total ?? 0}
            loading={loading}
            icon={<PeopleIcon />}
            color="#12457d"
            caption={`${data?.users.admins ?? 0} admin · ${data?.users.employees ?? 0} funcionarios`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Declaraciones"
            value={data?.declarations.total ?? 0}
            loading={loading}
            icon={<DescriptionIcon />}
            color="#f19b29"
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
            caption={revisionCount > 0 ? 'Pendientes de acción →' : 'Nada pendiente'}
            onClick={goToReviewQueue}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Plazas"
            value={data?.jobPositions.total ?? 0}
            loading={loading}
            icon={<WorkIcon />}
            color="#006a6a"
            caption={`${data?.jobPositions.occupied ?? 0} ocupadas · ${data?.jobPositions.vacant ?? 0} vacantes`}
          />
        </Grid>
      </Grid>

      {/* Pending review queue + status distribution */}
      <Grid container spacing={2.5} sx={{ mt: 0 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <ChartCard
            title="Pendientes de revisión"
            subtitle={revisionCount > 0 ? `${revisionCount} en espera de tu revisión` : 'No hay nada pendiente'}
            action={
              revisionCount > 0 ? (
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={goToReviewQueue}
                  sx={{ color: '#12457d', textTransform: 'none' }}
                >
                  Ir a la cola
                </Button>
              ) : undefined
            }
            minHeight={220}
          >
            {loading ? (
              <ChartSkeleton />
            ) : (
              <PendingReviewPanel
                pending={data?.declarations.pending ?? []}
                total={revisionCount}
                onReview={reviewDeclaration}
                onSeeAll={goToReviewQueue}
              />
            )}
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <ChartCard title="Declaraciones por estado" subtitle="Distribución actual" minHeight={220}>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <DonutChart
                segments={statusSegments}
                centerValue={data?.declarations.total ?? 0}
                centerLabel="Total"
              />
            )}
          </ChartCard>
        </Grid>
      </Grid>

      {/* Monthly trend + organizational structure */}
      <Grid container spacing={2.5} sx={{ mt: 0 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <ChartCard title="Declaraciones por mes" subtitle="Últimos 6 meses" minHeight={220}>
            {loading ? <ChartSkeleton /> : <ColumnChart data={data?.declarations.monthly ?? []} />}
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <ChartCard title="Estructura organizacional" subtitle="Unidades activas por nivel">
            {loading ? <ChartSkeleton /> : <BarList items={orgItems} />}
          </ChartCard>
        </Grid>
      </Grid>

      {/* Recent activity */}
      <Grid container spacing={2.5} sx={{ mt: 0 }}>
        <Grid size={12}>
          <ChartCard
            title="Actividad reciente"
            subtitle="Últimos eventos del sistema"
            action={
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/registros')}
                sx={{ color: '#12457d', textTransform: 'none' }}
              >
                Ver registros
              </Button>
            }
          >
            {loading ? <ChartSkeleton /> : <ActivityFeed logs={data?.activity ?? []} />}
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}

function ChartSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Skeleton variant="rounded" height={160} />
      <Skeleton width="60%" />
    </Box>
  );
}
