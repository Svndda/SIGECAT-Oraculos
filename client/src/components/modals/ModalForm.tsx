import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
} from '@mui/material';

interface ModalFormProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  isSubmitting?: boolean;
  children: React.ReactNode;
}

export default function ModalForm({
  open,
  title,
  onClose,
  onConfirm,
  confirmLabel = 'Confirmar',
  isSubmitting = false,
  children,
}: ModalFormProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight="bold" color="#12457d">
          {title}
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 2 }}>
        {children}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={isSubmitting}
          sx={{ color: '#2c2c2c', borderColor: '#2c2c2c', px: 3 }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={isSubmitting}
          sx={{ backgroundColor: '#2c2c2c', '&:hover': { backgroundColor: '#1a1a1a' }, px: 3 }}
        >
          {isSubmitting ? <CircularProgress size={20} sx={{ color: 'white' }} /> : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
