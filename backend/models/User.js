const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    trim: true
  },
  averageCycleLength: {
    type: Number,
    default: 28
  },
  averagePeriodLength: {
    type: Number,
    default: 5
  },
  goal: {
    type: String,
    enum: ['track', 'avoid', 'conceive'],
    default: 'track'
  },
  isOnboarded: {
    type: Boolean,
    default: false
  },
  lastPeriodDate: {
    type: Date
  },
  height: {
    type: Number,
    default: null
  },
  settings: {
    unitTemperature: {
      type: String,
      enum: ['C', 'F'],
      default: 'C'
    },
    unitWeight: {
      type: String,
      enum: ['kg', 'lbs'],
      default: 'kg'
    },
    notificationPreferences: {
      periodAlert: { type: Boolean, default: true },
      fertileAlert: { type: Boolean, default: true },
      dailyLogAlert: { type: Boolean, default: true },
      hygieneAlert: { type: Boolean, default: true }
    },
    hygieneInterval: {
      type: Number, // in minutes
      default: 240
    },
    hygieneProduct: {
      type: String,
      enum: ['pad', 'tampon', 'cup', 'none'],
      default: 'pad'
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
