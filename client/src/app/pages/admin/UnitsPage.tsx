import { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Pagination } from '@mui/material';
import { unitService } from '../../../services/unitService';
import type { Unit, CreateUnitPayload, UpdateUnitPayload } from '../../../services/unitService';
import { departmentService } from '../../../services/departmentService';
import { sectionService } from '../../../services/sectionService';
import type { OrgOption, PageMeta, ServiceError } from '../../../services/common';
import UnitToolbar from '../../../features/admin/unit/UnitToolbar';
import UnitList from '../../../features/admin/unit/UnitList';
import UnitFormModal from '../../../features/admin/unit/UnitFormModal';
import ModalError from '../../../components/modals/ModalError';
import ModalSuccess from '../../../components/modals/ModalSuccess';
import ModalAlert from '../../../components/modals/ModalAlert';

const LIMIT = 10;
type AssignmentType = 'department' | 'section';

const EMPTY_FORM = {
  name: '',
  description: '',
  assignmentType: '' as AssignmentType | '',
  assignmentId: '',
};

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<OrgOption[]>([]);
  const [sections, setSections] = useState<OrgOption[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Unit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null);
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

  const loadUnits = useCallback(() => {
    setLoading(true);
    return unitService
      .getUnits({ page, limit: LIMIT, filter: appliedFilter })
      .then((res) => {
        setUnits(res.data);
        setMeta(res.meta);
      })
      .catch((error) => {
        const e = error as ServiceError;
        setModalError({ open: true, title: 'Error al cargar', message: e.message ?? 'Error del servidor.' });
      })
      .finally(() => setLoading(false));
  }, [page, appliedFilter]);

  useEffect(() => {
    void loadUnits();
  }, [loadUnits]);

  // Cargar opciones para los selects
  useEffect(() => {
    departmentService.getDepartments({ limit: 100 }).then(setDepartments).catch(() => undefined);
    sectionService.getSections({ limit: 100 }).then(setSections).catch(() => undefined);
  }, []);

  const lookups = useMemo(() => ({
    department: new Map(departments.map((d) => [d.id, d.name])),
    section: new Map(sections.map((s) => [s.id, s.name])),
  }), [departments, sections]);

  const belongsTo = useCallback((unit: Unit): string => {
    if (unit.section_id) return `Sección: ${lookups.section.get(unit.section_id) ?? unit.section_id}`;
    if (unit.department_id) return `Departamento: ${lookups.department.get(unit.department_id) ?? unit.department_id}`;
    return '—';
  }, [lookups]);

  const assignmentOptions: OrgOption[] = useMemo(() => {
    switch (form.assignmentType) {
      case 'department': return departments;
      case 'section': return sections;
      default: return [];
    }
  }, [form.assignmentType, departments, sections]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (unit: Unit) => {
    setEditTarget(unit);
    setForm({
      name: unit.name,
      description: unit.description ?? '',
      assignmentType: unit.section_id ? 'section' : 'department',
      assignmentId: unit.section_id ?? unit.department_id ?? '',
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
    if (!form.name.trim()) errors.name = 'El nombre es requerido.';
    if (!form.assignmentType) errors.assignmentType = 'El tipo de asignación es requerido.';
    if (!form.assignmentId) errors.assignmentId = 'Debe seleccionar una entidad.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      if (editTarget) {
        const payload: UpdateUnitPayload = {
          name: form.name.trim(),
          description: form.description.trim(),
        };
        if (form.assignmentType === 'department') payload.department_id = form.assignmentId;
        else if (form.assignmentType === 'section') payload.section_id = form.assignmentId;
        await unitService.updateUnit(editTarget.id, payload);
        setSuccessMsg('Unidad actualizada correctamente.');
      } else {
        const payload: CreateUnitPayload = {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        };
        if (form.assignmentType === 'department') payload.department_id = form.assignmentId;
        else if (form.assignmentType === 'section') payload.section_id = form.assignmentId;
        await unitService.createUnit(payload);
        setSuccessMsg('Unidad creada correctamente.');
      }
      await loadUnits();
      setFormOpen(false);
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
      await unitService.deleteUnit(deleteTarget.id);
      setDeleteTarget(null);
      await loadUnits();
      setSuccessMsg('Unidad eliminada correctamente.');
      setSuccessOpen(true);
    } catch (error) {
      const e = error as ServiceError;
      setModalError({ open: true, title: 'Error al eliminar', message: e.message ?? 'Error del servidor.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPages = meta?.total_pages ?? 1;

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, minHeight: '100%' }}>
      <UnitToolbar search={search} onSearchChange={setSearch} onAddClick={openCreate} />

      <UnitList
        units={units}
        loading={loading}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        belongsTo={belongsTo}
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

      <UnitFormModal
        open={formOpen}
        isEditing={!!editTarget}
        form={form}
        formErrors={formErrors}
        assignmentOptions={assignmentOptions}
        isSubmitting={isSubmitting}
        onClose={() => setFormOpen(false)}
        onConfirm={handleConfirm}
        onFieldChange={setField}
      />

      <ModalAlert
        open={!!deleteTarget}
        title="Eliminar unidad"
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