import { Typography, TextField, MenuItem, Stack } from '@mui/material';
import ModalForm from '../../../components/modals/ModalForm';
import type { JobClass } from '../../../services/jobClassService';
import type { AdminUser } from '../../../services/userService';

interface AssignClassModalProps {
  open: boolean;
  targetUser: AdminUser | null;
  selectedClassId: string;
  jobClasses: JobClass[];
  isSubmitting: boolean;
  onSelectClass: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export default function AssignClassModal({
  open,
  targetUser,
  selectedClassId,
  jobClasses,
  isSubmitting,
  onSelectClass,
  onClose,
  onConfirm,
}: AssignClassModalProps) {
  return (
    <ModalForm
      open={open}
      title="Asignar clase ocupacional"
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel="Asignar"
      isSubmitting={isSubmitting}
    >
      <Stack spacing={2.5} sx={{ pt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {targetUser ? `${targetUser.first_name} ${targetUser.last_name}` : ''}
        </Typography>
        <TextField
          select
          label="Clase ocupacional"
          value={selectedClassId}
          onChange={(e) => onSelectClass(e.target.value)}
          size="small"
          fullWidth
          helperText={jobClasses.length === 0 ? 'No hay clases ocupacionales registradas.' : ''}
          required
        >
          {jobClasses.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    </ModalForm>
  );
}