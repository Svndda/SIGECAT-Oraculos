import { TextField, Stack } from '@mui/material';
import ModalForm from '../../../components/modals/ModalForm';

interface AreaFormState {
  name: string;
  description: string;
}

interface AreaFormModalProps {
  open: boolean;
  isEditing: boolean;
  form: AreaFormState;
  formErrors: Partial<Record<keyof AreaFormState, string>>;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onChange: (field: keyof AreaFormState) => (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function AreaFormModal({
  open,
  isEditing,
  form,
  formErrors,
  isSubmitting,
  onClose,
  onConfirm,
  onChange,
}: AreaFormModalProps) {
  return (
    <ModalForm
      open={open}
      title={isEditing ? 'Editar Área' : 'Añadir Área'}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel={isEditing ? 'Guardar cambios' : 'Confirmar'}
      isSubmitting={isSubmitting}
    >
      <Stack spacing={2.5} sx={{ pt: 1 }}>
        <TextField
          label="Nombre"
          value={form.name}
          onChange={onChange('name')}
          size="small"
          fullWidth
          error={!!formErrors.name}
          helperText={formErrors.name}
          required
        />
        <TextField
          label="Descripción"
          value={form.description}
          onChange={onChange('description')}
          size="small"
          fullWidth
          multiline
          rows={3}
        />
      </Stack>
    </ModalForm>
  );
} 