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

// @route   POST api/insights/chat
// @desc    Empathetic chatbot for health queries using decrypted user history
// @access  Private
router.post('/chat', auth, async (req, res) => {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ msg: 'Message is required' });
  }

  try {
    const User = require('../models/User');
    // Gather last 3 months of cycle and symptom history (automatically decrypted by getters)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const cycles = await Cycle.find({
      userId: req.user.id,
      startDate: { $gte: threeMonthsAgo }
    }).sort({ startDate: 1 });

    const symptoms = await Symptom.find({
      userId: req.user.id,
      date: { $gte: threeMonthsAgo }
    }).sort({ date: 1 });

    const user = await User.findById(req.user.id);
    let avgCycleLength = user?.averageCycleLength || 28;
    let avgPeriodLength = user?.averagePeriodLength || 5;

    // Calculate predictions to know current phase
    let currentPhase = 'Unknown';
    let currentCycleDay = 1;
    let daysUntilNextPeriod = 'N/A';

    let lastPeriodStart = null;
    if (cycles.length > 0) {
      lastPeriodStart = cycles[cycles.length - 1].startDate;
    } else if (user?.lastPeriodDate) {
      lastPeriodStart = user.lastPeriodDate;
    }

    if (lastPeriodStart) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let predictedStartDate = new Date(lastPeriodStart);
      while (predictedStartDate < today) {
        predictedStartDate.setDate(predictedStartDate.getDate() + avgCycleLength);
      }
      daysUntilNextPeriod = Math.ceil((predictedStartDate - today) / (1000 * 60 * 60 * 24));
      
      let activeCycleStart = new Date(lastPeriodStart);
      while (new Date(activeCycleStart.getTime() + avgCycleLength * 24 * 60 * 60 * 1000) <= today) {
        activeCycleStart.setDate(activeCycleStart.getDate() + avgCycleLength);
      }
      currentCycleDay = Math.ceil((today - activeCycleStart) / (1000 * 60 * 60 * 24)) + 1;
      
      if (currentCycleDay <= avgPeriodLength) {
        currentPhase = 'Menstrual';
      } else if (currentCycleDay >= avgCycleLength - 14 - 5 && currentCycleDay <= avgCycleLength - 14 + 1) {
        currentPhase = 'Ovulation';
      } else if (currentCycleDay < avgCycleLength - 14 - 5) {
        currentPhase = 'Follicular';
      } else {
        currentPhase = 'Luteal';
      }
    }

    // Prepare Context for Claude
    const cyclesSummary = cycles.map(c => `- Started: ${c.startDate.toISOString().split('T')[0]}, Flow: ${c.flowIntensity}`).join('\n');
    const symptomsSummary = symptoms.map(s => `- Date: ${s.date.toISOString().split('T')[0]}, Symptoms: ${s.symptoms.join(', ') || 'None'}, Mood: ${s.mood || 'N/A'}, Energy: ${s.energy || 'N/A'}, Sleep: ${s.sleep || 'N/A'}, Notes: "${s.notes || ''}"`).join('\n');

    const promptContext = `User Profile:
- Goal: ${user?.goal || 'track'}
- Avg Cycle Length: ${avgCycleLength} days
- Avg Period Length: ${avgPeriodLength} days
- Current Cycle Day: Day ${currentCycleDay}
- Current Cycle Phase: ${currentPhase}
- Days until next predicted period: ${daysUntilNextPeriod} days

Recent Period Logs (Last 3 months):
${cyclesSummary || 'No period logs found.'}

Recent Daily Health Logs (Last 3 months):
${symptomsSummary || 'No symptom logs found.'}`;

    let reply = '';

    if (anthropic) {
      const chatHistoryPrompt = (history || []).map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n');
      
      const systemMessage = `You are CycleCare AI, an empathetic, caring, and highly supportive healthcare assistant helping the user understand their menstrual cycles, moods, and symptoms.
Use the provided user logs to tailor your answers. If the user asks general wellness or menstrual health questions, answer professionally and gently. 
Always maintain a supportive, warm tone. Keep your responses relatively concise (1-3 paragraphs) and easy to read. 
CRITICAL: You are an tracking assistant, not a doctor. Always include a gentle disclaimer when discussing pain or symptoms, suggesting they consult a professional if needed.`;

      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 600,
        system: systemMessage,
        messages: [
          {
            role: 'user',
            content: `${promptContext}\n\nChat History:\n${chatHistoryPrompt}\n\nUser Question: ${message}`
          }
        ]
      });
      reply = response.content[0].text.trim();
    } else {
      // Fallback rule-based chatbot responses
      const msgLower = message.toLowerCase();
      if (msgLower.includes('hello') || msgLower.includes('hi') || msgLower.includes('hey') || msgLower.includes('greetings') || msgLower.includes('yo')) {
        reply = `Hello! I am your CycleCare companion. I am here to help you understand your cycle. Since we are running in local mode, you can ask me about your cycle regularity, energy or sleep, pain or cramps, ovulation/fertility, moods, or how to download reports. How are you feeling today, and how can I support you?`;
      } else if (msgLower.includes('regular') || msgLower.includes('irregular') || msgLower.includes('cycle')) {
        reply = `Based on your logs, you are currently on **Day ${currentCycleDay}** of your cycle, which is in the **${currentPhase} Phase**. Your average cycle length is ${avgCycleLength} days. Regularly logging your period start dates is the best way to help us identify if your cycles are standard or fluctuating. Remember, slight variations (under 7 days) are completely normal and can be influenced by stress, sleep, and lifestyle!`;
      } else if (msgLower.includes('tired') || msgLower.includes('fatigue') || msgLower.includes('energy') || msgLower.includes('sleep')) {
        reply = `I see that you're asking about energy or sleep. In the **${currentPhase} Phase**, it's very common to experience shifts in energy levels due to hormonal fluctuations (especially progesterone shifts in the Luteal phase or blood loss during the Menstrual phase). Try focusing on gentle self-care, keeping a consistent sleep schedule, and drinking herbal teas. If your fatigue is persistent, it's always a good idea to share this with a healthcare provider.`;
      } else if (msgLower.includes('pain') || msgLower.includes('cramp') || msgLower.includes('cramps') || msgLower.includes('hurt') || msgLower.includes('ache')) {
        reply = `I'm sorry to hear you are dealing with cramps or pain. Mild cramps are common during the menstrual phase as the uterine muscles contract. Applying warm heat compresses, gentle yoga stretches, and staying hydrated can offer relief. However, if your pain is severe, persistent, or doesn't respond to standard self-care, please consult your doctor or gynecologist to rule out any underlying concerns.`;
      } else if (msgLower.includes('ovulation') || msgLower.includes('fertile') || msgLower.includes('pregnancy') || msgLower.includes('conceive')) {
        reply = `Your predicted fertile window and ovulation are calculated based on your cycle stats. Estrogen levels typically peak right before ovulation, which can increase your physical energy and glow. If your goal is to conceive, the fertile window is the optimal time. If your goal is to avoid pregnancy, ensure you use protection during this active window!`;
      } else if (msgLower.includes('hygiene') || msgLower.includes('pad') || msgLower.includes('tampon') || msgLower.includes('cup') || msgLower.includes('change')) {
        reply = `You can manage your hygiene preferences (pads, tampons, menstrual cups) and change intervals on the **Log Today** page. I will monitor the time since your last change and display status updates on the dashboard to help you maintain fresh habits and prevent health issues.`;
      } else if (msgLower.includes('report') || msgLower.includes('pdf') || msgLower.includes('download') || msgLower.includes('doctor')) {
        reply = `To export your data for your doctor, head over to the **Profile** page and click **Download PDF Report**. It compiles your cycle regularity, logged symptoms, moods, and weight trends into a clean, readable medical format.`;
      } else if (msgLower.includes('mood') || msgLower.includes('happy') || msgLower.includes('sad') || msgLower.includes('irritable') || msgLower.includes('anxious') || msgLower.includes('calm') || msgLower.includes('pms')) {
        reply = `Hormonal changes throughout your cycle (especially progesterone shifts in the Luteal phase) heavily impact your mood. Irritability, mood swings, or anxiety are common pre-menstrual symptoms. Daily logging helps you recognize these trends so you can plan self-care ahead of time. Be gentle with yourself today!`;
      } else if (msgLower.includes('weight') || msgLower.includes('bmi') || msgLower.includes('height')) {
        reply = `You can log your weight daily on the Log page. If you set your height on the Profile page, I will automatically calculate and track your Body Mass Index (BMI) trends in the right sidebar.`;
      } else if (msgLower.includes('pcod') || msgLower.includes('pcos') || msgLower.includes('polycystic') || msgLower.includes('cyst')) {
        reply = `PCOD (Polycystic Ovarian Disease) and PCOS (Polycystic Ovary Syndrome) are common hormonal conditions where ovaries produce higher amounts of androgens (male hormones), sometimes leading to small follicles (cysts). Key signs include irregular or skipped cycles, acne, weight gain, and thinning hair. Keeping a persistent cycle log and downloading a wellness report for your physician is a great step in managing PCOS/PCOD via lifestyle or therapy.`;
      } else if (msgLower.includes('hormone') || msgLower.includes('hormonal') || msgLower.includes('imbalance') || msgLower.includes('estrogen') || msgLower.includes('progesterone')) {
        reply = `Hormonal changes drive your entire cycle: Estrogen builds energy during the pre-ovulation phase, while Progesterone rises post-ovulation (which can sometimes cause PMS or mood changes). Persistent cycles outside the 21-35 day window, extreme pain, or chronic fatigue can be indicators of a hormonal imbalance. We recommend logging symptoms regularly and sharing your trends report with a healthcare specialist.`;
      } else {
        reply = `Hello! I'm here as your CycleCare companion. Looking at your records, you are currently on **Day ${currentCycleDay}** of your cycle (${currentPhase} Phase). You can ask me about cycle regularity, symptoms (cramps, fatigue), ovulation/fertility, PCOD/PCOS, hormones, moods, or how to download reports. How are you feeling today, and how can I support you?`;
      }
    }

    res.json({ response: reply });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
