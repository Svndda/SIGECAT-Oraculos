import { useEffect, useMemo, useState } from 'react';
import { Box, Paper, Stack, Typography, TextField, MenuItem } from '@mui/material';
import { employeeWorkdayService, type WorkdayMagnitude } from '../../services/employeeWorkdayService';
import type { ServiceError } from '../../services/common';
import ModalError from '../../components/modals/ModalError';

export default function DeclarationWorkday() {
  const [magnitudes, setMagnitudes] = useState<WorkdayMagnitude[]>([]);
  const [magnitudeId, setMagnitudeId] = useState('');

  const [errorState, setErrorState] = useState({ open: false, title: '', message: '' });

  useEffect(() => {
    employeeWorkdayService
      .getMagnitudes()
      .then(setMagnitudes)
      .catch((error) => {
        const e = error as ServiceError;
        setErrorState({ open: true, title: 'Error al cargar', message: e.message ?? 'Error del servidor.' });
      });
  }, []);

  // Story 6: the chosen magnitude defines the weekly and overtime limits.
  const selected = useMemo(() => magnitudes.find((m) => m.id === magnitudeId) ?? null, [magnitudes, magnitudeId]);

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 4, backgroundColor: '#f9f9fd' }}>
      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: '#12457d' }}>
        Jornada laboral
      </Typography>

      <TextField
        select
        label="Magnitud de la jornada"
        value={magnitudeId}
        onChange={(e) => setMagnitudeId(e.target.value)}
        size="small"
        fullWidth
        sx={{ backgroundColor: 'white', maxWidth: 360 }}
      >
        {magnitudes.map((m) => (
          <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
        ))}
      </TextField>

      {selected && (
        <Box sx={{ mt: 2, p: 2, backgroundColor: '#e8f4f8', borderRadius: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 4 }}>
            <Typography variant="body2" sx={{ color: '#0066cc' }}>
              Límite semanal: <strong>{selected.weeklyHours} h</strong>
            </Typography>
            <Typography variant="body2" sx={{ color: '#0066cc' }}>
              Tiempo extraordinario máximo: <strong>{selected.overtimeHours} h</strong>
            </Typography>
          </Stack>
        </Box>
      )}

      <ModalError
        open={errorState.open}
        title={errorState.title}
        message={errorState.message}
        onClose={() => setErrorState((p) => ({ ...p, open: false }))}
      />
    </Paper>
  );
}
