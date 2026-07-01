'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import { Heart, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles, Brain, PlusCircle, AlertCircle, HelpCircle } from 'lucide-react';

interface PredictionData {
  hasHistory: boolean;
  lastPeriodStart?: string;
  avgCycleLength?: number;
  avgPeriodLength?: number;
  predictedStartDate?: string;
  predictedEndDate?: string;
  ovulationDate?: string;
  fertileStartDate?: string;
  fertileEndDate?: string;
  currentCycleDay?: number;
  currentPhase?: 'Menstrual' | 'Follicular' | 'Ovulation' | 'Luteal';
  daysUntilNextPeriod?: number;
  msg?: string;
}

interface CycleLog {
  id: string;
  startDate: string;
  endDate?: string;
  flowIntensity: 'light' | 'medium' | 'heavy' | 'spotting';
  notes?: string;
}

interface SymptomLog {
  id: string;
  date: string;
  symptoms: string[];
  mood: string;
  customTags: string[];
}

interface AIInsight {
  cycleRegularity: string;
  symptomPatterns: string[];
  recommendation: string;
  generatedAt: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [predictions, setPredictions] = useState<PredictionData | null>(null);
  const [cycles, setCycles] = useState<CycleLog[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date()); // Calendar navigation month
  const [loading, setLoading] = useState(true);

