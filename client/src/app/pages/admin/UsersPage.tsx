import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Stack,
  MenuItem,
  InputAdornment,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { adminService } from '../../../services/adminService';
import type { AdminUser, ServiceError } from '../../../services/adminService';
import { useAuth } from '../../../context/AuthContext';
import ModalForm from '../../../components/modals/ModalForm';
import ModalError from '../../../components/modals/ModalError';
import ModalSuccess from '../../../components/modals/ModalSuccess';
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

  useEffect(() => {
    adminService.getUsers().then(setUsers).catch(() => {});
  }, []);

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
      const created = await adminService.registerUser({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        role: form.role as 'admin' | 'employee',
        password: form.password,
        created_by: currentUser?.id ?? '',
      });
      setUsers((prev) => [created, ...prev]);
      setFormOpen(false);
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

  return (
    <Box sx={{ p: 4, minHeight: '100%' }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, color: '#1a1a1a' }}>
        Gestión de Usuarios
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar"
          size="small"
          sx={{ width: 260, backgroundColor: 'white', borderRadius: 1 }}
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
        <Box sx={{ flex: 1 }} />
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
          }}
        >
          Añadir Usuario
        </Button>
      </Box>

      {/* Table header */}
      <Box sx={{ display: 'flex', px: 2.5, py: 1.25, mb: 1 }}>
        {USER_COLS.map((col) => (
          <Typography key={col.label} variant="caption" fontWeight={700} sx={{ flex: col.flex, color: '#555', fontSize: '0.8rem' }}>
            {col.label}
          </Typography>
        ))}
      </Box>

      <Stack spacing={1.5}>
        {filtered.map((u) => (
          <Paper key={u.id} elevation={0} sx={{ display: 'flex', alignItems: 'center', px: 2.5, py: 1.75, border: '1px solid #ebebeb', borderRadius: 2 }}>
            <Typography variant="body2" sx={{ flex: USER_COLS[0].flex, color: '#333' }}>
              {u.first_name} {u.last_name}
            </Typography>
            <Typography variant="body2" sx={{ flex: USER_COLS[1].flex, color: '#555' }}>
              {u.email}
            </Typography>
            <Box sx={{ flex: USER_COLS[2].flex }}>
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
            </Box>
          </Paper>
        ))}
        {filtered.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
            No se encontraron usuarios.
          </Typography>
        )}
      </Stack>

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

      <ModalError
        open={modalError.open}
        title={modalError.title}
        message={modalError.message}
        onClose={() => setModalError((p) => ({ ...p, open: false }))}
      />
      <ModalSuccess
        open={successOpen}
        title="Usuario registrado"
        message="Usuario creado correctamente."
        onClose={() => setSuccessOpen(false)}
      />
    </Box>
  );
}

const USER_COLS = [
  { label: 'Nombre', flex: '0 0 30%' },
  { label: 'Correo institucional', flex: '1' },
  { label: 'Rol', flex: '0 0 18%' },
];
