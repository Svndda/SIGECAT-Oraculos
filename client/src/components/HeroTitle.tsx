import { Typography, type TypographyProps, styled } from '@mui/material';

export const HeroTitle = styled((props: TypographyProps) => (
  <Typography variant="h1" {...props} />
))(({ theme }) => ({
  fontSize: '2.5rem',
  fontWeight: 800,
  marginBottom: theme.spacing(2),
  [theme.breakpoints.up('md')]: {
    fontSize: '3.5rem',
  },
}));


