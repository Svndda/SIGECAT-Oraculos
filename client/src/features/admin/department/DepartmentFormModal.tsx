import { TextField, MenuItem, Stack } from '@mui/material';
import ModalForm from '../../../components/modals/ModalForm';
import type { Area } from '../../../services/adminService';

interface FormState {
  name: string;
  description: string;
  area_id: string;
}

interface DepartmentFormModalProps {
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

export default function DepartmentFormModal({
  open, isEditing, form, formErrors, areas, isSubmitting,
  onClose, onConfirm, onChange
}: DepartmentFormModalProps) {
  return (
    <ModalForm 
      open={open} 
      title={isEditing ? "Editar Departamento" : "Registrar Departamento"} 
      onClose={onClose} 
      onConfirm={onConfirm} 
      confirmLabel={isEditing ? "Guardar Cambios" : "Confirmar"} 
      isSubmitting={isSubmitting}
    >
      <Stack spacing={2.5} sx={{ pt: 1 }}>
        <TextField 
          label="Nombre del Departamento" 
          value={form.name} 
          onChange={onChange('name')} 
          size="small" fullWidth 
          error={!!formErrors.name} helperText={formErrors.name} required 
        />
        <TextField 
          select label="Área a la que pertenece" 
          value={form.area_id} 
          onChange={onChange('area_id')} 
          size="small" fullWidth 
          error={!!formErrors.area_id} helperText={formErrors.area_id} required
        >
          {areas.map((area) => (
            <MenuItem key={area.id} value={area.id}>{area.name}</MenuItem>
          ))}
        </TextField>
        <TextField 
          label="Descripción" 
          value={form.description} 
          onChange={onChange('description')} 
          size="small" fullWidth multiline rows={3} 
          error={!!formErrors.description} helperText={formErrors.description} 
        />
      </Stack>
    </ModalForm>
  );
}