import { Snackbar, Alert } from '@mui/material';

export type SnackbarSeverity = 'success' | 'error';

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
}

export const EMPTY_SNACKBAR: SnackbarState = { open: false, message: '', severity: 'success' };

interface AppSnackbarProps {
  state: SnackbarState;
  onClose: () => void;
  autoHideDuration?: number;
}

/**
 * Transient feedback for the result of an action (success or backend error).
 * Auto-hides and can be dismissed; ignores click-away so it is not closed by
 * an unrelated interaction.
 */
export default function AppSnackbar({ state, onClose, autoHideDuration = 4000 }: AppSnackbarProps) {
  return (
    <Snackbar
      open={state.open}
      autoHideDuration={autoHideDuration}
      onClose={(_, reason) => {
        if (reason !== 'clickaway') onClose();
      }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={onClose} severity={state.severity} variant="filled" sx={{ width: '100%' }}>
        {state.message}
      </Alert>
    </Snackbar>
  );
}
