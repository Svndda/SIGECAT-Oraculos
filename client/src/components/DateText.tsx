import { Typography, type TypographyProps, styled } from '@mui/material';

export const DateText = styled((props: TypographyProps) => (
  <Typography variant="body2" {...props} />
))(({ theme }) => ({
  color: 'var(--color-outline)',
  marginTop: theme.spacing(1),
}));