import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface ModalAlertProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export default function ModalAlert({
  open,
  title,
  message,
  onClose,
  onConfirm,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
}: ModalAlertProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', pt: 3, pb: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon sx={{ fontSize: 48, color: '#f57c00' }} />
          <Typography variant="h6" fontWeight="bold" color="text.primary">
            {title}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ textAlign: 'center', pb: 1 }}>
        <Typography color="text.secondary">{message}</Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', gap: 1, pb: 3 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{ color: '#2c2c2c', borderColor: '#2c2c2c', px: 3 }}
        >
          {cancelLabel}
        </Button>
        {onConfirm && (
          <Button
            variant="contained"
            onClick={onConfirm}
            sx={{ backgroundColor: '#2c2c2c', '&:hover': { backgroundColor: '#1a1a1a' }, px: 3 }}
          >
            {confirmLabel}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
