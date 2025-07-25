let tickets = [];

// Create a new ticket
exports.createTicket = (req, res) => {
  const ticket = { id: Date.now().toString(), ...req.body };
  tickets.push(ticket);
  res.status(201).json(ticket);
};

// Get all tickets
exports.getTickets = (req, res) => {
  res.json(tickets);
};

// Get a single ticket by ID
exports.getTicketById = (req, res) => {
  const ticket = tickets.find(t => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json(ticket);
};

// Update a ticket by ID
exports.updateTicket = (req, res) => {
  const idx = tickets.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Ticket not found' });
  tickets[idx] = { ...tickets[idx], ...req.body };
  res.json(tickets[idx]);
};

// Delete a ticket by ID
exports.deleteTicket = (req, res) => {
  const idx = tickets.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Ticket not found' });
  tickets.splice(idx, 1);
  res.json({ message: 'Ticket deleted' });
}; 