const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const encryptArray = (arr) => {
  if (!arr) return undefined;
  return encrypt(JSON.stringify(arr));
};

const decryptArray = (val) => {
  if (!val) return [];
  try {
    const decrypted = decrypt(val);
    return decrypted ? JSON.parse(decrypted) : [];
  } catch (e) {
    return [];
  }
};

const insightSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cycleRegularity: {
    type: String,
    set: encrypt,
    get: decrypt
  },
  symptomPatterns: {
    type: String, // Encrypted serialized JSON array of patterns
    set: encryptArray,
    get: decryptArray
  },
  recommendation: {
    type: String,
    set: encrypt,
    get: decrypt
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

module.exports = mongoose.model('Insight', insightSchema);
