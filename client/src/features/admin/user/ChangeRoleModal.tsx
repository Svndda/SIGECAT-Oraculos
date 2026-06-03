import { Typography, TextField, MenuItem, Stack } from '@mui/material';
import ModalForm from '../../../components/modals/ModalForm';
import type { AdminUser } from '../../../services/userService';

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'employee', label: 'Empleado' },
];

interface ChangeRoleModalProps {
  open: boolean;
  targetUser: AdminUser | null;
  selectedRole: 'admin' | 'employee';
  isSubmitting: boolean;
  onSelectRole: (role: 'admin' | 'employee') => void;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ChangeRoleModal({
  open,
  targetUser,
  selectedRole,
  isSubmitting,
  onSelectRole,
  onClose,
  onConfirm,
}: ChangeRoleModalProps) {
  return (
    <ModalForm
      open={open}
      title="Cambiar rol"
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel="Guardar"
      isSubmitting={isSubmitting}
    >
      <Stack spacing={2.5} sx={{ pt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {targetUser ? `${targetUser.first_name} ${targetUser.last_name}` : ''}
        </Typography>
        <TextField
          select
          label="Rol"
          value={selectedRole}
          onChange={(e) => onSelectRole(e.target.value as 'admin' | 'employee')}
          size="small"
          fullWidth
          required
        >
          {ROLES.map((r) => (
            <MenuItem key={r.value} value={r.value}>
              {r.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    </ModalForm>
  );
}