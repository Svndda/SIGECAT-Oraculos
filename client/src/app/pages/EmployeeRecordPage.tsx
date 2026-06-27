import {
  Container,
  Box,
  Button,
  Typography,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert
} from '@mui/material';
import {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {useSnackbar} from '../../context/SnackbarContext';
import {declarationService} from '../../services/declarationsService';

export default function EmployeeRecordPage() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();

  const [isRead, setIsRead] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [incompleteData, setIncompleteData] = useState<{
    has_incomplete: boolean;
    declaration_id?: string
  } | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await declarationService.checkIncomplete();
        setIncompleteData(res);
      } catch (error) {
        console.error(error);
        snackbar.error('No se pudo verificar el estado de las declaraciones.');
      } finally {
        setCheckingStatus(false);
      }
    };
    fetchStatus();
  }, [snackbar]);

  const instructions = [
    {
      title: 'Información General',
      content: `En este apartado debe de registrar la información general relacionada con el puesto que ocupa actualmente en la Unidad de trabajo.`
    },
    {
      title: 'Diagnóstico de carga',
      content: `Para el diagnóstico de la carga de trabajo debe indicar el objetivo del puesto (Puede tomar como referencia la información del “Formulario para el Análisis de Puestos General”, utilizado por la Oficina de Recursos Humanos durante el estudio integral puestos; asimismo puede consultar el Manual Descriptivo de Clases y Cargos de dicha Oficina, en el que se detalla la Estructura del Cargo del puesto que ocupa en su Unidad de trabajo), las funciones que desempeña actualmente, la descripción de cada una de las funciones, la cantidad de veces que realiza la función y el tiempo aproximado que tarda en realizar cada una de ellas.
      
      Considere los ejemplos que se presentan en el apartado correspondiente (se le recuerda que es una aproximación del tiempo con base en su experiencia). Ambos ejemplos incluyen la interpretación.`
    },
    {
      title: 'Información Adicional',
      content: `Considere los ejemplos que se presentan en el apartado correspondiente (se le recuerda que es una aproximación del tiempo con base en su experiencia). Ambos ejemplos incluyen la interpretación.`
    },
  ];

  const handleBegin = () => {

    navigate('/employee-form');
  };

  const handleAbandon = async () => {
    if (!incompleteData?.declaration_id) return;
    try {
      await declarationService.changeStatus(incompleteData.declaration_id, {status: 'Abandoned'});
      snackbar.success('Declaración abandonada exitosamente.');
      setIncompleteData({has_incomplete: false});
    } catch (error) {
      snackbar.error('Error al intentar abandonar la declaración.');
    }
  };

  if (checkingStatus) {
    return null;
  }

  return (
    <>
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
            Herramienta para la aplicación
          </Typography>

          {incompleteData?.has_incomplete ? (
            <Alert
              severity="warning"
              sx={{
                mb: 4,
                py: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}
            >
              <Typography variant="h6" sx={{mb: 2, fontWeight: 'bold'}}>
                Atención requerida
              </Typography>
              <Typography variant="body1" sx={{mb: 3}}>
                Actualmente tiene una declaración incompleta, es necesario que
                la complete o la abandone para poder crear una nueva
                declaración.
              </Typography>
              <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}
                     justifyContent="center" width="100%">
                <Button
                  variant="contained"
                  onClick={() =>  {
                    navigate('/employee-form')
                  }}
                  sx={{
                    backgroundColor: '#12457d',
                    '&:hover': {backgroundColor: '#0e345e'}
                  }}
                >
                  Continuar Declaración
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteOutlineIcon/>}
                  onClick={handleAbandon}
                >
                  Abandonar Declaración
                </Button>
              </Stack>
            </Alert>
          ) : (
            <>
              <Typography variant="body2" sx={{
                mb: 4,
                color: '#555',
                textAlign: 'justify',
                lineHeight: 1.8
              }}>
                La herramienta para la aplicación de cargas de trabajo, tiene
                por objetivo recopilar información que permite conocer el
                volumen, distribución y organización del trabajo. Sus respuestas
                verdaderas y precisas servirán de referencia para valorar las
                necesidades planteadas por la Unidad de Trabajo. Las respuestas
                brindadas serán confrontadas con la matriz de procesos de la
                Unidad respectiva, así como los formularios generales de puesto.
                Se agradece al tiempo y disposición para analizar y responder
                las preguntas que se le indican.
              </Typography>

              <Typography variant="h6"
                          sx={{mb: 3, fontWeight: 'bold', color: '#12457d'}}>
                Indicaciones Generales
              </Typography>

              <Box sx={{mb: 4}}>
                {instructions.map((item, index) => (
                  <Accordion key={index} sx={{mb: 1}}>
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon/>}
                      sx={{
                        backgroundColor: '#f9f9fd',
                        border: '1px solid #e0e0e0',
                        '&:hover': {backgroundColor: '#f5f5f5'},
                      }}
                    >
                      <Typography sx={{fontWeight: '600', color: '#12457d'}}>
                        {item.title}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{
                      backgroundColor: '#fafafa',
                      borderTop: '1px solid #e0e0e0'
                    }}>
                      <Typography variant="body2" sx={{
                        color: '#666',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-line'
                      }}>
                        {item.content}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>

              <Alert severity="warning" sx={{
                mb: 4,
                backgroundColor: '#fff3cd',
                borderColor: '#ffc107'
              }}>
                <Typography variant="subtitle2"
                            sx={{fontWeight: '700', mb: 2, color: '#8b6914'}}>
                  Aviso Importante
                </Typography>
                <Typography variant="body2"
                            sx={{mb: 2, color: '#666', lineHeight: 1.6}}>
                  La veracidad de la información suministrada en este archivo es
                  de su total responsabilidad.
                </Typography>
                <Typography variant="body2"
                            sx={{mb: 2, color: '#666', lineHeight: 1.6}}>
                  En caso de encontrar inconsistencias durante el análisis, se
                  procederá a solicitar una reunión con la jefatura inmediata
                  para aclarar la información.
                </Typography>
                <Typography variant="body2"
                            sx={{mb: 2, color: '#666', lineHeight: 1.6}}>
                  Una vez que haya completado la información, debe convertir el
                  documento en PDF y proceder con la firma del mismo. El archivo
                  debe ser remitido en la fecha previamente coordinada con el
                  analista encargado.
                </Typography>
                <Typography variant="body2" sx={{
                  mb: 2,
                  color: '#666',
                  fontWeight: '600',
                  lineHeight: 1.6
                }}>
                  NOTA: Para convertir todo el documento en PDF, seleccione la
                  primera hoja y, manteniendo presionada la tecla Control,
                  seleccione las demás hojas vinculadas. Luego seleccione
                  Archivo, Exportar, Crear documento PDF e inmediatamente se
                  abrirá la carpeta en la que se debe guardar.
                </Typography>
                <Typography variant="body2"
                            sx={{color: '#8b6914', fontWeight: '600'}}>
                  EN LA FECHA COORDINADA DEBE REMITIR TANTO EL DOCUMENTO FIRMADO
                  EN PDF COMO EL ARCHIVO EN EXCEL
                </Typography>
              </Alert>

              <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}
                     sx={{justifyContent: 'center', mt: 4}}>
                <Button
                  variant={isRead ? 'contained' : 'outlined'}
                  startIcon={<CheckCircleIcon/>}
                  onClick={() => setIsRead(!isRead)}
                  sx={isRead ? {
                    backgroundColor: '#388e3c',
                    '&:hover': {backgroundColor: '#2e7d32'},
                  } : {
                    color: '#12457d',
                    borderColor: '#12457d',
                    '&:hover': {backgroundColor: '#f0f4ff'},
                  }}
                >
                  {isRead ? 'Leído' : 'Marcar como leído'}
                </Button>
                <Button
                  variant="contained"
                  endIcon={<ArrowForwardIcon/>}
                  onClick={handleBegin}
                  disabled={!isRead}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontSize: '1rem',
                    backgroundColor: '#2c2c2c',
                    '&:hover': {backgroundColor: '#1a1a1a'},
                    '&.Mui-disabled': {
                      backgroundColor: '#e0e0e0',
                      color: '#9e9e9e'
                    }
                  }}
                >
                  Comenzar
                </Button>
              </Stack>
            </>
          )}
        </Box>
      </Container>
    </>
  );
}
