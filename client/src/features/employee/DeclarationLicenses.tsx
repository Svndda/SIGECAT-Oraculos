import { useEffect, useState } from 'react';
import {
  Box, Paper, Stack, Typography, TextField, MenuItem, Button, IconButton, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { employeeLicenseService, type LicenseType } from '../../services/employeeLicenseService';
import type { ServiceError } from '../../services/common';
import { useSnackbar } from '../../context/SnackbarContext';

/** A permit/license the employee added to their declaration (maps to LICENSE_TIMES). */
interface DeclaredLicense {
  id: string;
  typeId: string;
  typeName: string;
  hours: number;
}

export default function DeclarationLicenses() {
  const [types, setTypes] = useState<LicenseType[]>([]);
  const [licenses, setLicenses] = useState<DeclaredLicense[]>([]);

  const [typeId, setTypeId] = useState('');
  const [hours, setHours] = useState('');
  const [errors, setErrors] = useState<{ typeId?: string; hours?: string }>({});

  const snackbar = useSnackbar();

  useEffect(() => {
    employeeLicenseService
      .getLicenseTypes()
      .then(setTypes)
      .catch((error) => {
        const e = error as ServiceError;
        snackbar.error(e.message ?? 'Error del servidor.');
      });
  }, [snackbar]);

  const validate = (): boolean => {
    const next: { typeId?: string; hours?: string } = {};
    if (!typeId) next.typeId = 'Seleccione el tipo de permiso/licencia.';
    const n = Number(hours);
    if (hours.trim() === '') next.hours = 'Las horas semanales son requeridas.';
    else if (!Number.isFinite(n) || n <= 0) next.hours = 'Debe ser un número de horas mayor a 0.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleAdd = () => {
    if (!validate()) return;
    try {
      const type = types.find((t) => t.id === typeId);
      setLicenses((prev) => [
        ...prev,
        { id: `${typeId}-${Date.now()}`, typeId, typeName: type?.name ?? typeId, hours: Number(hours) },
      ]);
      setTypeId('');
      setHours('');
      setErrors({});
      snackbar.success('Permiso/licencia registrado correctamente.');
    } catch (error) {
      const e = error as ServiceError;
      snackbar.error(e.message ?? 'Error del servidor.');
    }
  };

  const remove = (id: string) => setLicenses((prev) => prev.filter((l) => l.id !== id));

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 4, backgroundColor: '#f9f9fd' }}>
      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: '#12457d' }}>
        Permisos y licencias
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          label="Tipo de permiso/licencia"
          value={typeId}
          onChange={(e) => {
            setTypeId(e.target.value);
            if (errors.typeId) setErrors((p) => ({ ...p, typeId: undefined }));
          }}
          error={!!errors.typeId}
          helperText={errors.typeId}
          size="small"
          sx={{ flex: 1, backgroundColor: 'white' }}
        >
          {types.map((t) => (
            <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="Horas / semana"
          type="number"
          value={hours}
          onChange={(e) => {
            setHours(e.target.value);
            if (errors.hours) setErrors((p) => ({ ...p, hours: undefined }));
          }}
          error={!!errors.hours}
          helperText={errors.hours}
          size="small"
          inputProps={{ min: 0, step: 0.5 }}
          sx={{ width: { xs: '100%', sm: 160 }, backgroundColor: 'white' }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{ backgroundColor: '#2c2c2c', '&:hover': { backgroundColor: '#1a1a1a' } }}
        >
          Agregar
        </Button>
      </Stack>

      {licenses.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          No has registrado permisos ni licencias.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {licenses.map((l) => (
            <Box
              key={l.id}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 1, px: 2, py: 1 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography>{l.typeName}</Typography>
                <Chip label={`${l.hours} h/sem`} size="small" variant="outlined" />
              </Box>
              <IconButton size="small" onClick={() => remove(l.id)} sx={{ color: '#d32f2f' }}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
