import {
  Box,
  Button,
  InputAdornment,
  TextField,
  Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface FunctionToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onAddClick: () => void;
}

export default function FunctionToolbar(
  {
    search,
    onSearchChange,
    onAddClick
  }: FunctionToolbarProps) {
  return (
    <>
      <Typography variant="h5" fontWeight="bold" sx={{mb: 3, color: '#1a1a1a'}}>
        Funciones
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
        <Box sx={{flex: 1, display: {xs: 'none', sm: 'block'}}}/>
        <Button
          variant="contained"
          onClick={onAddClick}
          sx={{
            backgroundColor: '#1a2b4a',
            '&:hover': {backgroundColor: '#111d33'},
            px: 3,
            fontWeight: 600,
            textTransform: 'none'
          }}
        >
          Añadir Función
        </Button>
      </Box>
    </>
  );
}
