'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import { Heart, Calendar, Target, Settings, ArrowRight, ArrowLeft } from 'lucide-react';

export default function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState<'track' | 'avoid' | 'conceive'>('track');
  const [averageCycleLength, setAverageCycleLength] = useState(28);
  const [averagePeriodLength, setAveragePeriodLength] = useState(5);
  const [lastPeriodDate, setLastPeriodDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (step === 3 && !lastPeriodDate) {
      setError('Please select your last period date.');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!lastPeriodDate) {
      setError('Please select your last period date.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Submit onboarding profile
      await apiFetch('/auth/onboard', {
        method: 'PUT',
        body: JSON.stringify({
          averageCycleLength,
          averagePeriodLength,
          goal,
          lastPeriodDate
        })
      });

      // 2. Create the first period cycle entry in the backend based on this date!
      // This is extremely convenient so the user instantly has predictions and active logs!
      const endPeriodDate = new Date(lastPeriodDate);
      endPeriodDate.setDate(endPeriodDate.getDate() + averagePeriodLength - 1);
      
      await apiFetch('/cycles', {
        method: 'POST',
        body: JSON.stringify({
          startDate: lastPeriodDate,
          endDate: endPeriodDate.toISOString().split('T')[0],
          flowIntensity: 'medium',
          notes: 'Initial onboarding log.'
        })
      });

      // 3. Refresh user context which redirects to /dashboard
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Onboarding update failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center py-6">
      <div className="w-full max-w-lg bg-white shadow-xl rounded-3xl border border-border-soft p-8 relative overflow-hidden">
        {/* Step Indicator Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-bg-base">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Steps */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-primary mb-3">
                <Target className="h-5.5 w-5.5" />
              </span>
              <h2 className="text-2xl font-extrabold text-text-dark">
                What is your primary goal?
              </h2>
              <p className="text-sm text-text-muted mt-1.5">
                We will customize your insights and calendar based on your objective.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => setGoal('track')}
                className={`w-full flex items-center justify-between p-5 border rounded-2xl text-left transition-all ${
                  goal === 'track'
                    ? 'border-primary bg-primary-light/10 ring-2 ring-primary/20'
                    : 'border-border-soft hover:bg-bg-base'
                }`}
              >
                <div>
                  <h4 className="text-sm font-bold text-text-dark">Track my cycle</h4>
                  <p className="text-xs text-text-muted mt-1">Get predictions, see trends, and understand your body rhythm.</p>
                </div>
                <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${goal === 'track' ? 'border-primary bg-primary' : 'border-border-soft'}`}>
                  {goal === 'track' && <span className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setGoal('avoid')}
                className={`w-full flex items-center justify-between p-5 border rounded-2xl text-left transition-all ${
                  goal === 'avoid'
                    ? 'border-primary bg-primary-light/10 ring-2 ring-primary/20'
                    : 'border-border-soft hover:bg-bg-base'
                }`}
              >
                <div>
                  <h4 className="text-sm font-bold text-text-dark">Avoid pregnancy naturally</h4>
                  <p className="text-xs text-text-muted mt-1">Keep an eye on fertile windows and monitor body changes carefully.</p>
                </div>
                <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${goal === 'avoid' ? 'border-primary bg-primary' : 'border-border-soft'}`}>
                  {goal === 'avoid' && <span className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setGoal('conceive')}
                className={`w-full flex items-center justify-between p-5 border rounded-2xl text-left transition-all ${
                  goal === 'conceive'
                    ? 'border-primary bg-primary-light/10 ring-2 ring-primary/20'
                    : 'border-border-soft hover:bg-bg-base'
                }`}
              >
                <div>
                  <h4 className="text-sm font-bold text-text-dark">Trying to conceive</h4>
                  <p className="text-xs text-text-muted mt-1">Track ovulation peaks and identify your most fertile days.</p>
                </div>
                <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${goal === 'conceive' ? 'border-primary bg-primary' : 'border-border-soft'}`}>
                  {goal === 'conceive' && <span className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </button>
            </div>

            <div className="pt-4">
              <button
                onClick={handleNext}
                className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-2xl shadow-md text-sm font-bold text-white bg-primary hover:bg-primary-dark transition-colors focus:outline-none"
              >
                Next Step
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-primary mb-3">
                <Settings className="h-5.5 w-5.5" />
              </span>
              <h2 className="text-2xl font-extrabold text-text-dark">
                How long is your cycle?
              </h2>
              <p className="text-sm text-text-muted mt-1.5">
                Don't worry if you aren't sure — we will adjust as you log.
              </p>
            </div>

            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-text-dark">Average Cycle Length</span>
                  <span className="font-bold text-primary">{averageCycleLength} days</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="45"
                  value={averageCycleLength}
                  onChange={(e) => setAverageCycleLength(Number(e.target.value))}
                  className="w-full h-2 bg-primary-light rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] text-text-muted px-1">
                  <span>20 days (Short)</span>
                  <span>28 days (Avg)</span>
                  <span>45 days (Long)</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-text-dark">Average Period Duration</span>
                  <span className="font-bold text-primary">{averagePeriodLength} days</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={averagePeriodLength}
                  onChange={(e) => setAveragePeriodLength(Number(e.target.value))}
                  className="w-full h-2 bg-primary-light rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] text-text-muted px-1">
                  <span>3 days</span>
                  <span>5 days (Avg)</span>
                  <span>10 days</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleBack}
                className="flex items-center justify-center p-3 border border-border-soft rounded-2xl text-text-muted hover:bg-bg-base transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button
                onClick={handleNext}
                className="flex-1 flex items-center justify-center py-3.5 px-4 border border-transparent rounded-2xl shadow-md text-sm font-bold text-white bg-primary hover:bg-primary-dark transition-colors focus:outline-none"
              >
                Next Step
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-primary mb-3">
                <Calendar className="h-5.5 w-5.5" />
              </span>
              <h2 className="text-2xl font-extrabold text-text-dark">
                When did your last period start?
              </h2>
              <p className="text-sm text-text-muted mt-1.5">
                We will use this to generate predictions.
              </p>
            </div>

            <div className="space-y-4 py-4">
              {error && (
                <div className="rounded-lg bg-red-50 p-4 text-xs font-semibold text-red-700 border border-red-100">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                  Period Start Date
                </label>
                <input
                  type="date"
                  required
                  value={lastPeriodDate}
                  onChange={(e) => setLastPeriodDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="block w-full px-4 py-3 bg-bg-base border border-border-soft rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-dark"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleBack}
                disabled={loading}
                className="flex items-center justify-center p-3 border border-border-soft rounded-2xl text-text-muted hover:bg-bg-base transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 flex items-center justify-center py-3.5 px-4 border border-transparent rounded-2xl shadow-md text-sm font-bold text-white bg-gradient-to-r from-primary to-accent hover:from-primary-dark hover:to-accent transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Setting up CycleCare...' : 'Complete & View Dashboard'}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
