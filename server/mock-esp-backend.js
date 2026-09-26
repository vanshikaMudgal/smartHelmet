/**
 * STANDALONE ESP BACKEND SERVER (Node.js + Express ES Module)
 *
 * This server receives real PUT requests from ESP devices / helmets,
 * saves their latest telemetry in memory, and serves them via GET to the frontend.
 *
 * Usage:
 *   node server/mock-esp-backend.js
 *   or: npm run backend:mock
 *
 * Endpoints:
 *   PUT /api/v1/helmets          -> Ingests ESP helmet packet (single object or array)
 *   PUT /api/v1/helmets/:id      -> Ingests ESP helmet packet by ID
 *   GET /api/v1/helmets          -> Returns latest state of all helmets
 *   GET /api/v1/health           -> Server health probe
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-memory store for active helmet states
const helmetsStore = new Map();

// Seed with default initial mine site helmets
const initialMineHelmets = [
  {
    helmetId: 'HELM-001',
    workerName: 'J. Martinez',
    sector: 'Sector A',
    latitude: 28.6156,
    longitude: 77.2091,
    signalStrength: -68,
    depth: 161,
    timestamp: new Date().toISOString()
  },
  {
    helmetId: 'HELM-002',
    workerName: 'R. Okafor',
    sector: 'Sector B',
    latitude: 28.6158,
    longitude: 77.2122,
    signalStrength: -74,
    depth: 197,
    timestamp: new Date().toISOString()
  },
  {
    helmetId: 'HELM-003',
    workerName: 'D. Patel',
    sector: 'Sector C',
    latitude: 28.6134,
    longitude: 77.2109,
    signalStrength: -54,
    depth: 31,
    timestamp: new Date().toISOString()
  },
  {
    helmetId: 'HELM-004',
    workerName: 'S. Kim',
    sector: 'Sector A',
    latitude: 28.6124,
    longitude: 77.2096,
    signalStrength: -58,
    depth: 22,
    timestamp: new Date().toISOString()
  },
  {
    helmetId: 'HELM-005',
    workerName: 'L. Torres',
    sector: 'Sector D',
    latitude: 28.6160,
    longitude: 77.2110,
    signalStrength: -71,
    depth: 184,
    timestamp: new Date().toISOString()
  },
  {
    helmetId: 'HELM-006',
    workerName: 'M. Adeyemi',
    sector: 'Sector B',
    latitude: 28.6132,
    longitude: 77.2060,
    signalStrength: -88,
    depth: 186,
    timestamp: new Date(Date.now() - 25000).toISOString() // Simulated offline
  },
  {
    helmetId: 'HELM-007',
    workerName: 'A. Novak',
    sector: 'Sector C',
    latitude: 28.6158,
    longitude: 77.2065,
    signalStrength: -56,
    depth: 50,
    timestamp: new Date().toISOString()
  }
];

initialMineHelmets.forEach(h => helmetsStore.set(h.helmetId, h));

// GET /api/v1/health
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString(), trackedHelmets: helmetsStore.size });
});

// GET /api/v1/helmets -> Frontend polling endpoint
app.get('/api/v1/helmets', (req, res) => {
  const helmetsList = Array.from(helmetsStore.values());
  res.json(helmetsList);
});

// PUT /api/v1/helmets -> ESP device ingestion endpoint
app.put('/api/v1/helmets', (req, res) => {
  const body = req.body;

  if (Array.isArray(body)) {
    body.forEach(record => {
      const id = record.helmetId || record.id || record.device_id;
      if (id) {
        helmetsStore.set(id, {
          ...helmetsStore.get(id),
          ...record,
          helmetId: id,
          timestamp: record.timestamp || new Date().toISOString()
        });
      }
    });
    return res.status(200).json({ success: true, count: body.length });
  }

  const id = body.helmetId || body.id || body.device_id;
  if (!id) {
    return res.status(400).json({ error: 'Missing helmetId / id' });
  }

  const updatedRecord = {
    ...helmetsStore.get(id),
    ...body,
    helmetId: id,
    timestamp: body.timestamp || new Date().toISOString()
  };

  helmetsStore.set(id, updatedRecord);
  console.log(`[ESP PUT] Updated ${id}: Signal=${updatedRecord.signalStrength}dBm, Pos=(${updatedRecord.latitude}, ${updatedRecord.longitude})`);

  return res.status(200).json({ success: true, data: updatedRecord });
});

// PUT /api/v1/helmets/:id -> Alternate ESP device ingestion endpoint by path param
app.put('/api/v1/helmets/:id', (req, res) => {
  const id = req.params.id;
  const body = req.body;

  const updatedRecord = {
    ...helmetsStore.get(id),
    ...body,
    helmetId: id,
    timestamp: body.timestamp || new Date().toISOString()
  };

  helmetsStore.set(id, updatedRecord);
  console.log(`[ESP PUT] Updated ${id}: Signal=${updatedRecord.signalStrength}dBm, Pos=(${updatedRecord.latitude}, ${updatedRecord.longitude})`);

  return res.status(200).json({ success: true, data: updatedRecord });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  ROCKFALL SAFETY - ESP BACKEND SERVER RUNNING`);
  console.log(`  Listening on: http://localhost:${PORT}`);
  console.log(`  ESP PUT Endpoint:  PUT http://localhost:${PORT}/api/v1/helmets`);
  console.log(`  Frontend Endpoint: GET http://localhost:${PORT}/api/v1/helmets`);
  console.log(`====================================================`);
});
