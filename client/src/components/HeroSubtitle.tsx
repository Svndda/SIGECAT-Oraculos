import { Typography, type TypographyProps, styled } from '@mui/material';

export const HeroSubtitle = styled((props: TypographyProps) => (
  <Typography variant="h5" {...props} />
))({
  opacity: 0.9,
  fontWeight: 300,
  lineHeight: 1.6,
});
