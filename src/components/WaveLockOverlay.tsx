/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { 
  Flame, 
  ShieldAlert, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  Play, 
  TrendingUp, 
  MessageSquare, 
  ChevronRight, 
  AlertTriangle,
  Lock,
  Unlock,
  Pause,
  RotateCcw,
  ShieldAlert as AlertOctagon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WaveLockOverlayProps {
  task: Task | null;
  onStart: (taskId: string) => Promise<void> | void;
  onUpdateProgress: (taskId: string, progress: number, completionState?: 'not_started' | 'started' | 'completed', commentary?: string) => Promise<void>;
  onComplete: (taskId: string) => Promise<void> | void;
  onBypass: (taskId: string, minutes: number, reason: string) => Promise<void>;
}

export default function WaveLockOverlay({ 
  task, 
  onStart, 
  onUpdateProgress, 
  onComplete, 
  onBypass 
}: WaveLockOverlayProps) {
  if (!task) return null;

  // Local states
  const [showProgressSection, setShowProgressSection] = useState(false);
  const [showEscapeSection, setShowEscapeSection] = useState(false);
  
  // Progress states
  const [progressVal, setProgressVal] = useState<number>(task.progress || 0);
  const [commentary, setCommentary] = useState('');
  const [isSubmittingProgress, setIsSubmittingProgress] = useState(false);

  // Focus block timer states
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState<number>((task.focusDurationMinutes || 25) * 60);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);

  // Escape states
  const [escapeReason, setEscapeReason] = useState('');
  const [escapeInterval, setEscapeInterval] = useState<number>(5); // default 5 mins
  const [isSubmittingEscape, setIsSubmittingEscape] = useState(false);
  const [escapeError, setEscapeError] = useState('');

  // Countdown state
  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [isOverdue, setIsOverdue] = useState(false);

  // Sync progress value when task progress changes
  useEffect(() => {
    setProgressVal(task.progress || 0);
  }, [task.progress]);

  // Sync state and reset timer states ONLY when the active task ID changes
  useEffect(() => {
    setCommentary('');
    setEscapeReason('');
    setShowProgressSection(false);
    setShowEscapeSection(false);
    setEscapeError('');
    
    // Reset focus timer states
    setSessionStarted(false);
    setSessionSecondsLeft((task.focusDurationMinutes || 25) * 60);
    setIsPaused(false);
    setSessionFinished(false);
  }, [task.id]);

  // Focus session timer tick effect
  useEffect(() => {
    if (!sessionStarted || isPaused || sessionSecondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSessionSecondsLeft((prev) => {
        if (prev <= 1) {
          setSessionFinished(true);
          // Dispatch system/mobile notification
          if ('Notification' in window && Notification.permission === 'granted') {
            const bodyText = `Your focused sprint for "${task.title}" has successfully completed! Great work.`;
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'SHOW_NOTIFICATION',
                title: '🎉 Focus Session Complete!',
                body: bodyText,
                tag: 'focus-complete-' + Date.now()
              });
            } else {
              new Notification('🎉 Focus Session Complete!', {
                body: bodyText,
                icon: '/favicon.ico'
              });
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStarted, isPaused, sessionSecondsLeft, task.title]);

  // Format focus session remaining time
  const formatSessionTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Live countdown timer to deadline
  useEffect(() => {
    if (!task.deadline) {
      setTimeLeftStr('No deadline specified');
      return;
    }

    const updateTimer = () => {
      const deadlineTime = new Date(task.deadline).getTime();
      const diff = deadlineTime - Date.now();

      if (isNaN(deadlineTime)) {
        setTimeLeftStr('Invalid deadline format');
        return;
      }

      if (diff <= 0) {
        setTimeLeftStr('Deadline Elapsed!');
        setIsOverdue(true);
        return;
      }

      setIsOverdue(false);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0 || days > 0) parts.push(`${hours}h`);
      parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setTimeLeftStr(parts.join(' ') + ' remaining');
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [task.deadline]);

  // Wave Strength styling mapping
  const waveLevel = task.waveLevel || 'low';
  
  let themeConfig = {
    bgGradient: 'from-slate-950 via-slate-900 to-indigo-950',
    accentColor: 'indigo',
    glowColor: 'indigo-500/30',
    title: 'A gentle wave approaches...',
    badgeBg: 'bg-indigo-950/40 border-indigo-500/20 text-indigo-400',
    icon: <Sparkles className="h-10 w-10 text-indigo-400" />,
    strobeEffect: 'animate-pulse'
  };

  if (waveLevel === 'medium') {
    themeConfig = {
      bgGradient: 'from-slate-950 via-amber-950/60 to-slate-950',
      accentColor: 'amber',
      glowColor: 'amber-500/30',
      title: 'The wave builds momentum!',
      badgeBg: 'bg-amber-950/40 border-amber-500/20 text-amber-400',
      icon: <Flame className="h-10 w-10 text-amber-400" />,
      strobeEffect: 'animate-pulse'
    };
  } else if (waveLevel === 'high') {
    themeConfig = {
      bgGradient: 'from-red-950/80 via-slate-950 to-red-950/70',
      accentColor: 'red',
      glowColor: 'red-500/40',
      title: 'CRITICAL OVERRIDE: Focus Wave locked!',
      badgeBg: 'bg-red-950/50 border-red-500/35 text-red-400 animate-pulse',
      icon: <ShieldAlert className="h-10 w-10 text-red-500" />,
      strobeEffect: 'animate-strobe'
    };
  }

  // Handle action triggers
  const handleStartTask = async () => {
    try {
      await onStart(task.id!);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingProgress(true);
    try {
      const compState = progressVal === 100 ? 'completed' : 'started';
      await onUpdateProgress(task.id!, progressVal, compState, commentary);
      setShowProgressSection(false);
      setCommentary('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingProgress(false);
    }
  };

  const handleCompleteTask = async () => {
    try {
      await onComplete(task.id!);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEscapeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escapeReason.trim()) {
      setEscapeError('Please provide a legitimate reason for escaping the wave lock.');
      return;
    }
    setEscapeError('');
    setIsSubmittingEscape(true);
    try {
      await onBypass(task.id!, escapeInterval, escapeReason);
      setShowEscapeSection(false);
      setEscapeReason('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingEscape(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-100 flex items-center justify-center p-4 overflow-y-auto bg-slate-950/95 backdrop-blur-xl ${themeConfig.strobeEffect}`}>
      {/* Immersive glow elements */}
      <div className={`absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl`}></div>
      {/* Main Container Card */}
      <div 
        className="relative w-full max-w-2xl bg-slate-950/80 border border-slate-800/80 rounded-[2.5rem] p-6 md:p-10 shadow-3xl shadow-indigo-500/10 overflow-hidden font-sans"
        id="wave-lock-container"
      >
        {/* Glow bar */}
        <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-${themeConfig.accentColor}-500 to-transparent shadow-lg shadow-${themeConfig.accentColor}-500/50`}></div>

        {/* Lock Overlay Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className={`inline-flex p-5 rounded-full bg-slate-900 border border-slate-800 shadow-inner mb-4 relative`}>
            {themeConfig.icon}
            <div className="absolute -bottom-1 -right-1 bg-slate-950 p-1.5 rounded-full border border-slate-800">
              <Lock className="h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className={`px-3 py-1 text-xs font-mono font-bold uppercase tracking-widest rounded-full border ${themeConfig.badgeBg}`}>
              {waveLevel} Wave Active
            </span>
            {task.missedInteractions && task.missedInteractions > 0 ? (
              <span className="px-3 py-1 bg-slate-900 border border-slate-800 text-slate-400 text-xs font-mono rounded-full font-bold">
                Bypassed {task.missedInteractions}x
              </span>
            ) : null}
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-none mt-2 font-sans">
            {themeConfig.title}
          </h2>
          <p className="text-slate-400 text-sm mt-2 max-w-md">
            This in-app overlay is locked. Please engage with your task parameters to unlock the dashboard.
          </p>
        </div>

        {/* Primary Task Information Display */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 md:p-6 mb-8 relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 right-0 p-4">
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
              task.priority === 'high' 
                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                : task.priority === 'medium'
                  ? 'bg-amber-550/10 text-amber-400 border-amber-500/20'
                  : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
            }`}>
              {task.priority} Priority
            </span>
          </div>

          <span className="text-xs font-mono text-slate-500 block mb-1">CURRENT LOCKED TASK:</span>
          <h3 className="text-lg md:text-xl font-bold text-white tracking-tight mb-2 pr-20">{task.title}</h3>
          {task.description && (
            <p className="text-xs md:text-sm text-slate-400 line-clamp-3 leading-relaxed mb-4">
              {task.description}
            </p>
          )}

          {/* Grid Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-slate-800/60 pt-4 mt-2">
            <div>
              <span className="text-[10px] font-mono text-slate-500 block">DEADLINE</span>
              <span className="text-xs font-bold text-slate-300 font-mono">
                {task.deadline ? new Date(task.deadline).toLocaleString() : 'Not Set'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-500 block">CURRENT PROGRESS</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-450 h-full rounded-full" style={{ width: `${task.progress || 0}%` }}></div>
                </div>
                <span className="text-xs font-bold text-slate-300 font-mono">{task.progress || 0}%</span>
              </div>
            </div>
            <div className="col-span-2 md:col-span-1">
              <span className="text-[10px] font-mono text-slate-500 block">COUNTDOWN TO DEADLINE</span>
              <span className={`text-xs font-mono font-bold flex items-center gap-1 mt-0.5 ${isOverdue ? 'text-red-400' : 'text-indigo-400'}`}>
                <Clock className="h-3.5 w-3.5" />
                {timeLeftStr}
              </span>
            </div>
          </div>
        </div>

        {/* Active Focus Wave Session Timer Widget */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 mb-8 relative overflow-hidden flex flex-col items-center justify-center text-center">
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-slate-950/60 border border-slate-850 rounded-full">
            <Clock className="h-3 w-3 text-indigo-400 animate-pulse" />
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">Focus Session Timer</span>
          </div>

          {task.strictWaveLock && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-red-950/40 border border-red-500/20 rounded-full animate-pulse">
              <Lock className="h-3 w-3 text-red-400" />
              <span className="text-[9px] font-mono font-bold text-red-450 uppercase tracking-widest font-extrabold">Strict Lock Mode</span>
            </div>
          )}

          <div className="pt-6 pb-2 w-full">
            {!sessionStarted ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Ready to lock out distractions? Commit to a <strong className="text-indigo-400 font-bold">{task.focusDurationMinutes || 25} minute</strong> high-intensity work sprint right now.
                </p>
                <button
                  onClick={() => {
                    setSessionStarted(true);
                    handleStartTask();
                  }}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-950/50 flex items-center gap-2 mx-auto cursor-pointer active:scale-95"
                  id="wave-lock-start-session-btn"
                >
                  <Play className="h-4 w-4 fill-white" />
                  Initiate Focused Wave Sprint
                </button>
              </div>
            ) : (
              <div className="space-y-4 w-full">
                {/* Timer text */}
                <div className={`text-5xl md:text-6xl font-black font-mono tracking-tighter text-white select-none ${isPaused ? 'opacity-40' : 'animate-pulse'}`}>
                  {formatSessionTime(sessionSecondsLeft)}
                </div>

                {/* Micro-status subtitle */}
                {sessionFinished ? (
                  <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1 justify-center animate-bounce">
                    <CheckCircle2 className="h-4 w-4" /> Focus Cycle Completed! Great Job!
                  </div>
                ) : (
                  <div className="text-xs text-indigo-400 font-bold uppercase tracking-widest">
                    {isPaused ? '⚠️ Focus Timer Paused' : '⚡ Deep Focus Mode Engaged'}
                  </div>
                )}

                {/* Progress Bar of the timer */}
                {(() => {
                  const totalSecs = (task.focusDurationMinutes || 25) * 60;
                  const elapsedPercent = Math.min(100, Math.max(0, ((totalSecs - sessionSecondsLeft) / totalSecs) * 100));
                  return (
                    <div className="w-full max-w-xs mx-auto bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className={`h-full transition-all duration-1000 ${sessionFinished ? 'bg-emerald-500 animate-pulse' : 'bg-gradient-to-r from-indigo-500 to-indigo-400'}`} 
                        style={{ width: `${elapsedPercent}%` }}
                      ></div>
                    </div>
                  );
                })()}

                {/* Controls */}
                <div className="flex justify-center items-center gap-3 pt-1">
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    disabled={sessionFinished}
                    className="p-2 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs transition-all cursor-pointer disabled:opacity-45"
                    title={isPaused ? 'Resume Session' : 'Pause Session'}
                    type="button"
                  >
                    {isPaused ? <Play className="h-4 w-4 text-emerald-400 fill-emerald-400" /> : <Pause className="h-4 w-4 text-indigo-400 fill-indigo-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setSessionSecondsLeft((task.focusDurationMinutes || 25) * 60);
                      setSessionFinished(false);
                      setIsPaused(false);
                    }}
                    className="p-2 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs transition-all cursor-pointer"
                    title="Reset Session"
                    type="button"
                  >
                    <RotateCcw className="h-4 w-4 text-slate-400" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Gemini AI Motivation & Recovery Block */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-500/10 rounded-3xl p-5 md:p-6 mb-8 relative">
          <div className="absolute top-4 right-4 bg-indigo-950/40 px-2.5 py-0.5 border border-indigo-550/20 rounded-full flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-indigo-400 animate-pulse" />
            <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest">Wave AI Coach</span>
          </div>

          <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
            AI-Generated Motivation
          </h4>
          
          <p className="text-xs md:text-sm text-slate-300 font-medium leading-relaxed italic pr-12">
            "{task.waveLockMotivation || 'You planned this task for a reason. Taking action now keeps you perfectly aligned with your productivity goal.'}"
          </p>

          {/* Recovery Recommendations (if task becomes high risk or High Wave lock) */}
          {(task.riskLevel === 'high' || waveLevel === 'high') && (
            <div className="mt-4 pt-4 border-t border-slate-800/60">
              <span className="text-[10px] font-mono text-red-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-1.5 animate-pulse">
                <ShieldAlert className="h-3.5 w-3.5" />
                Urgent Recovery Recommendation
              </span>
              <p className="text-xs text-slate-400 font-mono leading-relaxed bg-red-950/20 border border-red-500/10 p-3 rounded-2xl">
                {task.waveLockRecoveryPlan || 'This task is falling behind schedule. Begin within the next 30 minutes to avoid missing the deadline.'}
              </p>
            </div>
          )}
        </div>

        {/* Section Action Selection Toggle */}
        <AnimatePresence mode="wait">
          {!showProgressSection && !showEscapeSection && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-8"
              id="wave-lock-primary-actions"
            >
              <button
                onClick={handleStartTask}
                className="flex flex-col items-center justify-center p-4 md:p-5 bg-slate-900 border border-slate-800 hover:border-indigo-500/30 hover:bg-slate-900/80 text-white rounded-3xl cursor-pointer transition-all group"
                id="wave-lock-btn-start"
              >
                <div className="p-3 bg-indigo-500/10 rounded-2xl mb-2 text-indigo-400 group-hover:scale-110 transition-transform">
                  <Play className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold">Start Task</span>
                <span className="text-[10px] text-slate-500 mt-1">Activate Wave State</span>
              </button>

              <button
                onClick={() => setShowProgressSection(true)}
                className="flex flex-col items-center justify-center p-4 md:p-5 bg-slate-900 border border-slate-800 hover:border-indigo-500/30 hover:bg-slate-900/80 text-white rounded-3xl cursor-pointer transition-all group"
                id="wave-lock-btn-progress"
              >
                <div className="p-3 bg-indigo-500/10 rounded-2xl mb-2 text-indigo-400 group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold">Log Progress</span>
                <span className="text-[10px] text-slate-500 mt-1">Specify Increment</span>
              </button>

              <button
                onClick={handleCompleteTask}
                className="flex flex-col items-center justify-center p-4 md:p-5 bg-gradient-to-r from-indigo-650 to-indigo-750 border border-indigo-500/25 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-3xl cursor-pointer transition-all group shadow-lg shadow-indigo-600/10"
                id="wave-lock-btn-complete"
              >
                <div className="p-3 bg-white/10 rounded-2xl mb-2 text-white group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold">Mark Completed</span>
                <span className="text-[10px] text-indigo-200 mt-1">Conclude Fully</span>
              </button>
            </motion.div>
          )}

          {/* Action Pane: Update Progress */}
          {showProgressSection && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleUpdateProgressSubmit}
              className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 md:p-6 mb-8"
              id="wave-lock-progress-pane"
            >
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-400" />
                Log Incremental Progress
              </h4>

              {/* Progress slider / percentage buttons */}
              <div className="mb-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-mono text-slate-550">Completion Percentage:</span>
                  <span className="text-sm font-bold text-indigo-400 font-mono">{progressVal}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="25"
                  value={progressVal}
                  onChange={(e) => setProgressVal(Number(e.target.value))}
                  className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1 mt-1">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Progress Commentary */}
              <div className="mb-5">
                <label className="text-xs font-mono text-slate-550 block mb-2">Commentary/Next Actions (highly recommended):</label>
                <textarea
                  value={commentary}
                  onChange={(e) => setCommentary(e.target.value)}
                  placeholder="What is the current status? Let Wave AI analyze your progress..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500/30 font-sans leading-relaxed"
                />
              </div>

              {/* Pane Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowProgressSection(false)}
                  className="px-4 py-2.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProgress}
                  className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-550 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingProgress ? 'Logging...' : 'Save Progress'}
                </button>
              </div>
            </motion.form>
          )}

          {/* Action Pane: Escape/Bypass Section */}
          {showEscapeSection && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleEscapeSubmit}
              className="bg-red-950/10 border border-red-500/10 rounded-3xl p-5 md:p-6 mb-8"
              id="wave-lock-escape-pane"
            >
              <h4 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                Submit Accountability Escape Request
              </h4>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Escaping a focus wave lock records a **missed interaction** and increases the overall **Wave strength (Gentle &rarr; Firm &rarr; Override Lock)**. Please justify this deferral.
              </p>

              {escapeError && (
                <p className="text-xs text-red-400 mb-3 font-semibold">{escapeError}</p>
              )}

              {/* Escape Reason */}
              <div className="mb-5">
                <label className="text-xs font-mono text-slate-400 block mb-2">Escaping Reason / Deferral Justification:</label>
                <textarea
                  value={escapeReason}
                  onChange={(e) => setEscapeReason(e.target.value)}
                  placeholder="e.g. Critical meeting overlapping, urgent restroom break, physical discomfort..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500/20 font-sans leading-relaxed"
                />
              </div>

              {/* Escaped Interval Duration Select */}
              <div className="mb-5">
                <label className="text-xs font-mono text-slate-400 block mb-2">Re-lock Interval (Minutes to snooze):</label>
                <select
                  value={escapeInterval}
                  onChange={(e) => setEscapeInterval(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500/20"
                >
                  <option value={1}>1 Minute (Testing / Rapid evaluation)</option>
                  <option value={2}>2 Minutes</option>
                  <option value={5}>5 Minutes</option>
                  <option value={10}>10 Minutes</option>
                  <option value={15}>15 Minutes</option>
                </select>
              </div>

              {/* Pane Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEscapeSection(false)}
                  className="px-4 py-2.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEscape}
                  className="px-5 py-2.5 bg-red-650 hover:bg-red-550 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingEscape ? 'Deferring...' : 'Confirm Escape'}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Minimal accountability bypass footlink */}
        {!task.strictWaveLock && !showEscapeSection && !showProgressSection && (
          <div className="flex justify-center text-center mt-2">
            <button
              onClick={() => setShowEscapeSection(true)}
              className="text-[10px] md:text-xs font-semibold text-slate-500 hover:text-red-400 font-mono tracking-wider transition-colors cursor-pointer"
              id="wave-lock-escape-trigger"
            >
              Request Temporary Escape &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
