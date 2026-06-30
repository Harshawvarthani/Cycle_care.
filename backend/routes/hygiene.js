const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const HygieneLog = require('../models/HygieneLog');
const User = require('../models/User');
const Cycle = require('../models/Cycle');

// @route   GET api/hygiene/logs
// @desc    Get all hygiene logs
// @access  Private
router.get('/logs', auth, async (req, res) => {
  try {
    const logs = await HygieneLog.find({ userId: req.user.id }).sort({ timestamp: -1 }).limit(50);
    res.json(logs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/hygiene/log
// @desc    Log a hygiene product change
// @access  Private
router.post('/log', auth, async (req, res) => {
  const { productType, timestamp, notes } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const log = new HygieneLog({
      userId: req.user.id,
      productType: productType || user.settings.hygieneProduct || 'pad',
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      notes: notes || ''
    });

    await log.save();
    res.json(log);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/hygiene/settings
// @desc    Update hygiene product preferences and change intervals
// @access  Private
router.put('/settings', auth, async (req, res) => {
  const { hygieneInterval, hygieneProduct } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if (hygieneInterval !== undefined) user.settings.hygieneInterval = Number(hygieneInterval);
    if (hygieneProduct) user.settings.hygieneProduct = hygieneProduct;

    await user.save();
    res.json(user.settings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/hygiene/status
// @desc    Get current hygiene status, elapsed time since last change, and tips
// @access  Private
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const latestLog = await HygieneLog.findOne({ userId: req.user.id }).sort({ timestamp: -1 });

    const now = new Date();
    let minutesSinceChange = null;
    let needsChange = false;

    if (latestLog) {
      const diffTime = Math.abs(now - latestLog.timestamp);
      minutesSinceChange = Math.floor(diffTime / (1000 * 60));
      if (minutesSinceChange > user.settings.hygieneInterval) {
        needsChange = true;
      }
    } else {
      needsChange = true; // Recommend logging if no record exists
    }

    // Contextual tip based on current cycle day
    // Retrieve cycle predictions/info
    const latestCycle = await Cycle.findOne({ userId: req.user.id }).sort({ startDate: -1 });
    let cycleDay = 1;
    let tip = "Regular hygiene is vital: wear breathable cotton underwear and maintain fresh habits.";

    if (latestCycle) {
      const diffTime = now - latestCycle.startDate;
      cycleDay = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (cycleDay >= 1 && cycleDay <= 3) {
        tip = "Heavy flow days: Change your pad/tampon every 2-4 hours, or empty your cup every 4-8 hours. Staying clean prevents bacteria build-up.";
      } else if (cycleDay >= 4 && cycleDay <= 7) {
        tip = "Lighter flow days: You might switch to panty liners or a lighter product, but don't leave tampons in for more than 8 hours.";
      } else if (cycleDay > 7 && cycleDay <= 14) {
        tip = "Follicular/ovulation phase: Natural vaginal discharge may increase. Wear breathable clothing and wash with mild, unscented cleansers.";
      } else {
        tip = "Luteal phase: Some pre-menstrual spotting can occur. Keep a spare hygiene product in your bag just in case!";
      }
    }

    res.json({
      productPreference: user.settings.hygieneProduct,
      changeIntervalMinutes: user.settings.hygieneInterval,
      latestLog,
      minutesSinceChange,
      needsChange,
      tip
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
