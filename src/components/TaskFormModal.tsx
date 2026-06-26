/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { X, Sparkles, Calendar, Tag, Info, AlertTriangle, ChevronRight, Loader2 } from 'lucide-react';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  userId: string;
  onSave: (task: Partial<Task>) => Promise<void>;
}

export default function TaskFormModal({ isOpen, onClose, taskToEdit, userId, onSave }: TaskFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [strictWaveLock, setStrictWaveLock] = useState(true);
  const [focusDurationMinutes, setFocusDurationMinutes] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // AI Analyzer preview state (for edit/creation review)
  const [aiPreview, setAiPreview] = useState<{
    priority: 'low' | 'medium' | 'high';
    estimatedEffort: string;
    urgencyScore: number;
    suggestedStartTime: string;
  } | null>(null);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setDescription(taskToEdit.description || '');
      setDeadline(taskToEdit.deadline || '');
      setPriority(taskToEdit.priority || 'medium');
      setStrictWaveLock(taskToEdit.strictWaveLock !== false); // default to true
      setFocusDurationMinutes(taskToEdit.focusDurationMinutes || 25);
      setAiPreview(taskToEdit.aiAnalysis || null);
    } else {
      setTitle('');
      setDescription('');
      // Set default deadline to today’s date + 1 day
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // Default to 09:00 AM
      const formatted = tomorrow.toISOString().substring(0, 16);
      setDeadline(formatted);
      setPriority('medium');
      setStrictWaveLock(true);
      setFocusDurationMinutes(25);
      setAiPreview(null);
    }
    setError('');
  }, [taskToEdit, isOpen]);

  if (!isOpen) return null;

  const handleFetchAiAnalysis = async (titleVal: string, descVal: string, deadlineVal: string, priorityVal: string) => {
    if (!titleVal.trim()) return;
    try {
      const response = await fetch('/api/analyze-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleVal,
          description: descVal,
          deadline: deadlineVal,
          priority: priorityVal,
          currentLocalTime: new Date().toString()
        })
      });
      const data = await response.json();
      if (!data.error) {
        setAiPreview(data);
      }
    } catch (err) {
      console.error('Error fetching AI preview Analysis:', err);
    }
  };

  const handleBlurTitleOrDesc = () => {
    if (title.trim()) {
      handleFetchAiAnalysis(title, description, deadline, priority);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Determine if important fields have changed
      const fieldsChanged = !taskToEdit ||
        taskToEdit.title !== title ||
        taskToEdit.description !== description ||
        taskToEdit.priority !== priority;

      let finalAiAnalysis = fieldsChanged ? aiPreview : taskToEdit?.aiAnalysis;

      // If fields changed but we don't have a preview yet, mark it for background calculation
      if (fieldsChanged && !finalAiAnalysis) {
        finalAiAnalysis = {
          priority: priority,
          estimatedEffort: 'Calculating...',
          urgencyScore: priority === 'high' ? 80 : priority === 'medium' ? 50 : 20,
          suggestedStartTime: '09:00'
        };
      }

      const taskData: Partial<Task> = {
        userId,
        title,
        description,
        deadline,
        priority,
        progress: taskToEdit ? taskToEdit.progress : 0,
        status: taskToEdit ? taskToEdit.status : 'active',
        riskLevel: taskToEdit ? taskToEdit.riskLevel : 'low',
        strictWaveLock,
        focusDurationMinutes,
        aiAnalysis: finalAiAnalysis || {
          priority: priority,
          estimatedEffort: 'Calculating...',
          urgencyScore: priority === 'high' ? 80 : priority === 'medium' ? 50 : 20,
          suggestedStartTime: '09:00'
        },
        createdAt: taskToEdit ? taskToEdit.createdAt : Date.now()
      };

      if (taskToEdit?.id) {
        taskData.id = taskToEdit.id;
      }

      await onSave(taskData);
      onClose();
    } catch (err: any) {
      console.error('Save task error:', err);
      setError(err.message || 'Unable to store task records.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh] font-sans"
        id="task-form-modal-card"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-950 transition-colors cursor-pointer"
          id="task-form-modal-close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <span className="p-1.5 bg-indigo-950/40 text-indigo-400 border border-indigo-800/20 rounded-lg">
            <Sparkles className="h-5 w-5" />
          </span>
          <h3 className="text-xl font-extrabold text-white font-sans tracking-tight">
            {taskToEdit ? 'Edit Productivity Task' : 'Configure New Wave Task'}
          </h3>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-800/50 text-red-200 rounded-xl text-xs mb-4 font-sans">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left Inputs Section */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider font-mono">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleBlurTitleOrDesc}
                  placeholder="E.g. Refactor API controllers"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider font-mono">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleBlurTitleOrDesc}
                  placeholder="Optional details, subtasks, or objectives..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-505 font-sans transition-all resize-none h-24"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider font-mono flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                    Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => {
                      setDeadline(e.target.value);
                      handleFetchAiAnalysis(title, description, e.target.value, priority);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider font-mono flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5 text-indigo-400" />
                    Base Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => {
                      const newPri = e.target.value as 'low' | 'medium' | 'high';
                      setPriority(newPri);
                      handleFetchAiAnalysis(title, description, deadline, newPri);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans transition-all"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>

              {/* Focused Waves Lock Configuration */}
              <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl space-y-4">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-450 block">Focused Wave Lock Parameters</span>
                
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="strictWaveLock"
                    checked={strictWaveLock}
                    onChange={(e) => setStrictWaveLock(e.target.checked)}
                    className="mt-1 accent-indigo-550 h-4 w-4 rounded bg-slate-950 border-slate-800 focus:ring-0 cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <label htmlFor="strictWaveLock" className="text-xs font-bold text-white cursor-pointer font-sans select-none">
                      Strict Wave Lock (No Snooze)
                    </label>
                    <p className="text-[10px] text-slate-400 leading-normal mt-0.5">
                      Completely disables the "Request Temporary Escape" snooze option. You are locked in until you log progress or complete the task.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Focus Block Session Timer
                  </label>
                  <select
                    value={focusDurationMinutes}
                    onChange={(e) => setFocusDurationMinutes(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans transition-all"
                  >
                    <option value={1}>1 Minute (Dynamic Test Wave)</option>
                    <option value={5}>5 Minutes (Short Sprint)</option>
                    <option value={15}>15 Minutes</option>
                    <option value={25}>25 Minutes (Standard Pomodoro Wave)</option>
                    <option value={45}>45 Minutes (High-Flow State)</option>
                    <option value={60}>60 Minutes (Deep Cognitive Dive)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right Wave AI Analyzer Feedback */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <h4 className="text-xs uppercase font-mono tracking-wider text-indigo-400 font-bold mb-3.5 flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" /> Wave AI Analyzer
                </h4>

                {aiPreview ? (
                  <div className="space-y-4 animate-in fade-in duration-200 font-sans">
                    <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-850 rounded-xl">
                      <span className="text-xs text-slate-400">Calculated priority:</span>
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded font-mono border ${
                        aiPreview.priority === 'high' 
                          ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                          : aiPreview.priority === 'medium' 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                            : 'bg-indigo-500/10 text-indigo-305 border-indigo-500/20'
                      }`}>
                        {aiPreview.priority}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-855 rounded-xl">
                      <span className="text-xs text-slate-400">Estimated Effort:</span>
                      <span className="text-xs font-bold text-slate-200 font-mono">{aiPreview.estimatedEffort}</span>
                    </div>

                    <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Urgency Score:</span>
                        <span className="font-mono text-indigo-400 font-extrabold">{aiPreview.urgencyScore} / 100</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-full" 
                          style={{ width: `${aiPreview.urgencyScore}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-850 rounded-xl">
                      <span className="text-xs text-slate-400">Suggested Start:</span>
                      <span className="text-xs font-bold text-indigo-400 font-mono bg-indigo-950/40 px-2.5 py-0.5 rounded border border-indigo-500/10">
                        {aiPreview.suggestedStartTime}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-44 flex flex-col items-center justify-center text-center p-3 font-sans">
                    <Info className="h-6 w-6 text-slate-600 mb-2" />
                    <p className="text-xs text-slate-500 leading-relaxed font-normal">
                      Type a task title and description. Wave AI will analyze context in real-time, estimating efforts, scheduling optimum start hours, and scoring urgency indicators!
                    </p>
                  </div>
                )}
              </div>

              {title.trim() && !aiPreview && (
                <div className="flex items-center gap-1.5 text-xs text-indigo-400 mt-2 hover:text-indigo-350 transition-colors justify-center font-semibold mb-1">
                  <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                  Generating AI insights...
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Cancel Selection
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-indigo-500/10 cursor-pointer transition-all"
              id="task-form-submit"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {taskToEdit ? 'Save Task Alterations' : 'Deploy New Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
