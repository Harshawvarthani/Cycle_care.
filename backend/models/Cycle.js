const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const cycleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  flowIntensity: {
    type: String,
    enum: ['light', 'medium', 'heavy', 'spotting'],
    default: 'medium'
  },
  notes: {
    type: String,
    get: decrypt,
    set: encrypt
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

module.exports = mongoose.model('Cycle', cycleSchema);
