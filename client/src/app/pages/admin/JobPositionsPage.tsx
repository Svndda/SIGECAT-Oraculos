import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  InputAdornment,
  Stack,
  MenuItem,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DataTable, { type DataColumn } from '../../../components/DataTable';
import { areaService } from '../../../services/areaService';
import { unitService } from '../../../services/unitService';
import { departmentService } from '../../../services/departmentService';
import { sectionService } from '../../../services/sectionService';
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
import type { OrgOption, ServiceError } from '../../../services/common';
import ModalForm from '../../../components/modals/ModalForm';
import ModalError from '../../../components/modals/ModalError';
import ModalSuccess from '../../../components/modals/ModalSuccess';
import ModalAlert from '../../../components/modals/ModalAlert';

const EMPTY_FORM = {
  job_position_number: '',
  description: '',
  job_position_type_id: '',
  parentType: '' as JobPositionParentType | '',
  parentId: '',
};

const PARENT_TYPES: { value: JobPositionParentType; label: string }[] = [
  { value: 'area', label: 'Área' },
  { value: 'department', label: 'Departamento' },
  { value: 'section', label: 'Sección' },
  { value: 'unit', label: 'Unidad' },
];

/** Oracle default timestamps look like "28-MAY-26 05.34.02.776554 PM"; show the date part. */
function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return dateStr.split(' ')[0];
}

