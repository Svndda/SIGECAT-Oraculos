import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Pagination } from '@mui/material';
import {
  officialFunctionService,
  OFFICIAL_FUNCTION_IN_USE,
  type OfficialFunction,
  type UpdateOfficialFunctionPayload,
} from '../../../services/officialFunctionService';
import type { Job } from '../../../services/jobService';
import { jobService } from '../../../services/jobService';
import type { PageMeta, ServiceError } from '../../../services/common';

import FunctionToolbar from '../../../features/admin/function/FunctionToolbar';
import FunctionList from '../../../features/admin/function/FunctionList';
import FunctionFormModal from '../../../features/admin/function/FunctionFormModal';
import ModalAlert from '../../../components/modals/ModalAlert';
import { useSnackbar } from '../../../context/SnackbarContext';

const LIMIT = 10;
const EMPTY_FORM = { name: '', description: '', job_id: '', expected_time: '' };

export default function FunctionsPage() {
  const [functions, setFunctions] = useState<OfficialFunction[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<OfficialFunction | null>(null);
  const [viewTarget, setViewTarget] = useState<OfficialFunction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OfficialFunction | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof typeof EMPTY_FORM, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Holds a pending update that the backend flagged as used by declarations,
  // waiting for the admin to acknowledge the warning before it is applied.
  const [pendingUpdate, setPendingUpdate] = useState<
    { id: string; payload: UpdateOfficialFunctionPayload; message: string } | null
  >(null);

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
    jobService.getJobsPage({ limit: 100, status: 'active' })
      .then((res) => setJobs(res.data ?? []))
      .catch(() => {});
  }, []);

  const loadFunctions = useCallback(() => {
    setLoading(true);
    return officialFunctionService.getOfficialFunctions({
      page,
      limit: LIMIT,
      filter: appliedFilter,
      status: 'active'
    })
      .then((res) => {
        setFunctions(res.data ?? []);
        setMeta(res.meta);
      })
      .catch((error) => {
        const e = error as ServiceError;
        snackbar.error(e.message ?? 'Error del servidor al cargar funciones.');
      })
      .finally(() => setLoading(false));
  }, [page, appliedFilter, snackbar]);

  useEffect(() => {
    void loadFunctions();
  }, [loadFunctions]);

  const totalPages = meta?.total_pages ?? 1;

  const jobMap = useMemo(() => {
    const map = new Map<string, string>();
    jobs.forEach((j) => map.set(j.job_id, j.name));
    return map;
  }, [jobs]);

  const formFromFunction = (fn: OfficialFunction) => ({
    name: fn.name,
    description: fn.description ?? '',
    job_id: fn.job_id,
    expected_time: fn.expected_time != null ? String(fn.expected_time) : '',
  });

  const openCreate = () => {
    setEditTarget(null);
    setViewTarget(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (fn: OfficialFunction) => {
    setEditTarget(fn);
    setViewTarget(null);
    setForm(formFromFunction(fn));
    setFormErrors({});
    setFormOpen(true);
  };

  const openView = (fn: OfficialFunction) => {
    setViewTarget(fn);
    setEditTarget(null);
    setForm(formFromFunction(fn));
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
      errors.name = 'El nombre de la función es obligatorio.';
    } else if (form.name.length > 110) {
      errors.name = 'El nombre no puede exceder los 110 caracteres.';
    }

    if (form.description && form.description.length > 255) {
      errors.description = 'La descripción no puede exceder los 255 caracteres.';
    }

    if (!form.job_id.trim()) {
      errors.job_id = 'El tipo de puesto es obligatorio.';
    }

    if (form.expected_time.trim()) {
      const value = Number(form.expected_time);
      if (Number.isNaN(value) || value < 0) {
        errors.expected_time = 'El tiempo esperado debe ser un número mayor o igual a 0.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const buildPayload = () => ({
    name: form.name,
    description: form.description || undefined,
    job_id: form.job_id,
    expected_time: form.expected_time.trim() ? Number(form.expected_time) : undefined,
  });

  const handleConfirm = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payload = buildPayload();
      if (editTarget) {
        await officialFunctionService.updateOfficialFunction(editTarget.id, payload);
        snackbar.success('Función actualizada exitosamente.');
      } else {
        await officialFunctionService.createOfficialFunction(payload);
        snackbar.success('Función creada exitosamente.');
      }
      closeModal();
      loadFunctions();
    } catch (error) {
      const e = error as ServiceError;
      // The function is used by one or more declarations: ask the admin to
      // confirm the modification instead of failing outright.
      if (editTarget && e.code === OFFICIAL_FUNCTION_IN_USE) {
        setPendingUpdate({ id: editTarget.id, payload: buildPayload(), message: e.message });
        closeModal();
      } else {
        snackbar.error(e.message ?? 'Error al procesar la solicitud.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmPendingUpdate = async () => {
    if (!pendingUpdate) return;
    setIsSubmitting(true);
    try {
      await officialFunctionService.updateOfficialFunction(pendingUpdate.id, {
        ...pendingUpdate.payload,
        confirm: true,
      });
      setPendingUpdate(null);
      loadFunctions();
      snackbar.success('Función actualizada exitosamente.');
    } catch (error) {
      const e = error as ServiceError;
      setPendingUpdate(null);
      snackbar.error(e.message ?? 'Error al actualizar la función.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await officialFunctionService.deleteOfficialFunction(deleteTarget.id);
      setDeleteTarget(null);
      loadFunctions();
      snackbar.success('Función eliminada exitosamente.');
    } catch (error) {
      const e = error as ServiceError;
      setDeleteTarget(null);
      snackbar.error(e.message ?? 'Error al intentar eliminar la función.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewMode = !!viewTarget;

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, minHeight: '100%' }}>
      <FunctionToolbar search={search} onSearchChange={setSearch} onAddClick={openCreate} />

      <FunctionList
        functions={functions}
        loading={loading}
        jobMap={jobMap}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        onView={openView}
      />

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={totalPages} page={page} onChange={(_, value) => setPage(value)} color="primary" shape="rounded" />
        </Box>
      )}

      <FunctionFormModal
        open={formOpen}
        isEditing={!!editTarget}
        viewMode={viewMode}
        form={form}
        formErrors={formErrors}
        jobs={jobs}
        isSubmitting={isSubmitting}
        onClose={closeModal}
        onConfirm={handleConfirm}
        onChangeValue={setField}
      />

      <ModalAlert
        open={!!deleteTarget}
        title="Eliminar Función"
        message={`¿Está seguro de que desea eliminar la función "${deleteTarget?.name}"?`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />

      <ModalAlert
        open={!!pendingUpdate}
        title="Función en uso"
        message={`${pendingUpdate?.message ?? ''} ¿Desea aplicar los cambios de todas formas?`}
        onClose={() => setPendingUpdate(null)}
        onConfirm={confirmPendingUpdate}
        confirmLabel="Aplicar cambios"
        cancelLabel="Cancelar"
      />
    </Box>
  );
}
