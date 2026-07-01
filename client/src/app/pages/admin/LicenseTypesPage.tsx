import { useState, useEffect, useCallback } from 'react';
import { Box, Pagination } from '@mui/material';
import { licenseTypeService } from '../../../services/licenseTypeService';
import type { LicenseType } from '../../../services/licenseTypeService';
import type { PageMeta, ServiceError } from '../../../services/common';
import LicenseTypeToolbar from '../../../features/admin/licenseType/LicenseTypeToolbar';
import LicenseTypeList from '../../../features/admin/licenseType/LicenseTypeList';
import LicenseTypeFormModal from '../../../features/admin/licenseType/LicenseTypeFormModal';
import ModalAlert from '../../../components/modals/ModalAlert';
import { useSnackbar } from '../../../context/SnackbarContext';

const LIMIT = 10;
const EMPTY_FORM = { name: '' };

export default function LicenseTypesPage() {
  const [licenseTypes, setLicenseTypes] = useState<LicenseType[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LicenseType | null>(null);
  const [viewTarget, setViewTarget] = useState<LicenseType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LicenseType | null>(null);
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

  const loadLicenseTypes = useCallback(() => {
    setLoading(true);
    return licenseTypeService.getLicenseTypes({ page, limit: LIMIT, filter: appliedFilter })
      .then((res) => {
        setLicenseTypes(res.data);
        setMeta(res.meta);
      })
      .catch((error) => {
        const e = error as ServiceError;
        snackbar.error(e.message ?? 'Error del servidor.');
      })
      .finally(() => setLoading(false));
  }, [page, appliedFilter, snackbar]);

  useEffect(() => {
    void loadLicenseTypes();
  }, [loadLicenseTypes]);

  const totalPages = meta?.total_pages ?? 1;

  const openCreate = () => {
    setEditTarget(null);
    setViewTarget(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (licenseType: LicenseType) => {
    setEditTarget(licenseType);
    setViewTarget(null);
    setForm({ name: licenseType.name });
    setFormErrors({});
    setFormOpen(true);
  };

  const openView = (licenseType: LicenseType) => {
    setViewTarget(licenseType);
    setEditTarget(null);
    setForm({ name: licenseType.name });
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
      const payload = { name: form.name.trim() };
      if (editTarget) {
        await licenseTypeService.updateLicenseType(editTarget.id, payload);
      } else {
        await licenseTypeService.createLicenseType(payload);
      }
      await loadLicenseTypes();
      closeModal();
      snackbar.success(editTarget ? 'Tipo de licencia actualizado correctamente.' : 'Tipo de licencia creado correctamente.');
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
      await licenseTypeService.deleteLicenseType(deleteTarget.id);
      setDeleteTarget(null);
      await loadLicenseTypes();
      snackbar.success('Tipo de licencia eliminado correctamente.');
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
      <LicenseTypeToolbar search={search} onSearchChange={setSearch} onAddClick={openCreate} />

      <LicenseTypeList
        licenseTypes={licenseTypes}
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

      <LicenseTypeFormModal
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
        title="Eliminar tipo de licencia"
        message={`¿Está seguro que desea eliminar "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

    </Box>
  );
}
