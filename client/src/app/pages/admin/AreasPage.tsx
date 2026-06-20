import { useState, useEffect, useCallback } from 'react';
import { Box, Pagination } from '@mui/material';
import { areaService } from '../../../services/areaService';
import type { Area } from '../../../services/areaService';
import type { PageMeta, ServiceError } from '../../../services/common';
import AreaToolbar from '../../../features/admin/area/AreaToolbar';
import AreaList from '../../../features/admin/area/AreaList';
import AreaFormModal from '../../../features/admin/area/AreaFormModal';
import ModalAlert from '../../../components/modals/ModalAlert';
import { useSnackbar } from '../../../context/SnackbarContext';

const LIMIT = 10;
const EMPTY_FORM = { name: '', description: '' };

export default function AreasPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Area | null>(null);
  const [viewTarget, setViewTarget] = useState<Area | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Area | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<typeof EMPTY_FORM>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const snackbar = useSnackbar();

  useEffect(() => {
    const t = setTimeout(() => {
      setAppliedFilter(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadAreas = useCallback(() => {
    setLoading(true);
    return areaService.getAreas({ page, limit: LIMIT, filter: appliedFilter })
      .then((res) => {
        setAreas(res.data);
        setMeta(res.meta);
      })
      .catch((error) => {
        const e = error as ServiceError;
        snackbar.error(e.message ?? 'Error del servidor.');
      })
      .finally(() => setLoading(false));
  }, [page, appliedFilter, snackbar]);

  useEffect(() => {
    void loadAreas();
  }, [loadAreas]);

  const totalPages = meta?.total_pages ?? 1;

  const openCreate = () => {
    setEditTarget(null);
    setViewTarget(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (area: Area) => {
    setEditTarget(area);
    setViewTarget(null);
    setForm({ name: area.name, description: area.description ?? '' });
    setFormErrors({});
    setFormOpen(true);
  };

  const openView = (area: Area) => {
    setViewTarget(area);
    setEditTarget(null);
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
      } else {
        await areaService.createArea(payload);
      }
      await loadAreas();
      closeModal();
      snackbar.success(editTarget ? 'Área actualizada correctamente.' : 'Área creada correctamente.');
    } catch (error) {
      const e = error as ServiceError;
      snackbar.error(e.message ?? 'Error del servidor.');
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
      await loadAreas();
      snackbar.success('Área eliminada correctamente.');
    } catch (error) {
      const e = error as ServiceError;
      snackbar.error(e.message ?? 'Error del servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormChange = (field: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const closeModal = () => {
    setFormOpen(false);
    setViewTarget(null);
    setEditTarget(null);
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, minHeight: '100%' }}>
      <AreaToolbar search={search} onSearchChange={setSearch} onAddClick={openCreate} />

      <AreaList
        areas={areas}
        loading={loading}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        onView={openView}
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

      <AreaFormModal
        open={formOpen}
        isEditing={!!editTarget}
        viewMode={!!viewTarget}
        form={form}
        formErrors={formErrors}
        isSubmitting={isSubmitting}
        onClose={closeModal}
        onConfirm={handleConfirm}
        onChange={handleFormChange}
      />

      <ModalAlert
        open={!!deleteTarget}
        title="Eliminar área"
        message={`¿Está seguro que desea eliminar "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

    </Box>
  );
}