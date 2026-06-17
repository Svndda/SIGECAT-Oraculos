import { Container, Box, Button, Typography, Stack, TextField, Paper } from '@mui/material';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRecords } from '../../context/RecordsContext';
import { userService } from '../../services/userService';

/**
 * Read-only view of the employee's identity. These fields come from the
 * institutional SSO (and the user's record), so they are displayed, not
 * entered. Name and email come from the authenticated profile; the rest will
 * be filled by the SSO/back office once that data is available.
 */
export default function EmployeeFormPage() {
  const navigate = useNavigate();
  const { currentRecord, setCurrentRecord } = useRecords();

  const [info, setInfo] = useState({
    name: currentRecord?.name ?? '',
    idNumber: currentRecord?.idNumber ?? '',
    institutionalEmail: currentRecord?.institutionalEmail ?? '',
    employeeCode: currentRecord?.employeeCode ?? '',
    ucrRelationship: currentRecord?.ucrRelationship ?? '',
  });

  useEffect(() => {
    userService
      .getProfile()
      .then((profile) => {
        setInfo((prev) => ({
          ...prev,
          name: `${profile.first_name} ${profile.last_name}`.trim(),
          institutionalEmail: profile.email,
        }));
      })
      .catch(() => {
        // SSO/profile not available; keep whatever the record already had.
      });
  }, []);

  const handleNext = () => {
    setCurrentRecord({
      name: info.name,
      idNumber: info.idNumber,
      institutionalEmail: info.institutionalEmail,
      employeeCode: info.employeeCode,
      ucrRelationship: info.ucrRelationship,
      workLocation: currentRecord?.workLocation ?? '',
      plazaNumber: currentRecord?.plazaNumber ?? '',
      occupationalClass: currentRecord?.occupationalClass ?? null,
      workShift: currentRecord?.workShift ?? '',
      startTime: currentRecord?.startTime ?? '',
      endTime: currentRecord?.endTime ?? '',
      objective: currentRecord?.objective ?? '',
      isRead: currentRecord?.isRead ?? false,
      hours: currentRecord?.hours ?? [],
    });
    navigate('/work-hours');
  };

  const fields: Array<{ label: string; value: string }> = [
    { label: 'Nombre completo', value: info.name },
    { label: 'Número de cédula', value: info.idNumber },
    { label: 'Correo institucional', value: info.institutionalEmail },
    { label: 'Código de empleado', value: info.employeeCode },
    { label: 'Relación UCR', value: info.ucrRelationship },
  ];

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 'bold', color: '#12457d', textAlign: 'center' }}>
          Cargas de Trabajo
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 4, color: '#666', textAlign: 'center' }}>
          Información General
        </Typography>

        <Paper sx={{ p: { xs: 2, sm: 4 }, backgroundColor: '#f9f9fd' }}>
          <Box sx={{ p: 2, mb: 3, bgcolor: '#f0f8ff', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1565c0' }}>
              Estos datos provienen del SSO institucional y no son editables.
            </Typography>
          </Box>

          <Stack spacing={2.5}>
            {fields.map((f) => (
              <TextField
                key={f.label}
                label={f.label}
                value={f.value}
                placeholder="—"
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
                sx={{ backgroundColor: 'white' }}
              />
            ))}
          </Stack>

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
              sx={{ backgroundColor: '#2c2c2c', '&:hover': { backgroundColor: '#1a1a1a' } }}
            >
              Siguiente
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
}
