import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  IconButton,
  InputAdornment,
  Stack,
  MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { adminService } from '../../../services/adminService';
import type { Plaza, Area, JobPositionType, ServiceError } from '../../../services/adminService';
import ModalForm from '../../../components/modals/ModalForm';
import ModalError from '../../../components/modals/ModalError';
import ModalSuccess from '../../../components/modals/ModalSuccess';
import ModalAlert from '../../../components/modals/ModalAlert';

const EMPTY_FORM = { name: '', description: '', job_position_type_id: '', area_id: '' };

/** Oracle default timestamps look like "28-MAY-26 05.34.02.776554 PM"; show the date part. */
function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return dateStr.split(' ')[0];
}

export default function PlazasPage() {
  const [plazas, setPlazas] = useState<Plaza[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [types, setTypes] = useState<JobPositionType[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Plaza | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<typeof EMPTY_FORM>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState({ open: false, title: '', message: '' });
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const refreshPlazas = useCallback(async () => {
    try {
      const { data } = await adminService.getPlazas({ limit: 100 });
      setPlazas(data);
    } catch (error) {
      const e = error as ServiceError;
      setModalError({ open: true, title: 'Error al cargar', message: e.message ?? 'Error del servidor.' });
    }
  }, []);

  useEffect(() => {
    void refreshPlazas();
    // Load the option sources for the create form (areas + plaza types).
    adminService.getAreas({ limit: 100 }).then(({ data }) => setAreas(data)).catch(() => undefined);
    adminService.getJobPositionTypes().then(setTypes).catch(() => undefined);
  }, [refreshPlazas]);

  const areaName = useCallback(
    (id: string | null) => areas.find((a) => a.id === id)?.name ?? '—',
    [areas],
  );

  const filtered = useMemo(() =>
    plazas.filter((p) =>
      [p.name, p.description ?? '', areaName(p.area_id)]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
    ), [plazas, search, areaName]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Partial<typeof EMPTY_FORM> = {};
    if (!form.name.trim()) errors.name = 'El número de plaza es requerido.';
    if (!form.job_position_type_id) errors.job_position_type_id = 'El tipo de plaza es requerido.';
    if (!form.area_id) errors.area_id = 'El área es requerida.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      await adminService.createPlaza({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        job_position_type_id: form.job_position_type_id,
        area_id: form.area_id,
      });
      await refreshPlazas();
      setFormOpen(false);
      setSuccessMsg('Plaza creada correctamente.');
      setSuccessOpen(true);
    } catch (error) {
      const e = error as ServiceError;
      setModalError({ open: true, title: 'Error', message: e.message ?? 'Error del servidor.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await adminService.deletePlaza(deleteTarget.id);
      setDeleteTarget(null);
      await refreshPlazas();
      setSuccessMsg('Plaza eliminada correctamente.');
      setSuccessOpen(true);
    } catch (error) {
      const e = error as ServiceError;
      setDeleteTarget(null);
      setModalError({ open: true, title: 'Error al eliminar', message: e.message ?? 'Error del servidor.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormChange = (field: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, minHeight: '100%' }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, color: '#1a1a1a' }}>
        Plazas
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 3 }}>
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar"
          size="small"
          sx={{ width: { xs: '100%', sm: 260 }, backgroundColor: 'white', borderRadius: 1 }}
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
        <Box sx={{ flex: 1, display: { xs: 'none', sm: 'block' } }} />
        <Button
          variant="contained"
          onClick={openCreate}
          sx={{
            backgroundColor: '#1a2b4a',
            '&:hover': { backgroundColor: '#111d33' },
            px: 3,
            fontWeight: 600,
            textTransform: 'none',
            fontSize: '0.9rem',
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          Añadir Plaza
        </Button>
      </Box>

      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ minWidth: 720 }}>
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
            <Box sx={{ width: 48 }} />
          </Box>

          <Stack spacing={1.5}>
            {filtered.map((plaza) => (
              <Paper
                key={plaza.id}
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
                <Typography variant="body2" sx={{ flex: COLS[0].flex, color: '#333', fontWeight: 600 }}>
                  {plaza.name}
                </Typography>
                <Typography variant="body2" sx={{ flex: COLS[1].flex, color: '#555' }}>
                  {areaName(plaza.area_id)}
                </Typography>
                <Typography
                  variant="body2"
                  noWrap
                  sx={{ flex: COLS[2].flex, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', pr: 2 }}
                >
                  {plaza.description ?? '—'}
                </Typography>
                <Typography variant="body2" sx={{ flex: COLS[3].flex, color: '#555' }}>
                  {formatDate(plaza.created_at)}
                </Typography>
                <Box sx={{ width: 48, display: 'flex', justifyContent: 'flex-end' }}>
                  <IconButton size="small" onClick={() => setDeleteTarget(plaza)} sx={{ color: '#9e9e9e' }}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Paper>
            ))}
            {filtered.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
                No se encontraron plazas.
              </Typography>
            )}
          </Stack>
        </Box>
      </Box>

      <ModalForm
        open={formOpen}
        title="Añadir Plaza"
        onClose={() => setFormOpen(false)}
        onConfirm={handleConfirm}
        confirmLabel="Confirmar"
        isSubmitting={isSubmitting}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField
            label="Número de plaza"
            value={form.name}
            onChange={handleFormChange('name')}
            size="small"
            fullWidth
            error={!!formErrors.name}
            helperText={formErrors.name}
            required
          />
          <TextField
            select
            label="Tipo de plaza"
            value={form.job_position_type_id}
            onChange={handleFormChange('job_position_type_id')}
            size="small"
            fullWidth
            error={!!formErrors.job_position_type_id}
            helperText={formErrors.job_position_type_id ?? (types.length === 0 ? 'No hay tipos de plaza registrados.' : '')}
            required
          >
            {types.map((t) => (
              <MenuItem key={t.job_position_type_id} value={t.job_position_type_id}>
                {t.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Área"
            value={form.area_id}
            onChange={handleFormChange('area_id')}
            size="small"
            fullWidth
            error={!!formErrors.area_id}
            helperText={formErrors.area_id ?? (areas.length === 0 ? 'No hay áreas registradas.' : '')}
            required
          >
            {areas.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Descripción"
            value={form.description}
            onChange={handleFormChange('description')}
            size="small"
            fullWidth
            multiline
            rows={3}
          />
        </Stack>
      </ModalForm>

      <ModalAlert
        open={!!deleteTarget}
        title="Eliminar plaza"
        message={`¿Está seguro que desea eliminar la plaza "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <ModalError
        open={modalError.open}
        title={modalError.title}
        message={modalError.message}
        onClose={() => setModalError((p) => ({ ...p, open: false }))}
      />
      <ModalSuccess
        open={successOpen}
        title="Operación exitosa"
        message={successMsg}
        onClose={() => setSuccessOpen(false)}
      />
    </Box>
  );
}

const COLS = [
  { label: 'Número', flex: '0 0 20%' },
  { label: 'Área', flex: '0 0 24%' },
  { label: 'Descripción', flex: '1' },
  { label: 'Fecha de creación', flex: '0 0 18%' },
];
