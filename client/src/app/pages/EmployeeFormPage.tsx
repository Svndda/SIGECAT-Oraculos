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

export default function EmployeeFormPage() {
  const navigate = useNavigate();
  const { currentRecord, setCurrentRecord } = useRecords();

  const [formData, setFormData] = useState({
    name: currentRecord?.name || '',
    idNumber: currentRecord?.idNumber || '',
    institutionalEmail: currentRecord?.institutionalEmail || '',
    employeeCode: currentRecord?.employeeCode || '',
    ucrRelationship: currentRecord?.ucrRelationship || '',
    workLocation: currentRecord?.workLocation || '',
    plazaNumber: currentRecord?.plazaNumber || '',
    occupationalClass: currentRecord?.occupationalClass || null,
    jobPosition: (currentRecord as any)?.jobPosition || null,
    workShift: currentRecord?.workShift || 'Diurna',
    startTime: currentRecord?.startTime || '08:00',
    endTime: currentRecord?.endTime || '16:30',
  });

  const [classes, setClasses] = useState<Class[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSsoExpanded, setIsSsoExpanded] = useState(false);

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
    setFormData(prev => ({ ...prev, occupationalClass: value }));
    if (errors.occupationalClass) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.occupationalClass;
        return newErrors;
      });
    }
  };

  const handleJobChange = (_: any, value: Job | null) => {
    setFormData(prev => ({ ...prev, jobPosition: value }));
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) newErrors.name = 'Nombre es requerido';
    if (!formData.workLocation.trim()) newErrors.workLocation = 'Lugar de trabajo es requerido';
    if (!formData.plazaNumber.trim()) newErrors.plazaNumber = 'Número de plaza es requerido';
    if (!formData.occupationalClass) newErrors.occupationalClass = 'Clase ocupacional es requerida';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateForm()) {
      return;
    }

    setCurrentRecord({
      name: formData.name,
      idNumber: formData.idNumber,
      institutionalEmail: formData.institutionalEmail,
      employeeCode: formData.employeeCode,
      ucrRelationship: formData.ucrRelationship,
      workLocation: formData.workLocation,
      plazaNumber: formData.plazaNumber,
      occupationalClass: formData.occupationalClass,
      workShift: formData.workShift,
      startTime: formData.startTime,
      endTime: formData.endTime,
      objective: '',
      isRead: false,
      hours: [],
    });
    navigate('/work-hours');
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
        <Paper sx={{ p: { xs: 2, sm: 4 }, backgroundColor: '#f9f9fd' }}>
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
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Carlos Pérez García"
                    variant="outlined"
                    size="small"
                    error={!!errors.name}
                    helperText={errors.name}
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
                    name="workLocation"
                    value={formData.workLocation}
                    onChange={handleChange}
                    placeholder="Unidad de Investigación en Ciencias de la Materia..."
                    variant="outlined"
                    size="small"
                    multiline
                    rows={2}
                    error={!!errors.workLocation}
                    helperText={errors.workLocation}
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
                    name="plazaNumber"
                    value={formData.plazaNumber}
                    onChange={handleChange}
                    placeholder="00333"
                    variant="outlined"
                    size="small"
                    error={!!errors.plazaNumber}
                    helperText={errors.plazaNumber}
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
                    value={formData.occupationalClass}
                    onChange={handleClassChange}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Buscar clase ocupacional..."
                        variant="outlined"
                        size="small"
                        error={!!errors.occupationalClass}
                        helperText={errors.occupationalClass}
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
                    value={formData.jobPosition}
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
                    name="workShift"
                    value={formData.workShift}
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
                        name="startTime"
                        value={formData.startTime}
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
                        name="endTime"
                        value={formData.endTime}
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
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1565c0' }}>
                    Esta información puede venir del SSO:
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    color="primary"
                    onClick={() => setIsSsoExpanded(!isSsoExpanded)}
                    sx={{ backgroundColor: '#1565c0', alignSelf: { xs: 'flex-end', sm: 'auto' } }}
                  >
                    {isSsoExpanded ? 'Ocultar' : 'Autocompletar datos'}
                  </Button>
                </Box>

                {isSsoExpanded && (
                  <Stack spacing={2}>
                    <TextField
                      label="Nombre Completo"
                      value={formData.name}
                      fullWidth
                      disabled
                      size="small"
                      sx={{ backgroundColor: 'white' }}
                    />
                    <TextField
                      label="Número de Cédula"
                      value={formData.idNumber}
                      fullWidth
                      disabled
                      size="small"
                      sx={{ backgroundColor: 'white' }}
                    />
                    <TextField
                      label="Correo Institucional"
                      value={formData.institutionalEmail}
                      fullWidth
                      disabled
                      size="small"
                      sx={{ backgroundColor: 'white' }}
                    />
                    <TextField
                      label="Código de Empleado"
                      value={formData.employeeCode}
                      fullWidth
                      disabled
                      size="small"
                      sx={{ backgroundColor: 'white' }}
                    />
                    <TextField
                      label="UCR Relación"
                      value={formData.ucrRelationship}
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
            <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={2} sx={{ justifyContent: 'center', mt: 4 }}>
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
                onClick={handleNext}
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
