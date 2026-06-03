import { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Pagination } from '@mui/material';
import { areaService } from '../../../services/areaService';
import { departmentService } from '../../../services/departmentService';
import { sectionService } from '../../../services/sectionService';
import { unitService } from '../../../services/unitService';
import { jobPositionService } from '../../../services/jobPositionService';
import type { Area } from '../../../services/areaService';
import type { Unit } from '../../../services/unitService';
import type {
  JobPosition,
  JobPositionType,
  JobPositionParentType,
  CreateJobPositionPayload,
  UpdateJobPositionPayload,
} from '../../../services/jobPositionService';
import type { OrgOption, PageMeta, ServiceError } from '../../../services/common';
import JobPositionToolbar from '../../../features/admin/job_position/JobPositionToolbar';
import JobPositionList from '../../../features/admin/job_position/JobPositionList';
import JobPositionFormModal from '../../../features/admin/job_position/JobPositionFormModal';
import ModalError from '../../../components/modals/ModalError';
import ModalSuccess from '../../../components/modals/ModalSuccess';
import ModalAlert from '../../../components/modals/ModalAlert';

const LIMIT = 10;

const EMPTY_FORM = {
  job_position_number: '',
  description: '',
  job_position_type_id: '',
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

  // Datos para selects y lookups
  const [areas, setAreas] = useState<Area[]>([]);
  const [departments, setDepartments] = useState<OrgOption[]>([]);
  const [sections, setSections] = useState<OrgOption[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [types, setTypes] = useState<JobPositionType[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(true);

  // Estados de modales
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<JobPosition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobPosition | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof typeof EMPTY_FORM, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [modalError, setModalError] = useState({ open: false, title: '', message: '' });
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setAppliedFilter(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Cargar entidades (solo una vez)
  useEffect(() => {
    const loadEntities = async () => {
      try {
        const [areasData, departmentsData, sectionsData, unitsData, typesData] = await Promise.all([
          areaService.getAreas({ limit: 100 }),
          departmentService.getDepartments({ limit: 100 }),
          sectionService.getSections({ limit: 100 }),
          unitService.getUnits({ limit: 100 }),
          jobPositionService.getJobPositionTypes(),
        ]);
        setAreas(areasData.data);
        setDepartments(departmentsData);
        setSections(sectionsData);
        setUnits(unitsData.data);
        setTypes(typesData);
      } catch (error) {
        const e = error as ServiceError;
        setModalError({ open: true, title: 'Error al cargar', message: e.message ?? 'Error del servidor.' });
      } finally {
        setLoadingEntities(false);
      }
    };
    loadEntities();
  }, []);

  // Cargar plazas con paginación
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
        setModalError({ open: true, title: 'Error al cargar', message: e.message ?? 'Error del servidor.' });
      })
      .finally(() => setLoading(false));
  }, [page, appliedFilter]);

  useEffect(() => {
    if (!loadingEntities) {
      loadJobPositions();
    }
  }, [loadJobPositions, loadingEntities]);

  const totalPages = meta?.total_pages ?? 1;

  // Lookups para nombres de entidades
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

  // Opciones para el selector de entidad en el formulario
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

  // Manejadores del formulario
  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (jobPosition: JobPosition) => {
    setEditTarget(jobPosition);
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
      jobPosition.area_id ?? jobPosition.department_id ?? jobPosition.section_id ?? jobPosition.unit_id ?? '';
    setForm({
      job_position_number: jobPosition.job_position_number,
      description: jobPosition.description ?? '',
      job_position_type_id: jobPosition.job_position_type_id,
      parentType,
      parentId,
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const setField = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof typeof EMPTY_FORM, string>> = {};
    if (!form.job_position_number.trim()) errors.job_position_number = 'El número de plaza es requerido.';
    if (!form.job_position_type_id) errors.job_position_type_id = 'El tipo de plaza es requerido.';
    if (!form.parentType) errors.parentType = 'El tipo de entidad es requerido.';
    if (!form.parentId) errors.parentId = 'La entidad es requerida.';
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
          description: form.description.trim(),
          job_position_type_id: form.job_position_type_id,
        };
        if (form.parentType) {
          payload[`${form.parentType}_id`] = form.parentId;
        }
        await jobPositionService.editJobPosition(editTarget.id, payload);
        setSuccessMsg('Plaza actualizada correctamente.');
      } else {
        const payload: CreateJobPositionPayload = {
          job_position_number: form.job_position_number.trim(),
          description: form.description.trim() || undefined,
          job_position_type_id: form.job_position_type_id,
        };
        if (form.parentType) {
          payload[`${form.parentType}_id`] = form.parentId;
        }
        await jobPositionService.createJobPosition(payload);
        setSuccessMsg('Plaza creada correctamente.');
      }
      setFormOpen(false);
      await loadJobPositions();
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
      await jobPositionService.deleteJobPosition(deleteTarget.id);
      setDeleteTarget(null);
      await loadJobPositions();
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

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, minHeight: '100%' }}>
      <JobPositionToolbar search={search} onSearchChange={setSearch} onAddClick={openCreate} />

      <JobPositionList
        jobPositions={jobPositions}
        loading={loading || loadingEntities}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
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
        form={form}
        formErrors={formErrors}
        types={types}
        parentOptions={parentOptions}
        isSubmitting={isSubmitting}
        onClose={() => setFormOpen(false)}
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