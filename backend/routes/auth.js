const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'cyclecare_jwt_secret_token_2026_super_secure';

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({
      name,
      email,
      password
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const payload = {
      id: user.id
    };

    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, isOnboarded: user.isOnboarded } });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const payload = {
      id: user.id
    };

    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, isOnboarded: user.isOnboarded } });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/auth/me
// @desc    Get logged in user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/auth/onboard
// @desc    Submit user onboarding questionnaire
// @access  Private
router.put('/onboard', auth, async (req, res) => {
  const { averageCycleLength, averagePeriodLength, goal, lastPeriodDate } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.averageCycleLength = averageCycleLength || 28;
    user.averagePeriodLength = averagePeriodLength || 5;
    user.goal = goal || 'track';
    user.isOnboarded = true;
    if (lastPeriodDate) {
      user.lastPeriodDate = new Date(lastPeriodDate);
    }

    await user.save();

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/auth/profile
// @desc    Update user profile settings
// @access  Private
router.put('/profile', auth, async (req, res) => {
  const { name, averageCycleLength, averagePeriodLength, goal, settings, height } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if (name !== undefined) user.name = name;
    if (averageCycleLength !== undefined) user.averageCycleLength = Number(averageCycleLength);
    if (averagePeriodLength !== undefined) user.averagePeriodLength = Number(averagePeriodLength);
    if (goal !== undefined) user.goal = goal;
    if (height !== undefined) user.height = height !== null ? Number(height) : null;

    if (settings) {
      if (settings.unitTemperature) user.settings.unitTemperature = settings.unitTemperature;
      if (settings.unitWeight) user.settings.unitWeight = settings.unitWeight;
      if (settings.notificationPreferences) {
        user.settings.notificationPreferences = {
          ...user.settings.notificationPreferences,
          ...settings.notificationPreferences
        };
      }
      user.markModified('settings');
    }

    await user.save();

    
    const updatedUser = await User.findById(user._id).select('-password');
    res.json(updatedUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;

