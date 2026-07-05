'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import { Heart, Save, Plus, X, Calendar, Activity, Eye, Smile, Coffee, Moon, Thermometer, ShieldAlert, Sparkles } from 'lucide-react';

function LogForm() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Date parameter check (default to today)
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(searchParams.get('date') || todayStr);

  // Period / Cycle logging states
  const [isPeriodDay, setIsPeriodDay] = useState(false);
  const [flowIntensity, setFlowIntensity] = useState<'light' | 'medium' | 'heavy' | 'spotting'>('medium');
  const [existingCycleId, setExistingCycleId] = useState<string | null>(null);

  // Symptoms & Mood states
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [energyLevel, setEnergyLevel] = useState<string>('');
  const [sleepQuality, setSleepQuality] = useState<string>('');
  const [basalTemp, setBasalTemp] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // Custom tag states
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState<string>('');

  // Hygiene states
  const [hygieneProduct, setHygieneProduct] = useState<'pad' | 'tampon' | 'cup' | 'none'>('pad');
  const [hygieneInterval, setHygieneInterval] = useState<number>(240);
  const [hygieneStatus, setHygieneStatus] = useState<any>(null);

  // Alert states
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hygieneSaved, setHygieneSaved] = useState(false);
  const [hygieneError, setHygieneError] = useState('');

  // Predefined symptoms and moods
  const availableSymptoms = ['Cramps', 'Bloating', 'Headache', 'Acne', 'Fatigue', 'Back Pain', 'Nausea'];
  const availableMoods = ['Happy', 'Irritable', 'Anxious', 'Sad', 'Calm'];

  // Load existing data for selected date
  const loadDateData = async (targetDate: string) => {
    try {
      // 1. Fetch symptom/health log for date
      const log = await apiFetch(`/symptoms/date/${targetDate}`);
      if (log) {
        setSelectedSymptoms(log.symptoms || []);
        setSelectedMood(log.mood || '');
        setEnergyLevel(log.energy || '');
        setSleepQuality(log.sleep || '');
        setBasalTemp(log.basalTemperature ? log.basalTemperature.toString() : '');
        
        const unit = user?.settings?.unitWeight || 'kg';
        if (log.weight) {
          if (unit === 'lbs') {
            setWeight((log.weight * 2.20462).toFixed(1));
          } else {
            setWeight(log.weight.toString());
          }
        } else {
          setWeight('');
        }

        setCustomTags(log.customTags || []);
        setNotes(log.notes || '');
      } else {
        // Clear forms for empty date log
        setSelectedSymptoms([]);
        setSelectedMood('');
        setEnergyLevel('');
        setSleepQuality('');
        setBasalTemp('');
        setWeight('');
        setCustomTags([]);
        setNotes('');
      }

      // 2. Fetch cycle logs to see if this day falls in an active period
      const cycles = await apiFetch('/cycles');
      const activeCycle = cycles.find((c: any) => {
        const start = new Date(c.startDate);
        start.setHours(0, 0, 0, 0);
        const end = c.endDate ? new Date(c.endDate) : null;
        if (end) end.setHours(23, 59, 59, 999);
        const targetTime = new Date(targetDate).getTime();

        if (end) {
          return targetTime >= start.getTime() && targetTime <= end.getTime();
        } else {
          return targetTime >= start.getTime(); // Active open period
        }
      });

      if (activeCycle) {
        setIsPeriodDay(true);
        setFlowIntensity(activeCycle.flowIntensity);
        setExistingCycleId(activeCycle.id || activeCycle._id);
      } else {
        setIsPeriodDay(false);
        setFlowIntensity('medium');
        setExistingCycleId(null);
      }
    } catch (err) {
      console.error('Error fetching logs for date:', err);
    }
  };

  // Load hygiene preferences and status
  const loadHygieneData = async () => {
    try {
      const status = await apiFetch('/hygiene/status');
      setHygieneStatus(status);
      setHygieneProduct(status.productPreference || 'pad');
      setHygieneInterval(status.changeIntervalMinutes || 240);
    } catch (err) {
      console.error('Error fetching hygiene details:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadDateData(date);
      loadHygieneData();
    }
  }, [date, user]);

  const toggleSymptom = (sym: string) => {
    if (selectedSymptoms.includes(sym)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== sym));
    } else {
      setSelectedSymptoms([...selectedSymptoms, sym]);
    }
  };

  const addCustomTag = () => {
    const trimmed = customTagInput.trim();
    if (trimmed && !customTags.includes(trimmed)) {
      setCustomTags([...customTags, trimmed]);
      setCustomTagInput('');
    }
  };

  const removeCustomTag = (tag: string) => {
    setCustomTags(customTags.filter(t => t !== tag));
  };

  const logProductChange = async () => {
    try {
      await apiFetch('/hygiene/log', {
        method: 'POST',
        body: JSON.stringify({ productType: hygieneProduct })
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadHygieneData();
    } catch (err: any) {
      setSaveError(err.message || 'Failed to log hygiene change.');
    }
  };

  const updateHygieneSettings = async () => {
    setHygieneSaved(false);
    setHygieneError('');
    try {
      await apiFetch('/hygiene/settings', {
        method: 'PUT',
        body: JSON.stringify({ hygieneProduct, hygieneInterval })
      });
      await refreshUser();
      loadHygieneData();
      setHygieneSaved(true);
      setTimeout(() => setHygieneSaved(false), 3000);
    } catch (err: any) {
      setHygieneError(err.message || 'Failed to save settings.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      let weightInKg: number | null = null;
      if (weight) {
        const val = parseFloat(weight);
        if (!isNaN(val)) {
          weightInKg = user?.settings?.unitWeight === 'lbs' ? val / 2.20462 : val;
        }
      }

      // 1. Log symptoms, mood, sleep, temperature, weight
      await apiFetch('/symptoms', {
        method: 'POST',
        body: JSON.stringify({
          date,
          symptoms: selectedSymptoms,
          mood: selectedMood,
          energy: energyLevel,
          sleep: sleepQuality,
          basalTemperature: basalTemp ? parseFloat(basalTemp) : null,
          weight: weightInKg,
          customTags,
          notes
        })
      });

      // 2. Log or adjust period log
      if (isPeriodDay) {
        if (!existingCycleId) {
          // If toggled on and no existing entry, log a new period starting this day
          await apiFetch('/cycles', {
            method: 'POST',
            body: JSON.stringify({
              startDate: date,
              flowIntensity,
              notes: 'Logged from daily log screen.'
            })
          });
        } else {
          // If we already have a cycle entry, update its flow intensity
          await apiFetch(`/cycles/${existingCycleId}`, {
            method: 'PUT',
            body: JSON.stringify({ flowIntensity })
          });
        }
      } else {
        // If toggled off but there was a cycle starting exactly on this day, delete or edit it
        if (existingCycleId) {
          // Confirm or prompt if they want to remove it
          // For simplicity in MVP, we can delete the cycle log or set an end date of the day before
          await apiFetch(`/cycles/${existingCycleId}`, {
            method: 'DELETE'
          });
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
      loadDateData(date);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save health log.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Save Alerts */}
      <div className="lg:col-span-3 space-y-2">
        {saveSuccess && (
          <div className="rounded-2xl bg-green-50 p-4 border border-green-100 text-sm text-green-800 font-bold flex gap-2 items-center">
            <Heart className="h-5 w-5 text-green-500 fill-current" />
            Your health log was updated successfully. Take care!
          </div>
        )}
        {saveError && (
          <div className="rounded-2xl bg-red-50 p-4 border border-red-100 text-sm text-red-800 font-bold">
            {saveError}
          </div>
        )}
      </div>

      {/* Main Symptoms & Period Form */}
      <form onSubmit={handleSave} className="lg:col-span-2 space-y-6">
        {/* Date Selector Card */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-border-soft flex flex-wrap gap-4 justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-primary-light text-primary rounded-2xl">
              <Calendar className="h-5.5 w-5.5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-text-dark">Select Date</h3>
              <p className="text-xs text-text-muted">Log symptoms for a specific calendar day.</p>
            </div>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={todayStr}
            className="px-4 py-2.5 bg-bg-base border border-border-soft rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-text-dark"
          />
        </div>

        {/* Period flow toggle */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-border-soft space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-rose-50 text-rose-500 rounded-2xl">
                <Heart className="h-5.5 w-5.5 fill-current" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-text-dark">Period Day</h3>
                <p className="text-xs text-text-muted">Is your period active on this day?</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPeriodDay}
                onChange={(e) => setIsPeriodDay(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-13 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
            </label>
          </div>

          {isPeriodDay && (
            <div className="grid grid-cols-4 gap-2 pt-4 border-t border-border-soft">
              {(['spotting', 'light', 'medium', 'heavy'] as const).map((flow) => (
                <button
                  type="button"
                  key={flow}
                  onClick={() => setFlowIntensity(flow)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-all ${
                    flowIntensity === flow
                      ? 'border-primary bg-primary text-white shadow-sm'
                      : 'border-border-soft text-text-muted hover:bg-bg-base'
                  }`}
                >
                  {flow.charAt(0).toUpperCase() + flow.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Symptoms chip select */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-border-soft space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2.5 bg-purple-50 text-secondary rounded-2xl">
              <Activity className="h-5.5 w-5.5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-text-dark">Symptoms Logged</h3>
              <p className="text-xs text-text-muted">Select all symptoms felt on this date.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableSymptoms.map((sym) => {
              const active = selectedSymptoms.includes(sym);
              return (
                <button
                  type="button"
                  key={sym}
                  onClick={() => toggleSymptom(sym)}
                  className={`py-2 px-4 rounded-full border text-xs font-semibold transition-all ${
                    active
                      ? 'border-secondary bg-secondary text-white shadow-sm'
                      : 'border-border-soft text-text-muted hover:bg-bg-base'
                  }`}
                >
                  {sym}
                </button>
              );
            })}
          </div>

          {/* Custom tags logger */}
          <div className="pt-4 border-t border-border-soft">
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
              Custom Symptom Tags (e.g. Cravings, Migraine)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                placeholder="Add tag..."
                className="flex-1 px-4 py-2 bg-bg-base border border-border-soft rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 text-text-dark"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomTag();
                  }
                }}
              />
              <button
                type="button"
                onClick={addCustomTag}
                className="px-4 border border-secondary text-secondary hover:bg-secondary/5 rounded-xl font-bold text-sm transition-colors flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>

            {customTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {customTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 py-1 px-3 rounded-full bg-secondary-light/35 text-secondary text-xs font-semibold"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeCustomTag(tag)}
                      className="text-secondary hover:text-secondary-dark focus:outline-none"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mood & Sleep selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mood Select */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-border-soft space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-yellow-50 text-amber-500 rounded-2xl">
                <Smile className="h-5.5 w-5.5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-text-dark">Mood</h3>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableMoods.map((mood) => {
                const active = selectedMood === mood.toLowerCase();
                return (
                  <button
                    type="button"
                    key={mood}
                    onClick={() => setSelectedMood(mood.toLowerCase())}
                    className={`py-2 px-3.5 rounded-full border text-xs font-semibold transition-all ${
                      active
                        ? 'border-amber-500 bg-amber-500 text-white shadow-sm'
                        : 'border-border-soft text-text-muted hover:bg-bg-base'
                    }`}
                  >
                    {mood}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sleep Quality */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-border-soft space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-blue-50 text-blue-500 rounded-2xl">
                <Moon className="h-5.5 w-5.5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-text-dark">Sleep Quality</h3>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['poor', 'average', 'good'].map((sleep) => {
                const active = sleepQuality === sleep;
                return (
                  <button
                    type="button"
                    key={sleep}
                    onClick={() => setSleepQuality(sleep)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                      active
                        ? 'border-blue-500 bg-blue-500 text-white shadow-sm'
                        : 'border-border-soft text-text-muted hover:bg-bg-base'
                    }`}
                  >
                    {sleep.charAt(0).toUpperCase() + sleep.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Energy level */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-border-soft space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-orange-50 text-orange-500 rounded-2xl">
                <Coffee className="h-5.5 w-5.5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-text-dark">Energy Level</h3>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['low', 'medium', 'high'].map((energy) => {
                const active = energyLevel === energy;
                return (
                  <button
                    type="button"
                    key={energy}
                    onClick={() => setEnergyLevel(energy)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                      active
                        ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
                        : 'border-border-soft text-text-muted hover:bg-bg-base'
                    }`}
                  >
                    {energy.charAt(0).toUpperCase() + energy.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Basal Body Temperature */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-border-soft space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-red-50 text-rose-600 rounded-2xl">
                <Thermometer className="h-5.5 w-5.5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-text-dark">Basal Body Temperature</h3>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 36.6"
                value={basalTemp}
                onChange={(e) => setBasalTemp(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-bg-base border border-border-soft rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-text-dark"
              />
              <span className="text-sm font-bold text-text-muted px-2 bg-bg-base border border-border-soft py-2.5 rounded-xl">
                °{user?.settings?.unitTemperature || 'C'}
              </span>
            </div>
          </div>

          {/* Body Weight & BMI Card */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-border-soft space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Activity className="h-5.5 w-5.5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-text-dark">Body Weight</h3>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  step="0.1"
                  placeholder={user?.settings?.unitWeight === 'lbs' ? 'e.g. 135' : 'e.g. 62'}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-bg-base border border-border-soft rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-text-dark"
                />
                <span className="text-sm font-bold text-text-muted px-2 bg-bg-base border border-border-soft py-2.5 rounded-xl">
                  {user?.settings?.unitWeight || 'kg'}
                </span>
              </div>

              {/* Dynamic BMI Indicator */}
              {(() => {
                if (!weight) return null;
                if (!user?.height) {
                  return (
                    <div className="bg-amber-50/50 p-3 border border-amber-100 rounded-xl text-[11px] text-amber-700 font-medium leading-relaxed">
                      ⚠️ Please set your <strong>Height</strong> on the <strong>Profile</strong> page first to calculate your BMI here.
                    </div>
                  );
                }
                const wVal = parseFloat(weight);
                if (isNaN(wVal) || wVal <= 0) return null;
                
                const wKg = user?.settings?.unitWeight === 'lbs' ? wVal / 2.20462 : wVal;
                const hM = user.height / 100;
                const bmi = wKg / (hM * hM);
                
                let category = '';
                let textColor = 'text-green-600';
                
                if (bmi < 18.5) {
                  category = 'Underweight';
                  textColor = 'text-blue-500';
                } else if (bmi < 25) {
                  category = 'Normal';
                  textColor = 'text-green-600';
                } else if (bmi < 30) {
                  category = 'Overweight';
                  textColor = 'text-orange-500';
                } else {
                  category = 'Obese';
                  textColor = 'text-red-500';
                }

                return (
                  <div className="flex justify-between items-center bg-bg-base/60 p-2.5 border border-border-soft rounded-xl text-xs">
                    <span className="text-text-muted">Calculated BMI:</span>
                    <span className="font-bold text-text-dark">
                      {bmi.toFixed(1)}{' '}
                      <span className={`ml-1 font-bold ${textColor}`}>({category})</span>
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Notes Log */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-border-soft space-y-3">
          <h3 className="text-sm font-bold text-text-dark">Personal Notes (Encrypted at rest)</h3>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How are you taking care of yourself today? Note down symptoms, cravings, or self-care observations..."
            className="w-full px-4 py-3 bg-bg-base border border-border-soft rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-text-dark resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl shadow-lg text-sm font-bold text-white bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-5 w-5" />
          {submitting ? 'Saving health log...' : 'Save Log Entries'}
        </button>
      </form>

      {/* Hygiene Care Settings & Logging */}
      <div className="space-y-6">
        {/* Hygiene Alert Status */}
        {hygieneStatus && (
          <div className="bg-white p-6 rounded-3xl shadow-md border border-border-soft space-y-4">
            <h3 className="text-base font-bold text-text-dark flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-yellow-500" />
              Hygiene Tracker
            </h3>

            {user?.settings?.hygieneProduct === 'none' ? (
              <p className="text-xs text-text-muted">Hygiene tracking is currently disabled.</p>
            ) : (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-bg-base/70 border border-border-soft flex justify-between items-center">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-text-muted">Last Product Change</p>
                    <p className="text-xs font-bold text-text-dark mt-1">
                      {hygieneStatus.latestLog
                        ? new Date(hygieneStatus.latestLog.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                        : 'Never logged'}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-text-muted bg-border-soft/40 px-3 py-1 rounded-full">
                    {hygieneStatus.minutesSinceChange !== null
                      ? `${Math.round(hygieneStatus.minutesSinceChange / 60)}h ${hygieneStatus.minutesSinceChange % 60}m ago`
                      : 'N/A'}
                  </span>
                </div>

                <div className={`p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-2 ${
                  hygieneStatus.needsChange
                    ? 'bg-yellow-50/50 border-yellow-100 text-yellow-800 font-medium'
                    : 'bg-green-50/50 border-green-100 text-green-800'
                }`}>
                  <Sparkles className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <span>{hygieneStatus.tip}</span>
                </div>

                <button
                  type="button"
                  onClick={logProductChange}
                  className="w-full py-3 rounded-2xl text-xs font-bold text-white bg-secondary hover:bg-secondary-dark shadow-sm transition-colors"
                >
                  Log Change Now ({hygieneProduct})
                </button>
              </div>
            )}
          </div>
        )}

        {/* Hygiene Settings Card */}
        <div className="bg-white p-6 rounded-3xl shadow-md border border-border-soft space-y-4">
          <h3 className="text-base font-bold text-text-dark">Hygiene Settings</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">Preferred Product</label>
              <select
                value={hygieneProduct}
                onChange={(e) => setHygieneProduct(e.target.value as any)}
                className="w-full px-3 py-2 bg-bg-base border border-border-soft rounded-xl text-xs text-text-dark focus:outline-none"
              >
                <option value="pad">Pads</option>
                <option value="tampon">Tampons</option>
                <option value="cup">Menstrual Cups</option>
                <option value="none">Disable Reminder</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">Change Interval (hours)</label>
              <select
                value={hygieneInterval}
                onChange={(e) => setHygieneInterval(Number(e.target.value))}
                className="w-full px-3 py-2 bg-bg-base border border-border-soft rounded-xl text-xs text-text-dark focus:outline-none"
              >
                <option value={120}>Every 2 Hours</option>
                <option value={240}>Every 4 Hours</option>
                <option value={360}>Every 6 Hours</option>
                <option value={480}>Every 8 Hours</option>
              </select>
            </div>

            <button
              type="button"
              onClick={updateHygieneSettings}
              className="w-full py-2.5 rounded-xl border border-secondary text-secondary hover:bg-secondary/5 font-bold text-xs transition-colors"
            >
              Save Settings
            </button>
            {hygieneSaved && (
              <p className="text-center text-xs font-bold text-green-600 animate-fadeIn mt-2">
                ✓ Settings saved successfully!
              </p>
            )}
            {hygieneError && (
              <p className="text-center text-xs font-bold text-red-600 animate-fadeIn mt-2">
                ✗ {hygieneError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LogPage() {
  return (
    <Suspense fallback={<div>Loading logging screen...</div>}>
      <LogForm />
    </Suspense>
  );
}
