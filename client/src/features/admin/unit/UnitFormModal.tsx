import { TextField, Stack } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import ModalForm from '../../../components/modals/ModalForm';
import type { OrgOption } from '../../../services/common';

type AssignmentType = 'department' | 'section';

interface UnitFormState {
  name: string;
  description: string;
  assignmentType: AssignmentType | '';
  assignmentId: string;
}

interface UnitFormModalProps {
  open: boolean;
  isEditing: boolean;
  viewMode?: boolean;
  form: UnitFormState;
  formErrors: Partial<Record<keyof UnitFormState, string>>;
  assignmentOptions: OrgOption[];
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onFieldChange: (field: keyof UnitFormState, value: string) => void;
}

const ASSIGNMENT_TYPES: { value: AssignmentType; label: string }[] = [
  { value: 'department', label: 'Departamento' },
  { value: 'section', label: 'Sección' },
];

export default function UnitFormModal({
  open,
  isEditing,
  viewMode = false,
  form,
  formErrors,
  assignmentOptions,
  isSubmitting,
  onClose,
  onConfirm,
  onFieldChange,
}: UnitFormModalProps) {
  const selectedAssignmentType = ASSIGNMENT_TYPES.find((t) => t.value === form.assignmentType) ?? null;
  const selectedAssignment = assignmentOptions.find((o) => o.id === form.assignmentId) ?? null;
  const title = viewMode ? 'Ver Unidad' : isEditing ? 'Editar Unidad' : 'Añadir Unidad';
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
          onChange={(e) => onFieldChange('name', e.target.value)}
          size="small"
          fullWidth
          error={!!formErrors.name}
          helperText={formErrors.name || `${form.name.length}/${MAX_NAME} caracteres`}
          inputProps={{ min: 0, maxLength: MAX_NAME, step: 1 }}
          required
          disabled={viewMode}
        />
        <Autocomplete
          options={ASSIGNMENT_TYPES}
          getOptionLabel={(t) => t.label}
          value={selectedAssignmentType}
          disabled={isEditing || viewMode}
          onChange={(_, selected) => {
            onFieldChange('assignmentType', selected?.value ?? '');
            onFieldChange('assignmentId', '');
          }}
          size="small"
          fullWidth
          renderInput={(params) => (
            <TextField
              {...params}
              label="Tipo de asignación"
              required
              error={!!formErrors.assignmentType}
              helperText={isEditing ? 'El tipo de asignación no se puede cambiar.' : formErrors.assignmentType}
            />
          )}
        />
        <Autocomplete
          options={assignmentOptions}
          getOptionLabel={(o) => o.name}
          value={selectedAssignment}
          disabled={!form.assignmentType || viewMode}
          onChange={(_, selected) => onFieldChange('assignmentId', selected?.id ?? '')}
          size="small"
          fullWidth
          renderInput={(params) => (
            <TextField
              {...params}
              label="Entidad"
              required
              error={!!formErrors.assignmentId}
              helperText={
                formErrors.assignmentId ??
                (form.assignmentType && assignmentOptions.length === 0
                  ? 'No hay entidades de este tipo registradas.'
                  : '')
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
          disabled={viewMode}
          error={!!formErrors.description}
          helperText={formErrors.description || `${form.description.length}/${MAX_DESC} caracteres`}
          inputProps={{ min: 0, maxLength: MAX_DESC, step: 1 }}
        />
      </Stack>
    </ModalForm>
  );
}
