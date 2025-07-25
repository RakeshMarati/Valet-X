import React, { useState, useEffect } from 'react';
import ValetDashboard from './ValetDashboard';

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState({ userId: '', carNumber: '', status: 'requested' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sensorData, setSensorData] = useState({});
  const [backendResponse, setBackendResponse] = useState(null);
  const [view, setView] = useState('user'); // 'user' or 'valet'

  // Fetch tickets from backend
  const fetchTickets = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:4000/api/tickets');
      if (!res.ok) throw new Error('Failed to fetch tickets');
      const data = await res.json();
      setTickets(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Handle form input
  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle form submit (create ticket)
  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:4000/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to create ticket');
      setForm({ userId: '', carNumber: '', status: 'requested' });
      fetchTickets();
    } catch (err) {
      setError(err.message);
    }
  };

  // Sensor collection logic
  const collectAndSendSensorData = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const gps = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          let imu = {};
          const handleMotion = event => {
            imu = {
              acceleration: event.acceleration,
              accelerationIncludingGravity: event.accelerationIncludingGravity,
              rotationRate: event.rotationRate,
              interval: event.interval,
            };
            setSensorData({ gps, imu });
            fetch('http://localhost:4000/api/sensordata', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ gps, imu, userId: form.userId || 'demoUser' }),
            })
              .then(res => res.json())
              .then(data => setBackendResponse(data))
              .catch(err => setBackendResponse({ error: err.message }));
            window.removeEventListener('devicemotion', handleMotion);
          };
          window.addEventListener('devicemotion', handleMotion, { once: true });
        },
        err => {
          setError('Geolocation permission required. Please allow location access and try again.');
        }
      );
    } else {
      setError('Geolocation not supported in this browser');
    }
  };

  // --- UI ---
  if (view === 'valet') {
    return (
      <div>
        <div className="flex justify-center py-4">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
            onClick={() => setView('user')}
          >
            Switch to User View
          </button>
        </div>
        <ValetDashboard />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8">
      <div className="flex justify-center mb-6">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
          onClick={() => setView('valet')}
        >
          Switch to Valet Dashboard
        </button>
      </div>
      <h1 className="text-3xl font-bold text-blue-700 mb-6">Intelligent Valet System</h1>
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-8 w-full max-w-md">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">User ID</label>
          <input name="userId" value={form.userId} onChange={handleChange} required className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Car Number</label>
          <input name="carNumber" value={form.carNumber} onChange={handleChange} required className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Status</label>
          <select name="status" value={form.status} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
            <option value="requested">Requested</option>
            <option value="dropped-off">Dropped-off</option>
            <option value="parked">Parked</option>
            <option value="in-transit">In-transit</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Create Ticket</button>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </form>
      <button onClick={collectAndSendSensorData} className="mb-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Request Car (Send Sensor Data)</button>
      {sensorData.gps && (
        <div className="mb-4 p-4 bg-white rounded shadow w-full max-w-md">
          <h3 className="font-semibold mb-2">Latest Sensor Data</h3>
          <pre className="text-xs text-gray-700">{JSON.stringify(sensorData, null, 2)}</pre>
        </div>
      )}
      {backendResponse && (
        <div className="mb-4 p-4 bg-blue-50 rounded shadow w-full max-w-md">
          <h3 className="font-semibold mb-2">Backend Response</h3>
          <pre className="text-xs text-gray-700">{JSON.stringify(backendResponse, null, 2)}</pre>
        </div>
      )}
      <div className="w-full max-w-2xl bg-white shadow-md rounded p-6">
        <h2 className="text-xl font-semibold mb-4">All Tickets</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <ul>
            {tickets.map(ticket => (
              <li key={ticket.id} className="border-b py-2 flex justify-between items-center">
                <span>
                  <span className="font-semibold">{ticket.carNumber}</span> ({ticket.status}) - User: {ticket.userId}
                </span>
                <span className="text-xs text-gray-400">ID: {ticket.id}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
