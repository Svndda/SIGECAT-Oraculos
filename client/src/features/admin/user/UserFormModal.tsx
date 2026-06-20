import { TextField, Stack, InputAdornment, IconButton } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import ModalForm from '../../../components/modals/ModalForm';

interface UserFormState {
  first_name: string;
  second_name: string;
  first_last_name: string;
  second_last_name: string;
  email: string;
  role: 'admin' | 'employee' | '';
  password: string;
}

interface UserFormModalProps {
  open: boolean;
  viewMode?: boolean;
  form: UserFormState;
  formErrors: Partial<Record<keyof UserFormState, string>>;
  isSubmitting: boolean;
  showPassword: boolean;
  onTogglePasswordVisibility: () => void;
  onClose: () => void;
  onConfirm: () => void;
  onChange: (field: keyof UserFormState) => (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'employee', label: 'Empleado' },
];

export default function UserFormModal({
  open,
  viewMode = false,
  form,
  formErrors,
  isSubmitting,
  showPassword,
  onTogglePasswordVisibility,
  onClose,
  onConfirm,
  onChange,
}: UserFormModalProps) {
  return (
    <ModalForm
      open={open}
      title={viewMode ? 'Ver Usuario' : 'Registrar Usuario'}
      onClose={onClose}
      onConfirm={viewMode ? onClose : onConfirm}
      confirmLabel={viewMode ? 'Cerrar' : 'Confirmar'}
      isSubmitting={viewMode ? false : isSubmitting}
    >
      <Stack spacing={2.5} sx={{ pt: 1 }}>
        <TextField
          label="Primer nombre *"
          value={form.first_name}
          onChange={onChange('first_name')}
          size="small"
          fullWidth
          error={!!formErrors.first_name}
          helperText={formErrors.first_name}
          required
          disabled={viewMode}
        />
        <TextField
          label="Segundo nombre (opcional)"
          value={form.second_name}
          onChange={onChange('second_name')}
          size="small"
          fullWidth
          error={!!formErrors.second_name}
          helperText={formErrors.second_name}
          disabled={viewMode}
        />
        <TextField
          label="Primer apellido *"
          value={form.first_last_name}
          onChange={onChange('first_last_name')}
          size="small"
          fullWidth
          error={!!formErrors.first_last_name}
          helperText={formErrors.first_last_name}
          required
          disabled={viewMode}
        />
        <TextField
          label="Segundo apellido *"
          value={form.second_last_name}
          onChange={onChange('second_last_name')}
          size="small"
          fullWidth
          error={!!formErrors.second_last_name}
          helperText={formErrors.second_last_name}
          required
          disabled={viewMode}
        />
        <TextField
          label="Correo institucional *"
          type="email"
          value={form.email}
          onChange={onChange('email')}
          placeholder="usuario@ucr.ac.cr"
          size="small"
          fullWidth
          error={!!formErrors.email}
          helperText={formErrors.email}
          required
          disabled={viewMode}
        />
        <Autocomplete
          options={ROLES}
          getOptionLabel={(r) => r.label}
          value={ROLES.find((r) => r.value === form.role) ?? null}
          onChange={(_, selected) => {
            onChange('role')({
              target: { value: selected?.value ?? '' },
            } as React.ChangeEvent<HTMLInputElement>);
          }}
          size="small"
          fullWidth
          disabled={viewMode}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Rol"
              required
              error={!!formErrors.role}
              helperText={formErrors.role}
            />
          )}
        />
        {!viewMode && (
          <TextField
            label="Contraseña temporal *"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={onChange('password')}
            size="small"
            fullWidth
            error={!!formErrors.password}
            helperText={formErrors.password}
            required
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={onTogglePasswordVisibility} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        )}
      </Stack>
    </ModalForm>
  );
}