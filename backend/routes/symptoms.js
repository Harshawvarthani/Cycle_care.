const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Symptom = require('../models/Symptom');

// Helper to normalize dates to midnight UTC
const normalizeDate = (dateVal) => {
  const d = new Date(dateVal);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// @route   GET api/symptoms
// @desc    Get all symptom logs for user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const logs = await Symptom.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/symptoms/date/:date
// @desc    Get symptom log for a specific date (YYYY-MM-DD)
// @access  Private
router.get('/date/:date', auth, async (req, res) => {
  try {
    const searchDate = normalizeDate(req.params.date);
    const log = await Symptom.findOne({ userId: req.user.id, date: searchDate });
    if (!log) {
      return res.json(null);
    }
    res.json(log);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/symptoms
// @desc    Create or Update a symptom log for a date
// @access  Private
router.post('/', auth, async (req, res) => {
  const { date, symptoms, mood, energy, sleep, customTags, basalTemperature, weight, notes } = req.body;

  if (!date) {
    return res.status(400).json({ msg: 'Date is required' });
  }

  try {
    const targetDate = normalizeDate(date);

    let log = await Symptom.findOne({ userId: req.user.id, date: targetDate });

    if (log) {
      // Update existing log
      if (symptoms !== undefined) log.symptoms = symptoms;
      if (mood !== undefined) log.mood = mood;
      if (energy !== undefined) log.energy = energy;
      if (sleep !== undefined) log.sleep = sleep;
      if (customTags !== undefined) log.customTags = customTags;
      if (basalTemperature !== undefined) log.basalTemperature = basalTemperature;
      if (weight !== undefined) log.weight = weight;
      if (notes !== undefined) log.notes = notes;

      await log.save();
      return res.json(log);
    }

    // Create new log
    log = new Symptom({
      userId: req.user.id,
      date: targetDate,
      symptoms: symptoms || [],
      mood: mood || '',
      energy: energy || '',
      sleep: sleep || '',
      customTags: customTags || [],
      basalTemperature: basalTemperature !== undefined ? basalTemperature : null,
      weight: weight !== undefined ? weight : null,
      notes: notes || ''
    });

    await log.save();
    res.json(log);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/symptoms/trends
// @desc    Get aggregate data for symptoms and mood charts
// @access  Private
router.get('/trends', auth, async (req, res) => {
  try {
    const logs = await Symptom.find({ userId: req.user.id }).sort({ date: 1 });
    
    // Process symptom frequencies
    const symptomCounts = {};
    const moodCounts = {};
    const bbtTrend = [];
    const weightTrend = [];

    logs.forEach(log => {
      // Aggregate symptoms
      if (log.symptoms && Array.isArray(log.symptoms)) {
        log.symptoms.forEach(sym => {
          symptomCounts[sym] = (symptomCounts[sym] || 0) + 1;
        });
      }
      
      // Aggregate custom tags
      if (log.customTags && Array.isArray(log.customTags)) {
        log.customTags.forEach(tag => {
          symptomCounts[tag] = (symptomCounts[tag] || 0) + 1;
        });
      }

      // Aggregate moods
      if (log.mood) {
        moodCounts[log.mood] = (moodCounts[log.mood] || 0) + 1;
      }

      // Collect Basal Body Temp if exists
      if (log.basalTemperature !== undefined && log.basalTemperature !== null) {
        bbtTrend.push({
          date: log.date.toISOString().split('T')[0],
          temp: log.basalTemperature
        });
      }

      // Collect Weight if exists
      if (log.weight !== undefined && log.weight !== null) {
        weightTrend.push({
          date: log.date.toISOString().split('T')[0],
          weight: log.weight
        });
      }
    });

    // Format for charts
    const symptomData = Object.keys(symptomCounts).map(name => ({
      name,
      value: symptomCounts[name]
    })).sort((a, b) => b.value - a.value);

    const moodData = Object.keys(moodCounts).map(name => ({
      name,
      value: moodCounts[name]
    }));

    res.json({
      symptomData,
      moodData,
      bbtTrend,
      weightTrend
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/symptoms/correlations
// @desc    Calculate average energy, sleep, and symptoms grouped by menstrual cycle phase
// @access  Private
router.get('/correlations', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const Cycle = require('../models/Cycle');

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const avgCycleLength = user.averageCycleLength || 28;
    const avgPeriodLength = user.averagePeriodLength || 5;

    // Fetch all logs and cycle records
    const logs = await Symptom.find({ userId: req.user.id }).sort({ date: 1 });
    const cycles = await Cycle.find({ userId: req.user.id }).sort({ startDate: 1 });

    // Initial phase buckets
    const phaseStats = {
      Menstrual: { energySum: 0, sleepSum: 0, count: 0, symptoms: {} },
      Follicular: { energySum: 0, sleepSum: 0, count: 0, symptoms: {} },
      Ovulation: { energySum: 0, sleepSum: 0, count: 0, symptoms: {} },
      Luteal: { energySum: 0, sleepSum: 0, count: 0, symptoms: {} }
    };

    const energyMap = { low: 1, medium: 2, high: 3 };
    const sleepMap = { poor: 1, average: 2, good: 3 };

    logs.forEach(log => {
      const logDate = new Date(log.date);
      logDate.setHours(0, 0, 0, 0);

      // Find the anchor start date for this log's cycle
      let anchorDate = null;

      // Find the latest cycle start date that is <= logDate
      const matchingCycle = [...cycles].reverse().find(c => {
        const start = new Date(c.startDate);
        start.setHours(0, 0, 0, 0);
        return start <= logDate;
      });

      if (matchingCycle) {
        anchorDate = new Date(matchingCycle.startDate);
      } else if (user.lastPeriodDate) {
        anchorDate = new Date(user.lastPeriodDate);
      }

      if (!anchorDate) return;

      anchorDate.setHours(0, 0, 0, 0);

      // Calculate cycle day relative to anchorDate
      const diffTime = logDate - anchorDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      let cycleDay = (diffDays % avgCycleLength) + 1;
      if (cycleDay <= 0) cycleDay += avgCycleLength;

      // Categorize dayOfCycle into phase
      let phase = 'Follicular';
      const ovulationStart = avgCycleLength - 14 - 5;
      const ovulationEnd = avgCycleLength - 14 + 1;

      if (cycleDay <= avgPeriodLength) {
        phase = 'Menstrual';
      } else if (cycleDay >= ovulationStart && cycleDay <= ovulationEnd) {
        phase = 'Ovulation';
      } else if (cycleDay < ovulationStart) {
        phase = 'Follicular';
      } else {
        phase = 'Luteal';
      }

      // Aggregate energy, sleep, symptoms
      const eVal = energyMap[log.energy] || 0;
      const sVal = sleepMap[log.sleep] || 0;

      if (eVal > 0) {
        phaseStats[phase].energySum += eVal;
        phaseStats[phase].count++;
      }
      if (sVal > 0) {
        phaseStats[phase].sleepSum += sVal;
        if (eVal === 0) phaseStats[phase].count++; // Avoid double count
      }

      if (log.symptoms && Array.isArray(log.symptoms)) {
        log.symptoms.forEach(sym => {
          phaseStats[phase].symptoms[sym] = (phaseStats[phase].symptoms[sym] || 0) + 1;
        });
      }
    });

    // Format stats for frontend charting
    const correlations = Object.keys(phaseStats).map(phaseName => {
      const p = phaseStats[phaseName];
      const countVal = p.count || 1;
      const topSymptoms = Object.entries(p.symptoms)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(entry => entry[0]);

      return {
        phase: phaseName,
        avgEnergy: parseFloat((p.energySum / countVal).toFixed(2)) || 0,
        avgSleep: parseFloat((p.sleepSum / countVal).toFixed(2)) || 0,
        topSymptoms: topSymptoms.length > 0 ? topSymptoms : ['None Logged']
      };
    });

    res.json(correlations);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
