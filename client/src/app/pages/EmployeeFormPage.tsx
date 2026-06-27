import {useState, useEffect, useMemo} from 'react';
import {useNavigate} from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Stack,
  TextField,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  type SelectChangeEvent
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  jobPositionService,
  type JobPosition
} from '../../services/jobPositionService';
import {declarationService} from '../../services/declarationsService';
import {areaService, type Area} from '../../services/areaService';
import {departmentService} from '../../services/departmentService';
import {sectionService} from '../../services/sectionService';
import {unitService, type Unit} from '../../services/unitService';
import {type OrgOption, parseOracleToTimeInput} from '../../services/common';

interface OrgDataState {
  areas: Area[];
  departments: OrgOption[];
  sections: OrgOption[];
  units: Unit[];
}

const SHIFT_DURATIONS: Record<string, number> = {
  'Diurna': 8,
  'Media Diurna': 4,
  'Mixta': 7,
  'Nocturna': 6,
  'Media Nocturna': 3
};

export default function EmployeeFormPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [selectedPositionId, setSelectedPositionId] = useState<string>('');
  const [orgData, setOrgData] = useState<OrgDataState>({
    areas: [],
    departments: [],
    sections: [],
    units: []
  });
  const [times, setTimes] = useState({start: '08:00', end: '16:00'});
  const [error, setError] = useState<string | null>(null);

  const [currentDeclarationId, setCurrentDeclarationId] = useState<string | null>(null);
  const [isContinuing, setIsContinuing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [positions, resAreas, depts, sections, resUnits] = await Promise.all([
          jobPositionService.getMyJobPositions(),
          areaService.getAreas(),
          departmentService.getDepartments(),
          sectionService.getSections(),
          unitService.getUnits()
        ]);

        setJobPositions(positions);
        setOrgData({
          areas: resAreas.data || [],
          departments: depts || [],
          sections: sections || [],
          units: resUnits.data || []
        });

        const incomplete = await declarationService.checkIncomplete();
        if (incomplete.has_incomplete && incomplete.declaration_id) {
          const declId = incomplete.declaration_id;
          setCurrentDeclarationId(declId);
          setIsContinuing(true);

          const declaration = await declarationService.getDeclarationById(declId);
          setSelectedPositionId(declaration.job_position_id);
          setTimes({
            start: parseOracleToTimeInput(declaration.shift_starts_at) || '08:00',
            end: parseOracleToTimeInput(declaration.shift_ends_at) || '16:00'
          });
        } else {
          setIsContinuing(false);
          setCurrentDeclarationId(null);
          if (positions.length > 0) {
            setSelectedPositionId(positions[0].job_position_id);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setError("Error al cargar la información inicial.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const selectedPosition = jobPositions.find(p => p.job_position_id === selectedPositionId);

  const entityName = useMemo(() => {
    if (!selectedPosition) return 'No asignada';
    const {unit_id, section_id, department_id, area_id} = selectedPosition;

    const unit = orgData.units.find((u) => u.id === unit_id);
    if (unit) return `${unit.name}`;

    const section = orgData.sections.find((s) => s.id === section_id);
    if (section) return `${section.name}`;

    const dept = orgData.departments.find((d) => d.id === department_id);
    if (dept) return `${dept.name}`;

    const area = orgData.areas.find((a) => a.area_id === area_id);
    if (area) return `${area.name}`;

    return 'No asignada';
  }, [selectedPosition, orgData]);

  const handleNext = async () => {
    if (!selectedPosition) return;

    if (isContinuing && currentDeclarationId) {
      navigate('/work-hours', {state: {declarationId: currentDeclarationId}});
      return;
    }

    const startH = parseInt(times.start.split(':')[0]);
    const endH = parseInt(times.end.split(':')[0]);
    const duration = Math.abs(endH - startH);
    const required = SHIFT_DURATIONS[selectedPosition.job_shift ?? ''] || 0;

    if (required > 0 && duration !== required) {
      setError(`El horario laboral ${selectedPosition.job_shift} requiere una duración de ${required} horas. La actual es de ${duration} horas.`);
      return;
    }

    try {
      const res = await declarationService.createDeclaration({
        job_position_id: selectedPosition.job_position_id,
        shift_starts_at: times.start,
        shift_ends_at: times.end,
      });
      navigate('/work-hours', {state: {declarationId: res?.declaration_id}});
    } catch (err) {
      setError('Error al crear la declaración. Intente de nuevo.');
    }
  };

  if (loading) {
    return (
      <Container sx={{display: 'flex', justifyContent: 'center', py: 8}}>
        <CircularProgress/>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{py: 4}}>
        <Typography variant="h4" sx={{
          mb: 1,
          fontWeight: 'bold',
          color: '#12457d',
          textAlign: 'center'
        }}>
          Cargas de Trabajo
        </Typography>
        <Typography variant="subtitle1"
                    sx={{mb: 4, color: '#666', textAlign: 'center'}}>
          Información del Puesto y Horario
        </Typography>

        <Paper sx={{p: {xs: 2, sm: 4}, backgroundColor: '#f9f9fd'}}>
          {error && <Alert severity="error" sx={{mb: 3}}>{error}</Alert>}
          {isContinuing && (
            <Alert severity="info" sx={{mb: 3}}>
              Modo de solo lectura: Se ha cargado la información correspondiente
              a la declaración incompleta en curso. Estos campos no se pueden
              modificar.
            </Alert>
          )}

          <Stack spacing={2.5}>
            <TextField
              label="Lugar de Trabajo"
              value={entityName}
              fullWidth
              size="small"
              InputProps={{readOnly: true}}
              sx={{backgroundColor: 'white'}}
            />

            <FormControl fullWidth size="small" disabled={isContinuing}>
              <InputLabel>Número de Plaza</InputLabel>
              <Select
                value={selectedPositionId}
                label="Número de Plaza"
                onChange={(e: SelectChangeEvent) => setSelectedPositionId(e.target.value)}
                sx={{backgroundColor: 'white'}}
              >
                {jobPositions.map((pos) => (
                  <MenuItem key={pos.job_position_id}
                            value={pos.job_position_id}>
                    {pos.job_position_number}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Descripción de la Plaza"
              value={selectedPosition?.description ?? 'N/A'}
              fullWidth
              size="small"
              InputProps={{readOnly: true}}
              sx={{backgroundColor: 'white'}}
            />

            <TextField
              label="Cargo de la Plaza"
              value={selectedPosition?.job?.name ?? 'N/A'}
              fullWidth
              size="small"
              InputProps={{readOnly: true}}
              sx={{backgroundColor: 'white'}}
            />

            <TextField
              label="Clase Ocupacional"
              value={selectedPosition?.job_class?.name ?? 'N/A'}
              fullWidth
              size="small"
              InputProps={{readOnly: true}}
              sx={{backgroundColor: 'white'}}
            />

            <TextField
              label="Jornada Laboral"
              value={selectedPosition?.job_shift ?? 'No definido'}
              fullWidth
              size="small"
              InputProps={{readOnly: true}}
              sx={{backgroundColor: 'white'}}
            />

            <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}>
              <TextField
                label="Inicio"
                type="time"
                value={times.start}
                onChange={(e) => setTimes({...times, start: e.target.value})}
                fullWidth
                size="small"
                InputProps={{readOnly: isContinuing}}
                disabled={isContinuing}
                sx={{backgroundColor: 'white'}}
              />
              <TextField
                label="Finaliza"
                type="time"
                value={times.end}
                onChange={(e) => setTimes({...times, end: e.target.value})}
                fullWidth
                size="small"
                InputProps={{readOnly: isContinuing}}
                disabled={isContinuing}
                sx={{backgroundColor: 'white'}}
              />
            </Stack>
          </Stack>

          <Stack direction={{xs: 'column-reverse', sm: 'row'}} spacing={2}
                 sx={{justifyContent: 'center', mt: 4}}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon/>}
              onClick={() => navigate('/')}
              sx={{color: '#12457d', borderColor: '#12457d'}}
            >
              Atrás
            </Button>
            <Button
              variant="contained"
              endIcon={<ArrowForwardIcon/>}
              onClick={handleNext}
              disabled={!selectedPosition}
              sx={{
                backgroundColor: '#2c2c2c',
                '&:hover': {backgroundColor: '#1a1a1a'}
              }}
            >
              Siguiente
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
}