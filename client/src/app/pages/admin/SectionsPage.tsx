import { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Pagination } from '@mui/material';
import { sectionService } from '../../../services/sectionService';
import { areaService } from '../../../services/areaService';
import type { Section } from '../../../services/sectionService';
import type { Area } from '../../../services/areaService';
import type { PageMeta, ServiceError } from '../../../services/common';

import SectionToolbar from '../../../features/admin/section/SectionToolbar';
import SectionList from '../../../features/admin/section/SectionList';
import SectionFormModal from '../../../features/admin/section/SectionFormModal';
import ModalError from '../../../components/modals/ModalError';
import ModalSuccess from '../../../components/modals/ModalSuccess';
import ModalAlert from '../../../components/modals/ModalAlert';

const LIMIT = 10;
const EMPTY_FORM = { name: '', description: '', area_id: '' };

export default function SectionsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof typeof EMPTY_FORM, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [modalError, setModalError] = useState({ open: false, title: '', message: '' });
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setAppliedFilter(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Cargar secciones con paginación
  const loadSections = useCallback(() => {
    setLoading(true);
    sectionService.getSectionsPage({ page, limit: LIMIT, filter: appliedFilter })
      .then((res) => {
        setSections(res.data);
        setMeta(res.meta);
      })
      .catch((error) => {
        const e = error as ServiceError;
        setModalError({ open: true, title: 'Error al cargar', message: e.message ?? 'Error del servidor.' });
      })
      .finally(() => setLoading(false));
  }, [page, appliedFilter]);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  // Cargar áreas (solo una vez)
  useEffect(() => {
    areaService.getAreas({ limit: 100 })
      .then((res) => setAreas(res.data))
      .catch(() => {});
  }, []);

  const totalPages = meta?.total_pages ?? 1;

  // Mapa de áreas para mostrar el nombre en la tabla
  const areaMap = useMemo(() => {
    const map = new Map<string, string>();
    areas.forEach((area) => map.set(area.area_id, area.name));
    return map;
  }, [areas]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setIsEditing(null);
    setFormOpen(true);
  };

  const openEdit = (section: Section) => {
    setForm({
      name: section.name,
      description: section.description ?? '',
      area_id: section.area_id || '',
    });
    setFormErrors({});
    setIsEditing(section.section_id);
    setFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof typeof EMPTY_FORM, string>> = {};
    if (!form.name.trim()) errors.name = 'El nombre es requerido.';
    if (!form.area_id) errors.area_id = 'Debe seleccionar un área.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await sectionService.updateSection(isEditing, {
          name: form.name.trim(),
          description: form.description.trim(),
          area_id: form.area_id,
        });
        setSuccessMsg('Sección actualizada correctamente.');
      } else {
        await sectionService.createSection({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          area_id: form.area_id,
        });
        setSuccessMsg('Sección creada correctamente.');
      }
      setFormOpen(false);
      loadSections();
      setSuccessOpen(true);
    } catch (error) {
      const e = error as ServiceError;
      setModalError({ open: true, title: isEditing ? 'Error al actualizar' : 'Error al crear', message: e.message ?? 'Error del servidor.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = (section: Section) => {
    setDeleteTarget(section);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await sectionService.deleteSection(deleteTarget.section_id);
      setDeleteTarget(null);
      loadSections();
      setSuccessMsg('Sección eliminada correctamente.');
      setSuccessOpen(true);
    } catch (error) {
      const e = error as ServiceError;
      setModalError({ open: true, title: 'Error al eliminar', message: e.message ?? 'Error del servidor.' });
      setDeleteTarget(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, minHeight: '100%' }}>
      <SectionToolbar search={search} onSearchChange={setSearch} onAddClick={openCreate} />

      <SectionList
        sections={sections}
        loading={loading}
        areaMap={areaMap}
        onEdit={openEdit}
        onDelete={handleDeleteRequest}
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

      <SectionFormModal
        open={formOpen}
        isEditing={!!isEditing}
        form={form}
        formErrors={formErrors}
        areas={areas}
        isSubmitting={isSubmitting}
        onClose={() => setFormOpen(false)}
        onConfirm={handleConfirm}
        onChange={handleChange}
      />

      <ModalAlert
        open={!!deleteTarget}
        title="Eliminar sección"
        message={`¿Está seguro que desea eliminar la sección "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
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