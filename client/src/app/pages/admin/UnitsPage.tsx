import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  InputAdornment,
  Pagination,
  Stack,
  MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { unitService } from '../../../services/unitService';
import type { Unit, CreateUnitPayload, UpdateUnitPayload } from '../../../services/unitService';
import { departmentService } from '../../../services/departmentService';
import { sectionService } from '../../../services/sectionService';
import type { OrgOption, PageMeta, ServiceError } from '../../../services/common';
import DataTable, { type DataColumn } from '../../../components/DataTable';
import ModalForm from '../../../components/modals/ModalForm';
import ModalError from '../../../components/modals/ModalError';
import ModalSuccess from '../../../components/modals/ModalSuccess';
import ModalAlert from '../../../components/modals/ModalAlert';

const LIMIT = 10;

type AssignmentType = 'department' | 'section';

const ASSIGNMENT_TYPES: { value: AssignmentType; label: string }[] = [
  { value: 'department', label: 'Departamento' },
  { value: 'section', label: 'Sección' },
];

const EMPTY_FORM = {
  name: '',
  description: '',
  assignmentType: '' as AssignmentType | '',
  assignmentId: '',
};

/** Oracle default timestamps look like "28-MAY-26 05.34.02.776554 PM"; show the date part. */
function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return dateStr.split(' ')[0];
}

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

  // Debounce the search input into appliedFilter and reset to page 1.
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

  // Option sources for the create form, also used to label each unit's owner.
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

  const totalPages = meta?.total_pages ?? 1;

  const columns: DataColumn<Unit>[] = [
    { label: 'Nombre', flex: '0 0 26%', primary: true, render: (u) => u.name },
    { label: 'Descripción', flex: '1', truncate: true, render: (u) => u.description ?? '—' },
    { label: 'Pertenece a', flex: '0 0 22%', truncate: true, render: (u) => belongsTo(u) },
    { label: 'Fecha de creación', flex: '0 0 18%', meta: true, render: (u) => formatDate(u.created_at) },
  ];

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

  const handleText = (field: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setField(field, e.target.value);

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
        // The assignment type is locked on edit, so only the entity within the
        // same kind can change (the backend update cannot clear the other column).
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
      setDeleteTarget(null);
      setModalError({ open: true, title: 'Error al eliminar', message: e.message ?? 'Error del servidor.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, minHeight: '100%' }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, color: '#1a1a1a' }}>
        Unidades
      </Typography>

      {/* Toolbar */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 3 }}>
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre"
          size="small"
          sx={{ width: { xs: '100%', sm: 280 }, backgroundColor: 'white', borderRadius: 1 }}
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
          Añadir Unidad
        </Button>
      </Box>

      <DataTable
        columns={columns}
        items={units}
        getKey={(unit) => unit.id}
        loading={loading}
        actions={[
          { icon: <EditIcon fontSize="small" />, label: 'Editar', color: '#1a2b4a', onClick: openEdit },
          { icon: <DeleteOutlineIcon fontSize="small" />, label: 'Eliminar', color: '#9e9e9e', onClick: setDeleteTarget },
        ]}
        emptyMessage="No se encontraron unidades."
      />

      {/* Pagination */}
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

      {/* Create / Edit modal */}
      <ModalForm
        open={formOpen}
        title={editTarget ? 'Editar Unidad' : 'Añadir Unidad'}
        onClose={() => setFormOpen(false)}
        onConfirm={handleConfirm}
        confirmLabel={editTarget ? 'Guardar cambios' : 'Confirmar'}
        isSubmitting={isSubmitting}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField
            label="Nombre"
            value={form.name}
            onChange={handleText('name')}
            size="small"
            fullWidth
            error={!!formErrors.name}
            helperText={formErrors.name}
            required
          />
          <TextField
            select
            label="Tipo de asignación"
            value={form.assignmentType}
            onChange={(e) => {
              // Reset the chosen entity when the assignment kind changes.
              setForm((prev) => ({ ...prev, assignmentType: e.target.value as AssignmentType, assignmentId: '' }));
              setFormErrors((prev) => ({ ...prev, assignmentType: undefined, assignmentId: undefined }));
            }}
            size="small"
            fullWidth
            disabled={!!editTarget}
            error={!!formErrors.assignmentType}
            helperText={editTarget ? 'El tipo de asignación no se puede cambiar.' : formErrors.assignmentType}
            required
          >
            {ASSIGNMENT_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Entidad"
            value={form.assignmentId}
            onChange={handleText('assignmentId')}
            size="small"
            fullWidth
            disabled={!form.assignmentType}
            error={!!formErrors.assignmentId}
            helperText={
              formErrors.assignmentId ??
              (form.assignmentType && assignmentOptions.length === 0 ? 'No hay entidades de este tipo registradas.' : '')
            }
            required
          >
            {assignmentOptions.map((o) => (
              <MenuItem key={o.id} value={o.id}>
                {o.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Descripción"
            value={form.description}
            onChange={handleText('description')}
            size="small"
            fullWidth
            multiline
            rows={3}
          />
        </Stack>
      </ModalForm>

      {/* Delete confirmation */}
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
