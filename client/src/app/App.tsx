import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Screen1 from './pages/Screen1';
import Screen2 from './pages/Screen2';
import Screen3 from './pages/Screen3';
import Home from './pages/Home';
import { RecordsProvider } from '../context/RecordsContext';


function App() {
  return (
    <RecordsProvider>
      <BrowserRouter>
        <Routes>

          { /* App Routes */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Screen1 />} />
            <Route path="screen2" element={<Screen2 />} />
            <Route path="screen3" element={<Screen3 />} />
            <Route path="home" element={<Home />} />
          </Route>

        </Routes>
      </BrowserRouter>
    </RecordsProvider>
  );
}

export default App;