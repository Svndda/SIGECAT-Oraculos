import { useState, useEffect, useMemo } from 'react';
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
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { adminService } from '../../../services/adminService';
import type { OrgEntity, ServiceError } from '../../../services/adminService';
import ModalForm from '../../../components/modals/ModalForm';
import ModalError from '../../../components/modals/ModalError';
import ModalSuccess from '../../../components/modals/ModalSuccess';
import ModalAlert from '../../../components/modals/ModalAlert';

const CATEGORIAS = ['Área', 'Departamento', 'Unidad', 'División', 'Sección', 'Programa'];

const EMPTY_FORM = { categoria: '', nombre: '', descripcion: '', codigo: '' };

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
}

export default function OrganizationPage() {
  const [entities, setEntities] = useState<OrgEntity[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<OrgEntity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrgEntity | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<typeof EMPTY_FORM>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState({ open: false, title: '', message: '' });
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    adminService.getEntities().then(setEntities).catch(() => {});
  }, []);

  const filtered = useMemo(() =>
    entities.filter((e) =>
      [e.categoria, e.nombre, e.descripcion, e.codigo]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
    ), [entities, search]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (entity: OrgEntity) => {
    setEditTarget(entity);
    setForm({ categoria: entity.categoria, nombre: entity.nombre, descripcion: entity.descripcion, codigo: entity.codigo });
    setFormErrors({});
    setFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Partial<typeof EMPTY_FORM> = {};
    if (!form.categoria) errors.categoria = 'La categoría es requerida.';
    if (!form.nombre.trim()) errors.nombre = 'El nombre es requerido.';
    if (!form.codigo.trim()) errors.codigo = 'El código es requerido.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      if (editTarget) {
        const updated = await adminService.updateEntity(editTarget.id, form);
        setEntities((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        setSuccessMsg('Entidad actualizada correctamente.');
      } else {
        const created = await adminService.createEntity(form);
        setEntities((prev) => [created, ...prev]);
        setSuccessMsg('Entidad creada correctamente.');
      }
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
      await adminService.deleteEntity(deleteTarget.id);
      setEntities((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      setDeleteTarget(null);
      setSuccessMsg('Entidad eliminada correctamente.');
      setSuccessOpen(true);
    } catch (error) {
      const e = error as ServiceError;
      setDeleteTarget(null);
      setModalError({ open: true, title: 'Error al eliminar', message: e.message ?? 'Error del servidor.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormChange = (field: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, minHeight: '100%' }}>
      {/* Header */}
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, color: '#1a1a1a' }}>
        Control Organizacional
      </Typography>

      {/* Toolbar */}
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
          Añadir Entidad
        </Button>
      </Box>

      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ minWidth: 880 }}>
          {/* Table header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 2.5,
              py: 1.25,
              mb: 1,
            }}
          >
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
            {filtered.map((entity) => (
              <Paper
                key={entity.id}
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
                  {entity.categoria}
                </Typography>
                <Typography variant="body2" sx={{ flex: COLS[1].flex, color: '#333' }}>
                  {entity.nombre}
                </Typography>
                <Typography
                  variant="body2"
                  noWrap
                  sx={{ flex: COLS[2].flex, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', pr: 2 }}
                >
                  {entity.descripcion}
                </Typography>
                <Typography variant="body2" sx={{ flex: COLS[3].flex, color: '#333' }}>
                  {entity.codigo}
                </Typography>
                <Typography variant="body2" sx={{ flex: COLS[4].flex, color: '#555' }}>
                  {formatDate(entity.fechaCreacion)}
                </Typography>
                <Box sx={{ width: 72, display: 'flex', gap: 0.5 }}>
                  <IconButton size="small" onClick={() => openEdit(entity)} sx={{ color: '#1a2b4a' }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => setDeleteTarget(entity)} sx={{ color: '#9e9e9e' }}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Paper>
            ))}
            {filtered.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
                No se encontraron entidades.
              </Typography>
            )}
          </Stack>
        </Box>
      </Box>

      {/* Create / Edit modal */}
      <ModalForm
        open={formOpen}
        title={editTarget ? 'Editar Entidad' : 'Añadir Entidad'}
        onClose={() => setFormOpen(false)}
        onConfirm={handleConfirm}
        confirmLabel={editTarget ? 'Guardar cambios' : 'Confirmar'}
        isSubmitting={isSubmitting}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField
            select
            label="Categoría"
            value={form.categoria}
            onChange={handleFormChange('categoria')}
            size="small"
            fullWidth
            error={!!formErrors.categoria}
            helperText={formErrors.categoria}
            required
          >
            {CATEGORIAS.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Nombre"
            value={form.nombre}
            onChange={handleFormChange('nombre')}
            size="small"
            fullWidth
            error={!!formErrors.nombre}
            helperText={formErrors.nombre}
            required
          />
          <TextField
            label="Descripción"
            value={form.descripcion}
            onChange={handleFormChange('descripcion')}
            size="small"
            fullWidth
            multiline
            rows={3}
          />
          <TextField
            label="Código"
            value={form.codigo}
            onChange={handleFormChange('codigo')}
            size="small"
            fullWidth
            error={!!formErrors.codigo}
            helperText={formErrors.codigo}
            required
          />
        </Stack>
      </ModalForm>

      {/* Delete confirmation */}
      <ModalAlert
        open={!!deleteTarget}
        title="Eliminar entidad"
        message={`¿Está seguro que desea eliminar "${deleteTarget?.nombre}"? Esta acción no se puede deshacer.`}
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
  { label: 'Categoría', flex: '0 0 14%' },
  { label: 'Nombre', flex: '0 0 20%' },
  { label: 'Descripción', flex: '1' },
  { label: 'Código', flex: '0 0 13%' },
  { label: 'Fecha de creación', flex: '0 0 16%' },
];
