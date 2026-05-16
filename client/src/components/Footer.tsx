import { Box, Typography, Link, IconButton } from '@mui/material';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';

export default function Footer() {
  return (
    <Box component="footer" sx={{ backgroundColor: '#2c2c2c', flexShrink: 0 }}>
      {/* Main footer content */}
      <Box
        sx={{
          px: { xs: 2.5, sm: 5 },
          py: { xs: 3, sm: 4 },
          display: 'flex',
          gap: { xs: 3, sm: 6 },
          flexWrap: 'wrap',
        }}
      >
        {/* Left: brand + social */}
        <Box sx={{ minWidth: 180 }}>
          <Typography
            sx={{
              color: 'white',
              fontFamily: 'Cicero, serif',
              fontWeight: 400,
              fontSize: '1.1rem',
              letterSpacing: '0.05em',
              lineHeight: 1.3,
              mb: 1.5,
            }}
          >
            Universidad de Costa Rica
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              size="small"
              aria-label="Instagram"
              sx={{
                color: 'white',
                border: '1px solid rgba(255,255,255,0.4)',
                p: 0.5,
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
              }}
            >
              <InstagramIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton
              size="small"
              aria-label="Facebook"
              sx={{
                color: 'white',
                border: '1px solid rgba(255,255,255,0.4)',
                p: 0.5,
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
              }}
            >
              <FacebookIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Center: contact */}
        <Box>
          <Typography
            variant="subtitle2"
            sx={{ color: 'white', fontWeight: 600, mb: 1.5, letterSpacing: 0.5 }}
          >
            Contacto
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
            Piso 7, Edificio Administrativo A,
            <br />
            Sede Rodrigo Facio
          </Typography>
        </Box>

        {/* Right: quick links */}
        <Box>
          <Typography
            variant="subtitle2"
            sx={{ color: 'white', fontWeight: 600, mb: 1.5, letterSpacing: 0.5 }}
          >
            Enlaces rápidos
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {['Portal UCR', 'Matrícula Web', 'Soporte Técnico'].map((label) => (
              <Link
                key={label}
                underline="hover"
                sx={{
                  color: 'rgba(255,255,255,0.65)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  '&:hover': { color: 'white' },
                }}
              >
                {label}
              </Link>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Copyright strip */}
      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', px: { xs: 2.5, sm: 5 }, py: 1.5 }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)' }}>
          © Vicerrectoría de Administración, 2026.
        </Typography>
      </Box>
    </Box>
  );
}
