import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/SecondaryLayout';
import type { MainLayoutProps } from '../layouts/SecondaryLayout';


const appUCRLinks : MainLayoutProps['navLinks'] = [
  { label: 'Inicio', route: '/' },
];

const settingsLinks : MainLayoutProps['settingsLinks'] = [
  { label: 'Configuración', route: '/settings' },
  { label: 'Cerrar sesión', route: '/logout' },
];

function App() {
  return (
    <BrowserRouter>
      <Routes>

        { /* App Routes */}
        <Route path="/" element={<MainLayout appName="SIGECAT" navLinks={appUCRLinks} settingsLinks={settingsLinks} />}>
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;