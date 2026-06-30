const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Cycle = require('../models/Cycle');
const User = require('../models/User');

// Helper to add days to a date
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// @route   GET api/cycles
// @desc    Get all cycle logs for a user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const cycles = await Cycle.find({ userId: req.user.id }).sort({ startDate: -1 });
    res.json(cycles);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/cycles
// @desc    Create a new cycle log
// @access  Private
router.post('/', auth, async (req, res) => {
  const { startDate, endDate, flowIntensity, notes } = req.body;

  if (!startDate) {
    return res.status(400).json({ msg: 'Start date is required' });
  }

  try {
    const newCycle = new Cycle({
      userId: req.user.id,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      flowIntensity: flowIntensity || 'medium',
      notes
    });

    const cycle = await newCycle.save();
    res.json(cycle);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/cycles/:id
// @desc    Update a cycle log
// @access  Private
router.put('/:id', auth, async (req, res) => {
  const { startDate, endDate, flowIntensity, notes } = req.body;

  try {
    let cycle = await Cycle.findById(req.params.id);
    if (!cycle) {
      return res.status(404).json({ msg: 'Cycle log not found' });
    }

    if (cycle.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    if (startDate) cycle.startDate = new Date(startDate);
    // Explicitly allow setting endDate to null/undefined if it's active
    if (endDate !== undefined) {
      cycle.endDate = endDate ? new Date(endDate) : null;
    }
    if (flowIntensity) cycle.flowIntensity = flowIntensity;
    if (notes !== undefined) cycle.notes = notes;

    await cycle.save();
    res.json(cycle);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/cycles/:id
// @desc    Delete a cycle log
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const cycle = await Cycle.findById(req.params.id);
    if (!cycle) {
      return res.status(404).json({ msg: 'Cycle log not found' });
    }

    if (cycle.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await cycle.deleteOne();
    res.json({ msg: 'Cycle log removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/cycles/predictions
// @desc    Get period predictions, ovulation, and fertile window
// @access  Private
router.get('/predictions', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Get all cycle logs, sorted chronologically ascending to calculate average
    const cycles = await Cycle.find({ userId: req.user.id }).sort({ startDate: 1 });

    let avgCycleLength = user.averageCycleLength || 28;
    let avgPeriodLength = user.averagePeriodLength || 5;

    // If user has logged multiple cycles, calculate average cycle length based on start date differences
    if (cycles.length >= 2) {
      let totalDays = 0;
      let count = 0;
      for (let i = 1; i < cycles.length; i++) {
        const diffTime = Math.abs(cycles[i].startDate - cycles[i-1].startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        // Only average cycles within reasonable bounds (e.g. 15 to 45 days) to avoid outliers
        if (diffDays >= 15 && diffDays <= 45) {
          totalDays += diffDays;
          count++;
        }
      }
      if (count > 0) {
        avgCycleLength = Math.round(totalDays / count);
      }

      // Calculate average period duration
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

    // Determine the anchor date (start date of the last logged period)
    let lastPeriodStart = null;
    if (cycles.length > 0) {
      lastPeriodStart = cycles[cycles.length - 1].startDate;
    } else if (user.lastPeriodDate) {
      lastPeriodStart = user.lastPeriodDate;
    }

    if (!lastPeriodStart) {
      return res.json({
        hasHistory: false,
        msg: 'Please log your last period start date to generate predictions'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate next period dates
    // If the last period start is long ago, predict subsequent ones relative to the latest predicted start date
    let predictedStartDate = new Date(lastPeriodStart);
    while (predictedStartDate < today) {
      predictedStartDate = addDays(predictedStartDate, avgCycleLength);
    }
    
    // In case the last period start was very recent and is still in the future or active
    if (predictedStartDate.getTime() === lastPeriodStart.getTime() && addDays(predictedStartDate, avgCycleLength) > today) {
      // Just keep predictedStartDate as is, or project the next one
    }

    const predictedEndDate = addDays(predictedStartDate, avgPeriodLength - 1);

    // Ovulation is typically 14 days before the next period starts
    const ovulationDate = addDays(predictedStartDate, -14);
    
    // Fertile window is typically 5 days before ovulation and 1 day after (6 days total)
    const fertileStartDate = addDays(ovulationDate, -5);
    const fertileEndDate = addDays(ovulationDate, 1);

    // Calculate current phase
    // 1. Menstrual phase: start of period to end of period
    // 2. Follicular phase: start of period to ovulation
    // 3. Ovulation phase: ovulation day and fertile window around it
    // 4. Luteal phase: after ovulation to start of next period
    let currentPhase = 'Follicular';
    let daysUntilNextPeriod = Math.ceil((predictedStartDate - today) / (1000 * 60 * 60 * 24));
    if (daysUntilNextPeriod < 0) daysUntilNextPeriod = 0;

    // Check where today fits in the current cycle
    // Find the latest start date of the active cycle (either last logged, or previous predicted)
    let activeCycleStart = new Date(lastPeriodStart);
    while (addDays(activeCycleStart, avgCycleLength) <= today) {
      activeCycleStart = addDays(activeCycleStart, avgCycleLength);
    }

    const diffFromCycleStart = Math.ceil((today - activeCycleStart) / (1000 * 60 * 60 * 24)) + 1; // 1-indexed day of cycle
    const currentCycleDay = diffFromCycleStart > 0 ? diffFromCycleStart : 1;

    // Determine current phase based on cycle day
    // Let's refine the phases
    const follicularEnd = avgCycleLength - 14 - 1; // day before ovulation
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

    res.json({
      hasHistory: true,
      lastPeriodStart,
      avgCycleLength,
      avgPeriodLength,
      predictedStartDate,
      predictedEndDate,
      ovulationDate,
      fertileStartDate,
      fertileEndDate,
      currentCycleDay,
      currentPhase,
      daysUntilNextPeriod
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
