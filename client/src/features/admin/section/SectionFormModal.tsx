import { TextField, Stack } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import ModalForm from '../../../components/modals/ModalForm';
import type { Area } from '../../../services/areaService';

interface FormState {
  name: string;
  description: string;
  area_id: string;
}

interface SectionFormModalProps {
  open: boolean;
  isEditing: boolean;
  form: FormState;
  formErrors: Partial<Record<keyof FormState, string>>;
  areas: Area[];
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onChange: (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function SectionFormModal({
  open, isEditing, form, formErrors, areas, isSubmitting,
  onClose, onConfirm, onChange
}: SectionFormModalProps) {
  const selectedArea = areas.find((a) => a.area_id === form.area_id) ?? null;

  return (
    <ModalForm
      open={open}
      title={isEditing ? 'Editar Sección' : 'Registrar Sección'}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel={isEditing ? 'Guardar Cambios' : 'Confirmar'}
      isSubmitting={isSubmitting}
    >
      <Stack spacing={2.5} sx={{ pt: 1 }}>
        <TextField
          label="Nombre de la Sección"
          value={form.name}
          onChange={onChange('name')}
          size="small"
          fullWidth
          error={!!formErrors.name}
          helperText={formErrors.name}
          required
        />
        <Autocomplete
          options={areas}
          getOptionLabel={(a) => a.name}
          value={selectedArea}
          onChange={(_, selected) => {
            onChange('area_id')({
              target: { value: selected?.area_id ?? '' },
            } as React.ChangeEvent<HTMLInputElement>);
          }}
          size="small"
          fullWidth
          renderInput={(params) => (
            <TextField
              {...params}
              label="Área a la que pertenece"
              required
              error={!!formErrors.area_id}
              helperText={formErrors.area_id ?? (areas.length === 0 ? 'No hay áreas registradas.' : '')}
            />
          )}
        />
        <TextField
          label="Descripción"
          value={form.description}
          onChange={onChange('description')}
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
