import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Paper,
  IconButton,
  InputAdornment,
  Stack,
  Pagination,
  MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { unitService } from '../../../services/unitService';
import { departmentService } from '../../../services/departmentService';
import { sectionService } from '../../../services/sectionService';
import type { Unit } from '../../../services/unitService';
import type { OrgOption, PageMeta, ServiceError } from '../../../services/common';
import ModalForm from '../../../components/modals/ModalForm';
import ModalError from '../../../components/modals/ModalError';
import ModalSuccess from '../../../components/modals/ModalSuccess';
import ModalAlert from '../../../components/modals/ModalAlert';

const LIMIT = 10;

type UnitParentType = 'department' | 'section';

const PARENT_TYPES: { value: UnitParentType; label: string }[] = [
  { value: 'department', label: 'Departamento' },
  { value: 'section', label: 'Sección' },
];

const EMPTY_FORM = {
  name: '',
  description: '',
  parentType: 'department' as UnitParentType,
  parentId: '',
};

/** Oracle default timestamps look like "28-MAY-26 05.34.02.776554 PM"; show the date part. */
function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return dateStr.split(' ')[0];
}

function belongsTo(unit: Unit): string {
  if (unit.section_id) return 'Sección';
  if (unit.department_id) return 'Departamento';
  return '—';
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

  const refreshUnits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await unitService.getUnits({ page, limit: LIMIT, filter: appliedFilter });
      setUnits(res.data);
      setMeta(res.meta);
    } catch (error) {
      const e = error as ServiceError;
      setModalError({ open: true, title: 'Error al cargar', message: e.message ?? 'Error del servidor.' });
    } finally {
      setLoading(false);
    }
  }, [page, appliedFilter]);

  useEffect(() => { void refreshUnits(); }, [refreshUnits]);

  useEffect(() => {
    departmentService.getDepartments({ limit: 100 }).then(setDepartments).catch(() => undefined);
    sectionService.getSections({ limit: 100 }).then(setSections).catch(() => undefined);
  }, []);

  const totalPages = meta?.total_pages ?? 1;
  const parentOptions = form.parentType === 'section' ? sections : departments;

  const openEdit = (unit: Unit) => {
    setEditTarget(unit);
    setForm({
      name: unit.name,
      description: unit.description ?? '',
      parentType: unit.section_id ? 'section' : 'department',
      parentId: unit.section_id ?? unit.department_id ?? '',
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof typeof EMPTY_FORM, string>> = {};
    if (!form.name.trim()) errors.name = 'El nombre es requerido.';
    if (!form.parentId) errors.parentId = 'La entidad es requerida.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdate = async () => {
    if (!editTarget || !validateForm()) return;
    setIsSubmitting(true);
    try {
      await unitService.updateUnit(editTarget.id, {
        name: form.name.trim(),
        description: form.description.trim(),
        // Send only the chosen parent so the unit keeps exactly one.
        section_id: form.parentType === 'section' ? form.parentId : undefined,
        department_id: form.parentType === 'department' ? form.parentId : undefined,
      });
      setEditTarget(null);
      await refreshUnits();
      setSuccessMsg('Unidad actualizada correctamente.');
      setSuccessOpen(true);
    } catch (error) {
      const e = error as ServiceError;
      setModalError({ open: true, title: 'Error al actualizar', message: e.message ?? 'Error del servidor.' });
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
      await refreshUnits();
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

  const setField = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
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
      </Box>

      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ minWidth: 720 }}>
          {/* Table header */}
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
            <Box sx={{ width: 72 }} />
          </Box>

          {/* Rows */}
          <Stack spacing={1.5}>
            {units.map((unit) => (
              <Paper
                key={unit.id}
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
                <Typography variant="body2" sx={{ flex: COLS[0].flex, color: '#333' }}>
                  {unit.name}
                </Typography>
                <Typography
                  variant="body2"
                  noWrap
                  sx={{ flex: COLS[1].flex, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', pr: 2 }}
                >
                  {unit.description ?? '—'}
                </Typography>
                <Typography variant="body2" sx={{ flex: COLS[2].flex, color: '#333' }}>
                  {belongsTo(unit)}
                </Typography>
                <Typography variant="body2" sx={{ flex: COLS[3].flex, color: '#555' }}>
                  {formatDate(unit.created_at)}
                </Typography>
                <Box sx={{ width: 72, display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                  <IconButton size="small" onClick={() => openEdit(unit)} sx={{ color: '#1a2b4a' }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => setDeleteTarget(unit)} sx={{ color: '#9e9e9e' }}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Paper>
            ))}
            {!loading && units.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
                No se encontraron unidades.
              </Typography>
            )}
          </Stack>
        </Box>
      </Box>

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

      {/* Edit modal */}
      <ModalForm
        open={!!editTarget}
        title="Editar Unidad"
        onClose={() => setEditTarget(null)}
        onConfirm={handleUpdate}
        confirmLabel="Guardar cambios"
        isSubmitting={isSubmitting}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField
            label="Nombre"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            size="small"
            fullWidth
            error={!!formErrors.name}
            helperText={formErrors.name}
            required
          />
          <TextField
            select
            label="Pertenece a"
            value={form.parentType}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, parentType: e.target.value as UnitParentType, parentId: '' }));
              setFormErrors((prev) => ({ ...prev, parentId: undefined }));
            }}
            size="small"
            fullWidth
          >
            {PARENT_TYPES.map((p) => (
              <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={form.parentType === 'section' ? 'Sección' : 'Departamento'}
            value={form.parentId}
            onChange={(e) => setField('parentId', e.target.value)}
            size="small"
            fullWidth
            error={!!formErrors.parentId}
            helperText={
              formErrors.parentId ??
              (parentOptions.length === 0 ? 'No hay entidades de este tipo registradas.' : '')
            }
            required
          >
            {parentOptions.map((o) => (
              <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Descripción"
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
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
        message={`¿Está seguro que desea eliminar la unidad "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
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
  { label: 'Nombre', flex: '0 0 24%' },
  { label: 'Descripción', flex: '1' },
  { label: 'Pertenece a', flex: '0 0 15%' },
  { label: 'Fecha de creación', flex: '0 0 18%' },
];
