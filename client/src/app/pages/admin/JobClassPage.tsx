import { useEffect, useState } from 'react';
import { Box, Pagination } from '@mui/material';
import type { JobClass } from '../../../services/jobClassService';
import { jobClassService } from '../../../services/jobClassService';
import type { PageMeta, ServiceError } from '../../../services/common';

import JobClassToolbar from '../../../features/admin/job_class/JobClassToolbar';
import JobClassList from '../../../features/admin/job_class/JobClassList';
import JobClassFormModal from '../../../features/admin/job_class/JobClassFormModal';
import ModalAlert from '../../../components/modals/ModalAlert';
import { useSnackbar } from '../../../context/SnackbarContext';

const LIMIT = 10;
const EMPTY_FORM = { name: '', description: '', code: ''};

export default function JobClassPage() {
  const [jobClasses, setJobClasses] = useState<JobClass[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<JobClass | null>(null);
  const [viewTarget, setViewTarget] = useState<JobClass | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobClass | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof typeof EMPTY_FORM, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const snackbar = useSnackbar();

  useEffect(() => {
    const t = setTimeout(() => {
      const trimmedSearch = search.trim();
      if (trimmedSearch !== appliedFilter) {
        setAppliedFilter(trimmedSearch);
        setPage(1);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [search, appliedFilter]);

  useEffect(() => {
    jobClassService.getJobClasses({ limit: 100 })
      .then((res) => setJobClasses(res))
      .catch(() => {});
  }, []);

  const loadJobClasses = (isSubscribed: boolean) => {
    setLoading(true);
    jobClassService.getJobClassesPage({
      page,
      limit: LIMIT,
      filter: appliedFilter,
      status: 'active'
    })
      .then((res) => {
        if (!isSubscribed) return;
        setJobClasses(res.data ?? []);
        setMeta(res.meta);
      })
      .catch((error) => {
        if (!isSubscribed) return;
        const e = error as ServiceError;
        snackbar.error(e.message ?? 'Error del servidor al cargar clases ocupacionales.');
      })
      .finally(() => {
        if (isSubscribed) setLoading(false);
      });
  };

  useEffect(() => {
    let isSubscribed = true;
    loadJobClasses(isSubscribed);
    return () => { isSubscribed = false; };
  }, [page, appliedFilter]);

  const totalPages = meta?.total_pages ?? 1;

  const openCreate = () => {
    setEditTarget(null);
    setViewTarget(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (jobClass: JobClass) => {
    setEditTarget(jobClass);
    setViewTarget(null);
    setForm({
      name: jobClass.name,
      description: jobClass.description ?? '',
      code: String(jobClass.job_class_code)
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const openView = (jobClass: JobClass) => {
    setViewTarget(jobClass);
    setEditTarget(null);
    setForm({
      name: jobClass.name,
      description: jobClass.description ?? '',
      code: String(jobClass.job_class_code)
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const closeModal = () => {
    setFormOpen(false);
    setViewTarget(null);
    setEditTarget(null);
  };

  const setField = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof typeof EMPTY_FORM, string>> = {};

    if (!form.name.trim()) {
      errors.name = 'El nombre de la clase ocupacional es obligatorio.';
    } else if (form.name.length > 110) {
      errors.name = 'El nombre no puede exceder los 110 caracteres.';
    }

    if (form.description && form.description.length > 255) {
      errors.description = 'La descripción no puede exceder los 255 caracteres.';
    }

    if (!form.code.trim()) {
      errors.code = 'El código numérico es obligatorio.';
    } else {
      const codeNum = Number(form.code);
      if (!Number.isInteger(codeNum) || codeNum < 0 || codeNum > 200000) {
        errors.code = 'El código debe ser un número entero entre 0 y 200000.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        job_class_code: Number(form.code)
      };

      if (editTarget) {
        await jobClassService.updateJobClass(editTarget.job_class_id, payload);
      } else {
        await jobClassService.createJobClass(payload);
      }
      closeModal();
      loadJobClasses(true);
      snackbar.success(editTarget ? 'Clase Ocupacional actualizado exitosamente.' : 'Clase Ocupacional creada exitosamente.');
    } catch (error) {
      const e = error as ServiceError;
      snackbar.error(e.message ?? 'Error al procesar la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await jobClassService.deleteJobClass(deleteTarget.job_class_id);
      setDeleteTarget(null);
      loadJobClasses(true);
      snackbar.success('Clase Ocupacional eliminada exitosamente.');
    } catch (error) {
      const e = error as ServiceError;
      setDeleteTarget(null);
      snackbar.error(e.message ?? 'Error al intentar eliminar la Clase Ocupacional.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewMode = !!viewTarget;

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, minHeight: '100%' }}>
      <JobClassToolbar search={search} onSearchChange={setSearch} onAddClick={openCreate} />

      <JobClassList
        jobClasses={jobClasses}
        loading={loading}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        onView={openView}
      />

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={totalPages} page={page} onChange={(_, value) => setPage(value)} color="primary" shape="rounded" />
        </Box>
      )}

      <JobClassFormModal
        open={formOpen}
        isEditing={!!editTarget}
        viewMode={viewMode}
        form={form}
        formErrors={formErrors}
        isSubmitting={isSubmitting}
        onClose={closeModal}
        onConfirm={handleConfirm}
        onChangeValue={setField}
      />

      <ModalAlert
        open={!!deleteTarget}
        title="Eliminar Clase Ocupacional"
        message={`¿Está seguro de que desea eliminar la clase ocupacional "${deleteTarget?.name}"? Esta acción afectará a las plazas vinculadas.`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />
    </Box>
  );
}