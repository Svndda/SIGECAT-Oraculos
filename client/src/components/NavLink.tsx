import { styled } from '@mui/material/styles';
import { Link } from '@mui/material';

export const NavLink = styled(Link)(({ /*theme*/ }) => ({
  color: 'inherit',
  textDecoration: 'none',
  fontWeight: 500,
  fontSize: '0.9rem',
  '&:hover': {
    color: 'var(--brand-light-orange)',
  },
}));