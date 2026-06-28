import {
  Container,
  Box,
  Button,
  Typography,
  Stack,
  Alert
} from '@mui/material';
import {useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {declarationService} from '../../services/declarationsService';
import type {ServiceError} from '../../services/common';
import DeclarationFunctions from '../../features/employee/DeclarationFunctions';
import DeclarationLicenses from '../../features/employee/DeclarationLicenses';
import DeclarationWorkday from '../../features/employee/DeclarationWorkday';

export default function WorkHoursPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleCompleteRecord = async () => {
    setIsSaving(true);
    try {
      // The declaration is created in EmployeeFormPage and passed via router
      // state; fall back to the user's current incomplete one.
      let declarationId = (location.state as { declarationId?: string } | null)?.declarationId ?? null;
      if (!declarationId) {
        const incomplete = await declarationService.checkIncomplete();
        declarationId = incomplete.has_incomplete ? incomplete.declaration_id ?? null : null;
      }
      if (!declarationId) {
        setMessage('Error: No se encontró una declaración activa para completar.');
        return;
      }

      await declarationService.changeStatus(declarationId, {status: 'Completed'});
      setMessage('Declaración completada exitosamente');

      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      const e = error as ServiceError;
      setMessage('Error al completar la declaración: ' + (e.message ?? String(error)));
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

        {/* Jornada laboral (magnitud + límites) */}
        <DeclarationWorkday/>

        {/* Funciones a desarrollar (propias del cargo / de otro cargo / apoyo condicional) */}
        <DeclarationFunctions/>

        {/* Permisos y licencias */}
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
            disabled={isSaving}
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
