import { Container, Box, Button, Typography, Stack, TextField, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Alert, MenuItem } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useRegistros } from '../../context/RegistrosContext';

interface HoraRow {
  id: number;
  dia: string;
  tipoTarea: 'propias' | 'apoyo' | 'otros';
  horaInicio: string;
  horaFin: string;
  horas: number;
  minutos: number;
}

export default function Screen3() {
  const navigate = useNavigate();
  const { registroActual, guardarRegistro } = useRegistros();
  const [objetivo, setObjetivo] = useState(registroActual?.objetivo || '');
  const [estadoLeido, setEstadoLeido] = useState(registroActual?.estadoLeido === true);
  const [horasRows, setHorasRows] = useState<HoraRow[]>(
    registroActual?.horas && registroActual.horas.length > 0
      ? registroActual.horas
      : [{ id: 1, dia: 'Lunes', tipoTarea: 'propias', horaInicio: '', horaFin: '', horas: 0, minutos: 0 }]
  );
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const handleAgregarFila = () => {
    const newId = Math.max(...horasRows.map(r => r.id), 0) + 1;
    setHorasRows([...horasRows, { id: newId, dia: '', tipoTarea: 'propias', horaInicio: '', horaFin: '', horas: 0, minutos: 0 }]);
  };

  const handleEliminarFila = (id: number) => {
    if (horasRows.length > 1) {
      setHorasRows(horasRows.filter(row => row.id !== id));
    }
  };

  const calcularHorasYMinutos = (horaInicio: string, horaFin: string) => {
    if (!horaInicio || !horaFin) return { horas: 0, minutos: 0 };

    const [hI, mI] = horaInicio.split(':').map(Number);
    const [hF, mF] = horaFin.split(':').map(Number);

    const minutosTotales = (hF * 60 + mF) - (hI * 60 + mI);
    
    if (minutosTotales < 0) return { horas: 0, minutos: 0 };

    return {
      horas: Math.floor(minutosTotales / 60),
      minutos: minutosTotales % 60,
    };
  };

  const handleRowChange = (id: number, field: string, value: string | number) => {
    setHorasRows(horasRows.map(row => {
      if (row.id === id) {
        const newRow = { ...row, [field]: value };
        // Calcular horas y minutos automáticamente
        if (field === 'horaInicio' || field === 'horaFin') {
          const { horas, minutos } = calcularHorasYMinutos(newRow.horaInicio, newRow.horaFin);
          // Limitar a máximo 60 horas
          if (horas > 60) {
            newRow.horas = 60;
            newRow.minutos = 0;
          } else {
            newRow.horas = horas;
            newRow.minutos = minutos;
          }
        }
        return newRow;
      }
      return row;
    }));
  };

  const handleCompletarRegistro = async () => {
    if (!registroActual) {
      setMensaje('Error: No hay datos del formulario previo');
      return;
    }

    if (!objetivo.trim()) {
      setMensaje('Error: El objetivo del puesto es requerido');
      return;
    }

    setGuardando(true);
    try {
      const registroCompleto = {
        ...registroActual,
        objetivo,
        estadoLeido,
        horas: horasRows,
      };

      await guardarRegistro(registroCompleto);
      setMensaje('✓ Registro guardado exitosamente');
      
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      setMensaje('Error al guardar el registro: ' + String(error));
    } finally {
      setGuardando(false);
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

        {/* Botón Estado Leído */}
        <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: '600', color: '#12457d' }}>
              Estado de lectura:
            </Typography>
            <Button
              variant={estadoLeido ? "contained" : "outlined"}
              color={estadoLeido ? "success" : "inherit"}
              onClick={() => setEstadoLeido(!estadoLeido)}
              sx={{ minWidth: '150px' }}
            >
              {estadoLeido ? '✓ Se leyó' : 'Marcar como leído'}
            </Button>
          </Stack>
        </Box>

        {/* Objetivo del Puesto */}
        <Paper sx={{ p: 3, mb: 4, backgroundColor: '#f9f9fd' }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: '600', color: '#12457d' }}>
            Indique el objetivo del puesto:
          </Typography>
          <TextField
            fullWidth
            name="objetivo"
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            placeholder="Garantizar la calidad, seguridad y cumplimiento normativo en el uso de las radiaciones ionizantes..."
            variant="outlined"
            multiline
            rows={5}
            error={!objetivo.trim()}
            helperText={!objetivo.trim() ? 'El objetivo es requerido' : ''}
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
          <Box sx={{ p: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: '600', color: '#12457d' }}>
              Tareas:
            </Typography>

            <TableContainer>
              <Table size="small">
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
                  {horasRows.map((row) => (
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
                          value={row.tipoTarea}
                          onChange={(e) => handleRowChange(row.id, 'tipoTarea', e.target.value)}
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
                          value={row.horaInicio}
                          onChange={(e) => handleRowChange(row.id, 'horaInicio', e.target.value)}
                          variant="outlined"
                          inputProps={{ step: 300 }}
                          sx={{ backgroundColor: 'white', width: '100%' }}
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 100 }}>
                        <TextField
                          size="small"
                          type="time"
                          value={row.horaFin}
                          onChange={(e) => handleRowChange(row.id, 'horaFin', e.target.value)}
                          variant="outlined"
                          inputProps={{ step: 300 }}
                          sx={{ backgroundColor: 'white', width: '100%' }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: '600', color: '#12457d', textAlign: 'center' }}>
                        {row.horas}h : {row.minutos}m
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleEliminarFila(row.id)}
                          disabled={horasRows.length === 1}
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
              onClick={handleAgregarFila}
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
        {mensaje && (
          <Alert severity={mensaje.includes('Error') ? 'error' : 'success'} sx={{ mt: 3 }}>
            {mensaje}
          </Alert>
        )}

        {/* Botones de Navegación */}
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'center', mt: 4 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/screen2')}
            sx={{ color: '#12457d', borderColor: '#12457d' }}
          >
            Atrás
          </Button>
          <Button
            variant="contained"
            endIcon={<CheckCircleIcon />}
            onClick={handleCompletarRegistro}
            disabled={guardando || !objetivo.trim()}
            sx={{
              backgroundColor: '#2c2c2c',
              '&:hover': {
                backgroundColor: '#1a1a1a',
              },
            }}
          >
            {guardando ? 'Guardando...' : 'Completar'}
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}
