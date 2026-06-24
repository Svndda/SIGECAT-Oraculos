import { TextField, Stack } from '@mui/material';
import ModalForm from '../../../components/modals/ModalForm';

interface AreaFormState {
  name: string;
  description: string;
}

interface AreaFormModalProps {
  open: boolean;
  isEditing: boolean;
  viewMode?: boolean;
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
  viewMode = false,
  form,
  formErrors,
  isSubmitting,
  onClose,
  onConfirm,
  onChange,
}: AreaFormModalProps) {
  const title = viewMode ? 'Ver Área' : isEditing ? 'Editar Área' : 'Añadir Área';

  const MAX_NAME = 110;
  const MAX_DESC = 255;
  return (
    <ModalForm
      open={open}
      title={title}
      onClose={onClose}
      onConfirm={viewMode ? onClose : onConfirm}
      confirmLabel={viewMode ? 'Cerrar' : isEditing ? 'Guardar cambios' : 'Confirmar'}
      isSubmitting={viewMode ? false : isSubmitting}
    >
      <Stack spacing={2.5} sx={{ pt: 1 }}>
        <TextField
          label="Nombre"
          value={form.name}
          onChange={onChange('name')}
          size="small"
          fullWidth
          error={!!formErrors.name}
          helperText={formErrors.name || `${form.name.length}/${MAX_NAME} caracteres`}
          inputProps={{ min: 0, maxLength: MAX_NAME, step: 1 }}
          required
          disabled={viewMode}
        />
        <TextField
          label="Descripción"
          value={form.description}
          onChange={onChange('description')}
          size="small"
          fullWidth
          multiline
          rows={3}
          disabled={viewMode}
          error={!!formErrors.description}
          helperText={formErrors.description || `${form.description.length}/${MAX_DESC} caracteres`}
          inputProps={{ min: 0, maxLength: MAX_DESC, step: 1 }}
        />
      </Stack>
    </ModalForm>
  );
}