import { Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

export const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: '2rem',
  fontWeight: 700,
  marginBottom: theme.spacing(4),
  marginTop: theme.spacing(8),
  position: 'relative',
  '&::after': {
    content: '""',
    display: 'block',
    width: '40px',
    height: '4px',
    backgroundColor: 'var(--brand-orange)',
    marginTop: theme.spacing(1),
  },
}));