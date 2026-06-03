import { useState, useEffect, useMemo } from 'react';
import { Box, Pagination } from '@mui/material';
import { departmentService } from '../../../services/departmentService';
import type { Department } from '../../../services/departmentService';
import type { ServiceError } from '../../../services/common';
import { areaService } from '../../../services/areaService';
import type { Area } from '../../../services/areaService';
import type { PageMeta } from '../../../services/common';

import DepartmentToolbar from '../../../features/admin/department/DepartmentToolbar';
import DepartmentList from '../../../features/admin/department/DepartmentList';
import DepartmentFormModal from '../../../features/admin/department/DepartmentFormModal';
import ModalError from '../../../components/modals/ModalError';
import ModalSuccess from '../../../components/modals/ModalSuccess';
import ModalAlert from '../../../components/modals/ModalAlert';

const LIMIT = 10;
const EMPTY_FORM = { name: '', description: '', area_id: '' };

export default function DepartmentsPage() {

  const [departments, setDepartments] = useState<Department[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof typeof EMPTY_FORM, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [modalError, setModalError] = useState(
    { open: false, title: '', message: '' }
  );
  const [successOpen, setSuccessOpen] = useState(
    { open: false, title: '', message: '' }
  );
  const [deleteAlert, setDeleteAlert] = useState<{
    open: boolean; id: string
  }>({ open: false, id: '' });

  useEffect(() => {
    const t = setTimeout(() => {
      const trimmedSearch = search.trim();
      if (trimmedSearch !== appliedFilter) {
        setAppliedFilter(trimmedSearch);
        setPage(1);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [search, appliedFilter]);

  useEffect(() => {
    areaService.getAreas({ limit: 100 })
        .then(res => setAreas(res.data))
        .catch(() => {});
  }, []);

  const loadDepartments = (isSubscribed: boolean) => {
    setLoading(true);
    departmentService.getDepartmentsPage(
      { page, limit: LIMIT, filter: appliedFilter }
    )
        .then((res) => {
          if (!isSubscribed) return;
          setDepartments(res.data);
          setMeta(res.meta);
        })
        .catch((error) => {
          if (!isSubscribed) return;
          const e = error as ServiceError;
          setModalError({
            open: true,
            title: 'Error al cargar',
            message: e.message ?? 'Error del servidor.'
          });
        })
        .finally(() => {
          if (isSubscribed) setLoading(false);
        });
  };

  useEffect(() => {
    let isSubscribed = true;
    loadDepartments(isSubscribed);
    return () => { isSubscribed = false; };
  }, [page, appliedFilter]);

  const totalPages = meta?.total_pages ?? 1;
  const areaMap = useMemo(() => {
    const map = new Map<string, string>();
    areas.forEach(a => map.set(a.area_id, a.name));
    return map;
  }, [areas]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setIsEditing(null);
    setFormOpen(true);
  };

  const openEdit = (dept: Department) => {
    setForm({ name: dept.name, description: dept.description ?? '', area_id: dept.area_id });
    setFormErrors({});
    setIsEditing(dept.department_id);
    setFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof typeof EMPTY_FORM, string>> = {};
    if (!form.name.trim()) errors.name = 'El nombre es requerido.';
    if (!form.area_id) errors.area_id = 'Debe seleccionar un área vinculada.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await departmentService.updateDepartment(isEditing, form);
        setSuccessOpen({
          open: true,
          title: 'Departamento actualizado',
          message: 'Los cambios se han guardado.'
        });
      } else {
        await departmentService.createDepartment(form);
        setSuccessOpen({
          open: true,
          title: 'Departamento registrado',
          message: 'El departamento fue creado correctamente.'
        });
      }
      setFormOpen(false);
      loadDepartments(true);
    } catch (error) {
      const e = error as ServiceError;
      setModalError({
        open: true,
        title: 'Error al procesar',
        message: e.message ?? 'Error del servidor.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = (department: Department) => {
    setDeleteAlert({ open: true, id: department.department_id });
  };

  const confirmDelete = async () => {
    if (!deleteAlert.id) return;
    
    try {
      await departmentService.deleteDepartment(deleteAlert.id);
      setSuccessOpen({
        open: true,
        title: 'Departamento eliminado',
        message: 'El registro se movió a la papelera.'
      });
      loadDepartments(true);
    } catch (error) {
      const e = error as ServiceError;
      setModalError({
        open: true,
        title: 'Error al eliminar',
        message: e.message ?? 'Error del servidor.'
      });
    } finally {
      setDeleteAlert({ open: false, id: '' });
    }
  };

  const handleChange = (
    field: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>
    ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
      <Box sx={{ p: { xs: 2, sm: 4 }, minHeight: '100%' }}>

        <DepartmentToolbar
            search={search}
            onSearchChange={setSearch}
            onAddClick={openCreate}
        />

        <DepartmentList
            departments={departments}
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
                color="primary" shape="rounded" />
            </Box>
        )}

        <DepartmentFormModal
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
          open={deleteAlert.open}
          title="Eliminar Departamento"
          message="¿Está seguro de que desea eliminar este departamento? Se desvincularán las unidades asociadas."
          onClose={() => setDeleteAlert({ open: false, id: '' })}
          onConfirm={confirmDelete}
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
        />

        <ModalError
          open={modalError.open}
          title={modalError.title}
          message={modalError.message}
          onClose={() => setModalError((p) => ({ ...p, open: false }))}
          />
        <ModalSuccess
          open={successOpen.open}
          title={successOpen.title}
          message={successOpen.message}
          onClose={() => setSuccessOpen((p) => ({ ...p, open: false }))}
        />
      </Box>
  );
}