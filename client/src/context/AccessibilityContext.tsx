import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import AccessibilityWidget from '../components/AccessibilityWidget';
import {
  accessibilityStorage,
  DEFAULT_PREFS,
  type AccessibilityPrefs,
} from '../services/accessibilityStorage';

/** Discrete font-scale steps offered by the A+/A- controls. */
export const FONT_SCALES = [1, 1.15, 1.3, 1.5] as const;
const BASE_FONT_PX = 16;

interface AccessibilityContextType {
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

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

/**
 * App-wide accessibility preferences (font size, contrast, grayscale, colour
 * inversion, dyslexia-friendly font, click-to-read speech). Mounted at the root
 * so the floating widget is available on every page — including login — and the
 * chosen settings persist across browser restarts via localStorage.
 *
 * Effects are applied imperatively to <html>: the font scale sets the root
 * font-size (MUI typography is rem-based, so it scales with it) and each flag
 * toggles a global class consumed by styles/accessibility.css.
 */
export const AccessibilityProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(() =>
    accessibilityStorage.getPreferences(),
  );

  // Apply the preferences to the document and persist them on every change.
  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${BASE_FONT_PX * prefs.fontScale}px`;
    root.classList.toggle('a11y-contrast', prefs.highContrast);
    root.classList.toggle('a11y-grayscale', prefs.grayscale);
    root.classList.toggle('a11y-invert', prefs.invert);
    root.classList.toggle('a11y-dyslexia', prefs.dyslexiaFont);
    accessibilityStorage.setPreferences(prefs);
  }, [prefs]);

  const setFontScale = useCallback((next: number) => {
    setPrefs((prev) => ({...prev, fontScale: next}));
  }, []);

  const value = useMemo<AccessibilityContextType>(() => {
    const toggle = (key: keyof AccessibilityPrefs) => () =>
      setPrefs((prev) => ({...prev, [key]: !prev[key]}));

    return {
      prefs,
      increaseFont: () => {
        const i = FONT_SCALES.indexOf(prefs.fontScale as (typeof FONT_SCALES)[number]);
        setFontScale(FONT_SCALES[Math.min(i + 1, FONT_SCALES.length - 1)] ?? prefs.fontScale);
      },
      decreaseFont: () => {
        const i = FONT_SCALES.indexOf(prefs.fontScale as (typeof FONT_SCALES)[number]);
        setFontScale(FONT_SCALES[Math.max(i - 1, 0)] ?? prefs.fontScale);
      },
      resetFont: () => setFontScale(1),
      toggleHighContrast: toggle('highContrast'),
      toggleGrayscale: toggle('grayscale'),
      toggleInvert: toggle('invert'),
      toggleDyslexiaFont: toggle('dyslexiaFont'),
      toggleTts: toggle('ttsEnabled'),
      resetAll: () => setPrefs({...DEFAULT_PREFS}),
    };
  }, [prefs, setFontScale]);

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      <AccessibilityWidget />
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
