import { useState, useEffect, useCallback } from 'react';
import { Box, Pagination } from '@mui/material';
import { userService } from '../../../services/userService';
import type { AdminUser } from '../../../services/userService';
import type { PageMeta, ServiceError } from '../../../services/common';
import UserToolbar from '../../../features/admin/user/UserToolbar';
import UserList from '../../../features/admin/user/UserList';
import UserFormModal from '../../../features/admin/user/UserFormModal';
import ChangeRoleModal from '../../../features/admin/user/ChangeRoleModal';
import { useSnackbar } from '../../../context/SnackbarContext';
import { validateInstitutionalEmail } from '../../../utils/validation';
import ModalAlert from '../../../components/modals/ModalAlert';

const LIMIT = 10;

const EMPTY_FORM = {
  first_name: '',
  second_name: '',
  first_last_name: '',
  second_last_name: '',
  email: '',
  role: '' as 'admin' | 'employee' | '',
  password: '',
};

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados para modales
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof typeof EMPTY_FORM, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'employee'>('employee');
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [viewTarget, setViewTarget] = useState<AdminUser | null>(null);

  const snackbar = useSnackbar();

  // Debounce the search box into the applied (server-side) filter.
  useEffect(() => {
    const t = setTimeout(() => {
      setAppliedFilter(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadUsers = useCallback(() => {
    setLoading(true);
    return userService.getUsersPage({ page, limit: LIMIT, filter: appliedFilter })
      .then((res) => {
        setUsers(res.data);
        setMeta(res.meta);
      })
      .catch((error) => {
        const e = error as ServiceError;
        snackbar.error(e.message ?? 'Error del servidor al cargar usuarios.');
      })
      .finally(() => setLoading(false));
  }, [page, appliedFilter, snackbar]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const totalPages = meta?.total_pages ?? 1;

  // Handlers para cambiar rol
  const openRole = (user: AdminUser) => {
    setRoleTarget(user);
    setSelectedRole(user.role);
  };
  const handleChangeRole = async () => {
    if (!roleTarget) return;
    setIsSubmitting(true);
    try {
      await userService.changeRole(roleTarget.id, selectedRole);
      setRoleTarget(null);
      await loadUsers();
      snackbar.success('Rol actualizado correctamente.');
    } catch (error) {
      const e = error as ServiceError;
      snackbar.error(e.message ?? 'Error del servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers para eliminar
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await userService.deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      // If we just removed the last row on a page beyond the first, step back.
      if (users.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await loadUsers();
      }
      snackbar.success('Usuario eliminado correctamente.');
    } catch (error) {
      const e = error as ServiceError;
      snackbar.error(e.message ?? 'Error del servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowPassword(false);
    setViewTarget(null);
    setFormOpen(true);
  };

  const openView = (user: AdminUser) => {
    setForm({
      ...EMPTY_FORM,
      first_name: user.first_name,
      first_last_name: user.last_name,
      email: user.email,
      role: user.role,
    });
    setFormErrors({});
    setViewTarget(user);
    setFormOpen(true);
  };

  const closeModal = () => {
    setFormOpen(false);
    setViewTarget(null);
  };
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof typeof EMPTY_FORM, string>> = {};
    if (!form.first_name.trim()) errors.first_name = 'El primer nombre es requerido.';
    if (!form.first_last_name.trim()) errors.first_last_name = 'El primer apellido es requerido.';
    if (!form.second_last_name.trim()) errors.second_last_name = 'El segundo apellido es requerido.';
    const emailError = validateInstitutionalEmail(form.email);
    if (emailError) errors.email = emailError;
    if (!form.role) errors.role = 'El rol es requerido.';
    if (!form.password.trim()) errors.password = 'La contraseña temporal es requerida.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const handleConfirmCreate = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      await userService.registerUser({
        first_name: form.first_name,
        second_name: form.second_name || undefined,
        first_last_name: form.first_last_name,
        second_last_name: form.second_last_name,
        email: form.email,
        role: form.role as 'admin' | 'employee',
        password: form.password,
      });
      closeModal();
      if (page !== 1) {
        setPage(1);
      } else {
        await loadUsers();
      }
      snackbar.success('Usuario creado correctamente.');
    } catch (error) {
      const e = error as ServiceError;
      snackbar.error(e.message ?? 'Error del servidor.');
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
      <UserToolbar search={search} onSearchChange={setSearch} onAddClick={openCreate} />

      <UserList
        users={users}
        loading={loading}
        onChangeRole={openRole}
        onDelete={setDeleteTarget}
        onView={openView}
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

      <UserFormModal
        open={formOpen}
        viewMode={!!viewTarget}
        form={form}
        formErrors={formErrors}
        isSubmitting={isSubmitting}
        showPassword={showPassword}
        onTogglePasswordVisibility={() => setShowPassword((p) => !p)}
        onClose={closeModal}
        onConfirm={handleConfirmCreate}
        onChange={handleFormChange}
      />

      <ChangeRoleModal
        open={!!roleTarget}
        targetUser={roleTarget}
        selectedRole={selectedRole}
        isSubmitting={isSubmitting}
        onSelectRole={setSelectedRole}
        onClose={() => setRoleTarget(null)}
        onConfirm={handleChangeRole}
      />

      <ModalAlert
        open={!!deleteTarget}
        title="Eliminar usuario"
        message={`¿Está seguro que desea eliminar a "${deleteTarget?.first_name} ${deleteTarget?.last_name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

    </Box>
  );
}
