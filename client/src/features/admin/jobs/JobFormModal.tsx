import { TextField, Stack, Autocomplete } from '@mui/material';
import ModalForm from '../../../components/modals/ModalForm';
import type { JobClass } from '../../../services/jobClassService';

interface FormState {
  name: string;
  code: string;
  description: string;
  job_class_id: string;
}

interface JobFormModalProps {
  open: boolean;
  isEditing: boolean;
  form: FormState;
  formErrors: Partial<Record<keyof FormState, string>>;
  jobClasses: JobClass[];
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onChangeValue: (field: keyof FormState, value: string) => void;
}

export default function JobFormModal({
  open, isEditing, form, formErrors, jobClasses, isSubmitting,
  onClose, onConfirm, onChangeValue
}: JobFormModalProps) {
  const selectedJobClass = jobClasses.find((jc) => jc.job_class_id === form.job_class_id) ?? null;

  return (
    <ModalForm
      open={open}
      title={isEditing ? "Editar Puesto" : "Registrar Puesto"}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel={isEditing ? "Guardar Cambios" : "Confirmar"}
      isSubmitting={isSubmitting}
    >
      <Stack spacing={2.5} sx={{ pt: 1 }}>
        <TextField
          label="Código del Puesto"
          value={form.code}
          onChange={(e) => onChangeValue('code', e.target.value)}
          size="small"
          fullWidth
          type="number"
          error={!!formErrors.code}
          helperText={formErrors.code}
          required
          inputProps={{ min: 0, max: 200000 }}
        />

        <TextField
          label="Nombre del Puesto"
          value={form.name}
          onChange={(e) => onChangeValue('name', e.target.value)}
          size="small"
          fullWidth
          error={!!formErrors.name}
          helperText={formErrors.name}
          required
        />

        <Autocomplete
          options={jobClasses}
          getOptionLabel={(option) => option.name}
          value={selectedJobClass}
          onChange={(_, selected) => {
            onChangeValue('job_class_id', selected?.job_class_id ?? '');
          }}
          size="small"
          fullWidth
          renderInput={(params) => (
            <TextField
              {...params}
              label="Clase Ocupacional"
              required
              error={!!formErrors.job_class_id}
              helperText={formErrors.job_class_id
                ?? (jobClasses.length === 0
                  ? 'No hay clases ocupacionales registradas.' : '')}
            />
          )}
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
          helperText={formErrors.description}
        />
      </Stack>
    </ModalForm>
  );
}