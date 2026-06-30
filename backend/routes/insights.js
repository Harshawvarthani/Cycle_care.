const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Cycle = require('../models/Cycle');
const Symptom = require('../models/Symptom');
const Insight = require('../models/Insight');
const { Anthropic } = require('@anthropic-ai/sdk');

// Initializing Anthropic Client
let anthropic = null;
if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'mock-key-if-none-provided') {
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
}

// Rule-based Mock Insights Generator
function generateMockInsights(cycles, symptoms) {
  let cycleRegularity = 'Regular Cycle Length';
  const symptomPatterns = [];
  let recommendation = 'Your logs show a healthy, regular pattern. Keep logging your cycle to build a deeper history.';

  // 1. Analyze regularity
  if (cycles.length >= 3) {
    const lengths = [];
    for (let i = 1; i < cycles.length; i++) {
      const diffDays = Math.ceil((cycles[i].startDate - cycles[i-1].startDate) / (1000 * 60 * 60 * 24));
      lengths.push(diffDays);
    }
    const minLen = Math.min(...lengths);
    const maxLen = Math.max(...lengths);
    if (maxLen - minLen > 6) {
      cycleRegularity = 'Slightly Irregular Cycle Length';
      recommendation = 'Your cycle lengths show some variations (ranging from ' + minLen + ' to ' + maxLen + ' days). It is common for cycles to fluctuate slightly, but sharing this trend with a healthcare provider can provide helpful context.';
    }
  }

  // 2. Analyze symptoms
  const symptomFreq = {};
  symptoms.forEach(s => {
    if (s.symptoms && Array.isArray(s.symptoms)) {
      s.symptoms.forEach(sym => {
        symptomFreq[sym] = (symptomFreq[sym] || 0) + 1;
      });
    }
  });

  const topSymptoms = Object.entries(symptomFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(entry => entry[0]);

  if (topSymptoms.length > 0) {
    symptomPatterns.push(`Cramps and ${topSymptoms.join('/')} are your most frequently logged symptoms, peaking right before your period.`);
    symptomPatterns.push("Fatigue and lower energy are commonly logged during the early days of your cycle.");
  } else {
    symptomPatterns.push("No clear symptom patterns detected yet. Try logging daily symptoms on the Log page to unlock patterns!");
  }

  return {
    cycleRegularity,
    symptomPatterns,
    recommendation
  };
}

// @route   GET api/insights
// @desc    Generate or retrieve health insights
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Check if there is a cached insight generated in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cachedInsight = await Insight.findOne({
      userId: req.user.id,
      generatedAt: { $gte: oneDayAgo }
    }).sort({ generatedAt: -1 });

    if (cachedInsight) {
      return res.json(cachedInsight);
    }

    // Get last 6 months of data
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const cycles = await Cycle.find({
      userId: req.user.id,
      startDate: { $gte: sixMonthsAgo }
    }).sort({ startDate: 1 });

    const symptoms = await Symptom.find({
      userId: req.user.id,
      date: { $gte: sixMonthsAgo }
    }).sort({ date: 1 });

    if (cycles.length === 0) {
      return res.status(400).json({ msg: 'Not enough data. Please log at least one period start date to generate insights.' });
    }

    let insightsData = null;

    if (anthropic) {
      try {
        // Format data for AI prompt
        const cycleDataPrompt = cycles.map(c => `Start Date: ${c.startDate.toISOString().split('T')[0]}, End Date: ${c.endDate ? c.endDate.toISOString().split('T')[0] : 'Active'}, Flow: ${c.flowIntensity}`).join('\n');
        const symptomDataPrompt = symptoms.map(s => `Date: ${s.date.toISOString().split('T')[0]}, Symptoms: ${s.symptoms.join(', ')}, Mood: ${s.mood}, Energy: ${s.energy}, Temp: ${s.basalTemperature || 'N/A'}`).join('\n');

        const systemMessage = "You are CycleCare AI, an empathetic and supportive medical health assistant helping users understand their menstrual cycles. Analyze the user's cycle logs and symptoms. You MUST respond with a valid, clean JSON object ONLY. Do not include any markdown formatting, headers, or conversational text outside of the JSON block. The JSON format must be:\n{\n  \"cycleRegularity\": \"string describing regularity status\",\n  \"symptomPatterns\": [\"array of detected symptom trends/patterns\"],\n  \"recommendation\": \"gentle supportive medical advice/suggestion\"\n}";

        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 800,
          system: systemMessage,
          messages: [
            {
              role: 'user',
              content: `Here is my period logs over the past 6 months:\n${cycleDataPrompt}\n\nHere is my logged symptoms:\n${symptomDataPrompt}`
            }
          ]
        });

        const responseText = response.content[0].text.trim();
        // Remove markdown block backticks if present in AI output
        const jsonString = responseText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        insightsData = JSON.parse(jsonString);
      } catch (aiErr) {
        console.warn('Anthropic API request failed, falling back to rule-based mock generator:', aiErr.message);
        insightsData = generateMockInsights(cycles, symptoms);
      }
    } else {
      // Fallback
      insightsData = generateMockInsights(cycles, symptoms);
    }

    // Save and cache new insight
    const newInsight = new Insight({
      userId: req.user.id,
      cycleRegularity: insightsData.cycleRegularity,
      symptomPatterns: insightsData.symptomPatterns,
      recommendation: insightsData.recommendation,
      generatedAt: new Date()
    });

    await newInsight.save();
    res.json(newInsight);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
