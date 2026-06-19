import {useEffect, useMemo, useState} from 'react';
import {Box, Pagination} from '@mui/material';
import type {Job} from '../../../services/jobService';
import {jobService} from '../../../services/jobService';
import type {JobClass} from '../../../services/jobClassService';
import {jobClassService} from '../../../services/jobClassService';
import type {PageMeta, ServiceError} from '../../../services/common';

import JobToolbar from '../../../features/admin/job/JobToolbar';
import JobList from '../../../features/admin/job/JobList';
import JobFormModal from '../../../features/admin/job/JobFormModal';
import ModalAlert from '../../../components/modals/ModalAlert';
import {useSnackbar} from '../../../context/SnackbarContext';

const LIMIT = 10;
const EMPTY_FORM = {name: '', description: '', code: '', job_class_id: ''};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobClasses, setJobClasses] = useState<JobClass[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof typeof EMPTY_FORM, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const snackbar = useSnackbar();
  const [deleteAlert, setDeleteAlert] = useState<{
    open: boolean;
    id: string
  }>({open: false, id: ''});

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
    jobClassService.getJobClasses({limit: 100})
      .then(res => setJobClasses(res))
      .catch(() => {
      });
  }, []);

  const loadJobs = (isSubscribed: boolean) => {
    setLoading(true);
    jobService.getJobsPage({
      page,
      limit: LIMIT,
      filter: appliedFilter,
      status: 'active'
    })
      .then((res) => {
        if (!isSubscribed) return;
        setJobs(res.data ?? []);
        setMeta(res.meta);
      })
      .catch((error) => {
        if (!isSubscribed) return;
        const e = error as ServiceError;
        snackbar.error(e.message ?? 'Error del servidor al cargar cargos.');
      })
      .finally(() => {
        if (isSubscribed) setLoading(false);
      });
  };

  useEffect(() => {
    let isSubscribed = true;
    loadJobs(isSubscribed);
    return () => {
      isSubscribed = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, appliedFilter]);

  const totalPages = meta?.total_pages ?? 1;

  const jobClassMap = useMemo(() => {
    const map = new Map<string, string>();
    jobClasses.forEach(jc => map.set(jc.job_class_id, jc.name));
    return map;
  }, [jobClasses]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setIsEditing(null);
    setFormOpen(true);
  };

  const openEdit = (job: Job) => {
    setForm({
      name: job.name,
      description: job.description ?? '',
      code: String(job.job_code),
      job_class_id: job.job_class_id,
    });
    setFormErrors({});
    setIsEditing(job.job_id);
    setFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof typeof EMPTY_FORM, string>> = {};
    if (!form.name.trim()) errors.name = 'El nombre del puesto es obligatorio.';
    if (!form.code.trim()) errors.code = 'El código numérico es obligatorio.';
    if (!form.job_class_id.trim()) errors.job_class_id = 'La clase ocupacional es obligatoria.';
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
        job_class_id: form.job_class_id,
      };

      if (isEditing) {
        await jobService.updateJob(isEditing, payload);
      } else {
        await jobService.createJob(payload);
      }
      setFormOpen(false);
      loadJobs(true);
      snackbar.success(isEditing ? 'Puesto actualizado exitosamente.' : 'Puesto creado exitosamente.');
    } catch (error) {
      const e = error as ServiceError;
      snackbar.error(e.message ?? 'Error al procesar la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = (job: Job) => {
    setDeleteAlert({open: true, id: job.job_id});
  };

  const confirmDelete = async () => {
    if (!deleteAlert.id) return;
    try {
      await jobService.deleteJob(deleteAlert.id);
      snackbar.success('Puesto eliminado exitosamente.');
      loadJobs(true);
    } catch (error) {
      const e = error as ServiceError;
      snackbar.error(e.message ?? 'Error al intentar eliminar el puesto.');
    } finally {
      setDeleteAlert({open: false, id: ''});
    }
  };

  const handleChange = (field: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({...prev, [field]: e.target.value}));
    if (formErrors[field]) setFormErrors((prev) => ({
      ...prev,
      [field]: undefined
    }));
  };

  return (
    <Box sx={{p: {xs: 2, sm: 4}, minHeight: '100%'}}>
      <JobToolbar
        search={search}
        onSearchChange={setSearch}
        onAddClick={openCreate}
      />

      <JobList
        jobs={jobs}
        loading={loading}
        jobClassMap={jobClassMap}
        onEdit={openEdit}
        onDelete={handleDeleteRequest}
      />

      {totalPages > 1 && (
        <Box sx={{display: 'flex', justifyContent: 'center', mt: 3}}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary" shape="rounded"/>
        </Box>
      )}

      <JobFormModal
        open={formOpen}
        isEditing={!!isEditing}
        form={form}
        formErrors={formErrors}
        jobClasses={jobClasses}
        isSubmitting={isSubmitting}
        onClose={() => setFormOpen(false)}
        onConfirm={handleConfirm}
        onChangeValue={handleChange}
      />

      <ModalAlert
        open={deleteAlert.open}
        title="Eliminar Puesto de Trabajo"
        message="¿Está seguro de que desea eliminar este puesto? Esta acción afectará a las plazas vinculadas."
        onClose={() => setDeleteAlert({open: false, id: ''})}
        onConfirm={confirmDelete}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />
    </Box>
  );
}