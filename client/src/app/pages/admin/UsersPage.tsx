import { useState, useEffect, useMemo } from 'react';
import { Box } from '@mui/material';
import { userService } from '../../../services/userService';
import { jobClassService } from '../../../services/jobClassService';
import type { AdminUser } from '../../../services/userService';
import type { JobClass } from '../../../services/jobClassService';
import type { ServiceError } from '../../../services/common';
import UserToolbar from '../../../features/admin/user/UserToolbar';
import UserList from '../../../features/admin/user/UserList';
import UserFormModal from '../../../features/admin/user/UserFormModal';
import ChangeRoleModal from '../../../features/admin/user/ChangeRoleModal';
import AssignClassModal from '../../../features/admin/user/AssignClassModal';
import ModalError from '../../../components/modals/ModalError';
import ModalSuccess from '../../../components/modals/ModalSuccess';
import { validateInstitutionalEmail } from '../../../utils/validation';
import ModalAlert from '../../../components/modals/ModalAlert';

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
  const [search, setSearch] = useState('');
  const [jobClasses, setJobClasses] = useState<JobClass[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados para modales
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof typeof EMPTY_FORM, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [assignTarget, setAssignTarget] = useState<AdminUser | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'employee'>('employee');
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const [modalError, setModalError] = useState({ open: false, title: '', message: '' });
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Carga inicial
  useEffect(() => {
    setLoading(true);
    Promise.all([
      userService.getUsers().then(setUsers),
      jobClassService.getJobClasses().then(setJobClasses),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const className = (id?: string) => jobClasses.find((c) => c.id === id)?.name ?? '—';

  const filtered = useMemo(() =>
    users.filter((u) =>
      `${u.first_name} ${u.last_name} ${u.email} ${u.role}`
        .toLowerCase()
        .includes(search.toLowerCase())
    ), [users, search]
  );

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
      setUsers((prev) => prev.map((u) => (u.id === roleTarget.id ? { ...u, role: selectedRole } : u)));
      setRoleTarget(null);
      setSuccessMsg('Rol actualizado correctamente.');
      setSuccessOpen(true);
    } catch (error) {
      const e = error as ServiceError;
      setModalError({ open: true, title: 'Error al cambiar rol', message: e.message ?? 'Error del servidor.' });
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
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
      setSuccessMsg('Usuario eliminado correctamente.');
      setSuccessOpen(true);
    } catch (error) {
      const e = error as ServiceError;
      setModalError({ open: true, title: 'Error al eliminar', message: e.message ?? 'Error del servidor.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formulario de creación
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowPassword(false);
    setFormOpen(true);
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
      const created = await userService.registerUser({
        first_name: form.first_name,
        second_name: form.second_name || undefined,
        first_last_name: form.first_last_name,
        second_last_name: form.second_last_name,
        email: form.email,
        role: form.role as 'admin' | 'employee',
        password: form.password,
      });
      setUsers((prev) => [created, ...prev]);
      setFormOpen(false);
      setSuccessMsg('Usuario creado correctamente.');
      setSuccessOpen(true);
    } catch (error) {
      const e = error as ServiceError;
      setModalError({ open: true, title: 'Error al registrar usuario', message: e.message ?? 'Error del servidor.' });
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
        users={filtered}
        loading={loading}
        onChangeRole={openRole}
        onDelete={setDeleteTarget}
      />

      {/* Modales usando componentes específicos */}
      <UserFormModal
        open={formOpen}
        form={form}
        formErrors={formErrors}
        isSubmitting={isSubmitting}
        showPassword={showPassword}
        onTogglePasswordVisibility={() => setShowPassword((p) => !p)}
        onClose={() => setFormOpen(false)}
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

      {/* Modal de confirmación de eliminación (puedes usar ModalAlert directamente o crear un componente DeleteConfirmModal) */}
      <ModalAlert
        open={!!deleteTarget}
        title="Eliminar usuario"
        message={`¿Está seguro que desea eliminar a "${deleteTarget?.first_name} ${deleteTarget?.last_name}"? Esta acción no se puede deshacer.`}
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