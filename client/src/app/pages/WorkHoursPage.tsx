import { Container, Box, Button, Typography, Stack, TextField, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Alert, MenuItem } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useRecords } from '../../context/RecordsContext';

interface HourRow {
  id: number;
  dia: string;
  taskType: 'propias' | 'apoyo' | 'otros';
  startTime: string;
  endTime: string;
  hours: number;
  minutes: number;
}

export default function WorkHoursPage() {
  const navigate = useNavigate();
  const { currentRecord, saveRecord } = useRecords();
  const [objective, setObjective] = useState(currentRecord?.objective || '');
  const [hourRows, setHourRows] = useState<HourRow[]>(
    currentRecord?.hours && currentRecord.hours.length > 0
      ? currentRecord.hours
      : [{ id: 1, dia: 'Lunes', taskType: 'propias', startTime: '', endTime: '', hours: 0, minutes: 0 }]
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleAddRow = () => {
    const newId = Math.max(...hourRows.map(r => r.id), 0) + 1;
    setHourRows([...hourRows, { id: newId, dia: '', taskType: 'propias', startTime: '', endTime: '', hours: 0, minutes: 0 }]);
  };

  const handleDeleteRow = (id: number) => {
    if (hourRows.length > 1) {
      setHourRows(hourRows.filter(row => row.id !== id));
    }
  };

  const calculateHoursAndMinutes = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return { hours: 0, minutes: 0 };

    const [hI, mI] = startTime.split(':').map(Number);
    const [hF, mF] = endTime.split(':').map(Number);

    const totalMinutes = (hF * 60 + mF) - (hI * 60 + mI);
    
    if (totalMinutes < 0) return { hours: 0, minutes: 0 };

    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
    };
  };

  const handleRowChange = (id: number, field: string, value: string | number) => {
    setHourRows(hourRows.map(row => {
      if (row.id === id) {
        const newRow = { ...row, [field]: value };
        // Calculate hours and minutes automatically
        if (field === 'startTime' || field === 'endTime') {
          const { hours, minutes } = calculateHoursAndMinutes(newRow.startTime, newRow.endTime);
          // Limit to maximum 60 hours
          if (hours > 60) {
            newRow.hours = 60;
            newRow.minutes = 0;
          } else {
            newRow.hours = hours;
            newRow.minutes = minutes;
          }
        }
        return newRow;
      }
      return row;
    }));
  };

  const handleCompleteRecord = async () => {
    if (!currentRecord) {
      setMessage('Error: No hay datos del formulario previo');
      return;
    }

    if (!objective.trim()) {
      setMessage('Error: El objetivo del puesto es requerido');
      return;
    }

    setIsSaving(true);
    try {
      const recordComplete = {
        ...currentRecord,
        objective,
        isRead: currentRecord?.isRead ?? false,
        hours: hourRows,
      };

      await saveRecord(recordComplete);
      setMessage('✓ Registro guardado exitosamente');
      
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      setMessage('Error al guardar el registro: ' + String(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Título */}
        <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 'bold', color: '#12457d', textAlign: 'center' }}>
          Cargas de Trabajo
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 4, color: '#666', textAlign: 'center' }}>
          Diagnóstico de Cargas de trabajo
        </Typography>

        {/* Objetivo del Puesto */}
        <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 4, backgroundColor: '#f9f9fd' }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: '600', color: '#12457d' }}>
            Indique el objetivo del puesto:
          </Typography>
          <TextField
            fullWidth
            name="objetivo"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Garantizar la calidad, seguridad y cumplimiento normativo en el uso de las radiaciones ionizantes..."
            variant="outlined"
            multiline
            rows={5}
            error={!objective.trim()}
            helperText={!objective.trim() ? 'El objetivo es requerido' : ''}
            sx={{ backgroundColor: 'white' }}
          />
          <Box sx={{ mt: 2, p: 2, backgroundColor: '#e8f4f8', borderRadius: '4px' }}>
            <Typography variant="caption" sx={{ color: '#0066cc', fontWeight: '600' }}>
              ℹ️ El sistema convertirá las horas automáticamente en minutos
            </Typography>
          </Box>
        </Paper>

        {/* Tabla de Tareas y Horas */}
        <Paper sx={{ backgroundColor: '#f9f9fd' }}>
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: '600', color: '#12457d' }}>
              Tareas:
            </Typography>

            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 720 }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#e8f4f8' }}>
                    <TableCell sx={{ fontWeight: 'bold', color: '#12457d' }}>Día</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#12457d' }}>Tipo de Tarea</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#12457d' }}>Hora Inicio</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#12457d' }}>Hora Final</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#12457d' }} align="center">Horas : Minutos</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', color: '#12457d' }}>Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {hourRows.map((row) => (
                    <TableRow key={row.id} sx={{ backgroundColor: '#fafafa', '&:hover': { backgroundColor: '#f5f5f5' } }}>
                      <TableCell sx={{ maxWidth: 100 }}>
                        <TextField
                          size="small"
                          value={row.dia}
                          onChange={(e) => handleRowChange(row.id, 'dia', e.target.value)}
                          placeholder="Lunes"
                          variant="outlined"
                          sx={{ width: '100%', backgroundColor: 'white' }}
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 120 }}>
                        <TextField
                          select
                          size="small"
                          value={row.taskType}
                          onChange={(e) => handleRowChange(row.id, 'taskType', e.target.value)}
                          variant="outlined"
                          sx={{ width: '100%', backgroundColor: 'white' }}
                        >
                          <MenuItem value="propias">Propias</MenuItem>
                          <MenuItem value="apoyo">De apoyo</MenuItem>
                          <MenuItem value="otros">Otros</MenuItem>
                        </TextField>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 100 }}>
                        <TextField
                          size="small"
                          type="time"
                          value={row.startTime}
                          onChange={(e) => handleRowChange(row.id, 'startTime', e.target.value)}
                          variant="outlined"
                          inputProps={{ step: 300 }}
                          sx={{ backgroundColor: 'white', width: '100%' }}
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 100 }}>
                        <TextField
                          size="small"
                          type="time"
                          value={row.endTime}
                          onChange={(e) => handleRowChange(row.id, 'endTime', e.target.value)}
                          variant="outlined"
                          inputProps={{ step: 300 }}
                          sx={{ backgroundColor: 'white', width: '100%' }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: '600', color: '#12457d', textAlign: 'center' }}>
                        {row.hours}h : {row.minutes}m
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteRow(row.id)}
                          disabled={hourRows.length === 1}
                          sx={{ color: '#d32f2f' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Botón Agregar Fila */}
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddRow}
              sx={{
                mt: 2,
                color: '#12457d',
                borderColor: '#12457d',
                '&:hover': { backgroundColor: '#e8f4f8' },
              }}
            >
              Agregar fila
            </Button>
          </Box>
        </Paper>

        {/* Mensaje de Guardado */}
        {message && (
          <Alert severity={message.includes('Error') ? 'error' : 'success'} sx={{ mt: 3 }}>
            {message}
          </Alert>
        )}

        {/* Botones de Navegación */}
        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={2} sx={{ justifyContent: 'center', mt: 4 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/employee-form')}
            sx={{ color: '#12457d', borderColor: '#12457d' }}
          >
            Atrás
          </Button>
          <Button
            variant="contained"
            endIcon={<CheckCircleIcon />}
            onClick={handleCompleteRecord}
            disabled={isSaving || !objective.trim()}
            sx={{
              backgroundColor: '#2c2c2c',
              '&:hover': {
                backgroundColor: '#1a1a1a',
              },
            }}
          >
            {isSaving ? 'Guardando...' : 'Completar'}
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}
