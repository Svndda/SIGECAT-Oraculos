import { createContext, useContext } from 'react';
import type { AccessibilityPrefs } from '../services/accessibilityStorage';

/** Discrete font-scale steps offered by the A+/A- controls. */
export const FONT_SCALES = [1, 1.15, 1.3, 1.5] as const;

export interface AccessibilityContextType {
  prefs: AccessibilityPrefs;
  increaseFont: () => void;
  decreaseFont: () => void;
  resetFont: () => void;
  toggleHighContrast: () => void;
  toggleGrayscale: () => void;
  toggleInvert: () => void;
  toggleDyslexiaFont: () => void;
  toggleTts: () => void;
  resetAll: () => void;
}

export const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
