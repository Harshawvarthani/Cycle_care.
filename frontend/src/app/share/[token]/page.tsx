'use client';

import React, { useState, useEffect, use } from 'react';
import { apiFetch } from '../../../utils/api';
import { Heart, Calendar, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

interface SharedStatus {
  name: string;
  hasHistory: boolean;
  currentCycleDay?: number;
  currentPhase?: string;
  daysUntilNextPeriod?: number;
  predictedStartDate?: string;
  predictedEndDate?: string;
  partnerTip?: string;
  msg?: string;
}

export default function ShareViewPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [status, setStatus] = useState<SharedStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSharedData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/share/view/${token}`);
      setStatus(data);
    } catch (err: any) {
      setError(err.message || 'The sharing link is invalid, inactive, or expired.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadSharedData();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base px-4">
        <div className="flex flex-col items-center gap-3">
          <Heart className="h-10 w-10 text-primary animate-pulse fill-current" />
          <p className="text-sm text-text-muted font-medium">Opening secure CareCircle access...</p>
        </div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base px-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-border-soft shadow-md text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-extrabold text-text-dark">Access Link Expired</h2>
          <p className="text-xs text-text-muted leading-relaxed">
            {error || 'This CareCircle sharing token is no longer active. Please ask your partner to generate a new sharing link in their Profile page.'}
          </p>
          <button
            onClick={loadSharedData}
            className="px-6 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary-dark transition-colors inline-flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base py-12 px-4 animate-fadeIn">
      <div className="max-w-xl mx-auto space-y-8">
        
        {/* Header Branding */}
        <div className="text-center">
          <span className="text-xs font-extrabold text-primary uppercase tracking-widest bg-rose-50 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 border border-rose-100">
            <Heart className="h-3.5 w-3.5 fill-current" />
            CareCircle Portal
          </span>
          <h2 className="text-2xl font-black text-text-dark mt-3">
            {status.name}'s Wellness Journey
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Privacy-protected status updates for care partners.
          </p>
        </div>

        {/* Phase / Status Indicator */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Phase Card */}
          <div className="bg-gradient-to-br from-primary to-accent text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between min-h-[160px]">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-3 py-1.5 rounded-full inline-block">
                Current Cycle Day
              </span>
              <h3 className="text-4xl font-extrabold mt-3">
                Day {status.currentCycleDay || 1}
              </h3>
            </div>
            <p className="text-xs font-semibold text-white/90">
              Active Phase: {status.currentPhase || 'Cycle'}
            </p>
          </div>

          {/* Days until next period card */}
          <div className="bg-white p-6 rounded-3xl shadow-md border border-border-soft flex flex-col justify-between min-h-[160px]">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  Next Period Expected
                </span>
                <h3 className="text-4xl font-black mt-3 text-primary">
                  {status.hasHistory ? `${status.daysUntilNextPeriod} days` : 'N/A'}
                </h3>
              </div>
              <span className="p-2 rounded-full bg-rose-50 text-primary">
                <Calendar className="h-5.5 w-5.5" />
              </span>
            </div>
            <p className="text-xs text-text-muted">
              {status.predictedStartDate
                ? `Predicted start: ${new Date(status.predictedStartDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                : 'Insufficient historical data.'}
            </p>
          </div>
        </div>

        {/* Care Guide Tips Card */}
        <div className="bg-white rounded-3xl shadow-md border border-border-soft p-6 space-y-4">
          <h3 className="text-base font-extrabold text-text-dark flex items-center gap-2 border-b border-border-soft pb-3">
            <Sparkles className="h-5.5 w-5.5 text-secondary fill-current animate-pulse" />
            How You Can Support {status.name} Today
          </h3>
          
          <div className="p-4 bg-secondary/5 border border-secondary-light/35 rounded-2xl">
            <p className="text-xs text-text-dark leading-relaxed font-semibold italic">
              "{status.partnerTip}"
            </p>
          </div>

          <div className="flex items-start gap-2.5 text-[10px] text-text-muted leading-relaxed bg-bg-base/70 p-3.5 rounded-2xl border border-border-soft">
            <AlertCircle className="h-4.5 w-4.5 text-text-muted shrink-0" />
            <p>
              <strong>Data Privacy Notice:</strong> This sharing view is strictly read-only and restricted to basic predictions. Raw symptoms logged, mood selections, basal temperatures, and notes are never visible to maintain health data confidentiality.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[10px] text-text-muted pt-6 border-t border-border-soft">
          Powered by CycleCare © {new Date().getFullYear()}. Secure, end-to-end medical encryption.
        </div>
      </div>
    </div>
  );
}
