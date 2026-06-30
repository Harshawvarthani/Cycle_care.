'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import { User as UserIcon, Settings, ShieldAlert, FileText, LogOut, Check, Save, Heart, Activity } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();

  // Form states
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<'track' | 'avoid' | 'conceive'>('track');
  const [averageCycleLength, setAverageCycleLength] = useState(28);
  const [averagePeriodLength, setAveragePeriodLength] = useState(5);
  
  // Settings states
  const [unitTemperature, setUnitTemperature] = useState<'C' | 'F'>('C');
  const [unitWeight, setUnitWeight] = useState<'kg' | 'lbs'>('kg');
  const [height, setHeight] = useState<string>('');
  const [latestWeight, setLatestWeight] = useState<number | null>(null); // stored in kg
  
  // Notification checkboxes
  const [periodAlert, setPeriodAlert] = useState(true);
  const [fertileAlert, setFertileAlert] = useState(true);
  const [dailyLogAlert, setDailyLogAlert] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setGoal(user.goal || 'track');
      setAverageCycleLength(user.averageCycleLength || 28);
      setAveragePeriodLength(user.averagePeriodLength || 5);
      
      const unit = user.settings?.unitWeight || 'kg';
      if (user.height) {
        if (unit === 'lbs') {
          setHeight((user.height / 2.54).toFixed(1));
        } else {
          setHeight(user.height.toString());
        }
      } else {
        setHeight('');
      }

      if (user.settings) {
        setUnitTemperature(user.settings.unitTemperature || 'C');
        setUnitWeight(user.settings.unitWeight || 'kg');
        if (user.settings.notificationPreferences) {
          setPeriodAlert(user.settings.notificationPreferences.periodAlert !== false);
          setFertileAlert(user.settings.notificationPreferences.fertileAlert !== false);
          setDailyLogAlert(user.settings.notificationPreferences.dailyLogAlert !== false);
        }
      }
    }
  }, [user]);

  useEffect(() => {
    const fetchLatestWeight = async () => {
      try {
        const logs = await apiFetch('/symptoms');
        if (logs && Array.isArray(logs)) {
          const logWithWeight = logs.find(l => l.weight !== undefined && l.weight !== null);
          if (logWithWeight) {
            setLatestWeight(logWithWeight.weight);
          }
        }
      } catch (err) {
        console.error('Failed to fetch latest weight:', err);
      }
    };
    if (user) {
      fetchLatestWeight();
    }
  }, [user]);

  const handleUnitWeightChange = (newUnit: 'kg' | 'lbs') => {
    setUnitWeight(newUnit);
    // Convert current height input on unit switch
    if (height) {
      const val = parseFloat(height);
      if (!isNaN(val)) {
        if (newUnit === 'lbs') {
          setHeight((val / 2.54).toFixed(1));
        } else {
          setHeight((val * 2.54).toFixed(1));
        }
      }
    }
  };

  const getBmiDetails = () => {
    if (!height || !latestWeight) return null;
    const heightVal = parseFloat(height);
    if (isNaN(heightVal) || heightVal <= 0) return null;
    
    const hCm = unitWeight === 'lbs' ? heightVal * 2.54 : heightVal;
    const wKg = latestWeight;
    
    const bmi = wKg / ((hCm / 100) * (hCm / 100));
    
    let category = '';
    let colorClass = '';
    let progressPercent = 0;
    
    if (bmi < 18.5) {
      category = 'Underweight';
      colorClass = 'text-blue-600 bg-blue-50 border-blue-100';
      progressPercent = Math.max(5, ((bmi - 12) / 6.5) * 25);
    } else if (bmi < 25) {
      category = 'Normal weight';
      colorClass = 'text-green-600 bg-green-50 border-green-100';
      progressPercent = 25 + ((bmi - 18.5) / 6.5) * 25;
    } else if (bmi < 30) {
      category = 'Overweight';
      colorClass = 'text-orange-600 bg-orange-50 border-orange-100';
      progressPercent = 50 + ((bmi - 25) / 5) * 25;
    } else {
      category = 'Obese';
      colorClass = 'text-red-600 bg-red-50 border-red-100';
      progressPercent = 75 + Math.min(20, ((bmi - 30) / 10) * 25);
    }
    
    return {
      value: bmi.toFixed(1),
      category,
      colorClass,
      progressPercent
    };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 1. Submit update to onboarding/preference configurations
      // In Express backend, updating user properties:
      // We can update the onboarding values at put('/onboard') or make a generic update profile endpoint.
      // Wait, we had PUT api/auth/onboard which updates cycle metrics and goal.
      // Let's create or use the existing put('/onboard') to update user details, 
      // or implement custom update endpoints. Wait, let's write a generic update endpoint on backend if needed,
      // or we can use PUT `/auth/onboard` which supports this, and we can also add setting update support on it!
      // Wait, let's see how our PUT `/auth/onboard` is written in auth.js:
      // It updates user.averageCycleLength, user.averagePeriodLength, user.goal.
      // Let's check what endpoints we have for settings.
      // We can write a quick update profile endpoint or update it.
      // Let's look at `auth.js` again, did it support settings?
      // No, let's write a PUT `/auth/profile` route in the backend later, or let's inspect if we should update it.
      // Let's first make a fetch call to update profile in frontend.
      // We'll write the API handler in `profile/page.tsx` and ensure the backend accepts it.
      let heightInCm: number | null = null;
      if (height) {
        const val = parseFloat(height);
        if (!isNaN(val)) {
          heightInCm = unitWeight === 'lbs' ? val * 2.54 : val;
        }
      }

      const payload = {
        name,
        averageCycleLength,
        averagePeriodLength,
        goal,
        height: heightInCm,
        settings: {
          unitTemperature,
          unitWeight,
          notificationPreferences: {
            periodAlert,
            fertileAlert,
            dailyLogAlert,
            hygieneAlert: true
          }
        }
      };

      const updatedUser = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      updateUser(updatedUser);
      setSuccess('Profile settings updated successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    setError('');
    try {
      const blob = await apiFetch('/reports/download');
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CycleCare_Report_${user?.name || 'User'}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSuccess('PDF report downloaded successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to generate PDF. Ensure you have logs recorded.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-4xl mx-auto animate-fadeIn">
      {/* Notifications */}
      <div className="lg:col-span-3">
        {success && (
          <div className="rounded-2xl bg-green-50 p-4 border border-green-100 text-sm text-green-800 font-bold">
            {success}
          </div>
        )}
        {error && (
          <div className="rounded-2xl bg-red-50 p-4 border border-red-100 text-sm text-red-800 font-bold">
            {error}
          </div>
        )}
      </div>

      {/* Main Settings Card */}
      <form onSubmit={handleSave} className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-3xl shadow-md border border-border-soft p-6 space-y-6">
          <h3 className="text-lg font-bold text-text-dark flex items-center gap-2 border-b border-border-soft pb-3">
            <Settings className="h-5.5 w-5.5 text-primary" />
            Profile & Cycle Settings
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg-base border border-border-soft rounded-xl text-sm text-text-dark focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">Height ({unitWeight === 'lbs' ? 'in' : 'cm'})</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder={unitWeight === 'lbs' ? 'e.g. 65' : 'e.g. 165'}
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full px-4 py-2.5 bg-bg-base border border-border-soft rounded-xl text-sm text-text-dark focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">Avg. Cycle (days)</label>
                <input
                  type="number"
                  min="15"
                  max="50"
                  value={averageCycleLength}
                  onChange={(e) => setAverageCycleLength(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-bg-base border border-border-soft rounded-xl text-sm text-text-dark focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">Avg. Period (days)</label>
                <input
                  type="number"
                  min="2"
                  max="14"
                  value={averagePeriodLength}
                  onChange={(e) => setAveragePeriodLength(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-bg-base border border-border-soft rounded-xl text-sm text-text-dark focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">Your Primary Goal</label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-bg-base border border-border-soft rounded-xl text-xs text-text-dark focus:outline-none"
              >
                <option value="track">Track Cycle & Health</option>
                <option value="avoid">Avoid Pregnancy Naturally</option>
                <option value="conceive">Trying to Conceive</option>
              </select>
            </div>

            {/* Units Toggle */}
            <div className="pt-4 border-t border-border-soft space-y-3">
              <h4 className="text-xs font-bold text-text-dark uppercase tracking-wider">Unit Preferences</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Temperature</label>
                  <div className="flex gap-1.5">
                    {(['C', 'F'] as const).map((unit) => (
                      <button
                        type="button"
                        key={unit}
                        onClick={() => setUnitTemperature(unit)}
                        className={`flex-1 py-1.5 border text-xs font-bold rounded-xl text-center ${
                          unitTemperature === unit ? 'bg-primary text-white border-primary' : 'border-border-soft text-text-muted'
                        }`}
                      >
                        °{unit}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-text-muted mb-1">Weight</label>
                  <div className="flex gap-1.5">
                    {(['kg', 'lbs'] as const).map((unit) => (
                      <button
                        type="button"
                        key={unit}
                        onClick={() => handleUnitWeightChange(unit)}
                        className={`flex-1 py-1.5 border text-xs font-bold rounded-xl text-center ${
                          unitWeight === unit ? 'bg-primary text-white border-primary' : 'border-border-soft text-text-muted'
                        }`}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* In-app notification preferences */}
            <div className="pt-4 border-t border-border-soft space-y-3">
              <h4 className="text-xs font-bold text-text-dark uppercase tracking-wider">In-App Health Center Notifications</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 text-xs text-text-dark cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={periodAlert}
                    onChange={(e) => setPeriodAlert(e.target.checked)}
                    className="h-4 w-4 text-primary focus:ring-primary/20 border-border-soft rounded"
                  />
                  <span>Upcoming period start alerts (within 3 days)</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-text-dark cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={fertileAlert}
                    onChange={(e) => setFertileAlert(e.target.checked)}
                    className="h-4 w-4 text-primary focus:ring-primary/20 border-border-soft rounded"
                  />
                  <span>Fertile window and ovulation active alerts</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-text-dark cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={dailyLogAlert}
                    onChange={(e) => setDailyLogAlert(e.target.checked)}
                    className="h-4 w-4 text-primary focus:ring-primary/20 border-border-soft rounded"
                  />
                  <span>Daily health check-in log reminder</span>
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-md transition-colors flex justify-center items-center gap-2"
          >
            <Save className="h-5 w-5" />
            {loading ? 'Saving preferences...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>

      {/* Report & Logout Column */}
      <div className="space-y-6">
        {/* BMI Card */}
        {(() => {
          const bmi = getBmiDetails();
          if (!bmi) {
            return (
              <div className="bg-white rounded-3xl shadow-md border border-border-soft p-6 space-y-3">
                <h3 className="text-base font-bold text-text-dark flex items-center gap-2">
                  <Activity className="h-5.5 w-5.5 text-primary animate-pulse" />
                  Body Mass Index (BMI)
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  Enter your <strong>Height</strong> on the left and click save. Then log your weight on the <strong>Log Today</strong> page to calculate your BMI score here.
                </p>
              </div>
            );
          }
          return (
            <div className="bg-white rounded-3xl shadow-md border border-border-soft p-6 space-y-4">
              <h3 className="text-base font-bold text-text-dark flex items-center gap-2">
                <Activity className="h-5.5 w-5.5 text-primary" />
                Body Mass Index (BMI)
              </h3>
              
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-3xl font-extrabold text-text-dark">{bmi.value}</span>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    Based on height & latest weight
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${bmi.colorClass}`}>
                  {bmi.category}
                </span>
              </div>

              {/* Progress Slider */}
              <div className="space-y-1.5 pt-2">
                <div className="relative h-2 bg-bg-base rounded-full overflow-hidden border border-border-soft">
                  <div 
                    className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-blue-400 via-green-400 via-orange-400 to-red-400 transition-all duration-500"
                    style={{ width: `${bmi.progressPercent}%` }}
                  />
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-text-dark" 
                    style={{ left: `${bmi.progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-text-muted font-semibold">
                  <span>Under</span>
                  <span>Normal</span>
                  <span>Over</span>
                  <span>Obese</span>
                </div>
              </div>

              <div className="text-[10px] text-text-muted border-t border-border-soft pt-3 mt-2">
                Latest weight: <span className="font-bold text-text-dark">
                  {unitWeight === 'lbs' ? `${(latestWeight! * 2.20462).toFixed(1)} lbs` : `${latestWeight!.toFixed(1)} kg`}
                </span>
              </div>
            </div>
          );
        })()}

        {/* PDF Health Report card */}
        <div className="bg-white rounded-3xl shadow-md border border-border-soft p-6 space-y-4">
          <h3 className="text-base font-bold text-text-dark flex items-center gap-2">
            <FileText className="h-5.5 w-5.5 text-secondary" />
            Export Health Data
          </h3>
          <p className="text-xs text-text-muted leading-relaxed">
            Generate a downloadable PDF health report mapping your cycle trends, symptoms logged, and AI insights. Perfect for sharing directly with your OB-GYN or physician.
          </p>
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="w-full py-3 px-4 border border-transparent rounded-2xl shadow-sm text-xs font-bold text-white bg-secondary hover:bg-secondary-dark transition-colors flex justify-center items-center gap-2"
          >
            <FileText className="h-4.5 w-4.5" />
            {downloading ? 'Generating PDF...' : 'Download PDF Report'}
          </button>
        </div>

        {/* Support & Logout card */}
        <div className="bg-white rounded-3xl shadow-md border border-border-soft p-6 space-y-4">
          <h3 className="text-base font-bold text-text-dark flex items-center gap-2">
            <ShieldAlert className="h-5.5 w-5.5 text-yellow-500" />
            Account Management
          </h3>
          <p className="text-xs text-text-muted">
            Sign out of your CycleCare portal on this device. Your data remains protected in the cloud.
          </p>
          <button
            type="button"
            onClick={logout}
            className="w-full py-3 px-4 border border-border-soft hover:bg-red-50 text-text-muted hover:text-red-600 rounded-2xl font-bold text-xs transition-colors flex justify-center items-center gap-2"
          >
            <LogOut className="h-4.5 w-4.5" />
            Sign Out of Account
          </button>
        </div>
      </div>
    </div>
  );
}