export default function JobPositionsPage() {
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [departments, setDepartments] = useState<OrgOption[]>([]);
  const [sections, setSections] = useState<OrgOption[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [types, setTypes] = useState<JobPositionType[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<JobPosition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobPosition | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof typeof EMPTY_FORM, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState({ open: false, title: '', message: '' });
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const refreshJobPositions = useCallback(async () => {
    try {
      const { data } = await jobPositionService.getJobPositions({ limit: 100 });
      setJobPositions(data);
    } catch (error) {
      const e = error as ServiceError;
      setModalError({ open: true, title: 'Error al cargar', message: e.message ?? 'Error del servidor.' });
    }
  }, []);

  useEffect(() => {
    void refreshJobPositions();
    // Option sources for the create form.
    jobPositionService.getJobPositionTypes().then(setTypes).catch(() => undefined);
    areaService.getAreas({ limit: 100 }).then(({ data }) => setAreas(data)).catch(() => undefined);
    unitService.getUnits({ limit: 100 }).then(({ data }) => setUnits(data)).catch(() => undefined);
    departmentService.getDepartments({ limit: 100 }).then(setDepartments).catch(() => undefined);
    sectionService.getSections({ limit: 100 }).then(setSections).catch(() => undefined);
  }, [refreshJobPositions]);

  // Name lookups for each parent kind, to render a job position's owning entity.
  const lookups = useMemo(() => ({
    area: new Map(areas.map((a) => [a.id, a.name])),
    department: new Map(departments.map((d) => [d.id, d.name])),
    section: new Map(sections.map((s) => [s.id, s.name])),
    unit: new Map(units.map((u) => [u.id, u.name])),
  }), [areas, departments, sections, units]);

  const parentLabel = useCallback((jobPosition: JobPosition): string => {
    if (jobPosition.area_id) return `Área: ${lookups.area.get(jobPosition.area_id) ?? jobPosition.area_id}`;
    if (jobPosition.department_id) return `Departamento: ${lookups.department.get(jobPosition.department_id) ?? jobPosition.department_id}`;
    if (jobPosition.section_id) return `Sección: ${lookups.section.get(jobPosition.section_id) ?? jobPosition.section_id}`;
    if (jobPosition.unit_id) return `Unidad: ${lookups.unit.get(jobPosition.unit_id) ?? jobPosition.unit_id}`;
    return '—';
  }, [lookups]);

  // Options for the entity dropdown, depending on the selected parent type.
  const parentOptions: OrgOption[] = useMemo(() => {
    switch (form.parentType) {
      case 'area': return areas.map((a) => ({ id: a.id, name: a.name }));
      case 'department': return departments;
      case 'section': return sections;
      case 'unit': return units.map((u) => ({ id: u.id, name: u.name }));
      default: return [];
    }
  }, [form.parentType, areas, departments, sections, units]);

  const filtered = useMemo(() =>
    jobPositions.filter((p) =>
      [p.name, p.description ?? '', parentLabel(p)]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
    ), [jobPositions, search, parentLabel]);

  const columns: DataColumn<JobPosition>[] = [
    { label: 'Número', flex: '0 0 18%', primary: true, render: (p) => p.job_position_number },
    { label: 'Entidad', flex: '0 0 30%', truncate: true, render: (p) => parentLabel(p) },
    { label: 'Descripción', flex: '1', truncate: true, render: (p) => p.description ?? '—' },
    { label: 'Fecha de creación', flex: '0 0 18%', meta: true, render: (p) => formatDate(p.created_at) },
  ];

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (jobPosition: JobPosition) => {
    setEditTarget(jobPosition);
    const parentType: JobPositionParentType | '' =
      jobPosition.area_id ? 'area'
      : jobPosition.department_id ? 'department'
      : jobPosition.section_id ? 'section'
      : jobPosition.unit_id ? 'unit'
      : '';
    const parentId =
      jobPosition.area_id ?? jobPosition.department_id ??
      jobPosition.section_id ?? jobPosition.unit_id ?? '';
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
      await refreshJobPositions();
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
      await jobPositionService.deleteJobPosition(deleteTarget.id);
      setDeleteTarget(null);
      await refreshJobPositions();
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

  const setField = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleText = (field: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setField(field, e.target.value);

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, minHeight: '100%' }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, color: '#1a1a1a' }}>
        Plazas
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 3 }}>
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar"
          size="small"
          sx={{ width: { xs: '100%', sm: 260 }, backgroundColor: 'white', borderRadius: 1 }}
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
          Añadir Plaza
        </Button>
      </Box>

      <DataTable
        columns={columns}
        items={filtered}
        getKey={(p) => p.id}
        actions={[
          { icon: <EditIcon fontSize="small" />, label: 'Editar', color: '#1a2b4a', onClick: openEdit },
          { icon: <DeleteOutlineIcon fontSize="small" />, label: 'Eliminar', color: '#9e9e9e', onClick: setDeleteTarget },
        ]}
        emptyMessage="No se encontraron plazas."
      />

      <ModalForm
        open={formOpen}
        title={editTarget ? 'Editar Plaza' : 'Añadir Plaza'}
        onClose={() => setFormOpen(false)}
        onConfirm={handleConfirm}
        confirmLabel={editTarget ? 'Guardar cambios' : 'Confirmar'}
        isSubmitting={isSubmitting}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField
            label="Número de plaza"
            value={form.job_position_number}
            onChange={handleText('job_position_number')}
            size="small"
            fullWidth
            error={!!formErrors.job_position_number}
            helperText={formErrors.job_position_number}
            required
          />
          <Autocomplete
            options={types}
            getOptionLabel={(t) => t.name}
            value={types.find((t) => t.job_position_type_id === form.job_position_type_id) ?? null}
            onChange={(_, selected) => {
              setField('job_position_type_id', selected?.job_position_type_id ?? '');
            }}
            size="small"
            fullWidth
            renderInput={(params) => (
              <TextField
                {...params}
                label="Tipo de plaza"
                required
                error={!!formErrors.job_position_type_id}
                helperText={formErrors.job_position_type_id ?? (types.length === 0 ? 'No hay tipos de plaza registrados.' : '')}
              />
            )}
          />
          <TextField
            select
            label="Tipo de entidad"
            value={form.parentType}
            onChange={(e) => {
              // Reset the chosen entity when the parent kind changes.
              setForm((prev) => ({ ...prev, parentType: e.target.value as JobPositionParentType, parentId: '' }));
              setFormErrors((prev) => ({ ...prev, parentType: undefined, parentId: undefined }));
            }}
            size="small"
            fullWidth
            error={!!formErrors.parentType}
            helperText={formErrors.parentType}
            required
          >
            {PARENT_TYPES.map((p) => (
              <MenuItem key={p.value} value={p.value}>
                {p.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Entidad"
            value={form.parentId}
            onChange={handleText('parentId')}
            size="small"
            fullWidth
            disabled={!form.parentType}
            error={!!formErrors.parentId}
            helperText={
              formErrors.parentId ??
              (form.parentType && parentOptions.length === 0 ? 'No hay entidades de este tipo registradas.' : '')
            }
            required
          >
            {parentOptions.map((o) => (
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
