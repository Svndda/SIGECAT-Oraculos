import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Pagination } from '@mui/material';
import type { Job } from '../../../services/jobService';
import { jobService } from '../../../services/jobService';
import type { JobClass } from '../../../services/jobClassService';
import { jobClassService } from '../../../services/jobClassService';
import type { PageMeta, ServiceError } from '../../../services/common';

import JobToolbar from '../../../features/admin/job/JobToolbar';
import JobList from '../../../features/admin/job/JobList';
import JobFormModal from '../../../features/admin/job/JobFormModal';
import ModalAlert from '../../../components/modals/ModalAlert';
import { useSnackbar } from '../../../context/SnackbarContext';

const LIMIT = 10;
const EMPTY_FORM = { name: '', description: '', code: '', job_class_id: '' };

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobClasses, setJobClasses] = useState<JobClass[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Job | null>(null);
  const [viewTarget, setViewTarget] = useState<Job | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);
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

  const loadJobs = useCallback(() => {
    setLoading(true);
    return jobService.getJobsPage({
      page,
      limit: LIMIT,
      filter: appliedFilter,
      status: 'active'
    })
      .then((res) => {
        setJobs(res.data ?? []);
        setMeta(res.meta);
      })
      .catch((error) => {
        const e = error as ServiceError;
        snackbar.error(e.message ?? 'Error del servidor al cargar cargos.');
      })
      .finally(() => setLoading(false));
  }, [page, appliedFilter, snackbar]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const totalPages = meta?.total_pages ?? 1;

  const jobClassMap = useMemo(() => {
    const map = new Map<string, string>();
    jobClasses.forEach((jc) => map.set(jc.job_class_id, jc.name));
    return map;
  }, [jobClasses]);

  const openCreate = () => {
    setEditTarget(null);
    setViewTarget(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (job: Job) => {
    setEditTarget(job);
    setViewTarget(null);
    setForm({
      name: job.name,
      description: job.description ?? '',
      code: String(job.job_code),
      job_class_id: job.job_class_id
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const openView = (job: Job) => {
    setViewTarget(job);
    setEditTarget(null);
    setForm({
      name: job.name,
      description: job.description ?? '',
      code: String(job.job_code),
      job_class_id: job.job_class_id
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
      errors.name = 'El nombre del puesto es obligatorio.';
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

    if (!form.job_class_id.trim()) {
      errors.job_class_id = 'La clase ocupacional es obligatoria.';
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
        job_code: Number(form.code),
        job_class_id: form.job_class_id
      };

      if (editTarget) {
        await jobService.updateJob(editTarget.job_id, payload);
      } else {
        await jobService.createJob(payload);
      }
      closeModal();
      loadJobs();
      snackbar.success(editTarget ? 'Puesto actualizado exitosamente.' : 'Puesto creado exitosamente.');
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
      await jobService.deleteJob(deleteTarget.job_id);
      setDeleteTarget(null);
      loadJobs();
      snackbar.success('Puesto eliminado exitosamente.');
    } catch (error) {
      const e = error as ServiceError;
      setDeleteTarget(null);
      snackbar.error(e.message ?? 'Error al intentar eliminar el puesto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewMode = !!viewTarget;

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, minHeight: '100%' }}>
      <JobToolbar search={search} onSearchChange={setSearch} onAddClick={openCreate} />

      <JobList
        jobs={jobs}
        loading={loading}
        jobClassMap={jobClassMap}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        onView={openView}
      />

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={totalPages} page={page} onChange={(_, value) => setPage(value)} color="primary" shape="rounded" />
        </Box>
      )}

      <JobFormModal
        open={formOpen}
        isEditing={!!editTarget}
        viewMode={viewMode}
        form={form}
        formErrors={formErrors}
        jobClasses={jobClasses}
        isSubmitting={isSubmitting}
        onClose={closeModal}
        onConfirm={handleConfirm}
        onChangeValue={setField}
      />

      <ModalAlert
        open={!!deleteTarget}
        title="Eliminar Puesto de Trabajo"
        message={`¿Está seguro de que desea eliminar el puesto "${deleteTarget?.name}"? Esta acción afectará a las plazas vinculadas.`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />
    </Box>
  );
}