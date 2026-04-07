import { Typography, type TypographyProps, styled } from '@mui/material';

export const Title = styled((props: TypographyProps) => (
  <Typography variant="h5" gutterBottom {...props} />
))({
  color: 'var(--brand-deep-blue)',
  fontWeight: 600,
});