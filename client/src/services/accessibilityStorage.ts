/**
 * Persistent storage for the user's accessibility preferences.
 *
 * Unlike auth tokens (which live in `sessionStorage` and die with the tab),
 * accessibility preferences are stored in `localStorage`: a user who needs
 * larger text or high contrast expects those choices to survive browser
 * restarts and to apply on the login screen, before any session exists.
 */

const PREFS_KEY = 'sigecat_a11y_prefs';

export interface AccessibilityPrefs {
  /** Root font-size multiplier (1 = 100%). */
  fontScale: number;
  highContrast: boolean;
  grayscale: boolean;
  invert: boolean;
  dyslexiaFont: boolean;
  /** Click-to-read text-to-speech mode. */
  ttsEnabled: boolean;
}

export const DEFAULT_PREFS: AccessibilityPrefs = {
  fontScale: 1,
  highContrast: false,
  grayscale: false,
  invert: false,
  dyslexiaFont: false,
  ttsEnabled: false,
};

export const accessibilityStorage = {
  getPreferences: (): AccessibilityPrefs => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return {...DEFAULT_PREFS};
      // Merge over defaults so a newly added field never reads as undefined.
      return {...DEFAULT_PREFS, ...JSON.parse(raw)};
    } catch {
      return {...DEFAULT_PREFS};
    }
  },

  setPreferences: (prefs: AccessibilityPrefs): void => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  },

  clear: (): void => localStorage.removeItem(PREFS_KEY),
};
