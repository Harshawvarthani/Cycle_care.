const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const auth = require('../middleware/auth');
const ShareToken = require('../models/ShareToken');
const User = require('../models/User');
const Cycle = require('../models/Cycle');

// Helper to add days to a date
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// @route   POST api/share/generate
// @desc    Generate a new sharing link (valid for 7 days)
// @access  Private
router.post('/generate', auth, async (req, res) => {
  try {
    // Deactivate previous active tokens
    await ShareToken.updateMany(
      { userId: req.user.id, isActive: true },
      { isActive: false }
    );

    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    const shareToken = new ShareToken({
      userId: req.user.id,
      token,
      expiresAt
    });

    await shareToken.save();
    res.json({ token, expiresAt });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/share/active
// @desc    Get current user's active sharing token
// @access  Private
router.get('/active', auth, async (req, res) => {
  try {
    const activeToken = await ShareToken.findOne({
      userId: req.user.id,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    res.json(activeToken);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/share/revoke
// @desc    Revoke sharing links immediately
// @access  Private
router.put('/revoke', auth, async (req, res) => {
  try {
    await ShareToken.updateMany(
      { userId: req.user.id, isActive: true },
      { isActive: false }
    );
    res.json({ msg: 'Sharing revoked successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/share/view/:token
// @desc    Public viewing endpoint for a partner
// @access  Public
router.get('/view/:token', async (req, res) => {
  try {
    const shareToken = await ShareToken.findOne({
      token: req.params.token,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!shareToken) {
      return res.status(404).json({ msg: 'Sharing link has expired or is invalid' });
    }

    const user = await User.findById(shareToken.userId);
    if (!user) {
      return res.status(404).json({ msg: 'User profile not found' });
    }

    // Get cycles to calculate predictions (same logic as in cycles.js predictions)
    const cycles = await Cycle.find({ userId: user._id }).sort({ startDate: 1 });

    let avgCycleLength = user.averageCycleLength || 28;
    let avgPeriodLength = user.averagePeriodLength || 5;

    // Calculate actual average lengths if there are multiple logs
    if (cycles.length >= 2) {
      let totalDays = 0;
      let count = 0;
      for (let i = 1; i < cycles.length; i++) {
        const diffTime = Math.abs(cycles[i].startDate - cycles[i-1].startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 15 && diffDays <= 45) {
          totalDays += diffDays;
          count++;
        }
      }
      if (count > 0) {
        avgCycleLength = Math.round(totalDays / count);
      }

      let totalPeriodDays = 0;
      let periodCount = 0;
      cycles.forEach(c => {
        if (c.endDate) {
          const diffTime = Math.abs(c.endDate - c.startDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          if (diffDays >= 1 && diffDays <= 14) {
            totalPeriodDays += diffDays;
            periodCount++;
          }
        }
      });
      if (periodCount > 0) {
        avgPeriodLength = Math.round(totalPeriodDays / periodCount);
      }
    }

    // Anchor period
    let lastPeriodStart = null;
    if (cycles.length > 0) {
      lastPeriodStart = cycles[cycles.length - 1].startDate;
    } else if (user.lastPeriodDate) {
      lastPeriodStart = user.lastPeriodDate;
    }

    if (!lastPeriodStart) {
      return res.json({
        name: user.name,
        hasHistory: false,
        msg: 'User hasn\'t logged cycles yet to generate predictions.'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate predictions
    let predictedStartDate = new Date(lastPeriodStart);
    while (predictedStartDate < today) {
      predictedStartDate = addDays(predictedStartDate, avgCycleLength);
    }

    const predictedEndDate = addDays(predictedStartDate, avgPeriodLength - 1);
    const ovulationDate = addDays(predictedStartDate, -14);
    const fertileStartDate = addDays(ovulationDate, -5);
    const fertileEndDate = addDays(ovulationDate, 1);

    // Find cycle day
    let activeCycleStart = new Date(lastPeriodStart);
    while (addDays(activeCycleStart, avgCycleLength) <= today) {
      activeCycleStart = addDays(activeCycleStart, avgCycleLength);
    }
    const diffFromCycleStart = Math.ceil((today - activeCycleStart) / (1000 * 60 * 60 * 24)) + 1;
    const currentCycleDay = diffFromCycleStart > 0 ? diffFromCycleStart : 1;

    // Define current phase
    let currentPhase = 'Follicular';
    const ovulationStart = avgCycleLength - 14 - 5;
    const ovulationEnd = avgCycleLength - 14 + 1;

    if (currentCycleDay <= avgPeriodLength) {
      currentPhase = 'Menstrual';
    } else if (currentCycleDay >= ovulationStart && currentCycleDay <= ovulationEnd) {
      currentPhase = 'Ovulation';
    } else if (currentCycleDay < ovulationStart) {
      currentPhase = 'Follicular';
    } else {
      currentPhase = 'Luteal';
    }

    let daysUntilNextPeriod = Math.ceil((predictedStartDate - today) / (1000 * 60 * 60 * 24));
    if (daysUntilNextPeriod < 0) daysUntilNextPeriod = 0;

    // Construct support tip for partner
    let partnerTip = "Provide standard care and support.";
    switch (currentPhase) {
      case 'Menstrual':
        partnerTip = `${user.name} is currently in her Menstrual Phase. Her energy might be lower, and she may experience discomfort. Consider bringing a hot compress, offering a comforting massage, or suggesting gentle activities together.`;
        break;
      case 'Follicular':
        partnerTip = `${user.name} is in her Follicular Phase. She likely has rising energy levels and a brighter mood. Great time for outdoor activities, exercises, or starting new projects together!`;
        break;
      case 'Ovulation':
        partnerTip = `${user.name} is in her Ovulation Phase (peak fertility). Her energy and communication levels are usually high. Great time for social activities or planning dates!`;
        break;
      case 'Luteal':
        partnerTip = `${user.name} is in her Luteal Phase. She might feel a bit more tired or irritable as pre-menstrual symptoms approach. Practicing patience, offering relaxing settings, and taking chores off her plate can be incredibly helpful!`;
        break;
    }

    res.json({
      name: user.name,
      hasHistory: true,
      currentCycleDay,
      currentPhase,
      daysUntilNextPeriod,
      predictedStartDate,
      predictedEndDate,
      partnerTip
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
