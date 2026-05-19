import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

interface ModalSuccessProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export default function ModalSuccess({ open, title, message, onClose }: ModalSuccessProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', pt: 3, pb: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 48, color: '#388e3c' }} />
          <Typography variant="h6" fontWeight="bold" color="text.primary">
            {title}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ textAlign: 'center', pb: 1 }}>
        <Typography color="text.secondary">{message}</Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
        <Button
          variant="contained"
          onClick={onClose}
          sx={{ backgroundColor: '#2c2c2c', '&:hover': { backgroundColor: '#1a1a1a' }, px: 4 }}
        >
          Aceptar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
