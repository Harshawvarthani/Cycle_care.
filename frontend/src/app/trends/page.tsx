'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon, Activity, Heart } from 'lucide-react';

interface ChartItem {
  name: string;
  value: number;
}

interface BBTItem {
  date: string;
  temp: number;
}

interface CycleLengthItem {
  cycle: string;
  length: number;
}

export default function TrendsPage() {
  const { user } = useAuth();
  const [symptomData, setSymptomData] = useState<ChartItem[]>([]);
  const [moodData, setMoodData] = useState<ChartItem[]>([]);
  const [bbtData, setBbtData] = useState<BBTItem[]>([]);
  const [weightData, setWeightData] = useState<any[]>([]);
  const [cycleLengthData, setCycleLengthData] = useState<CycleLengthItem[]>([]);
  const [correlationsData, setCorrelationsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  // Prevent SSR hydration issues with Recharts
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const loadTrends = async () => {
    try {
      // 1. Fetch general symptom trends
      const aggregate = await apiFetch('/symptoms/trends');
      setSymptomData(aggregate.symptomData || []);
      setMoodData(aggregate.moodData || []);
      setBbtData(aggregate.bbtTrend || []);

      // Format weight trend data
      const unit = user?.settings?.unitWeight || 'kg';
      const heightCm = user?.height || null;
      const heightM = heightCm ? heightCm / 100 : null;

      const weights = (aggregate.weightTrend || []).map((w: any) => {
        const rawWeightKg = w.weight;
        const displayWeight = unit === 'lbs' ? rawWeightKg * 2.20462 : rawWeightKg;
        const bmiVal = heightM ? rawWeightKg / (heightM * heightM) : null;
        return {
          date: w.date,
          weight: parseFloat(displayWeight.toFixed(1)),
          bmi: bmiVal ? parseFloat(bmiVal.toFixed(1)) : null
        };
      });
      setWeightData(weights);

      // 2. Fetch cycle records to calculate cycle duration gaps
      const cycles = await apiFetch('/cycles');
      const sortedCycles = [...cycles].sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      
      const lengths: CycleLengthItem[] = [];
      for (let i = 1; i < sortedCycles.length; i++) {
        const d1 = new Date(sortedCycles[i - 1].startDate);
        const d2 = new Date(sortedCycles[i].startDate);
        const diffDays = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 15 && diffDays <= 45) {
          lengths.push({
            cycle: `Cycle ${i}`,
            length: diffDays
          });
        }
      }
      setCycleLengthData(lengths);

      // 3. Fetch wellness phase correlations
      try {
        const corr = await apiFetch('/symptoms/correlations');
        setCorrelationsData(corr || []);
      } catch (corrErr) {
        console.warn('Failed to load correlations:', corrErr);
      }
    } catch (err) {
      console.error('Failed to load trends:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadTrends();
    }
  }, [user]);

  // Pie Chart Colors
  const PIE_COLORS = ['#f472b6', '#a78bfa', '#f59e0b', '#3b82f6', '#10b981'];

  if (loading || !hasMounted) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Heart className="h-10 w-10 text-primary animate-pulse fill-current" />
          <p className="text-sm text-text-muted">Analyzing your cycle trends...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-text-dark flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          Cycle Trends & Analytics
        </h2>
        <p className="text-xs text-text-muted mt-1">
          Explore metrics aggregated from your logging history.
        </p>
      </div>

      {/* Grid of charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Chart 1: Cycle Length Variation */}
        <div className="bg-white rounded-3xl shadow-md border border-border-soft p-6 space-y-4">
          <h3 className="text-base font-bold text-text-dark flex items-center gap-2">
            <LineIcon className="h-5 w-5 text-primary" />
            Cycle Length Variation (Days)
          </h3>
          <p className="text-xs text-text-muted"> Gaps between period start dates over time. Normal cycle length is between 21-35 days.</p>
          <div className="h-64 w-full">
            {cycleLengthData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-text-muted">
                Log at least two periods to analyze cycle length variations.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cycleLengthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1e3e6" />
                  <XAxis dataKey="cycle" stroke="#6b7280" fontSize={11} />
                  <YAxis domain={[20, 40]} stroke="#6b7280" fontSize={11} />
                  <Tooltip contentStyle={{ background: '#fff', borderRadius: '1rem', border: '1px solid #f1e3e6', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="length" stroke="#e11d48" strokeWidth={3} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Basal Body Temperature */}
        <div className="bg-white rounded-3xl shadow-md border border-border-soft p-6 space-y-4">
          <h3 className="text-base font-bold text-text-dark flex items-center gap-2">
            <Activity className="h-5 w-5 text-secondary" />
            Basal Body Temperature Trend (°{user?.settings?.unitTemperature || 'C'})
          </h3>
          <p className="text-xs text-text-muted">BBT typically spikes slightly (0.3°C - 0.5°C) right after ovulation due to progesterone.</p>
          <div className="h-64 w-full">
            {bbtData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-text-muted">
                Add basal temperature entries on the Log page to plot your temp logs.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bbtData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1e3e6" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={10} />
                  <YAxis domain={['auto', 'auto']} stroke="#6b7280" fontSize={10} />
                  <Tooltip contentStyle={{ background: '#fff', borderRadius: '1rem', border: '1px solid #f1e3e6', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="temp" stroke="#8b5cf6" strokeWidth={2.5} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: Most Logged Symptoms */}
        <div className="bg-white rounded-3xl shadow-md border border-border-soft p-6 space-y-4">
          <h3 className="text-base font-bold text-text-dark flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Most Common Symptoms Logged
          </h3>
          <p className="text-xs text-text-muted">Frequency counts of symptoms and custom tags in your logs.</p>
          <div className="h-64 w-full">
            {symptomData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-text-muted">
                No symptoms logged yet. Try logging daily symptoms on the Log page.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={symptomData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1e3e6" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                  <YAxis stroke="#6b7280" fontSize={11} />
                  <Tooltip contentStyle={{ background: '#fff', borderRadius: '1rem', border: '1px solid #f1e3e6', fontSize: '12px' }} />
                  <Bar dataKey="value" fill="#f472b6" radius={[8, 8, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 4: Mood Distributions */}
        <div className="bg-white rounded-3xl shadow-md border border-border-soft p-6 space-y-4">
          <h3 className="text-base font-bold text-text-dark flex items-center gap-2">
            <PieIcon className="h-5 w-5 text-secondary" />
            Mood Distribution
          </h3>
          <p className="text-xs text-text-muted">Spread of your logged mood categories across logged days.</p>
          <div className="h-64 w-full flex items-center justify-center">
            {moodData.length === 0 ? (
              <div className="text-xs text-text-muted">
                No moods logged yet. Record your daily moods on the Log page.
              </div>
            ) : (
              <div className="w-full h-full flex flex-col md:flex-row items-center justify-around gap-2">
                <div className="h-48 w-48 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={moodData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {moodData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '1rem', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legend */}
                <div className="space-y-1.5 text-xs">
                  {moodData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full inline-block shrink-0"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      <span className="capitalize font-medium text-text-dark">{entry.name}:</span>
                      <span className="font-bold text-text-muted">{entry.value} times</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chart 5: Weight & BMI Trends */}
        <div className="bg-white rounded-3xl shadow-md border border-border-soft p-6 space-y-4 lg:col-span-2">
          <h3 className="text-base font-bold text-text-dark flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500" />
            Body Weight & BMI Trends
          </h3>
          <p className="text-xs text-text-muted">
            Track daily body weight and calculated BMI status over time.
            {!user?.height && " (Set your height on the Profile page to enable BMI line plotting!)"}
          </p>
          <div className="h-72 w-full">
            {weightData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-text-muted">
                Add weight entries on the Log page to chart your trends.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1e3e6" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={10} />
                  <YAxis yAxisId="left" stroke="#10b981" fontSize={10} domain={['auto', 'auto']} label={{ value: `Weight (${user?.settings?.unitWeight || 'kg'})`, angle: -90, position: 'insideLeft', offset: -10, style: { fontSize: '10px', fill: '#10b981', fontWeight: 'bold' } }} />
                  {user?.height && (
                    <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={10} domain={['auto', 'auto']} label={{ value: 'BMI', angle: 90, position: 'insideRight', offset: -10, style: { fontSize: '10px', fill: '#3b82f6', fontWeight: 'bold' } }} />
                  )}
                  <Tooltip contentStyle={{ background: '#fff', borderRadius: '1rem', border: '1px solid #f1e3e6', fontSize: '12px' }} />
                  <Legend verticalAlign="top" height={36} />
                  <Line yAxisId="left" type="monotone" dataKey="weight" name={`Weight (${user?.settings?.unitWeight || 'kg'})`} stroke="#10b981" strokeWidth={3} activeDot={{ r: 6 }} />
                  {user?.height && (
                    <Line yAxisId="right" type="monotone" dataKey="bmi" name="BMI" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 4 }} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 6: Phase-by-Phase Wellness Correlation */}
        <div className="bg-white rounded-3xl shadow-md border border-border-soft p-6 space-y-4 lg:col-span-2">
          <h3 className="text-base font-bold text-text-dark flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary fill-current" />
            Phase-by-Phase Wellness Correlation
          </h3>
          <p className="text-xs text-text-muted">
            Average energy levels and sleep quality scores (from 1 to 3) mapped across each cycle phase.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 h-72 w-full">
              {correlationsData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-text-muted">
                  Log symptoms on different days of your cycle to generate wellness correlations.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={correlationsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1e3e6" />
                    <XAxis dataKey="phase" stroke="#6b7280" fontSize={11} />
                    <YAxis domain={[0, 3]} stroke="#6b7280" fontSize={11} />
                    <Tooltip contentStyle={{ background: '#fff', borderRadius: '1rem', border: '1px solid #f1e3e6', fontSize: '12px' }} />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="avgEnergy" name="Average Energy (1-3)" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="avgSleep" name="Average Sleep (1-3)" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top symptoms list by phase */}
            <div className="space-y-4 flex flex-col justify-center">
              <h4 className="text-xs font-bold text-text-dark uppercase tracking-wider">Top Phase Symptoms</h4>
              <div className="space-y-3">
                {correlationsData.map((c: any) => (
                  <div key={c.phase} className="p-3 bg-bg-base/70 rounded-2xl border border-border-soft flex justify-between items-center text-xs">
                    <span className="font-bold text-text-dark">{c.phase}:</span>
                    <span className="text-text-muted font-medium italic text-right">
                      {c.topSymptoms && c.topSymptoms.length > 0 ? c.topSymptoms.join(', ') : 'None'}
                    </span>
                  </div>
                ))}
                {correlationsData.length === 0 && (
                  <p className="text-xs text-text-muted italic">No symptoms correlation data compiled.</p>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
