import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import AppSnackbar, { EMPTY_SNACKBAR, type SnackbarState, type SnackbarSeverity } from '../components/AppSnackbar';

interface SnackbarContextType {
  /** Shows a transient success message. */
  success: (message: string) => void;
  /** Shows a transient error message. */
  error: (message: string) => void;
  /** Shows a transient message with an explicit severity. */
  show: (message: string, severity: SnackbarSeverity) => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

/**
 * Provides a single, app-wide snackbar for post-action feedback. Rendering one
 * snackbar at the root (instead of a modal per page) means success/error
 * messages never stack and never block the UI — they appear, auto-hide and go.
 */
export const SnackbarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SnackbarState>(EMPTY_SNACKBAR);

  const show = useCallback((message: string, severity: SnackbarSeverity) => {
    setState({ open: true, message, severity });
  }, []);

  const close = useCallback(() => setState((prev) => ({ ...prev, open: false })), []);

  const value = useMemo<SnackbarContextType>(
    () => ({
      show,
      success: (message: string) => show(message, 'success'),
      error: (message: string) => show(message, 'error'),
    }),
    [show],
  );

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <AppSnackbar state={state} onClose={close} />
    </SnackbarContext.Provider>
  );
};

export const useSnackbar = (): SnackbarContextType => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};
