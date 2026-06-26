/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Task } from '../types';
import { deleteTask, updateTask, generateRecoveryPlan } from '../lib/taskService';
import NotificationStatusCard from './NotificationStatusCard';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  Sparkles, 
  RefreshCw,
  TrendingUp,
  Loader2,
  ChevronRight,
  Play
} from 'lucide-react';

interface TasksPageProps {
  tasks: Task[];
  onOpenCreateForm: () => void;
  onOpenEditForm: (task: Task) => void;
  onOpenProgressModal: (task: Task) => void;
  onTriggerAlert: (task: Task) => void;
}

export default function TasksPage({ tasks, onOpenCreateForm, onOpenEditForm, onOpenProgressModal, onTriggerAlert }: TasksPageProps) {
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [recoveringTaskId, setRecoveringTaskId] = useState<string | null>(null);

  // Start task wave directly
  const handleStartTaskWaveDirect = async (task: Task) => {
    try {
      await updateTask(task.id!, {
        progress: task.progress || 0,
        completionState: 'started',
        lastInteraction: Date.now()
      });
    } catch (err) {
      console.error('Error starting task wave:', err);
    }
  };

  // Mark task as complete directly
  const handleDirectComplete = async (taskId: string) => {
    try {
      await updateTask(taskId, {
        progress: 100,
        status: 'completed'
      });
    } catch (err) {
      console.error('Error completing task:', err);
    }
  };

  // Direct delete
  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(taskId);
      } catch (err) {
        console.error('Error deleting task:', err);
      }
    }
  };

  // Generate recovery plan
  const handleTriggerRecovery = async (task: Task) => {
    setRecoveringTaskId(task.id!);
    try {
      await generateRecoveryPlan(task);
    } catch (err) {
      console.error('Error generating recovery plan:', err);
    } finally {
      setRecoveringTaskId(null);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          (t.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 bg-slate-950 text-slate-200 min-h-screen animate-fade-in" id="tasks-page-container">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-900 pb-6">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white font-sans">
            Task Orchestration Grid
          </h2>
          <p className="text-sm text-slate-400 font-sans">
            Define deliverables, evaluate cognitive start times, and process progress validation records.
          </p>
        </div>
        
        <button
          onClick={onOpenCreateForm}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-550 text-white text-xs font-bold rounded-xl tracking-wide uppercase flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all shrink-0 cursor-pointer font-sans"
          id="tasks-btn-create"
        >
          <Plus className="h-4 w-4" />
          Deploy New Task
        </button>
      </div>

      {/* System Background Notifications Config Card */}
      <NotificationStatusCard />

      {/* Grid Configuration Controls */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:max-w-sm">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search task index..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          {/* Status Select */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-500 shrink-0">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-sans cursor-pointer"
            >
              <option value="all">All States</option>
              <option value="active">Active Execution</option>
              <option value="completed">Completed Waves</option>
            </select>
          </div>

          {/* Priority Select */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-500 shrink-0">Priority:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as any)}
              className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-sans cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      {filteredTasks.length === 0 ? (
        <div className="py-20 text-center max-w-md mx-auto bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
          <Calendar className="h-10 w-10 text-slate-600 mx-auto mb-3 animate-bounce-short" />
          <h4 className="text-base font-bold text-slate-300 mb-1">Grid Array Empty</h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            No productivity tasks mapped to this search spectrum. Create dynamic Wave tasks to initialize telemetry loops!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="tasks-cards-grid">
          {filteredTasks.map((t) => {
            const isOverdue = t.status === 'active' && t.deadline && new Date(t.deadline).getTime() < Date.now();
            return (
              <div 
                key={t.id}
                className={`relative bg-slate-900/40 border rounded-3xl p-6 md:p-8 transition-all ring-1 flex flex-col justify-between ${
                  isOverdue 
                    ? 'border-red-950 ring-red-500/5 hover:border-red-800' 
                    : t.status === 'completed'
                      ? 'border-emerald-950/40 ring-emerald-500/0 hover:border-emerald-900/50'
                      : 'border-slate-800 ring-indigo-500/0 hover:border-slate-705 hover:shadow-xl hover:shadow-indigo-500/5'
                }`}
              >
                {/* Cards decoration elements */}
                {isOverdue && (
                  <span className="absolute top-5 right-5 text-[9px] uppercase tracking-wider font-bold text-red-400 bg-red-950/60 border border-red-800/20 px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Overdue Alert
                  </span>
                )}

                <div className="space-y-4">
                  {/* Top line info */}
                  <div className="flex gap-2.5 items-center flex-wrap">
                    <span className={`text-[9px] uppercase tracking-wider font-extrabold font-mono px-2 py-0.5 rounded-full ${
                      t.priority === 'high' 
                        ? 'bg-red-550/10 text-red-400 border border-red-500/20' 
                        : t.priority === 'medium'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}>
                      {t.priority}
                    </span>

                    {t.aiAnalysis && (
                      t.aiAnalysis.estimatedEffort === 'Calculating...' ? (
                        <span className="text-[10px] text-indigo-400 bg-indigo-950/20 px-2 py-0.5 rounded-full border border-indigo-500/10 font-mono font-bold flex items-center gap-1 animate-pulse">
                          <Sparkles className="h-3 w-3 text-indigo-400 animate-spin" /> Analyzing...
                        </span>
                      ) : (
                        <span className="text-[10px] text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-900/10 font-mono font-semibold flex items-center gap-1">
                          <Clock className="h-3 w-3 text-indigo-400" /> Suggested: {t.aiAnalysis.suggestedStartTime}
                        </span>
                      )
                    )}

                    <span className={`text-[9px] uppercase font-bold tracking-wider font-mono ml-auto ${
                      t.status === 'completed' ? 'text-emerald-400' : 'text-indigo-400 animate-pulse'
                    }`}>
                      ● {t.status}
                    </span>
                  </div>

                  {/* Title and details */}
                  <div className="space-y-1">
                    <h3 className={`text-base font-bold text-slate-100 font-sans tracking-tight ${t.status === 'completed' ? 'line-through text-slate-500' : ''}`}>
                      {t.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-sans">
                      {t.description || "No supplemental descriptions registered."}
                    </p>
                  </div>                  {/* Effort / Urgency indicators mapping */}
                  {t.aiAnalysis && (
                    t.aiAnalysis.estimatedEffort === 'Calculating...' ? (
                      <div className="flex items-center gap-2 justify-center p-3 bg-slate-900/30 border border-slate-900/40 rounded-2xl text-[11px] font-sans animate-pulse">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                        <span className="text-slate-500 font-medium">Wave AI is optimizing task parameters...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/60 border border-slate-800 rounded-2xl text-[11px] font-sans">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-slate-500 font-medium">Effort Estimate:</span>
                          <span className="font-mono text-slate-300 font-bold">{t.aiAnalysis.estimatedEffort}</span>
                        </div>
                        <div className="flex justify-between items-center px-1">
                          <span className="text-slate-500 font-medium">Urgency Index:</span>
                          <span className="font-mono text-indigo-400 font-bold">{t.aiAnalysis.urgencyScore} / 100</span>
                        </div>
                      </div>
                    )
                  )}

                  {/* Progress completion bars */}
                  <div className="space-y-1.5 p-1 bg-slate-950/30 rounded-2xl">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-slate-500">Waves Complete:</span>
                      <span className={`${t.status === 'completed' ? 'text-emerald-400' : 'text-indigo-400'} font-bold`}>{t.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          t.status === 'completed' 
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                            : 'bg-indigo-500'
                        }`}
                        style={{ width: `${t.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Calendar deadlines */}
                  {t.deadline && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                      <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Deadline limit:</span>
                      <span className="text-slate-350 font-bold">
                        {new Date(t.deadline).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}

                  {/* Risk Badges */}
                  {t.status === 'active' && (
                    <div className="flex items-start gap-2.5 p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                      <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded font-mono border self-start ${
                        t.riskLevel === 'high' 
                          ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                          : t.riskLevel === 'medium'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                      }`}>
                        {t.riskLevel || 'pending'} risk
                      </span>
                      {t.riskExplanation && (
                        <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{t.riskExplanation}</p>
                      )}
                    </div>
                  )}

                  {/* AI Recovery Plan display */}
                  {(isOverdue || t.riskLevel === 'high') && (
                    <div className="border border-indigo-550/20 bg-indigo-950/10 p-4 rounded-2xl space-y-3">
                      <h4 className="text-xs uppercase font-mono tracking-wider font-semibold text-indigo-455 flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" /> AI Recovery Matrix
                      </h4>
                      {t.recoveryPlan ? (
                        <div className="space-y-2 text-[11px] font-sans">
                          <p className="text-slate-200">📅 <strong className="text-slate-400">Schedule:</strong> {t.recoveryPlan.revisedSchedule}</p>
                          <p className="text-slate-200">🔥 <strong className="text-slate-400">Priorities:</strong> {t.recoveryPlan.newPriorities}</p>
                          <p className="text-slate-200">⚡ <strong className="text-slate-400">Steps:</strong> {t.recoveryPlan.actionPlan}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-[11px] text-slate-450 leading-relaxed mb-3 font-sans">
                            This task is critical and shows high risk of slippage. No operational Recovery Plan compiled.
                          </p>
                          <button
                            onClick={() => handleTriggerRecovery(t)}
                            disabled={recoveringTaskId === t.id}
                            className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-indigo-400 text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 font-sans"
                          >
                            {recoveringTaskId === t.id ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                                Aligning Blueprint...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Execute Recovery Analysis
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Operations buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-900 mt-5">
                  {t.status === 'active' && (
                    <>
                      {t.progress === 0 && (
                        <button
                          onClick={() => handleStartTaskWaveDirect(t)}
                          className="py-2 px-3.5 bg-indigo-650 hover:bg-indigo-600 hover:text-white border border-indigo-500/10 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-950/40"
                          id={`btn-start-wave-${t.id}`}
                        >
                          <Play className="h-3 w-3 fill-white text-white" />
                          Start Task Wave
                        </button>
                      )}
                      <button
                        onClick={() => onOpenProgressModal(t)}
                        className="py-2 px-3.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:text-indigo-400 hover:border-indigo-505/20 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                        id={`btn-prog-update-${t.id}`}
                      >
                        Log wave Progress
                      </button>
                      <button
                        onClick={() => handleDirectComplete(t.id!)}
                        className="py-2 px-3.5 bg-emerald-950/40 hover:bg-emerald-950 hover:text-white border border-emerald-990/20 text-emerald-400 text-xs font-semibold rounded-xl cursor-pointer transition-colors flex items-center gap-1"
                        id={`btn-direct-complete-${t.id}`}
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Complete Wave
                      </button>
                    </>
                  )}



                  <div className="flex items-center gap-1.5 ml-auto pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => onOpenEditForm(t)}
                      className="p-2 text-slate-500 hover:text-indigo-400 rounded-xl hover:bg-slate-950 cursor-pointer transition-colors"
                      title="Edit task parameters"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(t.id!)}
                      className="p-2 text-slate-500 hover:text-red-405 rounded-xl hover:bg-slate-950 cursor-pointer transition-colors"
                      title="Delete task permanently"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
