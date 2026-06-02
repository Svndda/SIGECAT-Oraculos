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
import PersonIcon from '@mui/icons-material/Person';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import BadgeIcon from '@mui/icons-material/Badge';
import LogoutIcon from '@mui/icons-material/Logout';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ModalAlert from './modals/ModalAlert';

const OPEN_WIDTH = 240;
const CLOSED_WIDTH = 64;

const NAV_ITEMS = [
  { label: 'Inicio', icon: <HomeIcon fontSize="small" />, route: '/' },
  { label: 'Usuarios', icon: <PersonIcon fontSize="small" />, route: '/usuarios' },
  { label: 'Áreas', icon: <CorporateFareIcon fontSize="small" />, route: '/organizacion' },
  { label: 'Departamentos', icon: <AccountTreeIcon fontSize="small" />, route: '/departamentos' },
  { label: 'Unidades', icon: <AccountTreeIcon fontSize="small" />, route: '/unidades' },
  { label: 'Plazas', icon: <BadgeIcon fontSize="small" />, route: '/plazas' },
];

interface SidebarProps {
  /** Whether the mobile (temporary) drawer is open. */
  mobileOpen: boolean;
  /** Closes the mobile drawer. */
  onMobileClose: () => void;
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  // Desktop-only collapse state (icon rail vs labelled).
  const [collapsed, setCollapsed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-close the mobile drawer whenever we grow past the breakpoint.
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

  /**
   * Renders the drawer body. `showLabels` is true on mobile (full overlay)
   * and on the expanded desktop rail; false on the collapsed desktop rail.
   */
  const renderContent = (showLabels: boolean) => (
    <>
      {/* User section */}
      <Box sx={{ px: 1.5, py: 2, minHeight: 72, display: 'flex', alignItems: 'center' }}>
        {showLabels ? (
          <>
            <Avatar sx={{ width: 38, height: 38, bgcolor: '#bdbdbd', flexShrink: 0 }} />
            <Box sx={{ flex: 1, overflow: 'hidden', mx: 1.5 }}>
              <Typography
                variant="caption"
                sx={{ color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 1 }}
                display="block"
              >
                Usuario
              </Typography>
              <Typography variant="subtitle2" fontWeight="bold" noWrap>
                {user ? `${user.first_name} ${user.last_name}` : ''}
              </Typography>
            </Box>
            {/* Collapse control: desktop collapses the rail, mobile closes the drawer. */}
            <IconButton
              size="small"
              onClick={() => (isMobile ? onMobileClose() : setCollapsed(true))}
              sx={{ flexShrink: 0, color: '#666' }}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          </>
        ) : (
          <IconButton size="small" onClick={() => setCollapsed(false)} sx={{ mx: 'auto', color: '#666' }}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Divider />

      {/* Nav items */}
      <List sx={{ py: 1 }}>
        {NAV_ITEMS.map((item) => {
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
              <ListItemIcon
                sx={{
                  minWidth: showLabels ? 34 : 'auto',
                  color: active ? '#12457d' : '#555',
                }}
              >
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

      {/* Logout */}
      <List sx={{ py: 1 }}>
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
          {showLabels && (
            <ListItemText
              primary="Cerrar sesión"
              primaryTypographyProps={{ variant: 'body2', color: '#d32f2f' }}
            />
          )}
        </ListItemButton>
      </List>
    </>
  );

  return (
    <>
      {/* Desktop: permanent collapsible rail */}
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

      {/* Mobile: temporary overlay drawer */}
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
