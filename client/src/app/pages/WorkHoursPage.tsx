import {
  Container,
  Box,
  Button,
  Typography,
  Stack,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  MenuItem,
  useTheme,
  useMediaQuery
} from '@mui/material';
import type {ReactNode} from 'react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import DeclarationFunctions from '../../features/employee/DeclarationFunctions';
import DeclarationLicenses from '../../features/employee/DeclarationLicenses';
import DeclarationWorkday from '../../features/employee/DeclarationWorkday';

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Estado inicial limpio
  const [objective, setObjective] = useState('');
  const [hourRows, setHourRows] = useState<HourRow[]>([
    {
      id: 1,
      dia: 'Lunes',
      taskType: 'propias',
      startTime: '',
      endTime: '',
      hours: 0,
      minutes: 0
    }
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleAddRow = () => {
    const newId = Math.max(...hourRows.map(r => r.id), 0) + 1;
    setHourRows([...hourRows, {
      id: newId,
      dia: '',
      taskType: 'propias',
      startTime: '',
      endTime: '',
      hours: 0,
      minutes: 0
    }]);
  };

  const handleDeleteRow = (id: number) => {
    if (hourRows.length > 1) {
      setHourRows(hourRows.filter(row => row.id !== id));
    }
  };

  const calculateHoursAndMinutes = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return {hours: 0, minutes: 0};

    const [hI, mI] = startTime.split(':').map(Number);
    const [hF, mF] = endTime.split(':').map(Number);

    const totalMinutes = (hF * 60 + mF) - (hI * 60 + mI);

    if (totalMinutes < 0) return {hours: 0, minutes: 0};

    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
    };
  };

  const handleRowChange = (id: number, field: string, value: string | number) => {
    setHourRows(hourRows.map(row => {
      if (row.id === id) {
        const newRow = {...row, [field]: value};
        // Cálculo automático de horas
        if (field === 'startTime' || field === 'endTime') {
          const {
            hours,
            minutes
          } = calculateHoursAndMinutes(newRow.startTime, newRow.endTime);
          // Límite de 60 horas
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

  // ----- Field renderers shared by the desktop table and the mobile cards -----
  const diaField = (row: HourRow) => (
    <TextField
      size="small"
      value={row.dia}
      onChange={(e) => handleRowChange(row.id, 'dia', e.target.value)}
      placeholder="Lunes"
      variant="outlined"
      sx={{width: '100%', backgroundColor: 'white'}}
    />
  );

  const taskTypeField = (row: HourRow) => (
    <TextField
      select
      size="small"
      value={row.taskType}
      onChange={(e) => handleRowChange(row.id, 'taskType', e.target.value)}
      variant="outlined"
      sx={{width: '100%', backgroundColor: 'white'}}
    >
      <MenuItem value="propias">Propias</MenuItem>
      <MenuItem value="apoyo">De apoyo</MenuItem>
      <MenuItem value="otros">Otros</MenuItem>
    </TextField>
  );

  const timeField = (row: HourRow, field: 'startTime' | 'endTime') => (
    <TextField
      size="small"
      type="time"
      value={row[field]}
      onChange={(e) => handleRowChange(row.id, field, e.target.value)}
      variant="outlined"
      inputProps={{step: 300}}
      sx={{backgroundColor: 'white', width: '100%'}}
    />
  );

  const deleteButton = (row: HourRow) => (
    <IconButton
      size="small"
      onClick={() => handleDeleteRow(row.id)}
      disabled={hourRows.length === 1}
      sx={{color: '#d32f2f'}}
    >
      <DeleteIcon fontSize="small"/>
    </IconButton>
  );

  const handleCompleteRecord = async () => {
    if (!objective.trim()) {
      setMessage('Error: El objetivo del puesto es requerido');
      return;
    }

    setIsSaving(true);
    try {
      setMessage('Registro guardado exitosamente');

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
      <Box sx={{py: 4}}>
        <Typography variant="h4" component="h1" sx={{
          mb: 1,
          fontWeight: 'bold',
          color: '#12457d',
          textAlign: 'center'
        }}>
          Cargas de Trabajo
        </Typography>
        <Typography variant="subtitle1"
                    sx={{mb: 4, color: '#666', textAlign: 'center'}}>
          Diagnóstico de Cargas de trabajo
        </Typography>

        <Paper sx={{p: {xs: 2, sm: 3}, mb: 4, backgroundColor: '#f9f9fd'}}>
          <Typography variant="subtitle2"
                      sx={{mb: 2, fontWeight: '600', color: '#12457d'}}>
            Indique el objetivo del puesto:
          </Typography>
          <TextField
            fullWidth
            name="objetivo"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Garantizar la calidad, seguridad y cumplimiento normativo..."
            variant="outlined"
            multiline
            rows={5}
            error={!objective.trim()}
            helperText={!objective.trim() ? 'El objetivo es requerido' : ''}
            sx={{backgroundColor: 'white'}}
          />
          <Box
            sx={{mt: 2, p: 2, backgroundColor: '#e8f4f8', borderRadius: '4px'}}>
            <Typography variant="caption"
                        sx={{color: '#0066cc', fontWeight: '600'}}>
              ℹ️ El sistema calculará la duración automáticamente
            </Typography>
          </Box>
        </Paper>

        <Paper sx={{backgroundColor: '#f9f9fd'}}>
          <Box sx={{p: {xs: 2, sm: 3}}}>
            <Typography variant="subtitle2"
                        sx={{mb: 2, fontWeight: '600', color: '#12457d'}}>
              Tareas:
            </Typography>

            {isMobile ? (
              /* ----- Mobile: stacked cards, one per task row ----- */
              <Stack spacing={2}>
                {hourRows.map((row, index) => {
                  const labelled = (label: string, node: ReactNode) => (
                    <Box>
                      <Typography variant="caption"
                                  sx={{color: '#8a8a8a', display: 'block', mb: 0.5}}>
                        {label}
                      </Typography>
                      {node}
                    </Box>
                  );
                  return (
                    <Paper key={row.id} elevation={0}
                           sx={{p: 2, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: 'white'}}>
                      <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5}}>
                        <Typography variant="subtitle2" sx={{fontWeight: 700, color: '#12457d'}}>
                          Tarea {index + 1}
                        </Typography>
                        {deleteButton(row)}
                      </Box>
                      <Stack spacing={1.5}>
                        {labelled('Día', diaField(row))}
                        {labelled('Tipo de Tarea', taskTypeField(row))}
                        <Stack direction="row" spacing={1.5}>
                          {labelled('Hora Inicio', timeField(row, 'startTime'))}
                          {labelled('Hora Final', timeField(row, 'endTime'))}
                        </Stack>
                        <Typography sx={{fontWeight: 600, color: '#12457d'}}>
                          {row.hours}h : {row.minutes}m
                        </Typography>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            ) : (
              <TableContainer sx={{overflowX: 'auto'}}>
                <Table size="small" sx={{minWidth: 720}}>
                  <TableHead>
                    <TableRow sx={{backgroundColor: '#e8f4f8'}}>
                      <TableCell sx={{
                        fontWeight: 'bold',
                        color: '#12457d'
                      }}>Día</TableCell>
                      <TableCell sx={{fontWeight: 'bold', color: '#12457d'}}>Tipo
                        de Tarea</TableCell>
                      <TableCell sx={{fontWeight: 'bold', color: '#12457d'}}>Hora
                        Inicio</TableCell>
                      <TableCell sx={{fontWeight: 'bold', color: '#12457d'}}>Hora
                        Final</TableCell>
                      <TableCell sx={{fontWeight: 'bold', color: '#12457d'}}
                                 align="center">Horas : Minutos</TableCell>
                      <TableCell align="center" sx={{
                        fontWeight: 'bold',
                        color: '#12457d'
                      }}>Acción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {hourRows.map((row) => (
                      <TableRow key={row.id} sx={{
                        backgroundColor: '#fafafa',
                        '&:hover': {backgroundColor: '#f5f5f5'}
                      }}>
                        <TableCell sx={{maxWidth: 100}}>{diaField(row)}</TableCell>
                        <TableCell sx={{maxWidth: 120}}>{taskTypeField(row)}</TableCell>
                        <TableCell sx={{maxWidth: 100}}>{timeField(row, 'startTime')}</TableCell>
                        <TableCell sx={{maxWidth: 100}}>{timeField(row, 'endTime')}</TableCell>
                        <TableCell sx={{
                          fontWeight: '600',
                          color: '#12457d',
                          textAlign: 'center'
                        }}>
                          {row.hours}h : {row.minutes}m
                        </TableCell>
                        <TableCell align="center">{deleteButton(row)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Button
              variant="outlined"
              startIcon={<AddIcon/>}
              onClick={handleAddRow}
              sx={{
                mt: 2,
                color: '#12457d',
                borderColor: '#12457d',
                '&:hover': {backgroundColor: '#e8f4f8'}
              }}
            >
              Agregar fila
            </Button>
          </Box>
        </Paper>

        <DeclarationWorkday/>
        <DeclarationFunctions/>
        <DeclarationLicenses/>

        {message && (
          <Alert severity={message.includes('Error') ? 'error' : 'success'}
                 sx={{mt: 3}}>
            {message}
          </Alert>
        )}

        <Stack direction={{xs: 'column-reverse', sm: 'row'}} spacing={2}
               sx={{justifyContent: 'center', mt: 4}}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon/>}
            onClick={() => navigate('/employee-form')}
            sx={{color: '#12457d', borderColor: '#12457d'}}
          >
            Atrás
          </Button>
          <Button
            variant="contained"
            endIcon={<CheckCircleIcon/>}
            onClick={handleCompleteRecord}
            disabled={isSaving || !objective.trim()}
            sx={{
              backgroundColor: '#2c2c2c',
              '&:hover': {backgroundColor: '#1a1a1a'}
            }}
          >
            {isSaving ? 'Guardando...' : 'Completar'}
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}