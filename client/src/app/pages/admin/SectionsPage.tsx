import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
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
import { sectionService } from '../../../services/sectionService';
import { areaService } from '../../../services/areaService';
import type { Section } from '../../../services/sectionService';
import type { OrgOption, PageMeta, ServiceError } from '../../../services/common';
import ModalForm from '../../../components/modals/ModalForm';
import ModalError from '../../../components/modals/ModalError';
import ModalSuccess from '../../../components/modals/ModalSuccess';
import ModalAlert from '../../../components/modals/ModalAlert';

const LIMIT = 10;

const EMPTY_FORM = {
  name: '',
  description: '',
  areaId: '',
};

/** Oracle default timestamps look like "28-MAY-26 05.34.02.776554 PM"; show the date part. */
function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return dateStr.split(' ')[0];
}

export default function SectionsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [areas, setAreas] = useState<OrgOption[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Section | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null);
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

  const refreshSections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sectionService.getSectionsPage({ page, limit: LIMIT, filter: appliedFilter });
      setSections(res.data);
      setMeta(res.meta);
    } catch (error) {
      const e = error as ServiceError;
      setModalError({ open: true, title: 'Error al cargar', message: e.message ?? 'Error del servidor.' });
    } finally {
      setLoading(false);
    }
  }, [page, appliedFilter]);

  useEffect(() => { void refreshSections(); }, [refreshSections]);

  useEffect(() => {
    areaService.getAreas({ limit: 100 })
      .then((res) => setAreas(res.data.map((a) => ({ id: a.id, name: a.name }))))
      .catch(() => undefined);
  }, []);

  const totalPages = meta?.total_pages ?? 1;
  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? '—';

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (section: Section) => {
    setEditTarget(section);
    setForm({
      name: section.name,
      description: section.description ?? '',
      areaId: section.area_id,
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof typeof EMPTY_FORM, string>> = {};
    if (!form.name.trim()) errors.name = 'El nombre es requerido.';
    if (!form.areaId) errors.areaId = 'El área es requerida.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      if (editTarget) {
        await sectionService.updateSection(editTarget.id, {
          name: form.name.trim(),
          description: form.description.trim(),
          area_id: form.areaId,
        });
        setSuccessMsg('Sección actualizada correctamente.');
      } else {
        await sectionService.createSection({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          area_id: form.areaId,
        });
        setSuccessMsg('Sección creada correctamente.');
      }
      setFormOpen(false);
      await refreshSections();
      setSuccessOpen(true);
    } catch (error) {
      const e = error as ServiceError;
      setModalError({ open: true, title: editTarget ? 'Error al actualizar' : 'Error al crear', message: e.message ?? 'Error del servidor.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await sectionService.deleteSection(deleteTarget.id);
      setDeleteTarget(null);
      await refreshSections();
      setSuccessMsg('Sección eliminada correctamente.');
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
        Secciones
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
          Añadir Sección
        </Button>
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
            {sections.map((section) => (
              <Paper
                key={section.id}
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
                  {section.name}
                </Typography>
                <Typography
                  variant="body2"
                  noWrap
                  sx={{ flex: COLS[1].flex, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', pr: 2 }}
                >
                  {section.description ?? '—'}
                </Typography>
                <Typography variant="body2" sx={{ flex: COLS[2].flex, color: '#333' }}>
                  {areaName(section.area_id)}
                </Typography>
                <Typography variant="body2" sx={{ flex: COLS[3].flex, color: '#555' }}>
                  {formatDate(section.created_at)}
                </Typography>
                <Box sx={{ width: 72, display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                  <IconButton size="small" onClick={() => openEdit(section)} sx={{ color: '#1a2b4a' }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => setDeleteTarget(section)} sx={{ color: '#9e9e9e' }}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Paper>
            ))}
            {!loading && sections.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
                No se encontraron secciones.
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

      {/* Create / Edit modal */}
      <ModalForm
        open={formOpen}
        title={editTarget ? 'Editar Sección' : 'Añadir Sección'}
        onClose={() => setFormOpen(false)}
        onConfirm={handleSubmit}
        confirmLabel={editTarget ? 'Guardar cambios' : 'Confirmar'}
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
            label="Área"
            value={form.areaId}
            onChange={(e) => setField('areaId', e.target.value)}
            size="small"
            fullWidth
            error={!!formErrors.areaId}
            helperText={
              formErrors.areaId ??
              (areas.length === 0 ? 'No hay áreas registradas.' : '')
            }
            required
          >
            {areas.map((a) => (
              <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
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
        title="Eliminar sección"
        message={`¿Está seguro que desea eliminar la sección "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
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
  { label: 'Área', flex: '0 0 18%' },
  { label: 'Fecha de creación', flex: '0 0 18%' },
];
