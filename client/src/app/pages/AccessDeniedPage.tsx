
  import { Box, Typography, Button } from '@mui/material';
  import { useNavigate } from 'react-router-dom';

  export default function AccessDeniedPage() {
    const navigate = useNavigate();

    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Typography variant="h3" fontWeight="bold">
          403
        </Typography>

        <Typography variant="h6">
          No tienes permisos para acceder a esta página.
        </Typography>

        <Button
          variant="contained"
          onClick={() => navigate('/')}
        >
          Volver al inicio
        </Button>
      </Box>
    );
  }