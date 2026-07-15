import {useEffect, useRef, useState, type MouseEvent as ReactMouseEvent} from 'react';
import {
  Box,
  Divider,
  Drawer,
  Fab,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import CloseIcon from '@mui/icons-material/Close';
import TextIncreaseIcon from '@mui/icons-material/TextIncrease';
import TextDecreaseIcon from '@mui/icons-material/TextDecrease';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import {useAccessibility, FONT_SCALES} from '../context/AccessibilityContext';
import {isSpeechSupported, speak, stopSpeaking} from '../utils/speech';

/**
 * Floating accessibility panel, modelled on the UCR site's own accessibility
 * menu. A fixed FAB (present on every page, including login) opens a drawer with
 * controls for text size, high contrast, grayscale, colour inversion, a
 * dyslexia-friendly font and click-to-read text-to-speech.
 */
export default function AccessibilityWidget() {
  const {
    prefs,
    increaseFont,
    decreaseFont,
    resetFont,
    toggleHighContrast,
    toggleGrayscale,
    toggleInvert,
    toggleDyslexiaFont,
    toggleTts,
    resetAll,
  } = useAccessibility();
  const [open, setOpen] = useState(false);

  // Position + text for the "read aloud" right-click menu (null = closed).
  const [ctxMenu, setCtxMenu] =
    useState<{ mouseX: number; mouseY: number; text: string } | null>(null);

  // Remember the user's last non-empty text selection. Opening the panel and
  // clicking the "Leer selección" button both clear the live page selection
  // (mousedown on a control collapses it), so reading window.getSelection() at
  // click time usually finds nothing. We capture the selection as it happens and
  // read the remembered value instead.
  const lastSelectionRef = useRef('');
  useEffect(() => {
    const remember = () => {
      const text = window.getSelection()?.toString() ?? '';
      if (text.trim()) lastSelectionRef.current = text;
    };
    document.addEventListener('selectionchange', remember);
    return () => document.removeEventListener('selectionchange', remember);
  }, []);

  // Click-to-read: while TTS is on, reading the text of whatever the user clicks.
  useEffect(() => {
    if (!prefs.ttsEnabled || !isSpeechSupported()) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      // Ignore clicks inside the widget itself and on form controls.
      if (!target || target.closest('[data-a11y-widget]')) return;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const text = target.innerText || target.textContent || '';
      if (text.trim()) speak(text);
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [prefs.ttsEnabled]);

  // Right-click "read aloud": when the user right-clicks with text selected,
  // replace the native menu with a single "Leer en voz alta" option. A
  // right-click keeps the selection intact (unlike a left-click on a control),
  // so this is the most reliable way to read a selection. When nothing is
  // selected we leave the browser's own context menu untouched.
  useEffect(() => {
    if (!isSpeechSupported()) return;

    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-a11y-widget]')) return;
      const text = (window.getSelection()?.toString() ?? '').trim();
      if (!text) return; // no selection → keep the native context menu
      e.preventDefault();
      setCtxMenu({ mouseX: e.clientX, mouseY: e.clientY, text });
    };

    document.addEventListener('contextmenu', onContextMenu);
    return () => document.removeEventListener('contextmenu', onContextMenu);
  }, []);

  // Stop any speech when the read-aloud mode is switched off.
  useEffect(() => {
    if (!prefs.ttsEnabled) stopSpeaking();
  }, [prefs.ttsEnabled]);

  const fontStep = FONT_SCALES.indexOf(prefs.fontScale as (typeof FONT_SCALES)[number]);
  const fontPercent = Math.round(prefs.fontScale * 100);

  const readSelection = () => {
    // Prefer a live selection, but fall back to the last remembered one since
    // the click that triggered this usually just cleared the live selection.
    const live = window.getSelection()?.toString() ?? '';
    const text = live.trim() ? live : lastSelectionRef.current;
    if (text.trim()) speak(text);
  };

  const switchRow = (label: string, checked: boolean, onChange: () => void) => (
    <Box
      sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1}}
    >
      <Typography variant="body2">{label}</Typography>
      <Switch checked={checked} onChange={onChange} inputProps={{'aria-label': label}} />
    </Box>
  );

  return (
    <Box data-a11y-widget className="a11y-widget-root">
      <Tooltip title="Opciones de accesibilidad">
        <Fab
          color="primary"
          aria-label="Opciones de accesibilidad"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            bottom: {xs: 16, sm: 24},
            right: {xs: 16, sm: 24},
            zIndex: (theme) => theme.zIndex.tooltip + 1,
            backgroundColor: '#12457d',
            '&:hover': {backgroundColor: '#0e3763'},
          }}
        >
          <AccessibilityNewIcon />
        </Fab>
      </Tooltip>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{sx: {width: {xs: '85vw', sm: 340}, p: 2}}}
      >
        <Box data-a11y-widget>
        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1}}>
          <Typography variant="h6" fontWeight={700} sx={{color: '#12457d'}}>
            Accesibilidad
          </Typography>
          <IconButton onClick={() => setOpen(false)} aria-label="Cerrar panel de accesibilidad">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{mb: 2}} />

        {/* Text size */}
        <Typography variant="subtitle2" sx={{mb: 1, fontWeight: 600}}>
          Tamaño del texto
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{mb: 2}}>
          <IconButton
            onClick={decreaseFont}
            disabled={fontStep <= 0}
            aria-label="Reducir tamaño del texto"
            sx={{border: '1px solid #ddd'}}
          >
            <TextDecreaseIcon />
          </IconButton>
          <Typography variant="body2" sx={{flex: 1, textAlign: 'center'}} aria-live="polite">
            {fontPercent}%
          </Typography>
          <IconButton
            onClick={increaseFont}
            disabled={fontStep >= FONT_SCALES.length - 1}
            aria-label="Aumentar tamaño del texto"
            sx={{border: '1px solid #ddd'}}
          >
            <TextIncreaseIcon />
          </IconButton>
          <Tooltip title="Restablecer tamaño">
            <IconButton onClick={resetFont} aria-label="Restablecer tamaño del texto" sx={{border: '1px solid #ddd'}}>
              <RestartAltIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        <Divider sx={{mb: 2}} />

        {/* Visual toggles */}
        <Stack spacing={1.5} sx={{mb: 2}}>
          {switchRow('Alto contraste', prefs.highContrast, toggleHighContrast)}
          {switchRow('Escala de grises', prefs.grayscale, toggleGrayscale)}
          {switchRow('Invertir colores', prefs.invert, toggleInvert)}
          {switchRow('Fuente para dislexia', prefs.dyslexiaFont, toggleDyslexiaFont)}
        </Stack>

        <Divider sx={{mb: 2}} />

        {/* Text to speech */}
        <Typography variant="subtitle2" sx={{mb: 1, fontWeight: 600}}>
          Lectura por voz
        </Typography>
        {isSpeechSupported() ? (
          <>
            {switchRow('Leer al hacer clic', prefs.ttsEnabled, toggleTts)}
            <Stack direction="row" spacing={1} sx={{mt: 1}}>
              <Box
                component="button"
                onMouseDown={(e: ReactMouseEvent) => e.preventDefault()}
                onClick={readSelection}
                sx={btnStyle}
              >
                <VolumeUpIcon fontSize="small" /> Leer selección
              </Box>
              <Box component="button" onClick={stopSpeaking} sx={btnStyle}>
                <StopCircleIcon fontSize="small" /> Detener
              </Box>
            </Stack>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Tu navegador no admite lectura por voz.
          </Typography>
        )}

        <Divider sx={{my: 2}} />

        <Box
          component="button"
          onClick={resetAll}
          sx={{...btnStyle, width: '100%', justifyContent: 'center', borderColor: '#12457d', color: '#12457d'}}
        >
          <RestartAltIcon fontSize="small" /> Restablecer todo
        </Box>
        </Box>
      </Drawer>

      <Menu
        open={ctxMenu !== null}
        onClose={() => setCtxMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={ctxMenu ? {top: ctxMenu.mouseY, left: ctxMenu.mouseX} : undefined}
      >
        <MenuItem
          onClick={() => {
            if (ctxMenu) speak(ctxMenu.text);
            setCtxMenu(null);
          }}
        >
          <ListItemIcon>
            <VolumeUpIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Leer en voz alta</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}

const btnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.5,
  flex: 1,
  justifyContent: 'center',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '0.85rem',
  padding: '8px 10px',
  borderRadius: '8px',
  border: '1px solid #ddd',
  backgroundColor: 'transparent',
  color: '#444',
} as const;
