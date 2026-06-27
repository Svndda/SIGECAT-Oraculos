import {
  Breadcrumbs as MuiBreadcrumbs,
  Link as MuiLink,
  Typography,
  Box
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import {Link, useLocation} from 'react-router-dom';

interface RouteNode {
  label: string;
  parent?: string;
}

const ROUTES: Record<string, RouteNode> = {
  '/': {label: 'Inicio'},
  '/declaracion-registro': {label: 'Registro de Cargas', parent: '/'},
  '/employee-form': {
    label: 'Información del puesto',
    parent: '/declaracion-registro'
  },
  '/work-hours': {label: 'Cargas de trabajo', parent: '/employee-form'},
  '/cambiar-contrasena': {label: 'Cambiar contraseña', parent: '/'},
  '/ajustes': {label: 'Ajustes', parent: '/'},
  '/usuarios': {label: 'Usuarios', parent: '/'},
  '/areas': {label: 'Áreas', parent: '/'},
  '/departamentos': {label: 'Departamentos', parent: '/'},
  '/secciones': {label: 'Secciones', parent: '/'},
  '/unidades': {label: 'Unidades', parent: '/'},
  '/cargos': {label: 'Cargos', parent: '/'},
  '/declaraciones': {label: 'Declaraciones', parent: '/'},
  '/plazas': {label: 'Plazas', parent: '/'},
};

function buildTrail(pathname: string): Array<{ path: string; label: string }> {
  const trail: Array<{ path: string; label: string }> = [];
  let current: string | undefined = pathname;

  while (current && ROUTES[current]) {
    const node: RouteNode = ROUTES[current];
    trail.unshift({path: current, label: node.label});
    current = node.parent;
  }

  return trail;
}

export default function Breadcrumbs() {
  const {pathname} = useLocation();
  const trail = buildTrail(pathname);

  if (trail.length <= 1) return null;

  return (
    <Box sx={{px: {xs: 2, sm: 3}, pt: 2}}>
      <MuiBreadcrumbs
        separator={<NavigateNextIcon fontSize="small" sx={{color: '#999'}}/>}>
        {trail.map((step, index) => {
          const isLast = index === trail.length - 1;
          if (isLast) {
            return (
              <Typography key={step.path}
                          sx={{color: '#12457d', fontWeight: 600}}
                          variant="body2">
                {step.label}
              </Typography>
            );
          }
          return (
            <MuiLink
              key={step.path}
              component={Link}
              to={step.path}
              underline="hover"
              variant="body2"
              sx={{color: '#666', '&:hover': {color: '#12457d'}}}
            >
              {step.label}
            </MuiLink>
          );
        })}
      </MuiBreadcrumbs>
    </Box>
  );
}