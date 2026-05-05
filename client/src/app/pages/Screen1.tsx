import { Container, Box, Button, Typography, Stack, Accordion, AccordionSummary, AccordionDetails, Alert } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useRecords } from '../../context/RecordsContext';

const DEFAULT_RECORD = {
  nombre: '', cedula: '', correoInstitucional: '', codigoEmpleado: '',
  relacionUCR: '', lugarTrabajo: '', numeroPlaza: '', claseOcupacional: null,
  jornadaLaboral: '', horarioInicio: '', horarioFinal: '', objetivo: '',
  estadoLeido: false, horas: [],
};

export default function Screen1() {
  const navigate = useNavigate();
  const { currentRecord, setCurrentRecord } = useRecords();
  const [estadoLeido, setEstadoLeido] = useState(currentRecord?.estadoLeido === true);

  const indicaciones = [
    {
      title: 'Información General',
      content: 'En este apartado debe registrar la información general relacionada al puesto que ocupa actualmente en la Unidad de Trabajo.'
    },
    {
      title: 'Diagnóstico de carga',
      content: 'Proporcione el análisis detallado de volumen, distribución y organización del trabajo.'
    },
    {
      title: 'Información Adicional',
      content: 'Complete cualquier información adicional que considere relevante para el análisis.'
    },
  ];

  const handleComenzar = () => {
    setCurrentRecord({ ...(currentRecord ?? DEFAULT_RECORD), estadoLeido });
    navigate('/screen2');
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Título */}
        <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 'bold', color: '#12457d', textAlign: 'center' }}>
          Cargas de Trabajo
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 4, color: '#666', textAlign: 'center' }}>
          Herramienta para la aplicación
        </Typography>

        {/* Descripción Principal */}
        <Typography variant="body2" sx={{ mb: 4, color: '#555', textAlign: 'justify', lineHeight: 1.8 }}>
          La herramienta para la aplicación de cargas de trabajo, tiene por objetivo recopilar información que permite conocer el volumen, distribución y organización del trabajo. Sus respuestas verdaderas y precisas servirán de referencia para valorar las necesidades planteadas por la Unidad de Trabajo. Las respuestas brindadas serán confrontadas con la matriz de procesos de la Unidad respectiva, así como los formularios generales de puesto. Se agradece al tiempo y disposición para analizar y responder las preguntas que se le indican.
        </Typography>

        {/* Indicaciones Generales */}
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold', color: '#12457d' }}>
          Indicaciones Generales
        </Typography>

        <Box sx={{ mb: 4 }}>
          {indicaciones.map((item, index) => (
            <Accordion key={index} sx={{ mb: 1 }}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  backgroundColor: '#f9f9fd',
                  border: '1px solid #e0e0e0',
                  '&:hover': { backgroundColor: '#f5f5f5' },
                }}
              >
                <Typography sx={{ fontWeight: '600', color: '#12457d' }}>
                  {item.title}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ backgroundColor: '#fafafa', borderTop: '1px solid #e0e0e0' }}>
                <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.6 }}>
                  {item.content}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>

        {/* Aviso Importante */}
        <Alert severity="warning" sx={{ mb: 4, backgroundColor: '#fff3cd', borderColor: '#ffc107' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: '700', mb: 2, color: '#8b6914' }}>
            Aviso Importante
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: '#666', lineHeight: 1.6 }}>
            La veracidad y responsabilidad de la información suministrada en este archivo, es de su responsabilidad.
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: '#666', lineHeight: 1.6 }}>
            En caso de que al analizar inconsistencias, se procederá a solicitar una reunión con el funcionario jefe con la jefatura inmediata para aclarar información solicitada.
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: '#666', lineHeight: 1.6 }}>
            Una vez que haya completado la información, debe convertir el documento en PDF y proceder con la firma del mismo. El archivo debe ser remitido en la fecha previamente coordinada con el analista encargado.
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: '#666', fontWeight: '600', lineHeight: 1.6 }}>
            NOTA: Para convertir todo el documento en PDF es debe EJE la primera hoja y luego con la ficha de Control presionada, es son vinculado. Luego se selecciona Archivo, Exportar, Crear documento PDF e inmediatamente se abre la carpeta en la que se debe guardar.
          </Typography>
          <Typography variant="body2" sx={{ color: '#8b6914', fontWeight: '600' }}>
            EN LA FECHA COORDINADA DEBE REMITIR TANTO EL DOCUMENTO FIRMADO EN PDF COMO EL ARCHIVO EN EXCEL
          </Typography>
        </Alert>

        {/* Botones */}
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'center', mt: 4 }}>
          <Button
            variant={estadoLeido ? 'contained' : 'outlined'}
            startIcon={<CheckCircleIcon />}
            onClick={() => setEstadoLeido(!estadoLeido)}
            sx={estadoLeido ? {
              backgroundColor: '#388e3c',
              '&:hover': { backgroundColor: '#2e7d32' },
            } : {
              color: '#12457d',
              borderColor: '#12457d',
              '&:hover': { backgroundColor: '#f0f4ff' },
            }}
          >
            {estadoLeido ? 'Leído' : 'Marcar como leído'}
          </Button>
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={handleComenzar}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1rem',
              backgroundColor: '#2c2c2c',
              '&:hover': {
                backgroundColor: '#1a1a1a',
              },
            }}
          >
            Comenzar
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}
