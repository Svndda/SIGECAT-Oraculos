import { useState } from 'react';
import {
  Box, Paper, Stack, Typography, Autocomplete, TextField, Button, IconButton, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { employeeFunctionService, type CatalogFunction } from '../../services/employeeFunctionService';
import type { ServiceError } from '../../services/common';
import ModalForm from '../../components/modals/ModalForm';
import { useSnackbar } from '../../context/SnackbarContext';

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
  /** Weekly time dedicated to the function, in minutes. */
  minutes: number;
  /** Extraordinary (overtime) minutes for the function. */
  overtime_minutes: number;
  /** Reason/detail for the overtime; required when overtime_minutes > 0. */
  justification: string;
}

/** Formats a minutes amount as "Xh Ym" for the weekly total. */
function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
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

  const snackbar = useSnackbar();

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
        snackbar.error(e.message ?? 'Error del servidor.');
      })
      .finally(() => setLoadingCatalog(false));
  };

  const addToDeclaration = (fn: CatalogFunction) => {
    if (declared.some((d) => d.id === fn.id)) {
      snackbar.error('Esa función ya está en tu lista.');
      return;
    }
    setDeclared((prev) => [
      ...prev,
      {
        id: fn.id, name: fn.name, description: fn.description, is_custom: fn.is_custom,
        minutes: fn.expected_time ?? 0, overtime_minutes: 0, justification: '',
      },
    ]);
    setSelected(null);
    snackbar.success(`Función "${fn.name}" agregada a tu jornada.`);
  };

  const removeFromDeclaration = (id: string) => {
    setDeclared((prev) => prev.filter((d) => d.id !== id));
  };

  // Parses a minutes input into a non-negative integer (empty/invalid -> 0).
  const parseMinutes = (raw: string): number => {
    const n = Math.trunc(Number(raw));
    return raw.trim() === '' || !Number.isFinite(n) || n < 0 ? 0 : n;
  };

  // Story 4: assign/edit the weekly minutes of a function (the time is in minutes).
  const updateMinutes = (id: string, raw: string) => {
    const minutes = parseMinutes(raw);
    setDeclared((prev) => prev.map((d) => (d.id === id ? { ...d, minutes } : d)));
  };

  // Story 5: extraordinary minutes and their justification.
  const updateOvertime = (id: string, raw: string) => {
    const overtime_minutes = parseMinutes(raw);
    setDeclared((prev) => prev.map((d) => (d.id === id ? { ...d, overtime_minutes } : d)));
  };

  const updateJustification = (id: string, justification: string) => {
    setDeclared((prev) => prev.map((d) => (d.id === id ? { ...d, justification } : d)));
  };

  const totalMinutes = declared.reduce((sum, d) => sum + d.minutes, 0);

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
      snackbar.error(e.message ?? 'Error del servidor.');
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
        <Stack spacing={1.5}>
          {declared.map((d) => {
            const needsJustification = d.overtime_minutes > 0 && d.justification.trim() === '';
            return (
              <Paper key={d.id} variant="outlined" sx={{ p: 2, backgroundColor: 'white' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontWeight: 600 }}>{d.name}</Typography>
                      {d.is_custom && <Chip label="Personalizada" size="small" color="primary" variant="outlined" />}
                    </Box>
                    {d.description && (
                      <Typography variant="body2" color="text.secondary">{d.description}</Typography>
                    )}
                  </Box>
                  <IconButton size="small" onClick={() => removeFromDeclaration(d.id)} sx={{ color: '#d32f2f' }}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1.5 }}>
                  {/* Story 4: regular weekly minutes */}
                  <TextField
                    label="Minutos / semana"
                    type="number"
                    size="small"
                    value={d.minutes === 0 ? '' : d.minutes}
                    onChange={(e) => updateMinutes(d.id, e.target.value)}
                    inputProps={{ min: 0, step: 5 }}
                    sx={{ width: 160 }}
                  />
                  {/* Story 5: extraordinary minutes */}
                  <TextField
                    label="Minutos extra"
                    type="number"
                    size="small"
                    value={d.overtime_minutes === 0 ? '' : d.overtime_minutes}
                    onChange={(e) => updateOvertime(d.id, e.target.value)}
                    inputProps={{ min: 0, step: 5 }}
                    sx={{ width: 160 }}
                  />
                </Stack>

                {/* Story 5: justification, required when there are overtime minutes */}
                {d.overtime_minutes > 0 && (
                  <TextField
                    label="Justificación del tiempo extraordinario"
                    value={d.justification}
                    onChange={(e) => updateJustification(d.id, e.target.value)}
                    error={needsJustification}
                    helperText={needsJustification ? 'La justificación es obligatoria si hay tiempo extraordinario.' : undefined}
                    size="small"
                    fullWidth
                    multiline
                    rows={2}
                    required
                    sx={{ mt: 1.5 }}
                  />
                )}
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* Story 4: weekly workload total (time handled in minutes) */}
      {declared.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, pt: 1, borderTop: '1px solid #e0e0e0' }}>
          <Typography variant="caption" color="text.secondary">
            El tiempo se registra en minutos.
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#12457d' }}>
            Carga semanal: {totalMinutes} min ({formatMinutes(totalMinutes)})
          </Typography>
        </Box>
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
    </Paper>
  );
}
