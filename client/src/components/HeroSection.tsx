import { Box, type BoxProps } from '@mui/material';
import { styled } from '@mui/material/styles';

export const HeroSection = styled(Box)<BoxProps> (({ theme }) => ({
  backgroundColor: 'var(--brand-deep-blue)',
  color: '#ffffff',
  padding: theme.spacing(10, 0),
  textAlign: 'center',
}));
