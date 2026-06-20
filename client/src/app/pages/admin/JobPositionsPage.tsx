import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Box,
  Pagination,
} from '@mui/material';

import ModalAlert from '../../../components/modals/ModalAlert';
import { useSnackbar } from '../../../context/SnackbarContext';
import JobPositionFormModal
  from '../../../features/admin/job_position/JobPositionFormModal';
import JobPositionList
  from '../../../features/admin/job_position/JobPositionList';
import JobPositionToolbar
  from '../../../features/admin/job_position/JobPositionToolbar';
import type { Area } from '../../../services/areaService';
import { areaService } from '../../../services/areaService';
import type {
  OrgOption,
  PageMeta,
  ServiceError,
} from '../../../services/common';
import { departmentService } from '../../../services/departmentService';
import type {
  CreateJobPositionPayload,
  Job,
  JobPosition,
  JobPositionParentType,
  UpdateJobPositionPayload,
} from '../../../services/jobPositionService';
import { jobPositionService } from '../../../services/jobPositionService';
import { sectionService } from '../../../services/sectionService';
import type { Unit } from '../../../services/unitService';
import { unitService } from '../../../services/unitService';
import type { AdminUser } from '../../../services/userService';
import { userService } from '../../../services/userService';

const LIMIT = 10;
const SHIFT_OPTIONS = [
  'Diurna', 'Media Diurna', 'Mixta', 'Nocturna', 'Media Nocturna'
];

const EMPTY_FORM = {
  job_position_number: '',
  description: '',
  job_id: '',
  user_id: '',
  job_shift: '',
  parentType: '' as JobPositionParentType | '',
  parentId: '',
};

