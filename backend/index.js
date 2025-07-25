const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

let tickets = [];

// Create a new ticket
app.post('/api/tickets', (req, res) => {
  const ticket = { id: Date.now().toString(), ...req.body };
  tickets.push(ticket);
  res.status(201).json(ticket);
});

// Get all tickets
app.get('/api/tickets', (req, res) => {
  res.json(tickets);
});

// Get a single ticket by ID
app.get('/api/tickets/:id', (req, res) => {
  const ticket = tickets.find(t => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json(ticket);
});

// Update a ticket by ID
app.put('/api/tickets/:id', (req, res) => {
  const idx = tickets.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Ticket not found' });
  tickets[idx] = { ...tickets[idx], ...req.body };
  res.json(tickets[idx]);
});

// Delete a ticket by ID
app.delete('/api/tickets/:id', (req, res) => {
  const idx = tickets.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Ticket not found' });
  tickets.splice(idx, 1);
  res.json({ message: 'Ticket deleted' });
});

// Probabilistic scoring model for exit gate prediction
function scoreGate({ gps, imu, ble, wifi, dwell, vector }, gate) {
  // Mock proximity: closer lat/lon to gate = higher score
  // Mock vector: if moving toward gate, higher score
  // Mock dwell: if dwell time in approach geofence, higher score
  // For demo, use random but weighted logic
  let proximity = ble?.[gate] || wifi?.[gate] || Math.random() * 100;
  let vectorScore = vector?.[gate] || (imu && Math.random() * 100) || Math.random() * 100;
  let dwellTime = dwell?.[gate] || Math.random() * 100;
  // Weights
  const w1 = 0.4, w2 = 0.4, w3 = 0.2;
  const score = w1 * proximity + w2 * vectorScore + w3 * dwellTime;
  return Math.round(score);
}

// Simulate BLE/Wi-Fi/geofence data for demo
function simulateSensorFusion(gps, imu) {
  // Simulate 4 gates: A, B, C, D
  const gates = ['A', 'B', 'C', 'D'];
  // Simulate BLE and Wi-Fi proximity (random for demo)
  const ble = Object.fromEntries(gates.map(g => [g, Math.random() * 100]));
  const wifi = Object.fromEntries(gates.map(g => [g, Math.random() * 80 + 10]));
  // Simulate dwell and vector (random for demo)
  const dwell = Object.fromEntries(gates.map(g => [g, Math.random() * 100]));
  const vector = Object.fromEntries(gates.map(g => [g, Math.random() * 100]));
  return { ble, wifi, dwell, vector };
}

// In-memory user state for demo
const userSensorHistory = {}; // { userId: [{ timestamp, scores, predictedGate, confidence }] }
const userDispatchState = {}; // { userId: { dispatchedGate, dispatchedAt, status, lastUpdate, lastScores } }

// Helper: get current timestamp
function now() { return Date.now(); }

// Helper: check if a single gate has >90 confidence for at least 10s (2+ consecutive submissions, 5s apart)
function shouldDispatch(history) {
  if (!history || history.length < 2) return null;
  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  if (
    last.confidence > 90 &&
    prev.confidence > 90 &&
    last.predictedGate === prev.predictedGate &&
    last.timestamp - prev.timestamp >= 5000 &&
    last.timestamp - prev.timestamp <= 15000 // allow for 5-15s gap
  ) {
    return last.predictedGate;
  }
  return null;
}

// Sensor data endpoint with full dispatch logic
app.post('/api/sensordata', (req, res) => {
  const { gps, imu, userId = 'demoUser' } = req.body;
  // Simulate sensor fusion for demo
  const { ble, wifi, dwell, vector } = simulateSensorFusion(gps, imu);
  const gates = ['A', 'B', 'C', 'D'];
  const scores = {};
  gates.forEach(gate => {
    scores[gate] = scoreGate({ gps, imu, ble, wifi, dwell, vector }, gate);
  });
  // Find the gate with the highest score
  let predictedGate = gates[0];
  let maxScore = scores[predictedGate];
  gates.forEach(gate => {
    if (scores[gate] > maxScore) {
      predictedGate = gate;
      maxScore = scores[gate];
    }
  });
  // Track user sensor history
  if (!userSensorHistory[userId]) userSensorHistory[userId] = [];
  userSensorHistory[userId].push({
    timestamp: now(),
    scores,
    predictedGate,
    confidence: maxScore
  });
  // Keep only last 10
  if (userSensorHistory[userId].length > 10) userSensorHistory[userId].shift();
  // Dispatch logic
  let dispatchInfo = userDispatchState[userId] || { status: 'pending' };
  const history = userSensorHistory[userId];
  const dispatchGate = shouldDispatch(history);
  // Signal loss: if last update >90s ago
  const lastUpdate = history[history.length - 1].timestamp;
  if (dispatchInfo.lastUpdate && now() - dispatchInfo.lastUpdate > 90000) {
    dispatchInfo = { status: 'signal_lost', message: 'No sensor data for over 90 seconds.' };
  }
  // If not yet dispatched and should dispatch
  else if (dispatchInfo.status !== 'dispatched' && dispatchGate) {
    dispatchInfo = {
      status: 'dispatched',
      dispatchedGate: dispatchGate,
      dispatchedAt: now(),
      lastScores: scores
    };
  }
  // If already dispatched, check for direction change
  else if (dispatchInfo.status === 'dispatched') {
    // If a new gate now has >90 and is different, and not yet in-transit, redirect
    if (predictedGate !== dispatchInfo.dispatchedGate && maxScore > 90) {
      if (!dispatchInfo.inTransit) {
        dispatchInfo = {
          ...dispatchInfo,
          status: 'redirected',
          redirectedGate: predictedGate,
          redirectedAt: now(),
          lastScores: scores
        };
      } else {
        dispatchInfo = {
          ...dispatchInfo,
          message: `Car already in transit to Gate ${dispatchInfo.dispatchedGate}. Notify user to proceed to that gate.`
        };
      }
    }
  }
  // Update state
  dispatchInfo.lastUpdate = lastUpdate;
  userDispatchState[userId] = dispatchInfo;
  // Respond with full state
  res.json({
    predictedGate,
    confidence: maxScore,
    scores,
    breakdown: { ble, wifi, dwell, vector },
    dispatch: dispatchInfo,
    received: { gps, imu, userId }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 