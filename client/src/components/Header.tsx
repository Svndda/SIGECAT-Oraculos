import { Box, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ucrLogo from '../../public/assets/ucr_logo.svg';
import vraLogo from '../../public/assets/VRA_logo.svg';

interface HeaderProps {
  /** When provided, shows a hamburger button (mobile only) to open the nav drawer. */
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <Box
      component="header"
      sx={{
        backgroundColor: '#1565c0',
        px: { xs: 2, sm: 4 },
        py: { xs: 1.25, sm: 2 },
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1.5, sm: 5 },
        flexShrink: 0,
        flexWrap: 'wrap',
      }}
    >
      {/* Mobile nav toggle (only inside the authenticated layout) */}
      {onMenuClick && (
        <IconButton
          onClick={onMenuClick}
          aria-label="Abrir menú"
          sx={{ color: 'white', display: { md: 'none' }, mr: -0.5 }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* UCR */}
      <Box         
        component="img"
        src={ucrLogo}
        alt="UCR"
        sx={{
          height: { xs: 35, sm: 55 },
          width: 'auto',
          flexShrink: 0,
        }}
      />

      {/* VRA + Vicerrectoría de Administración */}
      <Box 
        component="img"
        src={vraLogo}
        alt="VRA"
        sx={{
          height: { xs: 35, sm: 55 },
          width: 'auto',
          flexShrink: 0,
        }}
      />
    </Box>
  );
}
