import { useState } from 'react';
import {
  Box, Paper, Stack, Typography, Autocomplete, TextField, Button,
  List, ListItem, ListItemText, IconButton, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { employeeFunctionService, type CatalogFunction } from '../../services/employeeFunctionService';
import type { ServiceError } from '../../services/common';
import ModalSuccess from '../../components/modals/ModalSuccess';
import ModalError from '../../components/modals/ModalError';

/** A function the employee added to their workday declaration. */
export interface DeclaredFunction {
  id: string;
  name: string;
  description: string | null;
  is_custom: boolean;
}

export default function DeclarationFunctions() {
  const [catalog, setCatalog] = useState<CatalogFunction[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [selected, setSelected] = useState<CatalogFunction | null>(null);

  const [declared, setDeclared] = useState<DeclaredFunction[]>([]);

  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorState, setErrorState] = useState({ open: false, title: '', message: '' });

  // Story 2: search the unit's function catalogue.
  const handleSearch = (query: string) => {
    setLoadingCatalog(true);
    employeeFunctionService
      .searchCatalog(query)
      .then(setCatalog)
      .catch((error) => {
        const e = error as ServiceError;
        setErrorState({ open: true, title: 'Error al buscar', message: e.message ?? 'Error del servidor.' });
      })
      .finally(() => setLoadingCatalog(false));
  };

  const addToDeclaration = (fn: CatalogFunction) => {
    if (declared.some((d) => d.id === fn.id)) {
      setErrorState({ open: true, title: 'Función repetida', message: 'Esa función ya está en tu lista.' });
      return;
    }
    setDeclared((prev) => [
      ...prev,
      { id: fn.id, name: fn.name, description: fn.description, is_custom: fn.is_custom },
    ]);
    setSelected(null);
    setSuccessMsg(`Función "${fn.name}" agregada a tu jornada.`);
    setSuccessOpen(true);
  };

  const removeFromDeclaration = (id: string) => {
    setDeclared((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 4, backgroundColor: '#f9f9fd' }}>
      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: '#12457d' }}>
        Funciones de la jornada
      </Typography>

      {/* Story 2: search the catalogue and add */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Autocomplete
          sx={{ flex: 1, backgroundColor: 'white' }}
          options={catalog}
          loading={loadingCatalog}
          value={selected}
          onChange={(_, value) => setSelected(value)}
          onInputChange={(_, value) => handleSearch(value)}
          getOptionLabel={(o) => o.name}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          noOptionsText="No se encontraron funciones en el catálogo."
          renderInput={(params) => (
            <TextField {...params} size="small" placeholder="Buscar función en el catálogo de la unidad..." />
          )}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={!selected}
          onClick={() => selected && addToDeclaration(selected)}
          sx={{ backgroundColor: '#2c2c2c', '&:hover': { backgroundColor: '#1a1a1a' } }}
        >
          Agregar
        </Button>
      </Stack>

      {/* Declared functions */}
      {declared.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          Aún no has agregado funciones a tu jornada.
        </Typography>
      ) : (
        <List dense disablePadding>
          {declared.map((d) => (
            <ListItem
              key={d.id}
              sx={{ backgroundColor: 'white', borderRadius: 1, mb: 1 }}
              secondaryAction={
                <IconButton edge="end" size="small" onClick={() => removeFromDeclaration(d.id)} sx={{ color: '#d32f2f' }}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {d.name}
                    {d.is_custom && <Chip label="Personalizada" size="small" color="primary" variant="outlined" />}
                  </Box>
                }
                secondary={d.description ?? undefined}
              />
            </ListItem>
          ))}
        </List>
      )}

      <ModalSuccess
        open={successOpen}
        title="Operación exitosa"
        message={successMsg}
        onClose={() => setSuccessOpen(false)}
      />
      <ModalError
        open={errorState.open}
        title={errorState.title}
        message={errorState.message}
        onClose={() => setErrorState((p) => ({ ...p, open: false }))}
      />
    </Paper>
  );
}
