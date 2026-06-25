import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Sidebar from '../components/Sidebar';
import Breadcrumbs from '../components/Breadcrumbs';

export default function MainLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header onMenuClick={() => setMobileNavOpen(true)} />
      <Box sx={{ flex: 1, display: 'flex', minWidth: 0 }}>
        <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
        <Box
          component="main"
          sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
        >
          <Breadcrumbs />
          <Outlet />
        </Box>
      </Box>
      <Footer />
    </Box>
  );
}
