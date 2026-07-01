import {
  Stack,
  TextField,
} from '@mui/material';

import ModalForm from '../../../components/modals/ModalForm';

interface FormState {
  name: string;
  code: string;
  description: string;
}

interface JobFormModalProps {
  open: boolean;
  isEditing: boolean;
  viewMode?: boolean;
  form: FormState;
  formErrors: Partial<Record<keyof FormState, string>>;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onChangeValue: (field: keyof FormState, value: string) => void;
}

export default function JobFormModal({
  open,
  isEditing,
  viewMode = false,
  form,
  formErrors,
  isSubmitting,
  onClose,
  onConfirm,
  onChangeValue,
}: JobFormModalProps) {
  const MAX_CODE = 200000;
  const MAX_NAME = 110;
  const MAX_DESC = 255;

  const handleCodeChange = (value: string) => {
    const numValue = Number(value);
    
    if (value === '') {
      onChangeValue('code', '');
      return;
    }
    if (numValue <= MAX_CODE) {
      onChangeValue('code', value);
    }
  };

  const title = viewMode
    ? 'Ver Clase Ocupacional'
    : isEditing
    ? 'Editar Clase Ocupacional'
    : 'Registrar Clase Ocupacional';

  return (
    <ModalForm
      open={open}
      title={title}
      onClose={onClose}
      onConfirm={viewMode ? onClose : onConfirm}
      confirmLabel={viewMode ? 'Cerrar' : isEditing ? 'Guardar Cambios' : 'Confirmar'}
      isSubmitting={viewMode ? false : isSubmitting}
      confirmDisabled={!form.code || !form.name}
    >
      <Stack spacing={2.5} sx={{ pt: 1 }}>
        <TextField
          label="Código de la Clase Ocupacional"
          value={form.code}
          onChange={(e) => handleCodeChange(e.target.value)}
          size="small"
          fullWidth
          type="number"
          error={!!formErrors.code}
          helperText={formErrors.code}
          required
          disabled={viewMode}
          inputProps={{ min: 0, max: MAX_CODE, step: 1 }}
        />

        <TextField
          label="Nombre de la Clase Ocupacional"
          value={form.name}
          onChange={(e) => onChangeValue('name', e.target.value)}
          size="small"
          fullWidth
          error={!!formErrors.name}
          helperText={formErrors.name || `${form.name.length}/${MAX_NAME} caracteres`}
          required
          disabled={viewMode}
          inputProps={{ maxLength: MAX_NAME }}
        />

        <TextField
          label="Descripción"
          value={form.description}
          onChange={(e) => onChangeValue('description', e.target.value)}
          size="small"
          fullWidth
          multiline
          rows={3}
          error={!!formErrors.description}
          helperText={formErrors.description || `${form.description.length}/${MAX_DESC} caracteres`}
          disabled={viewMode}
          inputProps={{ maxLength: MAX_DESC }}
        />
      </Stack>
    </ModalForm>
  );
}