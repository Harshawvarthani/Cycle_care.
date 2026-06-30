const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const hygieneLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productType: {
    type: String,
    enum: ['pad', 'tampon', 'cup', 'none'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    set: encrypt,
    get: decrypt
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

module.exports = mongoose.model('HygieneLog', hygieneLogSchema);
