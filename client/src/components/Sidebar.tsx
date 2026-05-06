import { useState } from 'react';
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
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';
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
  // { label: 'Organización', icon: <CorporateFareIcon fontSize="small" />, route: '/organizacion' },
  // { label: 'Trabajo', icon: <WorkIcon fontSize="small" />, route: '/laboral' },
  // { label: 'Ajustes', icon: <SettingsIcon fontSize="small" />, route: '/ajustes' },
];

export default function Sidebar() {
  const [open, setOpen] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    setConfirmOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <>
      <Box
        sx={{
          width: open ? OPEN_WIDTH : CLOSED_WIDTH,
          minHeight: '100%',
          backgroundColor: 'white',
          borderRight: '1px solid #e8e8e8',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* User section */}
        <Box sx={{ px: 1.5, py: 2, minHeight: 72, display: 'flex', alignItems: 'center' }}>
          {open ? (
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
              <IconButton size="small" onClick={() => setOpen(false)} sx={{ flexShrink: 0, color: '#666' }}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            </>
          ) : (
            <IconButton size="small" onClick={() => setOpen(true)} sx={{ mx: 'auto', color: '#666' }}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        <Divider />

        {/* Nav items */}
        <List sx={{ flex: 1, py: 1 }}>
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.route;
            return (
              <ListItemButton
                key={item.label}
                selected={active}
                onClick={() => navigate(item.route)}
                sx={{
                  borderRadius: 1,
                  mx: 1,
                  mb: 0.5,
                  justifyContent: open ? 'flex-start' : 'center',
                  px: open ? 1.5 : 1,
                  '&.Mui-selected': { backgroundColor: '#f0f0f0' },
                  '&.Mui-selected:hover': { backgroundColor: '#e8e8e8' },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: open ? 34 : 'auto',
                    color: active ? '#12457d' : '#555',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {open && (
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
              justifyContent: open ? 'flex-start' : 'center',
              px: open ? 1.5 : 1,
              color: '#d32f2f',
              '&:hover': { backgroundColor: '#fdecea' },
            }}
          >
            <ListItemIcon sx={{ minWidth: open ? 34 : 'auto', color: '#d32f2f' }}>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            {open && (
              <ListItemText
                primary="Cerrar sesión"
                primaryTypographyProps={{ variant: 'body2', color: '#d32f2f' }}
              />
            )}
          </ListItemButton>
        </List>
      </Box>

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
