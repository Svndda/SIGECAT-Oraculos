import { createContext, useContext } from 'react';
import type { SnackbarSeverity } from '../components/AppSnackbar';

export interface SnackbarContextType {
  /** Shows a transient success message. */
  success: (message: string) => void;
  /** Shows a transient error message. */
  error: (message: string) => void;
  /** Shows a transient message with an explicit severity. */
  show: (message: string, severity: SnackbarSeverity) => void;
}

export const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export const useSnackbar = (): SnackbarContextType => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};
