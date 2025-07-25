const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  carNumber: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['dropped-off', 'parked', 'requested', 'in-transit', 'completed'],
    default: 'dropped-off',
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Ticket', ticketSchema); 