import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  InputAdornment,
  Stack,
  Pagination,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { areaService } from '../../../services/areaService';
import type { Area } from '../../../services/areaService';
import type { PageMeta, ServiceError } from '../../../services/common';
import DataTable, { type DataColumn } from '../../../components/DataTable';
import ModalForm from '../../../components/modals/ModalForm';
import ModalError from '../../../components/modals/ModalError';
import ModalSuccess from '../../../components/modals/ModalSuccess';
import ModalAlert from '../../../components/modals/ModalAlert';

const LIMIT = 10;
const EMPTY_FORM = { name: '', description: '' };

/** Oracle default timestamps look like "28-MAY-26 05.34.02.776554 PM"; show the date part. */
function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return dateStr.split(' ')[0];
}

export default function OrganizationPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Area | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Area | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<typeof EMPTY_FORM>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState({ open: false, title: '', message: '' });
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setAppliedFilter(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadAreas = (isSubscribed: boolean) => {
    setLoading(true);
    areaService.getAreas({ page, limit: LIMIT, filter: appliedFilter })
      .then((res) => {
        if (!isSubscribed) return;
        setAreas(res.data);
        setMeta(res.meta);
      })
      .catch((error) => {
        if (!isSubscribed) return;
        const e = error as ServiceError;
        setModalError({ open: true, title: 'Error al cargar', message: e.message ?? 'Error del servidor.' });
      })
      .finally(() => { if (isSubscribed) setLoading(false); });
  };

  useEffect(() => {
    let isSubscribed = true;
    loadAreas(isSubscribed);
    return () => { isSubscribed = false; };
  }, [page, appliedFilter]);

  const totalPages = meta?.total_pages ?? 1;

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (area: Area) => {
    setEditTarget(area);
    setForm({ name: area.name, description: area.description ?? '' });
    setFormErrors({});
    setFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Partial<typeof EMPTY_FORM> = {};
    if (!form.name.trim()) errors.name = 'El nombre es requerido.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() };
      if (editTarget) {
        await areaService.updateArea(editTarget.area_id, payload);
        setSuccessMsg('Área actualizada correctamente.');
      } else {
        await areaService.createArea(payload);
        setSuccessMsg('Área creada correctamente.');
      }
      setFormOpen(false);
      loadAreas(true);
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
      await areaService.deleteArea(deleteTarget.area_id);
      setDeleteTarget(null);
      loadAreas(true);
      setSuccessMsg('Área eliminada correctamente.');
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
        Áreas
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
          Añadir Área
        </Button>
      </Box>

      <DataTable
        columns={COLS}
        items={areas}
        getKey={(area) => area.area_id}
        actions={[
          { icon: <EditIcon fontSize="small" />, label: 'Editar', color: '#1a2b4a', onClick: openEdit },
          { icon: <DeleteOutlineIcon fontSize="small" />, label: 'Eliminar', color: '#9e9e9e', onClick: setDeleteTarget },
        ]}
        emptyMessage={loading ? 'Cargando...' : 'No se encontraron áreas.'}
      />

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

      <ModalForm
        open={formOpen}
        title={editTarget ? 'Editar Área' : 'Añadir Área'}
        onClose={() => setFormOpen(false)}
        onConfirm={handleConfirm}
        confirmLabel={editTarget ? 'Guardar cambios' : 'Confirmar'}
        isSubmitting={isSubmitting}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField
            label="Nombre"
            value={form.name}
            onChange={handleFormChange('name')}
            size="small"
            fullWidth
            error={!!formErrors.name}
            helperText={formErrors.name}
            required
          />
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
        title="Eliminar área"
        message={`¿Está seguro que desea eliminar "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
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

const COLS: DataColumn<Area>[] = [
  { label: 'Nombre', flex: '0 0 26%', primary: true, render: (a) => a.name },
  { label: 'Descripción', flex: '1', truncate: true, render: (a) => a.description ?? '—' },
  { label: 'Fecha de creación', flex: '0 0 20%', meta: true, render: (a) => formatDate(a.created_at) },
];
