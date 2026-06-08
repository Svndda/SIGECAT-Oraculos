import { TextField, MenuItem, Stack } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import ModalForm from '../../../components/modals/ModalForm';
import type { OrgOption } from '../../../services/common';
import type { JobPositionType, JobPositionParentType } from '../../../services/jobPositionService';

interface JobPositionFormState {
  job_position_number: string;
  description: string;
  job_position_type_id: string;
  parentType: JobPositionParentType | '';
  parentId: string;
}

interface JobPositionFormModalProps {
  open: boolean;
  isEditing: boolean;
  form: JobPositionFormState;
  formErrors: Partial<Record<keyof JobPositionFormState, string>>;
  types: JobPositionType[];
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
  open,
  isEditing,
  form,
  formErrors,
  types,
  parentOptions,
  isSubmitting,
  onClose,
  onConfirm,
  onFieldChange,
}: JobPositionFormModalProps) {
  const selectedType = types.find((t) => t.job_position_type_id === form.job_position_type_id) ?? null;

  return (
    <ModalForm
      open={open}
      title={isEditing ? 'Editar Plaza' : 'Añadir Plaza'}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel={isEditing ? 'Guardar cambios' : 'Confirmar'}
      isSubmitting={isSubmitting}
    >
      <Stack spacing={2.5} sx={{ pt: 1 }}>
        <TextField
          label="Número de plaza"
          value={form.job_position_number}
          onChange={(e) => onFieldChange('job_position_number', e.target.value)}
          size="small"
          fullWidth
          error={!!formErrors.job_position_number}
          helperText={formErrors.job_position_number}
          required
        />

        <Autocomplete
          options={types}
          getOptionLabel={(t) => t.name}
          value={selectedType}
          onChange={(_, selected) => {
            onFieldChange('job_position_type_id', selected?.job_position_type_id ?? '');
          }}
          size="small"
          fullWidth
          renderInput={(params) => (
            <TextField
              {...params}
              label="Tipo de plaza"
              required
              error={!!formErrors.job_position_type_id}
              helperText={
                formErrors.job_position_type_id ??
                (types.length === 0 ? 'No hay tipos de plaza registrados.' : '')
              }
            />
          )}
        />

        <TextField
          select
          label="Tipo de entidad"
          value={form.parentType}
          onChange={(e) => {
            // Reset the chosen entity when the parent kind changes.
            onFieldChange('parentType', e.target.value);
            onFieldChange('parentId', '');
          }}
          size="small"
          fullWidth
          error={!!formErrors.parentType}
          helperText={formErrors.parentType}
          required
        >
          {PARENT_TYPES.map((p) => (
            <MenuItem key={p.value} value={p.value}>
              {p.label}
            </MenuItem>
          ))}
        </TextField>

        <Autocomplete
          options={parentOptions}
          getOptionLabel={(o) => o.name}
          value={parentOptions.find((o) => o.id === form.parentId) ?? null}
          disabled={!form.parentType}
          onChange={(_, selected) => onFieldChange('parentId', selected?.id ?? '')}
          size="small"
          fullWidth
          renderInput={(params) => (
            <TextField
              {...params}
              label="Entidad"
              required
              error={!!formErrors.parentId}
              helperText={
                formErrors.parentId ??
                (form.parentType && parentOptions.length === 0 ? 'No hay entidades de este tipo registradas.' : '')
              }
            />
          )}
        />

        <TextField
          label="Descripción"
          value={form.description}
          onChange={(e) => onFieldChange('description', e.target.value)}
          size="small"
          fullWidth
          multiline
          rows={3}
        />
      </Stack>
    </ModalForm>
  );
}