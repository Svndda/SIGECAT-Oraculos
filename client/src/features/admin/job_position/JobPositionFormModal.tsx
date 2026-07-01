import {
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';

import ModalForm from '../../../components/modals/ModalForm';
import type { OrgOption } from '../../../services/common';
import type {
  Job,
  JobPositionParentType,
} from '../../../services/jobPositionService';

interface JobPositionFormState {
  job_position_number: string;
  description: string;
  job_id: string;
  user_id: string;
  job_shift: string;
  parentType: JobPositionParentType | '';
  parentId: string;
}

interface JobPositionFormModalProps {
  open: boolean;
  isEditing: boolean;
  viewMode?: boolean;
  form: JobPositionFormState;
  formErrors: Partial<Record<keyof JobPositionFormState, string>>;
  types: Job[];
  userOptions: { id: string; label: string }[];
  shiftOptions: string[];
  parentOptions: OrgOption[];
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onFieldChange: (field: keyof JobPositionFormState, value: string) => void;
}

const PARENT_TYPES: { value: JobPositionParentType; label: string }[] = [
  { value: 'area', label: 'Área' },
  { value: 'department', label: 'Departamento' },
  { value: 'section', label: 'Sección' },
  { value: 'unit', label: 'Unidad' },
];

export default function JobPositionFormModal({
  open, isEditing, viewMode = false, form, formErrors, types, userOptions,
  shiftOptions, parentOptions, isSubmitting, onClose, onConfirm, onFieldChange,
}: JobPositionFormModalProps) {
  const selectedType = types.find((t) => t.job_id === form.job_id) ?? null;
  const selectedParentType = PARENT_TYPES.find((p) => p.value === form.parentType) ?? null;
  const selectedUser = userOptions.find((u) => u.id === form.user_id) ?? null;

  const MAX_DESC = 255;
  const MAX_NUM = 10;

  const handleNumberChange = (value: string) => {
    const onlyNumbers = value.replace(/[^0-9]/g, '');
    const truncated = onlyNumbers.slice(0, MAX_NUM);
    onFieldChange('job_position_number', truncated);
  };

  return (
    <ModalForm
      open={open}
      title={viewMode ? 'Ver Plaza' : isEditing ? 'Editar Plaza' : 'Añadir Plaza'}
      onClose={onClose}
      onConfirm={viewMode ? onClose : onConfirm}
      confirmLabel={viewMode ? 'Cerrar' : isEditing ? 'Guardar cambios' : 'Confirmar'}
      isSubmitting={viewMode ? false : isSubmitting}
    >
      <Stack spacing={2.5} sx={{ pt: 1 }}>
        <TextField
          label="Número de plaza"
          value={form.job_position_number}
          onChange={(e) => handleNumberChange(e.target.value)}
          size="small"
          fullWidth
          type="Number" 
          error={!!formErrors.job_position_number}
          helperText={formErrors.job_position_number}
          required
          disabled={viewMode}
          inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
        />

        <Autocomplete
          options={types}
          getOptionLabel={(t) => t.name}
          value={selectedType}
          onChange={(_, selected) => onFieldChange('job_id', selected?.job_id ?? '')}
          size="small"
          fullWidth
          disabled={viewMode}
          renderInput={(params) => (
            <TextField {...params}
              label="Tipo de plaza"
              required error={!!formErrors.job_id}
              helperText={formErrors.job_id} />
          )}
        />

        <Autocomplete
          options={userOptions}
          getOptionLabel={(u) => u.label}
          value={selectedUser}
          onChange={(_, selected) => onFieldChange('user_id', selected?.id ?? '')}
          size="small"
          fullWidth
          disabled={viewMode}
          renderInput={(params) => (
            <TextField {...params}
              label="Usuario asignado"
              required error={!!formErrors.user_id}
              helperText={formErrors.user_id} />
          )}
        />

        <TextField
          select
          label="Turno"
          value={form.job_shift}
          onChange={(e) => onFieldChange('job_shift', e.target.value)}
          size="small"
          fullWidth
          required
          error={!!formErrors.job_shift}
          helperText={formErrors.job_shift}
          disabled={viewMode}
        >
          {shiftOptions.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
        </TextField>

        <Autocomplete
          options={PARENT_TYPES}
          getOptionLabel={(p) => p.label}
          value={selectedParentType}
          onChange={(_, selected) => {
            onFieldChange('parentType', selected?.value ?? '');
            onFieldChange('parentId', '');
          }}
          size="small"
          fullWidth
          disabled={viewMode}
          renderInput={
            (params) => <TextField {...params}
              label="Tipo de entidad" required />
          }
        />

        <Autocomplete
          options={parentOptions}
          getOptionLabel={(o) => o.name}
          value={parentOptions.find((o) => o.id === form.parentId) ?? null}
          disabled={!form.parentType || viewMode}
          onChange={(_, selected) => onFieldChange('parentId', selected?.id ?? '')}
          size="small"
          fullWidth
          renderInput={
            (params) => <TextField {...params}
              label="Entidad"
              required error={!!formErrors.parentId}
              helperText={formErrors.parentId} />
          }
        />

        <TextField
          label="Descripción"
          value={form.description}
          onChange={(e) => onFieldChange('description', e.target.value)}
          size="small"
          fullWidth
          multiline
          rows={3}
          error={!!formErrors.description}
          helperText={
            formErrors.description
            || `${form.description.length}/${MAX_DESC} caracteres`
          }
          disabled={viewMode}
          inputProps={{ maxLength: MAX_DESC }}
        />
      </Stack>
    </ModalForm>
  );
}