import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  MenuItem,
  InputAdornment,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import DataTable, { type DataColumn } from '../../../components/DataTable';
import { userService } from '../../../services/userService';
import { jobClassService } from '../../../services/jobClassService';
import type { AdminUser } from '../../../services/userService';
import type { JobClass } from '../../../services/jobClassService';
import type { ServiceError } from '../../../services/common';
import { useAuth } from '../../../context/AuthContext';
import ModalForm from '../../../components/modals/ModalForm';
import ModalError from '../../../components/modals/ModalError';
import ModalSuccess from '../../../components/modals/ModalSuccess';
import ModalAlert from '../../../components/modals/ModalAlert';
import { validateInstitutionalEmail } from '../../../utils/validation';

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'employee', label: 'Empleado' },
];

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  role: '' as 'admin' | 'employee' | '',
  password: '',
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof typeof EMPTY_FORM, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState({ open: false, title: '', message: '' });
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('Usuario creado correctamente.');
  const [jobClasses, setJobClasses] = useState<JobClass[]>([]);
  const [assignTarget, setAssignTarget] = useState<AdminUser | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'employee'>('employee');
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  useEffect(() => {
    userService.getUsers().then(setUsers).catch(() => {});
    jobClassService.getJobClasses().then(setJobClasses).catch(() => {});
  }, []);

  const className = (id?: string) => jobClasses.find((c) => c.id === id)?.name ?? '—';

  const openAssign = (user: AdminUser) => {
    setAssignTarget(user);
    setSelectedClassId(user.job_class_id ?? '');
  };

  const handleAssign = async () => {
    if (!assignTarget || !selectedClassId) return;
    setIsSubmitting(true);
    try {
      await userService.assignJobClass(assignTarget.id, selectedClassId);
      setUsers((prev) => prev.map((u) => (u.id === assignTarget.id ? { ...u, job_class_id: selectedClassId } : u)));
      setAssignTarget(null);
      setSuccessMsg('Clase ocupacional asignada correctamente.');
      setSuccessOpen(true);
    } catch (error) {
      const e = error as ServiceError;
      setAssignTarget(null);
      setModalError({ open: true, title: 'Error al asignar', message: e.message ?? 'Error del servidor.' });
    } finally {
      setIsSubmitting(false);
    }
  };

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
      setRoleTarget(null);
      setModalError({ open: true, title: 'Error al cambiar rol', message: e.message ?? 'Error del servidor.' });
    } finally {
      setIsSubmitting(false);
    }
  };

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
      setDeleteTarget(null);
      setModalError({ open: true, title: 'Error al eliminar', message: e.message ?? 'Error del servidor.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useMemo(() =>
    users.filter((u) =>
      `${u.first_name} ${u.last_name} ${u.email} ${u.role}`
        .toLowerCase()
        .includes(search.toLowerCase())
    ), [users, search]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowPassword(false);
    setFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof typeof EMPTY_FORM, string>> = {};
    if (!form.first_name.trim()) errors.first_name = 'El nombre es requerido.';
    if (!form.last_name.trim()) errors.last_name = 'Los apellidos son requeridos.';
    const emailError = validateInstitutionalEmail(form.email);
    if (emailError) errors.email = emailError;
    if (!form.role) errors.role = 'El rol es requerido.';
    if (!form.password.trim()) errors.password = 'La contraseña temporal es requerida.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const created = await userService.registerUser({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        role: form.role as 'admin' | 'employee',
        password: form.password,
        created_by: currentUser?.id ?? '',
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

  const handleChange = (field: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const columns: DataColumn<AdminUser>[] = [
    { label: 'Nombre', flex: '0 0 24%', primary: true, render: (u) => `${u.first_name} ${u.last_name}` },
    { label: 'Correo institucional', flex: '1', truncate: true, render: (u) => u.email },
    {
      label: 'Rol',
      flex: '0 0 15%',
      badge: true,
      render: (u) => (
        <Typography
          variant="caption"
          sx={{
            px: 1.5,
            py: 0.4,
            borderRadius: 4,
            fontWeight: 600,
            backgroundColor: u.role === 'admin' ? '#e8edf7' : '#f0f0f0',
            color: u.role === 'admin' ? '#1a2b4a' : '#555',
          }}
        >
          {u.role === 'admin' ? 'Administrador' : 'Empleado'}
        </Typography>
      ),
    },
    { label: 'Clase ocupacional', flex: '0 0 22%', render: (u) => className(u.job_class_id) },
  ];

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, minHeight: '100%' }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, color: '#1a1a1a' }}>
        Gestión de Usuarios
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
          Añadir Usuario
        </Button>
      </Box>

      <DataTable
        columns={columns}
        items={filtered}
        getKey={(u) => u.id}
        actions={[
          { icon: <AssignmentIndIcon fontSize="small" />, label: 'Asignar clase', color: '#1a2b4a', onClick: openAssign },
          { icon: <AdminPanelSettingsIcon fontSize="small" />, label: 'Cambiar rol', color: '#1a2b4a', onClick: openRole },
          { icon: <DeleteOutlineIcon fontSize="small" />, label: 'Eliminar', color: '#9e9e9e', onClick: setDeleteTarget },
        ]}
        emptyMessage="No se encontraron usuarios."
      />

      {/* Register user modal */}
      <ModalForm
        open={formOpen}
        title="Registrar Usuario"
        onClose={() => setFormOpen(false)}
        onConfirm={handleConfirm}
        confirmLabel="Confirmar"
        isSubmitting={isSubmitting}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField
            label="Nombre"
            value={form.first_name}
            onChange={handleChange('first_name')}
            size="small"
            fullWidth
            error={!!formErrors.first_name}
            helperText={formErrors.first_name}
            required
          />
          <TextField
            label="Apellidos"
            value={form.last_name}
            onChange={handleChange('last_name')}
            size="small"
            fullWidth
            error={!!formErrors.last_name}
            helperText={formErrors.last_name}
            required
          />
          <TextField
            label="Correo institucional"
            type="email"
            value={form.email}
            onChange={handleChange('email')}
            placeholder="usuario@ucr.ac.cr"
            size="small"
            fullWidth
            error={!!formErrors.email}
            helperText={formErrors.email}
            required
          />
          <TextField
            select
            label="Rol"
            value={form.role}
            onChange={handleChange('role')}
            size="small"
            fullWidth
            error={!!formErrors.role}
            helperText={formErrors.role}
            required
          >
            {ROLES.map((r) => (
              <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Contraseña temporal"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={handleChange('password')}
            size="small"
            fullWidth
            error={!!formErrors.password}
            helperText={formErrors.password}
            required
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPassword((p) => !p)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </Stack>
      </ModalForm>

      {/* Assign occupational class modal */}
      <ModalForm
        open={!!assignTarget}
        title="Asignar clase ocupacional"
        onClose={() => setAssignTarget(null)}
        onConfirm={handleAssign}
        confirmLabel="Asignar"
        isSubmitting={isSubmitting}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {assignTarget ? `${assignTarget.first_name} ${assignTarget.last_name}` : ''}
          </Typography>
          <TextField
            select
            label="Clase ocupacional"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            size="small"
            fullWidth
            helperText={jobClasses.length === 0 ? 'No hay clases ocupacionales registradas.' : ''}
            required
          >
            {jobClasses.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </ModalForm>

      {/* Change role modal */}
      <ModalForm
        open={!!roleTarget}
        title="Cambiar rol"
        onClose={() => setRoleTarget(null)}
        onConfirm={handleChangeRole}
        confirmLabel="Guardar"
        isSubmitting={isSubmitting}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {roleTarget ? `${roleTarget.first_name} ${roleTarget.last_name}` : ''}
          </Typography>
          <TextField
            select
            label="Rol"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as 'admin' | 'employee')}
            size="small"
            fullWidth
            required
          >
            {ROLES.map((r) => (
              <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </ModalForm>

      {/* Delete confirmation */}
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
