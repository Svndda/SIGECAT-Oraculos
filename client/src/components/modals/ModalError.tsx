import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface ModalErrorProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export default function ModalError({ open, title, message, onClose }: ModalErrorProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', pt: 3, pb: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <ErrorOutlineIcon sx={{ fontSize: 48, color: '#d32f2f' }} />
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
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