  // Chatbot State Hooks
  const [activeTab, setActiveTab] = useState<'insights' | 'chat'>('insights');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: "Hi! I'm your CycleCare health companion. Based on your cycle logs and daily symptoms, I can provide gentle, personalized advice. What's on your mind today?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const loadData = async () => {
    try {
      const pred = await apiFetch('/cycles/predictions');
      setPredictions(pred);

      const logs = await apiFetch('/cycles');
      setCycles(logs);

      const syms = await apiFetch('/symptoms');
      setSymptomLogs(syms);

      // Fetch latest AI insight cached
      try {
        const aiIns = await apiFetch('/insights');
        setInsight(aiIns);
      } catch (aiErr) {
        // Can be empty if not enough history
        console.warn('Insight fetch failed or not generated yet.');
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const generateAIInsights = async () => {
    setInsightLoading(true);
    setInsightError('');
    try {
      const freshInsight = await apiFetch('/insights');
      setInsight(freshInsight);
    } catch (err: any) {
      setInsightError(err.message || 'Need more logs. Please log at least 1 cycle to generate insights.');
    } finally {
      setInsightLoading(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) return;

    const userMsg = { sender: 'user' as const, text: trimmed };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const history = chatMessages.map(m => ({
        role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: m.text
      }));

      const res = await apiFetch('/insights/chat', {
        method: 'POST',
        body: JSON.stringify({ message: trimmed, history })
      });

      setChatMessages(prev => [...prev, { sender: 'ai', text: res.response }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { sender: 'ai', text: `Sorry, I encountered an error: ${err.message || 'Something went wrong.'}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Heart className="h-10 w-10 text-primary animate-pulse fill-current" />
          <p className="text-sm text-text-muted">Loading your wellness dashboard...</p>
        </div>
      </div>
    );
  }

  // Calendar Math Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const prevMonthDays = new Date(year, month, 0).getDate();
  const daysArray = [];

  // Previous month dates padding
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    daysArray.push({
      day: prevMonthDays - i,
      month: 'prev',
      date: new Date(year, month - 1, prevMonthDays - i)
    });
  }

  // Current month dates
  for (let i = 1; i <= daysInMonth; i++) {
    daysArray.push({
      day: i,
      month: 'current',
      date: new Date(year, month, i)
    });
  }

  // Next month padding
  const totalSlots = 42; // 6 rows of 7 days
  const nextMonthPadding = totalSlots - daysArray.length;
  for (let i = 1; i <= nextMonthPadding; i++) {
    daysArray.push({
      day: i,
      month: 'next',
      date: new Date(year, month + 1, i)
    });
  }

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Check state of each day
  const getDayStatus = (d: Date) => {
    const dStr = d.toDateString();
    const dTime = d.getTime();

    // 1. Check logged periods
    const isLoggedPeriod = cycles.some(c => {
      const start = new Date(c.startDate);
      start.setHours(0, 0, 0, 0);
      const end = c.endDate ? new Date(c.endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);

      if (end) {
        return dTime >= start.getTime() && dTime <= end.getTime();
      } else {
        return dTime === start.getTime();
      }
    });

    // 2. Check predictions
    let isPredictedPeriod = false;
    let isFertile = false;
    let isOvulation = false;

    if (predictions && predictions.hasHistory) {
      const predStart = new Date(predictions.predictedStartDate!);
      predStart.setHours(0, 0, 0, 0);
      const predEnd = new Date(predictions.predictedEndDate!);
      predEnd.setHours(23, 59, 59, 999);

      const fertStart = new Date(predictions.fertileStartDate!);
      fertStart.setHours(0, 0, 0, 0);
      const fertEnd = new Date(predictions.fertileEndDate!);
      fertEnd.setHours(23, 59, 59, 999);

      const ovul = new Date(predictions.ovulationDate!);
      ovul.setHours(0, 0, 0, 0);

      isPredictedPeriod = dTime >= predStart.getTime() && dTime <= predEnd.getTime();
      isFertile = dTime >= fertStart.getTime() && dTime <= fertEnd.getTime();
      isOvulation = d.toLocaleDateString() === ovul.toLocaleDateString();
    }

    // 3. Check logged symptoms
    const hasSymptoms = symptomLogs.some(s => {
      const sDate = new Date(s.date);
      return sDate.toLocaleDateString() === d.toLocaleDateString();
    });

    return {
      isLoggedPeriod,
      isPredictedPeriod,
      isFertile,
      isOvulation,
      hasSymptoms
    };
  };

  const handleDayClick = (dateItem: Date) => {
    const formattedDate = dateItem.toISOString().split('T')[0];
    router.push(`/log?date=${formattedDate}`);
  };

  // Phase Descriptions
  const getPhaseDescription = (phase?: string) => {
    switch (phase) {
      case 'Menstrual':
        return 'Focus on rest, gentle stretching, and warmth. Flow intensity is highest now.';
      case 'Follicular':
        return 'Energy is rising. A great time for fresh starts, planning, and high intensity tasks.';
      case 'Ovulation':
        return 'Peak fertility and high social energy. You may feel more glowing and communicative.';
      case 'Luteal':
        return 'Slowing down. Practice nurturing self-care. PMS symptoms could begin to manifest.';
      default:
        return 'Keeping your cycle healthy day by day.';
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Header Banner & Status Summary */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Phase / Cycle Day Card */}
        <div className="bg-gradient-to-br from-primary to-accent text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between min-h-[180px]">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1.5 rounded-full inline-block">
              {predictions?.currentPhase || 'Cycle'} Phase
            </span>
            <h3 className="text-4xl font-extrabold mt-3">
              Day {predictions?.currentCycleDay || 1}
            </h3>
          </div>
          <p className="text-xs text-white/90 leading-relaxed mt-2">
            {getPhaseDescription(predictions?.currentPhase)}
          </p>
        </div>

        {/* Days to Next Period Card */}
        <div className="bg-white p-6 rounded-3xl shadow-md border border-border-soft flex flex-col justify-between min-h-[180px]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Next Period Predicted In
              </span>
              <h3 className="text-4xl font-extrabold mt-3 text-primary">
                {predictions?.hasHistory ? `${predictions.daysUntilNextPeriod} days` : 'N/A'}
              </h3>
            </div>
            <span className="p-2 rounded-full bg-rose-50 text-primary">
              <CalendarIcon className="h-6 w-6" />
            </span>
          </div>
          <p className="text-xs text-text-muted">
            {predictions?.hasHistory
              ? `Starting around ${new Date(predictions.predictedStartDate!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
              : 'Add at least one period log to begin calculating predictions.'}
          </p>
        </div>

        {/* Action Center Log Button */}
        <div className="bg-white p-6 rounded-3xl shadow-md border border-border-soft flex flex-col justify-between min-h-[180px]">
          <div>
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Log Today's Health
            </span>
            <p className="text-xs text-text-dark mt-2 leading-relaxed">
              Log symptoms, mood, sleep quality, and hygiene product changes to generate AI insights.
            </p>
          </div>
          <button
            onClick={() => router.push('/log')}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl shadow-md text-sm font-bold text-white bg-secondary hover:bg-secondary-dark transition-colors"
          >
            <PlusCircle className="h-5 w-5" />
            Log Health & Symptoms
          </button>
        </div>
      </div>

      {/* 2. Interactive Calendar & Right Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar View */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-md border border-border-soft p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-text-dark flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={prevMonth}
                className="p-2 border border-border-soft rounded-xl hover:bg-bg-base text-text-dark transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 border border-border-soft rounded-xl hover:bg-bg-base text-text-dark transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 text-center text-xs font-bold text-text-muted mb-3">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {daysArray.map((dayItem, idx) => {
              const status = getDayStatus(dayItem.date);
              const isToday = dayItem.date.toDateString() === new Date().toDateString();
              const isCurrentMonth = dayItem.month === 'current';

              let cellStyle = 'bg-transparent text-text-dark hover:bg-bg-base';
              if (!isCurrentMonth) {
                cellStyle = 'text-text-muted/40';
              }

              // Apply color codes
              if (status.isLoggedPeriod) {
                cellStyle = 'bg-primary text-white font-semibold shadow-sm hover:bg-primary-dark';
              } else if (status.isPredictedPeriod) {
                cellStyle = 'border-2 border-dashed border-primary bg-primary-light/20 text-primary hover:bg-primary-light/45';
              } else if (status.isOvulation) {
                cellStyle = 'bg-cyan-500 text-white font-bold ring-4 ring-cyan-200 shadow-sm hover:bg-cyan-600';
              } else if (status.isFertile) {
                cellStyle = 'bg-blue-100 text-blue-600 font-semibold ring-2 ring-blue-50/50 hover:bg-blue-200';
              }

              if (isToday && !status.isLoggedPeriod && !status.isOvulation) {
                cellStyle += ' ring-2 ring-secondary ring-offset-2';
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleDayClick(dayItem.date)}
                  className={`relative flex flex-col items-center justify-center aspect-square rounded-2xl p-1 text-sm transition-all focus:outline-none ${cellStyle}`}
                >
                  <span>{dayItem.day}</span>
                  {/* Indicators */}
                  <div className="absolute bottom-1 flex gap-0.5">
                    {status.hasSymptoms && (
                      <span className={`h-1 w-1 rounded-full ${status.isLoggedPeriod || status.isOvulation ? 'bg-white' : 'bg-secondary'}`} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-6 border-t border-border-soft flex flex-wrap gap-4 text-xs text-text-muted justify-center">
            <div className="flex items-center gap-1.5">
              <span className="h-4.5 w-4.5 rounded-full bg-primary inline-block" />
              <span>Logged Period</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-4.5 w-4.5 rounded-full border-2 border-dashed border-primary bg-primary-light/20 inline-block" />
              <span>Predicted Period</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-4.5 w-4.5 rounded-full bg-blue-100 inline-block" />
              <span>Fertile Window</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-4.5 w-4.5 rounded-full bg-cyan-500 inline-block" />
              <span>Predicted Ovulation</span>
            </div>
          </div>
        </div>

        {/* AI Sidebar & Chat Companion */}
        <div className="bg-white rounded-3xl shadow-md border border-border-soft p-6 flex flex-col justify-between min-h-[500px]">
          <div className="flex flex-col h-full">
            {/* Tab Headers */}
            <div className="flex border-b border-border-soft mb-4">
              <button
                onClick={() => setActiveTab('insights')}
                className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${
                  activeTab === 'insights'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text-dark'
                }`}
              >
                Health Insights
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${
                  activeTab === 'chat'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text-dark'
                }`}
              >
                Chat Companion
              </button>
            </div>

            {/* TAB CONTENT: INSIGHTS */}
            {activeTab === 'insights' && (
              <div className="space-y-4 flex-1">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-text-dark flex items-center gap-1.5">
                    <Sparkles className="h-4.5 w-4.5 text-primary fill-current" />
                    AI Health Insights
                  </h3>
                  <button
                    onClick={generateAIInsights}
                    disabled={insightLoading}
                    className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors disabled:opacity-50"
                  >
                    {insightLoading ? 'Analyzing...' : 'Refresh'}
                  </button>
                </div>

                {insightError && (
                  <div className="rounded-xl bg-red-50 p-4 border border-red-100 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 font-semibold">{insightError}</p>
                  </div>
                )}

                {insight ? (
                  <div className="space-y-4">
                    {/* Regularity Card */}
                    <div className="bg-primary-light/10 border border-primary-light/40 rounded-2xl p-4">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
                        Cycle Assessment
                      </span>
                      <h4 className="text-sm font-bold text-text-dark mt-1">
                        {insight.cycleRegularity}
                      </h4>
                    </div>

                    {/* Symptom Trends Card */}
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
                        Detected Patterns
                      </span>
                      {insight.symptomPatterns.map((pat, idx) => (
                        <div key={idx} className="bg-bg-base/80 border border-border-soft rounded-xl p-3 text-xs leading-relaxed text-text-dark flex items-start gap-2">
                          <Brain className="h-4.5 w-4.5 text-secondary shrink-0 mt-0.5" />
                          <span>{pat}</span>
                        </div>
                      ))}
                    </div>

                    {/* Recommendation */}
                    <div className="bg-secondary/5 border border-secondary-light/35 rounded-2xl p-4">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-secondary-dark">
                        Doctor's Suggestion
                      </span>
                      <p className="text-xs text-text-dark leading-relaxed mt-1 font-medium italic">
                        "{insight.recommendation}"
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-text-muted space-y-3">
                    <Brain className="h-10 w-10 mx-auto text-primary-light animate-pulse" />
                    <p className="text-xs">
                      {predictions?.hasHistory
                        ? "Generate your personalized health insights. This compiles your symptoms and cycle logs."
                        : "Start logging your period dates. We will use your logging history to generate health insights."}
                    </p>
                    {predictions?.hasHistory && (
                      <button
                        onClick={generateAIInsights}
                        disabled={insightLoading}
                        className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-dark transition-colors"
                      >
                        Generate Insights
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: CHAT */}
            {activeTab === 'chat' && (
              <div className="flex flex-col flex-1 h-[400px]">
                {/* Chat Message Logs */}
                <div className="flex-1 overflow-y-auto space-y-3 p-1 max-h-[300px] scrollbar-thin">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-primary text-white font-medium rounded-tr-none'
                            : 'bg-bg-base text-text-dark border border-border-soft rounded-tl-none'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-bg-base text-text-muted border border-border-soft rounded-2xl rounded-tl-none px-3.5 py-2 text-xs animate-pulse">
                        Analyzing your logs...
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Send Form */}
                <form onSubmit={handleSendChat} className="mt-3 pt-3 border-t border-border-soft flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about cramps, fatigue, cycles..."
                    disabled={chatLoading}
                    className="flex-1 px-3.5 py-2 bg-bg-base border border-border-soft rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary text-text-dark"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="px-3 py-2 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl shadow-sm transition-colors disabled:opacity-50"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-border-soft flex gap-2 items-center text-[10px] text-text-muted justify-center">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>AI tips are supportive insights. Consult a physician for diagnostic advice.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
