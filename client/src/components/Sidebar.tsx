import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Drawer,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import BusinessIcon from '@mui/icons-material/Business';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import WorkIcon from '@mui/icons-material/Work';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ModalAlert from './modals/ModalAlert';
import {Engineering} from "@mui/icons-material";

const OPEN_WIDTH = 240;
const CLOSED_WIDTH = 64;

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  EMPLOYEE: 'Funcionario',
};

const ALL_NAV_ITEMS = [
  { label: 'Inicio', icon: <HomeIcon fontSize="small" />, route: '/', adminOnly: false },
  { label: 'Usuarios', icon: <PeopleIcon fontSize="small" />, route: '/usuarios', adminOnly: true },
  { label: 'Áreas', icon: <CorporateFareIcon fontSize="small" />, route: '/areas', adminOnly: true },
  { label: 'Departamentos', icon: <BusinessIcon fontSize="small" />, route: '/departamentos', adminOnly: true },
  { label: 'Secciones', icon: <ViewModuleIcon fontSize="small" />, route: '/secciones', adminOnly: true },
  { label: 'Unidades', icon: <AccountTreeIcon fontSize="small" />, route: '/unidades', adminOnly: true },
  { label: 'Cargos', icon: <Engineering fontSize="small" />, route: '/cargos', adminOnly: true },
  { label: 'Funciones', icon: <AssignmentIcon fontSize="small" />, route: '/funciones', adminOnly: true },
  { label: 'Funciones Personalizadas', icon: <AssignmentIndIcon fontSize="small" />, route: '/funciones-personalizadas', adminOnly: true },
  { label: 'Plazas', icon: <WorkIcon fontSize="small" />, route: '/plazas', adminOnly: true },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [collapsed, setCollapsed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user?.role === 'ADMIN';
  const navItems = ALL_NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  useEffect(() => {
    if (!isMobile) onMobileClose();
  }, [isMobile, onMobileClose]);

  const handleLogout = async () => {
    setConfirmOpen(false);
    onMobileClose();
    await logout();
    navigate('/login');
  };

  const handleNavigate = (route: string) => {
    navigate(route);
    if (isMobile) onMobileClose();
  };

  const renderContent = (showLabels: boolean) => (
    <>
      <Box
        sx={{
          px: 1.5,
          py: 2,
          minHeight: 72,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {showLabels ? (
          <>
            <Avatar sx={{ width: 38, height: 38, bgcolor: '#bdbdbd', flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0, mx: 1.5 }}>
              <Typography variant="caption" sx={{ color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 }} display="block">
                {user ? (ROLE_LABELS[user.role] ?? user.role) : ''}
              </Typography>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ wordBreak: 'break-word', lineHeight: 1.3 }}>
                {user ? `${user.first_name} ${user.last_name}` : ''}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                if (isMobile) onMobileClose();
                else setCollapsed(true);
              }}
              sx={{ flexShrink: 0, color: '#666' }}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          </>
        ) : (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(false);
            }}
            sx={{ mx: 'auto', color: '#666' }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Divider />

      <List sx={{ py: 1 }}>
        {navItems.map((item) => {
          const active = location.pathname === item.route;
          return (
            <ListItemButton
              key={item.label}
              selected={active}
              onClick={() => handleNavigate(item.route)}
              sx={{
                borderRadius: 1,
                mx: 1,
                mb: 0.5,
                justifyContent: showLabels ? 'flex-start' : 'center',
                px: showLabels ? 1.5 : 1,
                '&.Mui-selected': { backgroundColor: '#f0f0f0' },
                '&.Mui-selected:hover': { backgroundColor: '#e8e8e8' },
              }}
            >
              <ListItemIcon sx={{ minWidth: showLabels ? 34 : 'auto', color: active ? '#12457d' : '#555' }}>
                {item.icon}
              </ListItemIcon>
              {showLabels && (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    variant: 'body2',
                    fontWeight: active ? 600 : 400,
                    color: active ? '#12457d' : 'text.primary',
                  }}
                />
              )}
            </ListItemButton>
          );
        })}
      </List>

      <Divider />

      <List sx={{ py: 1 }}>
        <ListItemButton
          selected={location.pathname === '/ajustes'}
          onClick={() => handleNavigate('/ajustes')}
          sx={{
            borderRadius: 1,
            mx: 1,
            mb: 0.5,
            justifyContent: showLabels ? 'flex-start' : 'center',
            px: showLabels ? 1.5 : 1,
            '&.Mui-selected': { backgroundColor: '#f0f0f0' },
            '&.Mui-selected:hover': { backgroundColor: '#e8e8e8' },
          }}
        >
          <ListItemIcon sx={{ minWidth: showLabels ? 34 : 'auto', color: location.pathname === '/ajustes' ? '#12457d' : '#555' }}>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          {showLabels && (
            <ListItemText
              primary="Ajustes"
              primaryTypographyProps={{
                variant: 'body2',
                fontWeight: location.pathname === '/ajustes' ? 600 : 400,
                color: location.pathname === '/ajustes' ? '#12457d' : 'text.primary',
              }}
            />
          )}
        </ListItemButton>
        <ListItemButton
          onClick={() => setConfirmOpen(true)}
          sx={{
            borderRadius: 1,
            mx: 1,
            justifyContent: showLabels ? 'flex-start' : 'center',
            px: showLabels ? 1.5 : 1,
            color: '#d32f2f',
            '&:hover': { backgroundColor: '#fdecea' },
          }}
        >
          <ListItemIcon sx={{ minWidth: showLabels ? 34 : 'auto', color: '#d32f2f' }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          {showLabels && <ListItemText primary="Cerrar sesión" primaryTypographyProps={{ variant: 'body2', color: '#d32f2f' }} />}
        </ListItemButton>
      </List>
    </>
  );

  return (
    <>
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          width: collapsed ? CLOSED_WIDTH : OPEN_WIDTH,
          minHeight: '100%',
          backgroundColor: 'white',
          borderRight: '1px solid #e8e8e8',
          flexDirection: 'column',
          transition: 'width 0.2s ease',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {renderContent(!collapsed)}
      </Box>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: OPEN_WIDTH, boxSizing: 'border-box' },
        }}
      >
        {renderContent(true)}
      </Drawer>

      <ModalAlert
        open={confirmOpen}
        title="Cerrar sesión"
        message="¿Está seguro que desea cerrar su sesión?"
        confirmLabel="Cerrar sesión"
        cancelLabel="Cancelar"
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}