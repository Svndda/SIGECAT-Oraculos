import { Container, Box, Button, Typography, Stack, TextField, MenuItem, Paper, Autocomplete } from '@mui/material';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import classesData from '../../data/classes.json';
import jobsData from '../../data/jobs.json';
import { useRecords } from '../../context/RecordsContext';

interface Class {
  id: string;
  codigo: string;
  estrato: string;
  descripcion: string;
}

interface Job {
  id: string;
  codigo: string;
  clase: string;
  nombre: string;
  descripcion: string;
}

export default function Screen2() {
  const navigate = useNavigate();
  const { currentRecord, setCurrentRecord } = useRecords();
  
  const [formData, setFormData] = useState({
    nombre: currentRecord?.nombre || '',
    cedula: currentRecord?.cedula || '',
    correoInstitucional: currentRecord?.correoInstitucional || '',
    codigoEmpleado: currentRecord?.codigoEmpleado || '',
    relacionUCR: currentRecord?.relacionUCR || '',
    lugarTrabajo: currentRecord?.lugarTrabajo || '',
    numeroPlaza: currentRecord?.numeroPlaza || '',
    claseOcupacional: currentRecord?.claseOcupacional || null,
    cargoDelPuesto: (currentRecord as any)?.cargoDelPuesto || null,
    jornadaLaboral: currentRecord?.jornadaLaboral || 'Diurna',
    horarioInicio: currentRecord?.horarioInicio || '08:00',
    horarioFinal: currentRecord?.horarioFinal || '16:30',
  });

  const [classes, setClasses] = useState<Class[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [ssoExpanded, setSsoExpanded] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleClassChange = (_: any, value: Class | null) => {
    setFormData(prev => ({ ...prev, claseOcupacional: value }));
    if (errors.claseOcupacional) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.claseOcupacional;
        return newErrors;
      });
    }
  };

  const handleJobChange = (_: any, value: Job | null) => {
    setFormData(prev => ({ ...prev, cargoDelPuesto: value }));
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.nombre.trim()) newErrors.nombre = 'Nombre es requerido';
    if (!formData.lugarTrabajo.trim()) newErrors.lugarTrabajo = 'Lugar de trabajo es requerido';
    if (!formData.numeroPlaza.trim()) newErrors.numeroPlaza = 'Número de plaza es requerido';
    if (!formData.claseOcupacional) newErrors.claseOcupacional = 'Clase ocupacional es requerida';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSiguiente = () => {
    if (!validateForm()) {
      return;
    }

    // Save form data to context so Screen3 can access
    setCurrentRecord({
      nombre: formData.nombre,
      cedula: formData.cedula,
      correoInstitucional: formData.correoInstitucional,
      codigoEmpleado: formData.codigoEmpleado,
      relacionUCR: formData.relacionUCR,
      lugarTrabajo: formData.lugarTrabajo,
      numeroPlaza: formData.numeroPlaza,
      claseOcupacional: formData.claseOcupacional,
      jornadaLaboral: formData.jornadaLaboral,
      horarioInicio: formData.horarioInicio,
      horarioFinal: formData.horarioFinal,
      objetivo: '',
      estadoLeido: false,
      horas: [],
    });
    navigate('/screen3');
  };

  useEffect(() => {
    setClasses(classesData as Class[]);
    setJobs(jobsData as Job[]);
  }, []);

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Título */}
        <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 'bold', color: '#12457d', textAlign: 'center' }}>
          Cargas de Trabajo
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 4, color: '#666', textAlign: 'center' }}>
          Información General
        </Typography>

        {/* Formulario */}
        <Paper sx={{ p: 4, backgroundColor: '#f9f9fd' }}>
          <Stack spacing={3}>
            {/* SECCIÓN 1: CAMPOS PRINCIPALES */}
            <Box>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold', color: '#12457d' }}>
                Información Principal
              </Typography>
              <Stack spacing={2.5}>
                {/* Nombre */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: '600', color: '#12457d' }}>
                    Nombre:
                  </Typography>
                  <TextField
                    fullWidth
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Carlos Pérez García"
                    variant="outlined"
                    size="small"
                    error={!!errors.nombre}
                    helperText={errors.nombre}
                    sx={{ backgroundColor: 'white' }}
                    required
                  />
                </Box>

                {/* Lugar de Trabajo */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: '600', color: '#12457d' }}>
                    Lugar de trabajo:
                  </Typography>
                  <TextField
                    fullWidth
                    name="lugarTrabajo"
                    value={formData.lugarTrabajo}
                    onChange={handleChange}
                    placeholder="Unidad de Investigación en Ciencias de la Materia..."
                    variant="outlined"
                    size="small"
                    multiline
                    rows={2}
                    error={!!errors.lugarTrabajo}
                    helperText={errors.lugarTrabajo}
                    sx={{ backgroundColor: 'white' }}
                    required
                  />
                </Box>

                {/* Número de Plaza */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: '600', color: '#12457d' }}>
                    Número de plaza:
                  </Typography>
                  <TextField
                    fullWidth
                    name="numeroPlaza"
                    value={formData.numeroPlaza}
                    onChange={handleChange}
                    placeholder="00333"
                    variant="outlined"
                    size="small"
                    error={!!errors.numeroPlaza}
                    helperText={errors.numeroPlaza}
                    sx={{ backgroundColor: 'white' }}
                    required
                  />
                </Box>

                {/* Clase Ocupacional */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: '600', color: '#12457d' }}>
                    Clase Ocupacional:
                  </Typography>
                  <Autocomplete
                    options={classes}
                    getOptionLabel={(option) => `${option.codigo} - ${option.descripcion}`}
                    value={formData.claseOcupacional}
                    onChange={handleClassChange}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Buscar clase ocupacional..."
                        variant="outlined"
                        size="small"
                        error={!!errors.claseOcupacional}
                        helperText={errors.claseOcupacional}
                        sx={{ backgroundColor: 'white' }}
                        required
                      />
                    )}
                    isOptionEqualToValue={(option, value) => option.id === value?.id}
                  />
                </Box>

                {/* Cargo del Puesto */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: '600', color: '#12457d' }}>
                    Cargo del puesto:
                  </Typography>
                  <Autocomplete
                    options={jobs}
                    getOptionLabel={(option) => `${option.codigo} - ${option.nombre}`}
                    value={formData.cargoDelPuesto}
                    onChange={handleJobChange}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Buscar cargo del puesto..."
                        variant="outlined"
                        size="small"
                        sx={{ backgroundColor: 'white' }}
                      />
                    )}
                    isOptionEqualToValue={(option, value) => option.id === value?.id}
                  />
                </Box>
              </Stack>
            </Box>

            {/* Divisor */}
            <Box sx={{ height: '1px', bgcolor: '#e0e0e0', my: 2 }} />

            {/* SECCIÓN 2: INFORMACIÓN LABORAL */}
            <Box>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold', color: '#12457d' }}>
                Información Laboral
              </Typography>
              <Stack spacing={2.5}>
                {/* Jornada Laboral */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: '600', color: '#12457d' }}>
                    Jornada Laboral:
                  </Typography>
                  <TextField
                    fullWidth
                    select
                    name="jornadaLaboral"
                    value={formData.jornadaLaboral}
                    onChange={handleChange}
                    variant="outlined"
                    size="small"
                    sx={{ backgroundColor: 'white' }}
                  >
                    <MenuItem value="Diurna">Diurna</MenuItem>
                    <MenuItem value="Nocturna">Nocturna</MenuItem>
                    <MenuItem value="Mixta">Mixta</MenuItem>
                  </TextField>
                </Box>

                {/* Horario Laboral */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: '600', color: '#12457d' }}>
                    Horario Laboral:
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
                        Inicio:
                      </Typography>
                      <TextField
                        fullWidth
                        type="time"
                        name="horarioInicio"
                        value={formData.horarioInicio}
                        onChange={handleChange}
                        variant="outlined"
                        size="small"
                        inputProps={{ step: 300 }}
                        sx={{ backgroundColor: 'white' }}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
                        Final:
                      </Typography>
                      <TextField
                        fullWidth
                        type="time"
                        name="horarioFinal"
                        value={formData.horarioFinal}
                        onChange={handleChange}
                        variant="outlined"
                        size="small"
                        inputProps={{ step: 300 }}
                        sx={{ backgroundColor: 'white' }}
                      />
                    </Box>
                  </Stack>
                </Box>
              </Stack>
            </Box>

            {/* Divisor */}
            <Box sx={{ height: '1px', bgcolor: '#e0e0e0', my: 2 }} />

            {/* SECCIÓN 3: INFORMACIÓN DEL SSO */}
            <Box sx={{ p: 2, bgcolor: '#f0f8ff', borderRadius: 1 }}>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1565c0' }}>
                    Esta información puede venir del SSO:
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    color="primary"
                    onClick={() => setSsoExpanded(!ssoExpanded)}
                    sx={{ backgroundColor: '#1565c0' }}
                  >
                    {ssoExpanded ? 'Ocultar' : 'Autocompletar datos'}
                  </Button>
                </Box>

                {ssoExpanded && (
                  <Stack spacing={2}>
                    <TextField
                      label="Nombre Completo"
                      value={formData.nombre}
                      fullWidth
                      disabled
                      size="small"
                      sx={{ backgroundColor: 'white' }}
                    />
                    <TextField
                      label="Número de Cédula"
                      value={formData.cedula}
                      fullWidth
                      disabled
                      size="small"
                      sx={{ backgroundColor: 'white' }}
                    />
                    <TextField
                      label="Correo Institucional"
                      value={formData.correoInstitucional}
                      fullWidth
                      disabled
                      size="small"
                      sx={{ backgroundColor: 'white' }}
                    />
                    <TextField
                      label="Código de Empleado"
                      value={formData.codigoEmpleado}
                      fullWidth
                      disabled
                      size="small"
                      sx={{ backgroundColor: 'white' }}
                    />
                    <TextField
                      label="UCR Relación"
                      value={formData.relacionUCR}
                      fullWidth
                      disabled
                      size="small"
                      sx={{ backgroundColor: 'white' }}
                    />
                  </Stack>
                )}
              </Stack>
            </Box>

            {/* Botones */}
            <Stack direction="row" spacing={2} sx={{ justifyContent: 'center', mt: 4 }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/')}
                sx={{ color: '#12457d', borderColor: '#12457d' }}
              >
                Atrás
              </Button>
              <Button
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                onClick={handleSiguiente}
                sx={{
                  backgroundColor: '#2c2c2c',
                  '&:hover': {
                    backgroundColor: '#1a1a1a',
                  },
                }}
              >
                Siguiente
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
}
