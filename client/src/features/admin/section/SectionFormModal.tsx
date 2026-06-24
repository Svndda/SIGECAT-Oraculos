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
  viewMode?: boolean;
  form: FormState;
  formErrors: Partial<Record<keyof FormState, string>>;
  areas: Area[];
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onChange: (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function SectionFormModal({
  open, isEditing, viewMode = false, form, formErrors, areas, isSubmitting,
  onClose, onConfirm, onChange
}: SectionFormModalProps) {
  const selectedArea = areas.find((a) => a.area_id === form.area_id) ?? null;
  const title = viewMode ? 'Ver Sección' : isEditing ? 'Editar Sección' : 'Registrar Sección';
  const MAX_NAME = 110;
  const MAX_DESC = 255;

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
          label="Nombre de la Sección"
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
          disabled={viewMode}
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
          helperText={formErrors.description || `${form.description.length}/${MAX_DESC} caracteres`}
          disabled={viewMode}
          inputProps={{ min: 0, maxLength: MAX_DESC, step: 1 }}
        />
      </Stack>
    </ModalForm>
  );
}
