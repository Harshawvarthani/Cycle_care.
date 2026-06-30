const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Cycle = require('../models/Cycle');
const Symptom = require('../models/Symptom');
const Insight = require('../models/Insight');
const User = require('../models/User');
const PDFDocument = require('pdfkit');

// @route   GET api/reports/download
// @desc    Generate and download a PDF cycle health report
// @access  Private
router.get('/download', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Fetch historical data
    const cycles = await Cycle.find({ userId: req.user.id }).sort({ startDate: -1 }).limit(10);
    const symptoms = await Symptom.find({ userId: req.user.id }).sort({ date: -1 }).limit(15);
    const latestInsight = await Insight.findOne({ userId: req.user.id }).sort({ generatedAt: -1 });

    // Initialize PDF Document
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Stream PDF directly to client response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=CycleCare_Report_${user.name || 'User'}.pdf`);
    doc.pipe(res);

    // Color Palette
    const primaryColor = '#e11d48'; // Rosy pink
    const secondaryColor = '#8b5cf6'; // Violet/purple
    const textColor = '#374151'; // Dark grey
    const lightBg = '#fff1f2'; // Soft pink background

    // PDF Header
    doc
      .fillColor(primaryColor)
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('CycleCare', 50, 45)
      .fillColor(textColor)
      .fontSize(10)
      .font('Helvetica')
      .text('Menstrual & Symptom Health Report', 50, 75)
      .text(`Generated on: ${new Date().toLocaleDateString()}`, 400, 45, { align: 'right' });

    doc.moveTo(50, 95).lineTo(545, 95).strokeColor('#e5e7eb').lineWidth(1).stroke();

    // Patient Info Profile
    doc.y = 110;
    doc
      .fillColor(textColor)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('User Profile Summary', 50, 110);

    const logWithWeight = symptoms.find(s => s.weight !== undefined && s.weight !== null);
    const latestWeight = logWithWeight ? logWithWeight.weight : null;
    const unit = user.settings?.unitWeight || 'kg';
    
    let heightText = 'N/A';
    if (user.height) {
      heightText = unit === 'lbs' ? `${(user.height / 2.54).toFixed(1)} in` : `${user.height} cm`;
    }
    
    let weightText = 'N/A';
    let bmiText = 'N/A';
    if (latestWeight) {
      weightText = unit === 'lbs' ? `${(latestWeight * 2.20462).toFixed(1)} lbs` : `${latestWeight.toFixed(1)} kg`;
      if (user.height) {
        const bmi = latestWeight / ((user.height / 100) * (user.height / 100));
        bmiText = `${bmi.toFixed(1)}`;
      }
    }

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Name: ${user.name || 'N/A'}`, 50, 130)
      .text(`Email: ${user.email}`, 50, 145)
      .text(`Height: ${heightText}`, 50, 160)
      .text(`Primary Goal: ${user.goal === 'track' ? 'Track Cycle' : user.goal === 'avoid' ? 'Avoid Pregnancy' : 'Trying to Conceive'}`, 230, 130)
      .text(`Avg. Cycle Length: ${user.averageCycleLength} days`, 230, 145)
      .text(`Avg. Period Length: ${user.averagePeriodLength} days`, 230, 160)
      .text(`Latest Weight: ${weightText}`, 410, 130)
      .text(`Latest BMI: ${bmiText}`, 410, 145);

    // Draw background card for AI insights if available
    if (latestInsight) {
      doc.rect(50, 185, 495, 115).fill(lightBg);
      doc
        .fillColor(primaryColor)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('AI Health Insights Summary', 65, 195)
        .fillColor(textColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`Status: ${latestInsight.cycleRegularity}`, 65, 215)
        .font('Helvetica')
        .text(`Symptom Patterns: ${latestInsight.symptomPatterns.join(' ') || 'None logged yet.'}`, 65, 230, { width: 460 })
        .font('Helvetica-Oblique')
        .text(`Physician Recommendation: ${latestInsight.recommendation}`, 65, 270, { width: 460 });
    }

    doc.y = 320;
    // Section: Cycle Logs Table
    doc
      .fillColor(secondaryColor)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Recent Period Logs', 50, doc.y);

    doc.y += 20;
    // Draw table header
    doc
      .fillColor(textColor)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Start Date', 60, doc.y)
      .text('End Date', 180, doc.y)
      .text('Duration', 300, doc.y)
      .text('Flow Intensity', 420, doc.y);

    doc.moveTo(50, doc.y + 15).lineTo(545, doc.y + 15).strokeColor('#e5e7eb').lineWidth(1).stroke();
    doc.y += 20;

    doc.font('Helvetica');
    if (cycles.length === 0) {
      doc.text('No cycle logs found.', 60, doc.y);
    } else {
      cycles.forEach(c => {
        const startStr = c.startDate.toLocaleDateString();
        const endStr = c.endDate ? c.endDate.toLocaleDateString() : 'Active';
        let duration = 'N/A';
        if (c.endDate) {
          const days = Math.ceil((c.endDate - c.startDate) / (1000 * 60 * 60 * 24)) + 1;
          duration = `${days} days`;
        }
        doc
          .text(startStr, 60, doc.y)
          .text(endStr, 180, doc.y)
          .text(duration, 300, doc.y)
          .text(c.flowIntensity.charAt(0).toUpperCase() + c.flowIntensity.slice(1), 420, doc.y);
        doc.y += 18;
      });
    }

    doc.y += 15;
    // Section: Symptom Log Summary
    doc
      .fillColor(secondaryColor)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Recent Daily Symptoms & Mood Logs', 50, doc.y);

    doc.y += 20;
    doc
      .fillColor(textColor)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Date', 60, doc.y)
      .text('Symptoms Logged', 140, doc.y)
      .text('Mood / Sleep', 320, doc.y)
      .text('Weight / BMI', 440, doc.y);

    doc.moveTo(50, doc.y + 15).lineTo(545, doc.y + 15).strokeColor('#e5e7eb').lineWidth(1).stroke();
    doc.y += 20;

    doc.font('Helvetica');
    if (symptoms.length === 0) {
      doc.text('No symptom logs found.', 60, doc.y);
    } else {
      symptoms.slice(0, 8).forEach(s => {
        const dateStr = s.date.toLocaleDateString();
        const symsList = [...s.symptoms, ...s.customTags].join(', ') || 'None';
        
        const moodStr = s.mood ? s.mood.charAt(0).toUpperCase() + s.mood.slice(1) : 'N/A';
        const sleepStr = s.sleep ? s.sleep.charAt(0).toUpperCase() + s.sleep.slice(1) : 'N/A';
        const moodSleepText = `${moodStr} / ${sleepStr}`;
        
        let weightBmiText = 'N/A';
        if (s.weight) {
          const displayWeight = unit === 'lbs' ? (s.weight * 2.20462).toFixed(1) + ' lbs' : s.weight.toFixed(1) + ' kg';
          let bmiSuffix = '';
          if (user.height) {
            const bmi = s.weight / ((user.height / 100) * (user.height / 100));
            bmiSuffix = `\n(BMI: ${bmi.toFixed(1)})`;
          }
          weightBmiText = `${displayWeight}${bmiSuffix}`;
        }
        
        doc
          .text(dateStr, 60, doc.y)
          .text(symsList, 140, doc.y, { width: 160 })
          .text(moodSleepText, 320, doc.y, { width: 100 })
          .text(weightBmiText, 440, doc.y, { width: 100 });
        doc.y += 26;
      });
    }

    // Medical Disclaimer Footer
    doc.moveTo(50, 750).lineTo(545, 750).strokeColor('#e5e7eb').lineWidth(1).stroke();
    doc
      .fillColor('#9ca3af')
      .fontSize(8)
      .text('Disclaimer: CycleCare is an tracking tool and the information in this report is for guidance only. It is not intended to diagnose, treat, or prevent any medical condition. Please discuss any cycle anomalies, pain, or patterns with a licensed medical professional.', 50, 765, { align: 'center', width: 495 });

    doc.end();
  } catch (err) {
    console.error('PDF Generation Error:', err.message);
    res.status(500).send('Server error generating report');
  }
});

module.exports = router;