export default function JobPositionsPage() {
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const [areas, setAreas] = useState<Area[]>([]);
  const [departments, setDepartments] = useState<OrgOption[]>([]);
  const [sections, setSections] = useState<OrgOption[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [types, setTypes] = useState<Job[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<JobPosition | null>(null);
  const [viewTarget, setViewTarget] = useState<JobPosition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobPosition | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof typeof EMPTY_FORM, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const snackbar = useSnackbar();

  useEffect(() => {
    const t = setTimeout(() => {
      setAppliedFilter(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const loadEntities = async () => {
      try {
        const [
          areasData, departmentsData,
          sectionsData, unitsData,
          typesData, usersData
        ] = await Promise.all([
            areaService.getAreas({ limit: 100 }),
            departmentService.getDepartments({ limit: 100 }),
            sectionService.getSections({ limit: 100 }),
            unitService.getUnits({ limit: 100 }),
            jobPositionService.getJobs(),
            userService.getUsers(),
          ]);
        setAreas(areasData.data);
        setDepartments(departmentsData);
        setSections(sectionsData);
        setUnits(unitsData.data);
        setTypes(typesData);
        setUsers(usersData);
      } catch (error) {
        const e = error as ServiceError;
        snackbar.error(e.message ?? 'Error del servidor.');
      } finally {
        setLoadingEntities(false);
      }
    };
    loadEntities();
  }, [snackbar]);

  const loadJobPositions = useCallback(() => {
    setLoading(true);
    jobPositionService
      .getJobPositions({ page, limit: LIMIT, filter: appliedFilter })
      .then((res) => {
        setJobPositions(res.data);
        setMeta(res.meta);
      })
      .catch((error) => {
        const e = error as ServiceError;
        snackbar.error(e.message ?? 'Error del servidor.');
      })
      .finally(() => setLoading(false));
  }, [page, appliedFilter, snackbar]);

  useEffect(() => {
    if (!loadingEntities) {
      loadJobPositions();
    }
  }, [loadJobPositions, loadingEntities]);

  const totalPages = meta?.total_pages ?? 1;

  const lookups = useMemo(
    () => ({
      area: new Map(areas.map((a) => [a.area_id, a.name])),
      department: new Map(departments.map((d) => [d.id, d.name])),
      section: new Map(sections.map((s) => [s.id, s.name])),
      unit: new Map(units.map((u) => [u.id, u.name])),
    }),
    [areas, departments, sections, units]
  );

  const parentLabel = useCallback(
    (jobPosition: JobPosition): string => {
      if (loadingEntities) return 'Cargando...';
      if (jobPosition.area_id) {
        const name = lookups.area.get(jobPosition.area_id);
        return name ? `Área: ${name}` : `Área: ${jobPosition.area_id}`;
      }
      if (jobPosition.department_id) {
        const name = lookups.department.get(jobPosition.department_id);
        return name ? `Departamento: ${name}` : `Departamento: ${jobPosition.department_id}`;
      }
      if (jobPosition.section_id) {
        const name = lookups.section.get(jobPosition.section_id);
        return name ? `Sección: ${name}` : `Sección: ${jobPosition.section_id}`;
      }
      if (jobPosition.unit_id) {
        const name = lookups.unit.get(jobPosition.unit_id);
        return name ? `Unidad: ${name}` : `Unidad: ${jobPosition.unit_id}`;
      }
      return '—';
    },
    [lookups, loadingEntities]
  );

  const parentOptions: OrgOption[] = useMemo(() => {
    switch (form.parentType) {
      case 'area':
        return areas.map((a) => ({ id: a.area_id, name: a.name }));
      case 'department':
        return departments;
      case 'section':
        return sections;
      case 'unit':
        return units.map((u) => ({ id: u.id, name: u.name }));
      default:
        return [];
    }
  }, [form.parentType, areas, departments, sections, units]);

  const userOptions = useMemo(() => {
    return users.map((u) => ({
      id: u.id,
      label: `${u.first_name} ${u.last_name} (${u.email})`,
    }));
  }, [users]);

  const openCreate = () => {
    setEditTarget(null);
    setViewTarget(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (jobPosition: JobPosition) => {
    setEditTarget(jobPosition);
    setViewTarget(null);
    const parentType: JobPositionParentType | '' =
      jobPosition.area_id
        ? 'area'
        : jobPosition.department_id
          ? 'department'
          : jobPosition.section_id
            ? 'section'
            : jobPosition.unit_id
              ? 'unit'
              : '';
    const parentId =
      jobPosition.area_id ??
      jobPosition.department_id ??
      jobPosition.section_id ??
      jobPosition.unit_id ??
      '';
    setForm({
      job_position_number: jobPosition.job_position_number,
      description: jobPosition.description ?? '',
      job_id: jobPosition.job_id,
      user_id: jobPosition.user_id ?? '',
      job_shift: jobPosition.job_shift ?? '',
      parentType,
      parentId,
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const openView = (jobPosition: JobPosition) => {
    setViewTarget(jobPosition);
    setEditTarget(null);
    const parentType: JobPositionParentType | '' =
      jobPosition.area_id
        ? 'area'
        : jobPosition.department_id
          ? 'department'
          : jobPosition.section_id
            ? 'section'
            : jobPosition.unit_id
              ? 'unit'
              : '';
    const parentId =
      jobPosition.area_id ??
      jobPosition.department_id ??
      jobPosition.section_id ??
      jobPosition.unit_id ??
      '';
    setForm({
      job_position_number: jobPosition.job_position_number,
      description: jobPosition.description ?? '',
      job_id: jobPosition.job_id,
      user_id: jobPosition.user_id ?? '',
      job_shift: jobPosition.job_shift ?? '',
      parentType,
      parentId,
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
    const num = form.job_position_number.trim();
    if (!num) errors.job_position_number = 'El número de plaza es requerido.';
    else if (num.length > 10) errors.job_position_number = 'No puede exceder 10 dígitos.';
    else if (!/^\d+$/.test(num)) errors.job_position_number = 'Solo números.';
    if (!form.job_id) errors.job_id = 'El tipo de plaza es requerido.';
    if (!form.user_id) errors.user_id = 'El usuario asignado es requerido.';
    if (!form.job_shift) errors.job_shift = 'El turno es requerido.';
    if (form.job_shift && !SHIFT_OPTIONS.includes(form.job_shift))
      errors.job_shift = 'Turno no válido.';
    if (!form.parentType) errors.parentType = 'El tipo de entidad es requerido.';
    if (!form.parentId) errors.parentId = 'La entidad es requerida.';
    if (form.description && form.description.length > 255)
      errors.description = 'No puede exceder 255 caracteres.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      if (editTarget) {
        const payload: UpdateJobPositionPayload = {
          job_position_number: form.job_position_number.trim(),
          description: form.description.trim() || undefined,
          job_id: form.job_id,
          user_id: form.user_id || undefined,
          job_shift: form.job_shift || undefined,
        };
        if (form.parentType) {
          payload[`${form.parentType}_id`] = form.parentId;
        }
        await jobPositionService.editJobPosition(editTarget.job_position_id, payload);
      } else {
        const payload: CreateJobPositionPayload = {
          job_position_number: form.job_position_number.trim(),
          description: form.description.trim() || undefined,
          job_id: form.job_id,
          user_id: form.user_id,
          job_shift: form.job_shift,
        };
        if (form.parentType) {
          payload[`${form.parentType}_id`] = form.parentId;
        }
        await jobPositionService.createJobPosition(payload);
      }
      closeModal();
      await loadJobPositions();
      snackbar.success(editTarget ? 'Plaza actualizada correctamente.' : 'Plaza creada correctamente.');
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
      await jobPositionService.deleteJobPosition(deleteTarget.job_position_id);
      setDeleteTarget(null);
      await loadJobPositions();
      snackbar.success('Plaza eliminada correctamente.');
    } catch (error) {
      const e = error as ServiceError;
      setDeleteTarget(null);
      snackbar.error(e.message ?? 'Error del servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewMode = !!viewTarget;

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, minHeight: '100%' }}>
      <JobPositionToolbar search={search} onSearchChange={setSearch} onAddClick={openCreate} />

      <JobPositionList
        jobPositions={jobPositions}
        loading={loading || loadingEntities}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        onView={openView}
        parentLabel={parentLabel}
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

      <JobPositionFormModal
        open={formOpen}
        isEditing={!!editTarget}
        viewMode={viewMode}
        form={form}
        formErrors={formErrors}
        types={types}
        userOptions={userOptions}
        shiftOptions={SHIFT_OPTIONS}
        parentOptions={parentOptions}
        isSubmitting={isSubmitting}
        onClose={closeModal}
        onConfirm={handleConfirm}
        onFieldChange={setField}
      />

      <ModalAlert
        open={!!deleteTarget}
        title="Eliminar plaza"
        message={`¿Está seguro que desea eliminar la plaza "${deleteTarget?.job_position_number}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </Box>
  );
}