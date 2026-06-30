import { TextField, Stack } from '@mui/material';
import ModalForm from '../../../components/modals/ModalForm';

interface LicenseTypeFormState {
  name: string;
}

interface LicenseTypeFormModalProps {
  open: boolean;
  isEditing: boolean;
  viewMode?: boolean;
  form: LicenseTypeFormState;
  formErrors: Partial<Record<keyof LicenseTypeFormState, string>>;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onChange: (field: keyof LicenseTypeFormState) => (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const MAX_NAME = 110;

export default function LicenseTypeFormModal({
  open,
  isEditing,
  viewMode = false,
  form,
  formErrors,
  isSubmitting,
  onClose,
  onConfirm,
  onChange,
}: LicenseTypeFormModalProps) {
  const title = viewMode ? 'Ver Tipo de Licencia' : isEditing ? 'Editar Tipo de Licencia' : 'Añadir Tipo de Licencia';

  return (
    <ModalForm
      open={open}
      title={title}
      onClose={onClose}
      onConfirm={viewMode ? onClose : onConfirm}
      confirmLabel={viewMode ? 'Cerrar' : isEditing ? 'Guardar cambios' : 'Confirmar'}
      isSubmitting={viewMode ? false : isSubmitting}
      confirmDisabled={!form.name}
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
      </Stack>
    </ModalForm>
  );
}
