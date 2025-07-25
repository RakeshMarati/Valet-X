import React, { useEffect, useState } from 'react';

const statusOptions = [
  'requested',
  'dropped-off',
  'parked',
  'in-transit',
  'completed',
];

export default function ValetDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchTickets = () => {
    setLoading(true);
    fetch('http://localhost:4000/api/tickets')
      .then(res => res.json())
      .then(data => setTickets(data))
      .catch(err => setError('Failed to fetch tickets'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleStatusChange = (id, newStatus) => {
    setUpdatingId(id);
    fetch(`http://localhost:4000/api/tickets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
      .then(res => res.json())
      .then(() => fetchTickets())
      .catch(() => setError('Failed to update status'))
      .finally(() => setUpdatingId(null));
  };

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <h2 className="text-2xl font-bold mb-4 text-blue-700">Valet Dashboard</h2>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <ul>
          {tickets.map(ticket => (
            <li key={ticket.id} className="mb-2 p-4 border rounded bg-white flex flex-col md:flex-row md:justify-between md:items-center">
              <div>
                <span className="font-semibold">{ticket.carNumber}</span> <span className="text-gray-600">({ticket.status})</span> - User: {ticket.userId}
              </div>
              <div className="flex items-center gap-2 mt-2 md:mt-0">
                <select
                  value={ticket.status}
                  onChange={e => handleStatusChange(ticket.id, e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                  disabled={updatingId === ticket.id}
                >
                  {statusOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {updatingId === ticket.id && <span className="text-xs text-blue-500 ml-2">Updating...</span>}
              </div>
              <div className="text-xs text-gray-400 mt-2 md:mt-0">ID: {ticket.id}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 