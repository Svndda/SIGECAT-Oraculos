import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  IconButton,
  InputAdornment,
  Stack,
  MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { adminService } from '../../../services/adminService';
import type {
  Plaza,
  Area,
  Unit,
  OrgOption,
  JobPositionType,
  PlazaParentType,
  CreatePlazaPayload,
  ServiceError,
} from '../../../services/adminService';
import ModalForm from '../../../components/modals/ModalForm';
import ModalError from '../../../components/modals/ModalError';
import ModalSuccess from '../../../components/modals/ModalSuccess';
import ModalAlert from '../../../components/modals/ModalAlert';

const EMPTY_FORM = {
  name: '',
  description: '',
  job_position_type_id: '',
  parentType: '' as PlazaParentType | '',
  parentId: '',
};

const PARENT_TYPES: { value: PlazaParentType; label: string }[] = [
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

export default function PlazasPage() {
  const [plazas, setPlazas] = useState<Plaza[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [departments, setDepartments] = useState<OrgOption[]>([]);
  const [sections, setSections] = useState<OrgOption[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [types, setTypes] = useState<JobPositionType[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Plaza | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof typeof EMPTY_FORM, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState({ open: false, title: '', message: '' });
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const refreshPlazas = useCallback(async () => {
    try {
      const { data } = await adminService.getPlazas({ limit: 100 });
      setPlazas(data);
    } catch (error) {
      const e = error as ServiceError;
      setModalError({ open: true, title: 'Error al cargar', message: e.message ?? 'Error del servidor.' });
    }
  }, []);

  useEffect(() => {
    void refreshPlazas();
    // Option sources for the create form.
    adminService.getJobPositionTypes().then(setTypes).catch(() => undefined);
    adminService.getAreas({ limit: 100 }).then(({ data }) => setAreas(data)).catch(() => undefined);
    adminService.getUnits({ limit: 100 }).then(({ data }) => setUnits(data)).catch(() => undefined);
    adminService.getDepartments({ limit: 100 }).then(setDepartments).catch(() => undefined);
    adminService.getSections({ limit: 100 }).then(setSections).catch(() => undefined);
  }, [refreshPlazas]);

  // Name lookups for each parent kind, to render a plaza's owning entity.
  const lookups = useMemo(() => ({
    area: new Map(areas.map((a) => [a.id, a.name])),
    department: new Map(departments.map((d) => [d.id, d.name])),
    section: new Map(sections.map((s) => [s.id, s.name])),
    unit: new Map(units.map((u) => [u.id, u.name])),
  }), [areas, departments, sections, units]);

  const parentLabel = useCallback((plaza: Plaza): string => {
    if (plaza.area_id) return `Área: ${lookups.area.get(plaza.area_id) ?? plaza.area_id}`;
    if (plaza.department_id) return `Departamento: ${lookups.department.get(plaza.department_id) ?? plaza.department_id}`;
    if (plaza.section_id) return `Sección: ${lookups.section.get(plaza.section_id) ?? plaza.section_id}`;
    if (plaza.unit_id) return `Unidad: ${lookups.unit.get(plaza.unit_id) ?? plaza.unit_id}`;
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
    plazas.filter((p) =>
      [p.name, p.description ?? '', parentLabel(p)]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
    ), [plazas, search, parentLabel]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof typeof EMPTY_FORM, string>> = {};
    if (!form.name.trim()) errors.name = 'El número de plaza es requerido.';
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
      const payload: CreatePlazaPayload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        job_position_type_id: form.job_position_type_id,
      };
      if (form.parentType) {
        payload[`${form.parentType}_id`] = form.parentId;
      }
      await adminService.createPlaza(payload);
      await refreshPlazas();
      setFormOpen(false);
      setSuccessMsg('Plaza creada correctamente.');
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
      await adminService.deletePlaza(deleteTarget.id);
      setDeleteTarget(null);
      await refreshPlazas();
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

      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ minWidth: 720 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', px: 2.5, py: 1.25, mb: 1 }}>
            {COLS.map((col) => (
              <Typography
                key={col.label}
                variant="caption"
                fontWeight={700}
                sx={{ flex: col.flex, color: '#555', textTransform: 'none', fontSize: '0.8rem' }}
              >
                {col.label}
              </Typography>
            ))}
            <Box sx={{ width: 48 }} />
          </Box>

          <Stack spacing={1.5}>
            {filtered.map((plaza) => (
              <Paper
                key={plaza.id}
                elevation={0}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 2.5,
                  py: 1.75,
                  border: '1px solid #ebebeb',
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2" sx={{ flex: COLS[0].flex, color: '#333', fontWeight: 600 }}>
                  {plaza.name}
                </Typography>
                <Typography
                  variant="body2"
                  noWrap
                  sx={{ flex: COLS[1].flex, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', pr: 2 }}
                >
                  {parentLabel(plaza)}
                </Typography>
                <Typography
                  variant="body2"
                  noWrap
                  sx={{ flex: COLS[2].flex, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', pr: 2 }}
                >
                  {plaza.description ?? '—'}
                </Typography>
                <Typography variant="body2" sx={{ flex: COLS[3].flex, color: '#555' }}>
                  {formatDate(plaza.created_at)}
                </Typography>
                <Box sx={{ width: 48, display: 'flex', justifyContent: 'flex-end' }}>
                  <IconButton size="small" onClick={() => setDeleteTarget(plaza)} sx={{ color: '#9e9e9e' }}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Paper>
            ))}
            {filtered.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
                No se encontraron plazas.
              </Typography>
            )}
          </Stack>
        </Box>
      </Box>

      <ModalForm
        open={formOpen}
        title="Añadir Plaza"
        onClose={() => setFormOpen(false)}
        onConfirm={handleConfirm}
        confirmLabel="Confirmar"
        isSubmitting={isSubmitting}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField
            label="Número de plaza"
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
            label="Tipo de plaza"
            value={form.job_position_type_id}
            onChange={handleText('job_position_type_id')}
            size="small"
            fullWidth
            error={!!formErrors.job_position_type_id}
            helperText={formErrors.job_position_type_id ?? (types.length === 0 ? 'No hay tipos de plaza registrados.' : '')}
            required
          >
            {types.map((t) => (
              <MenuItem key={t.job_position_type_id} value={t.job_position_type_id}>
                {t.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Tipo de entidad"
            value={form.parentType}
            onChange={(e) => {
              // Reset the chosen entity when the parent kind changes.
              setForm((prev) => ({ ...prev, parentType: e.target.value as PlazaParentType, parentId: '' }));
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
        message={`¿Está seguro que desea eliminar la plaza "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
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

const COLS = [
  { label: 'Número', flex: '0 0 18%' },
  { label: 'Entidad', flex: '0 0 30%' },
  { label: 'Descripción', flex: '1' },
  { label: 'Fecha de creación', flex: '0 0 18%' },
];
