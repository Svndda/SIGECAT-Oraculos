// components/PasswordStrengthFeedback.tsx
import { Box, Typography, LinearProgress } from '@mui/material';
import { Check, Close } from '@mui/icons-material';
import zxcvbn from 'zxcvbn';

interface Props {
  password?: string;
}

export default function PasswordStrengthFeedback({ password = '' }: Props) {
  const rules = [
    { label: 'Mínimo 8 caracteres', met: password.length >= 8 },
    { label: 'Al menos una mayúscula', met: /[A-Z]/.test(password) },
    { label: 'Al menos un número', met: /[0-9]/.test(password) },
    { label: 'Al menos un caracter especial', met: /[^a-zA-Z0-9]/.test(password) },
  ];

  const evaluation = zxcvbn(password);
  const progress = password ? (evaluation.score * 25) : 0;

  const getStrengthDetails = () => {
    if (!password) return { color: '#e0e0e0', label: '' };
    switch (evaluation.score) {
      case 0:
      case 1: return { color: '#d32f2f', label: 'Muy débil' };
      case 2: return { color: '#ed6c02', label: 'Regular' };
      case 3: return { color: '#2e7d32', label: 'Buena' };
      case 4: return { color: '#1b5e20', label: 'Fuerte' };
      default: return { color: '#e0e0e0', label: '' };
    }
  };

  const { color, label } = getStrengthDetails();

  if (!password) return null;

  return (
    <Box sx={{ mt: 1.5, mb: 2, px: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            flexGrow: 1,
            height: 6,
            borderRadius: 3,
            bgcolor: '#e0e0e0',
            '& .MuiLinearProgress-bar': { backgroundColor: color, transition: 'background-color 0.3s ease' },
          }}
        />
        <Typography variant="caption" sx={{ ml: 2, color, fontWeight: 'bold', minWidth: 60 }}>
          {label}
        </Typography>
      </Box>

      <Box sx={{ mt: 1 }}>
        {rules.map((rule, idx) => (
          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            {rule.met ? (
              <Check sx={{ color: 'success.main', fontSize: 16, mr: 1 }} />
            ) : (
              <Close sx={{ color: 'error.main', fontSize: 16, mr: 1 }} />
            )}
            <Typography
              variant="caption"
              sx={{ color: rule.met ? 'success.main' : 'error.main', transition: 'color 0.2s' }}
            >
              {rule.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}