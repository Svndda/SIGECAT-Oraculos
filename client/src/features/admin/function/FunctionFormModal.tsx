import {
  Autocomplete,
  Stack,
  TextField,
} from '@mui/material';

import ModalForm from '../../../components/modals/ModalForm';
import type { Job } from '../../../services/jobService';

interface FormState {
  name: string;
  description: string;
  job_id: string;
  expected_time: string;
}

interface FunctionFormModalProps {
  open: boolean;
  isEditing: boolean;
  viewMode?: boolean;
  form: FormState;
  formErrors: Partial<Record<keyof FormState, string>>;
  jobs: Job[];
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onChangeValue: (field: keyof FormState, value: string) => void;
}

const MAX_NAME = 110;
const MAX_DESC = 255;

export default function FunctionFormModal({
  open,
  isEditing,
  viewMode = false,
  form,
  formErrors,
  jobs,
  isSubmitting,
  onClose,
  onConfirm,
  onChangeValue,
}: FunctionFormModalProps) {
  const selectedJob = jobs.find((j) => j.job_id === form.job_id) ?? null;

  const title = viewMode
    ? 'Ver Función'
    : isEditing
    ? 'Editar Función'
    : 'Registrar Función';

  const handleExpectedTimeChange = (value: string) => {
    if (value === '' || Number(value) >= 0) {
      onChangeValue('expected_time', value);
    }
  };

  return (
    <ModalForm
      open={open}
      title={title}
      onClose={onClose}
      onConfirm={viewMode ? onClose : onConfirm}
      confirmLabel={viewMode ? 'Cerrar' : isEditing ? 'Guardar Cambios' : 'Confirmar'}
      isSubmitting={viewMode ? false : isSubmitting}
    >
      <Stack spacing={2.5} sx={{ pt: 1 }}>
        <TextField
          label="Nombre de la Función"
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

        <Autocomplete
          options={jobs}
          getOptionLabel={(option) => option.name}
          value={selectedJob}
          onChange={(_, selected) => {
            onChangeValue('job_id', selected?.job_id ?? '');
          }}
          size="small"
          fullWidth
          disabled={viewMode}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Tipo de Puesto"
              required
              error={!!formErrors.job_id}
              helperText={
                formErrors.job_id ||
                (jobs.length === 0 ? 'No hay tipos de puesto registrados.' : '')
              }
            />
          )}
        />

        <TextField
          label="Tiempo esperado (horas)"
          value={form.expected_time}
          onChange={(e) => handleExpectedTimeChange(e.target.value)}
          size="small"
          fullWidth
          type="number"
          error={!!formErrors.expected_time}
          helperText={formErrors.expected_time}
          disabled={viewMode}
          inputProps={{ min: 0, step: 0.5 }}
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
