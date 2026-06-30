'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import { Calendar, Trash2, Edit2, Plus, Check, X, CalendarDays, Heart } from 'lucide-react';

interface CycleLog {
  id: string;
  startDate: string;
  endDate?: string;
  flowIntensity: 'light' | 'medium' | 'heavy' | 'spotting';
  notes?: string;
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [cycles, setCycles] = useState<CycleLog[]>([]);
  const [loading, setLoading] = useState(true);

  // New period log form states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [flowIntensity, setFlowIntensity] = useState<'light' | 'medium' | 'heavy' | 'spotting'>('medium');
  const [notes, setNotes] = useState('');
  
  // Edit states
  const [editId, setEditId] = useState<string | null>(null);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editFlowIntensity, setEditFlowIntensity] = useState<'light' | 'medium' | 'heavy' | 'spotting'>('medium');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCycles = async () => {
    try {
      const data = await apiFetch('/cycles');
      setCycles(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCycles();
    }
  }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!startDate) {
      setError('Start date is required.');
      return;
    }

    try {
      await apiFetch('/cycles', {
        method: 'POST',
        body: JSON.stringify({
          startDate,
          endDate: endDate || null,
          flowIntensity,
          notes
        })
      });

      setSuccess('Period log added successfully.');
      setStartDate('');
      setEndDate('');
      setFlowIntensity('medium');
      setNotes('');
      fetchCycles();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to log period.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this period log?')) return;

    setError('');
    setSuccess('');
    try {
      await apiFetch(`/cycles/${id}`, {
        method: 'DELETE'
      });
      setSuccess('Period log deleted.');
      fetchCycles();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete period.');
    }
  };

  const startEdit = (cycle: CycleLog) => {
    setEditId(cycle.id);
    setEditStartDate(cycle.startDate.split('T')[0]);
    setEditEndDate(cycle.endDate ? cycle.endDate.split('T')[0] : '');
    setEditFlowIntensity(cycle.flowIntensity);
  };

  const handleUpdate = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/cycles/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          startDate: editStartDate,
          endDate: editEndDate || null,
          flowIntensity: editFlowIntensity
        })
      });
      setSuccess('Period log updated.');
      setEditId(null);
      fetchCycles();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update period.');
    }
  };

  const cancelEdit = () => {
    setEditId(null);
  };

  const calculateDuration = (start: string, end?: string) => {
    if (!end) return 'Active';
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return `${diff} days`;
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Heart className="h-10 w-10 text-primary animate-pulse fill-current" />
          <p className="text-sm text-text-muted">Loading your cycle timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Messages */}
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

      {/* Cycle Logs List */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-3xl shadow-md border border-border-soft p-6">
          <h3 className="text-lg font-bold text-text-dark flex items-center gap-2 mb-6">
            <CalendarDays className="h-5.5 w-5.5 text-primary" />
            Period Timeline History
          </h3>

          {cycles.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              No period cycles logged yet. Use the form to manually log your history.
            </div>
          ) : (
            <div className="space-y-4">
              {cycles.map((cycle) => {
                const isEditing = editId === cycle.id;
                return (
                  <div
                    key={cycle.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isEditing
                        ? 'border-primary bg-primary-light/5 ring-1 ring-primary/10'
                        : 'border-border-soft hover:bg-bg-base/40'
                    } flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}
                  >
                    {isEditing ? (
                      /* Editing View */
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                        <div>
                          <label className="block text-[10px] font-bold text-text-muted mb-1">Start Date</label>
                          <input
                            type="date"
                            value={editStartDate}
                            onChange={(e) => setEditStartDate(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-border-soft rounded-xl text-xs text-text-dark"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-text-muted mb-1">End Date</label>
                          <input
                            type="date"
                            value={editEndDate}
                            onChange={(e) => setEditEndDate(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-border-soft rounded-xl text-xs text-text-dark"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-text-muted mb-1">Flow</label>
                          <select
                            value={editFlowIntensity}
                            onChange={(e) => setEditFlowIntensity(e.target.value as any)}
                            className="w-full px-3 py-2 bg-white border border-border-soft rounded-xl text-xs text-text-dark"
                          >
                            <option value="spotting">Spotting</option>
                            <option value="light">Light</option>
                            <option value="medium">Medium</option>
                            <option value="heavy">Heavy</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      /* Display View */
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                          <h4 className="text-sm font-bold text-text-dark">
                            {new Date(cycle.startDate).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                            {cycle.endDate && ` — ${new Date(cycle.endDate).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}`}
                          </h4>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-text-muted pl-5.5">
                          <span>Duration: <strong>{calculateDuration(cycle.startDate, cycle.endDate)}</strong></span>
                          <span>Flow: <strong className="capitalize">{cycle.flowIntensity}</strong></span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 w-full md:w-auto justify-end pt-2 md:pt-0">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleUpdate(cycle.id)}
                            className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-sm transition-colors"
                            title="Save Changes"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-2 border border-border-soft hover:bg-bg-base rounded-xl text-text-muted transition-colors"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(cycle)}
                            className="p-2 border border-border-soft text-text-muted hover:text-primary rounded-xl hover:bg-primary-light/10 transition-colors"
                            title="Edit dates"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cycle.id)}
                            className="p-2 border border-border-soft text-text-muted hover:text-red-500 rounded-xl hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Manual Input Form */}
      <div className="bg-white rounded-3xl shadow-md border border-border-soft p-6 h-fit">
        <h3 className="text-base font-bold text-text-dark flex items-center gap-2 mb-4">
          <Plus className="h-5 w-5 text-primary" />
          Log Past Cycle
        </h3>
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1">Start Date</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg-base border border-border-soft rounded-xl text-xs text-text-dark focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1">End Date (Optional)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="w-full px-4 py-2.5 bg-bg-base border border-border-soft rounded-xl text-xs text-text-dark focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1">Flow Intensity</label>
            <select
              value={flowIntensity}
              onChange={(e) => setFlowIntensity(e.target.value as any)}
              className="w-full px-3 py-2 bg-bg-base border border-border-soft rounded-xl text-xs text-text-dark focus:outline-none"
            >
              <option value="spotting">Spotting</option>
              <option value="light">Light</option>
              <option value="medium">Medium</option>
              <option value="heavy">Heavy</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any symptoms, cramps, or logs..."
              className="w-full px-4 py-2 bg-bg-base border border-border-soft rounded-xl text-xs text-text-dark resize-none focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-dark transition-colors shadow-sm"
          >
            Save Past Period Log
          </button>
        </form>
      </div>
    </div>
  );
}
