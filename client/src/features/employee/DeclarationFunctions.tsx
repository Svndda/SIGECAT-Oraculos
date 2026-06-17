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
import ModalForm from '../../components/modals/ModalForm';

interface CustomFunctionForm {
  name: string;
  description: string;
  execution_time: string;
}

const EMPTY_CUSTOM_FORM: CustomFunctionForm = { name: '', description: '', execution_time: '' };

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
  const [inputValue, setInputValue] = useState('');

  const [declared, setDeclared] = useState<DeclaredFunction[]>([]);

  // Story 1: create a function that is not in the catalogue.
  const [createOpen, setCreateOpen] = useState(false);
  const [customForm, setCustomForm] = useState<CustomFunctionForm>(EMPTY_CUSTOM_FORM);
  const [customErrors, setCustomErrors] = useState<Partial<Record<keyof CustomFunctionForm, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorState, setErrorState] = useState({ open: false, title: '', message: '' });

  // The function is "inexistente" when a non-empty search returns no catalogue match.
  const canCreateCustom = inputValue.trim() !== '' && !loadingCatalog && catalog.length === 0;

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

  // Story 1: open the create form, prefilled with the searched name.
  const openCreate = () => {
    setCustomForm({ ...EMPTY_CUSTOM_FORM, name: inputValue.trim() });
    setCustomErrors({});
    setCreateOpen(true);
  };

  const setCustomField = (field: keyof CustomFunctionForm, value: string) => {
    setCustomForm((prev) => ({ ...prev, [field]: value }));
    if (customErrors[field]) setCustomErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateCustom = (): boolean => {
    const errors: Partial<Record<keyof CustomFunctionForm, string>> = {};
    if (!customForm.name.trim()) errors.name = 'El nombre es requerido.';
    if (!customForm.description.trim()) errors.description = 'La descripción es requerida.';
    if (customForm.execution_time.trim() === '') {
      errors.execution_time = 'El tiempo de ejecución es requerido.';
    } else {
      const n = Number(customForm.execution_time);
      if (!Number.isFinite(n) || n <= 0) errors.execution_time = 'Debe ser un número de minutos mayor a 0.';
    }
    setCustomErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateCustom = async () => {
    if (!validateCustom()) return;
    setIsSubmitting(true);
    try {
      const created = await employeeFunctionService.createCustomFunction({
        name: customForm.name,
        description: customForm.description,
        execution_time: Number(customForm.execution_time),
      });
      setCreateOpen(false);
      addToDeclaration(created);
    } catch (error) {
      const e = error as ServiceError;
      setErrorState({ open: true, title: 'Error al crear', message: e.message ?? 'Error del servidor.' });
    } finally {
      setIsSubmitting(false);
    }
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
          onInputChange={(_, value) => {
            setInputValue(value);
            handleSearch(value);
          }}
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

      {/* Story 1: offer to create the function only when it is not in the catalogue */}
      {canCreateCustom && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'inline', mr: 1 }}>
            "{inputValue.trim()}" no está en el catálogo.
          </Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={openCreate} sx={{ color: '#12457d' }}>
            Crear función nueva
          </Button>
        </Box>
      )}

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

      <ModalForm
        open={createOpen}
        title="Crear función nueva"
        confirmLabel="Crear"
        isSubmitting={isSubmitting}
        onClose={() => setCreateOpen(false)}
        onConfirm={handleCreateCustom}
      >
        <Stack spacing={2.5}>
          <TextField
            label="Nombre"
            value={customForm.name}
            onChange={(e) => setCustomField('name', e.target.value)}
            error={!!customErrors.name}
            helperText={customErrors.name}
            size="small"
            fullWidth
            required
          />
          <TextField
            label="Descripción"
            value={customForm.description}
            onChange={(e) => setCustomField('description', e.target.value)}
            error={!!customErrors.description}
            helperText={customErrors.description}
            size="small"
            fullWidth
            multiline
            rows={3}
            required
          />
          <TextField
            label="Tiempo de ejecución (minutos)"
            value={customForm.execution_time}
            onChange={(e) => setCustomField('execution_time', e.target.value)}
            error={!!customErrors.execution_time}
            helperText={customErrors.execution_time}
            size="small"
            fullWidth
            type="number"
            inputProps={{ min: 1 }}
            required
          />
        </Stack>
      </ModalForm>

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
