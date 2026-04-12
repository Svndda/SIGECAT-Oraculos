import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import type { NavLinkItem } from '../types/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';

export interface MainLayoutProps {
  appName?: string;
  navLinks: NavLinkItem[];
  settingsLinks?: NavLinkItem[];
}

export default function MainLayout () {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      <Header />
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
        }}
      >
        <Outlet />
      </main>
      <Footer />
    </Box>
  );
}