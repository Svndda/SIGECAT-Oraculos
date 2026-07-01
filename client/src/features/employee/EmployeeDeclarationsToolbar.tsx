import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';

interface EmployeeDeclarationsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onCreateClick: () => void;
}

export default function EmployeeDeclarationsToolbar({
  search,
  onSearchChange,
  onCreateClick,
}: EmployeeDeclarationsToolbarProps) {
  return (
    <>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, color: '#1a1a1a' }}>
        Mis Declaraciones
      </Typography>

      <Box sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 2,
        mb: 3
      }}>
        <TextField
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por cargo"
          size="small"
          sx={{
            width: { xs: '100%', sm: 300 },
            backgroundColor: 'white',
            borderRadius: 1
          }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon sx={{ color: '#999', fontSize: 20 }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <Box sx={{ flex: 1, display: { xs: 'none', sm: 'block' } }} />
        <Button
          variant="contained"
          onClick={onCreateClick}
          sx={{
            backgroundColor: '#1a2b4a',
            '&:hover': { backgroundColor: '#111d33' },
            px: 3,
            fontWeight: 600,
            textTransform: 'none',
            fontSize: '0.9rem',
          }}
        >
          Crear Declaración
        </Button>
      </Box>
    </>
  );
}