import {useState} from 'react';

import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
} from '@mui/material';
import {
  Clear as ClearIcon,
  FilterAlt as FilterIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

import {STATUS_TRANSLATIONS} from '../../../services/declarationConstants';

interface DeclarationsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

const STATUS_OPTIONS = [
  {value: 'all', label: 'Todos'},
  ...Object.entries(STATUS_TRANSLATIONS).map(([value, label]) => ({
    value,
    label,
  })),
];

export default function DeclarationsToolbar(
  {
    search,
    onSearchChange,
    status,
    onStatusChange,
    onClearFilters,
    hasActiveFilters,
  }: DeclarationsToolbarProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: {xs: 'column', sm: 'row'},
          gap: 2,
          alignItems: {xs: 'stretch', sm: 'center'},
        }}
      >
        <TextField
          placeholder="Buscar por usuario o puesto..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          size="small"
          sx={{
            flex: 1,
            minWidth: {xs: '100%', sm: 250},
            bgcolor: 'background.paper',
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action"/>
                </InputAdornment>
              ),
              endAdornment: search && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => onSearchChange('')} aria-label="Limpiar búsqueda">
                    <ClearIcon fontSize="small"/>
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap'}}>
          <Button
            variant={showFilters ? 'contained' : 'outlined'}
            onClick={() => setShowFilters(!showFilters)}
            startIcon={<FilterIcon/>}
            size="small"
            color="primary"
          >
            Filtros
            {hasActiveFilters && (
              <Chip
                label="•"
                size="small"
                sx={{
                  ml: 0.5,
                  bgcolor: showFilters ? 'primary.contrastText' : 'primary.main',
                  color: showFilters ? 'primary.main' : 'primary.contrastText',
                  borderRadius: '50%',
                  width: 18,
                  height: 18,
                  '& .MuiChip-label': {px: 0, fontSize: 14},
                }}
              />
            )}
          </Button>

          {hasActiveFilters && (
            <Button
              variant="text"
              color="inherit"
              onClick={onClearFilters}
              size="small"
              startIcon={<ClearIcon/>}
            >
              Limpiar
            </Button>
          )}
        </Box>
      </Box>

      {showFilters && (
        <Box
          sx={{
            mt: 2,
            pt: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{maxWidth: 300}}>
            <TextField
              select
              label="Estado"
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              size="small"
              fullWidth
            >
              {STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </Box>
      )}
    </Box>
  );
}