import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const RECORDS_FILE = path.join(__dirname, '../src/data/records.json');

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

// Read records from file
const readRecords = () => {
  try {
    if (!fs.existsSync(RECORDS_FILE)) {
      fs.writeFileSync(RECORDS_FILE, JSON.stringify([]));
    }
    const data = fs.readFileSync(RECORDS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error reading records:', error);
    return [];
  }
};

// Write records to file
const writeRecords = (records) => {
  try {
    fs.writeFileSync(RECORDS_FILE, JSON.stringify(records, null, 2));
  } catch (error) {
    console.error('Error writing records:', error);
  }
};

// API Routes

// GET /api/records - Get all records
app.get('/api/records', (req, res) => {
  const records = readRecords();
  res.json(records);
});

// POST /api/records - Create a new record
app.post('/api/records', (req, res) => {
  try {
    const records = readRecords();
    const newRecord = {
      ...req.body,
      id: Date.now().toString(),
      fecha: new Date().toISOString(),
    };
    records.push(newRecord);
    writeRecords(records);
    res.status(201).json(newRecord);
  } catch (error) {
    res.status(500).json({ error: 'Error saving record' });
  }
});

// GET /api/records/:id - Get a record by ID
app.get('/api/records/:id', (req, res) => {
  const records = readRecords();
  const record = records.find((r) => r.id === req.params.id);
  if (record) {
    res.json(record);
  } else {
    res.status(404).json({ error: 'Record not found' });
  }
});

// PUT /api/records/:id - Update a record
app.put('/api/records/:id', (req, res) => {
  try {
    const records = readRecords();
    const index = records.findIndex((r) => r.id === req.params.id);
    if (index > -1) {
      records[index] = {
        ...records[index],
        ...req.body,
      };
      writeRecords(records);
      res.json(records[index]);
    } else {
      res.status(404).json({ error: 'Record not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error updating record' });
  }
});

// DELETE /api/records/:id - Delete a record
app.delete('/api/records/:id', (req, res) => {
  try {
    let records = readRecords();
    records = records.filter((r) => r.id !== req.params.id);
    writeRecords(records);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting record' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ API Server running at http://localhost:${PORT}`);
  console.log(`✓ Data saved at: ${RECORDS_FILE}`);
});
