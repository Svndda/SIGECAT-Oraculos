import {
  Box,
  InputAdornment,
  TextField,
  Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface CustomFunctionToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export default function CustomFunctionToolbar({
  search,
  onSearchChange
}: CustomFunctionToolbarProps) {
  return (
    <>
      <Typography variant="h5" fontWeight="bold" sx={{mb: 1, color: '#1a1a1a'}}>
        Funciones Personalizadas
      </Typography>
      <Typography variant="body2" sx={{mb: 3, color: '#666'}}>
        Funciones que los funcionarios registran en sus declaraciones (solo consulta).
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
          placeholder="Buscar por nombre"
          size="small"
          sx={{
            width: {xs: '100%', sm: 280},
            backgroundColor: 'white',
            borderRadius: 1
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <SearchIcon sx={{color: '#999', fontSize: 20}}/>
              </InputAdornment>
            ),
          }}
        />
      </Box>
    </>
  );
}
