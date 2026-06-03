import { TextField, MenuItem, Stack } from '@mui/material';
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
  form,
  formErrors,
  assignmentOptions,
  isSubmitting,
  onClose,
  onConfirm,
  onFieldChange,
}: UnitFormModalProps) {
  return (
    <ModalForm
      open={open}
      title={isEditing ? 'Editar Unidad' : 'Añadir Unidad'}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel={isEditing ? 'Guardar cambios' : 'Confirmar'}
      isSubmitting={isSubmitting}
    >
      <Stack spacing={2.5} sx={{ pt: 1 }}>
        <TextField
          label="Nombre"
          value={form.name}
          onChange={(e) => onFieldChange('name', e.target.value)}
          size="small"
          fullWidth
          error={!!formErrors.name}
          helperText={formErrors.name}
          required
        />
        <TextField
          select
          label="Tipo de asignación"
          value={form.assignmentType}
          onChange={(e) => {
            onFieldChange('assignmentType', e.target.value);
            onFieldChange('assignmentId', ''); // reset entity when type changes
          }}
          size="small"
          fullWidth
          disabled={isEditing}
          error={!!formErrors.assignmentType}
          helperText={isEditing ? 'El tipo de asignación no se puede cambiar.' : formErrors.assignmentType}
          required
        >
          {ASSIGNMENT_TYPES.map((t) => (
            <MenuItem key={t.value} value={t.value}>
              {t.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Entidad"
          value={form.assignmentId}
          onChange={(e) => onFieldChange('assignmentId', e.target.value)}
          size="small"
          fullWidth
          disabled={!form.assignmentType}
          error={!!formErrors.assignmentId}
          helperText={
            formErrors.assignmentId ??
            (form.assignmentType && assignmentOptions.length === 0
              ? 'No hay entidades de este tipo registradas.'
              : '')
          }
          required
        >
          {assignmentOptions.map((o) => (
            <MenuItem key={o.id} value={o.id}>
              {o.name}
            </MenuItem>
          ))}
        </TextField>
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