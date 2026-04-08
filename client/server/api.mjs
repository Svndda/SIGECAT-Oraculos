import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const REGISTROS_FILE = path.join(__dirname, '../src/data/registros.json');

// Middleware
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Leer registros del archivo
const leerRegistros = () => {
  try {
    if (!fs.existsSync(REGISTROS_FILE)) {
      fs.writeFileSync(REGISTROS_FILE, JSON.stringify([]));
    }
    const data = fs.readFileSync(REGISTROS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error leyendo registros:', error);
    return [];
  }
};

// Escribir registros al archivo
const escribirRegistros = (registros) => {
  try {
    fs.writeFileSync(REGISTROS_FILE, JSON.stringify(registros, null, 2));
  } catch (error) {
    console.error('Error escribiendo registros:', error);
  }
};

// Rutas API

// GET /api/registros - Obtener todos los registros
app.get('/api/registros', (req, res) => {
  const registros = leerRegistros();
  res.json(registros);
});

// POST /api/registros - Crear un nuevo registro
app.post('/api/registros', (req, res) => {
  try {
    const registros = leerRegistros();
    const nuevoRegistro = {
      ...req.body,
      id: Date.now().toString(),
      fecha: new Date().toISOString(),
    };
    registros.push(nuevoRegistro);
    escribirRegistros(registros);
    res.status(201).json(nuevoRegistro);
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar registro' });
  }
});

// GET /api/registros/:id - Obtener un registro por ID
app.get('/api/registros/:id', (req, res) => {
  const registros = leerRegistros();
  const registro = registros.find((r) => r.id === req.params.id);
  if (registro) {
    res.json(registro);
  } else {
    res.status(404).json({ error: 'Registro no encontrado' });
  }
});

// PUT /api/registros/:id - Actualizar un registro
app.put('/api/registros/:id', (req, res) => {
  try {
    const registros = leerRegistros();
    const index = registros.findIndex((r) => r.id === req.params.id);
    if (index > -1) {
      registros[index] = {
        ...registros[index],
        ...req.body,
      };
      escribirRegistros(registros);
      res.json(registros[index]);
    } else {
      res.status(404).json({ error: 'Registro no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar registro' });
  }
});

// DELETE /api/registros/:id - Eliminar un registro
app.delete('/api/registros/:id', (req, res) => {
  try {
    let registros = leerRegistros();
    registros = registros.filter((r) => r.id !== req.params.id);
    escribirRegistros(registros);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar registro' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✓ Servidor API corriendo en http://localhost:${PORT}`);
  console.log(`✓ Datos guardados en: ${REGISTROS_FILE}`);
});
