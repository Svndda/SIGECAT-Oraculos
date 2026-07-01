import React, { useState, useCallback, useMemo } from 'react';
import AppSnackbar, { type SnackbarState, type SnackbarSeverity } from '../components/AppSnackbar';
import { SnackbarContext, type SnackbarContextType } from './SnackbarContext';

const EMPTY_SNACKBAR: SnackbarState = { open: false, message: '', severity: 'success' };

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
