const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

// Helper to encrypt arrays of strings
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

// Helper to encrypt numbers
const encryptNum = (num) => {
  if (num === undefined || num === null) return undefined;
  return encrypt(num.toString());
};

const decryptNum = (val) => {
  if (!val) return undefined;
  try {
    const decrypted = decrypt(val);
    return decrypted ? parseFloat(decrypted) : undefined;
  } catch (e) {
    return undefined;
  }
};

const symptomSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  symptoms: {
    type: String, // Encrypted array of symptoms
    set: encryptArray,
    get: decryptArray
  },
  mood: {
    type: String, // Encrypted mood
    set: encrypt,
    get: decrypt
  },
  energy: {
    type: String, // Encrypted energy level
    set: encrypt,
    get: decrypt
  },
  sleep: {
    type: String, // Encrypted sleep quality
    set: encrypt,
    get: decrypt
  },
  customTags: {
    type: String, // Encrypted custom tags array
    set: encryptArray,
    get: decryptArray
  },
  basalTemperature: {
    type: String, // Encrypted number
    set: encryptNum,
    get: decryptNum
  },
  weight: {
    type: String, // Encrypted weight (in kg)
    set: encryptNum,
    get: decryptNum
  },
  notes: {
    type: String, // Encrypted text
    set: encrypt,
    get: decrypt
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Compound index to ensure one log per user per day
symptomSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Symptom', symptomSchema);
