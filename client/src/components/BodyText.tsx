import { Typography, type TypographyProps, styled } from '@mui/material';

export const BodyText = styled((props: TypographyProps) => (
  <Typography variant="body1" {...props} />
))({
  lineHeight: 1.7,
});