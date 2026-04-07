import { Outlet } from 'react-router-dom';
import type { NavLinkItem } from '../types/navigation';
import ResponsiveAppBar from '../components/ResponsiveAppBar';

export interface MainLayoutProps {
  appName?: string;
  navLinks: NavLinkItem[];
  settingsLinks?: NavLinkItem[];
}

export default function MainLayout ({ appName, navLinks, settingsLinks }: MainLayoutProps) {
  return (

    <div className="app">
      <ResponsiveAppBar appName={appName} navLinks={navLinks} settingsLinks={settingsLinks  } />
      <main className="container flex-col centered" style={{ flexGrow: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}