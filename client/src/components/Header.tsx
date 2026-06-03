import { Box, Typography, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

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
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <Typography
          sx={{
            color: '#b8c8dc',
            fontFamily: 'Cicero, serif',
            fontWeight: 400,
            fontSize: { xs: '1.6rem', sm: '2.4rem' },
            letterSpacing: '0.00em',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          UCR
        </Typography>
        {/* Arc underline */}
        <Box
          sx={{
            height: { xs: 6, sm: 10 },
            mt: '3px',
            borderBottom: '2.5px solid #b8c8dc',
            borderBottomLeftRadius: '50%',
            borderBottomRightRadius: '50%',
          }}
        />
      </Box>

      {/* VRA + Vicerrectoría de Administración */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
        <Box>
          <Typography
            sx={{
              color: 'white',
              fontWeight: 700,
              fontSize: { xs: '1.6rem', sm: '2.4rem' },
              letterSpacing: '0.08em',
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            VRA
          </Typography>
          <Box sx={{ height: '2px', bgcolor: 'white', mt: '5px' }} />
        </Box>

        <Box sx={{ ml: 0.5, display: { xs: 'none', sm: 'block' } }}>
          <Typography sx={{ color: 'white', fontSize: '0.8rem', fontWeight: 400, lineHeight: 1.4 }}>
            Vicerrectoría de
          </Typography>
          <Typography sx={{ color: 'white', fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.4 }}>
            Administración
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
