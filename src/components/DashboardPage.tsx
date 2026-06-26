/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Task, RecoveryPlan } from '../types';
import { runBulkRiskPrediction, generateRecoveryPlan, updateTask } from '../lib/taskService';
import NotificationStatusCard from './NotificationStatusCard';
import { 
  Sparkles, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Loader2, 
  Calendar, 
  ArrowRight,
  ShieldAlert,
  Dribbble,
  BookOpen
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';

interface DashboardPageProps {
  user: { displayName?: string | null; email?: string | null; uid: string };
  tasks: Task[];
  onTriggerAlert: (task: Task) => void;
  onOpenEditForm: (task: Task) => void;
  onOpenProgressModal: (task: Task) => void;
}

export default function DashboardPage({ user, tasks, onTriggerAlert, onOpenEditForm, onOpenProgressModal }: DashboardPageProps) {
  const [analyzingRisks, setAnalyzingRisks] = useState(false);
  const [generatingRecoveryTaskId, setGeneratingRecoveryTaskId] = useState<string | null>(null);

  const activeTasks = tasks.filter(t => t.status === 'active');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  // Time calculations
  const overdueTasks = activeTasks.filter(t => {
    if (!t.deadline) return false;
    return new Date(t.deadline).getTime() < Date.now();
  });

  // Calculate high risk tasks
  const highRiskTasks = activeTasks.filter(t => t.riskLevel === 'high' || overdueTasks.includes(t));

  // Risk recalculation handler
  const handleRecalculateRisks = async () => {
    setAnalyzingRisks(true);
    try {
      await runBulkRiskPrediction(user.uid, activeTasks);
    } catch (err) {
      console.error('Error recalculating risks:', err);
    } finally {
      setAnalyzingRisks(false);
    }
  };

  // Recovery Plan triggers
  const handleTriggerRecovery = async (task: Task) => {
    setGeneratingRecoveryTaskId(task.id!);
    try {
      await generateRecoveryPlan(task);
    } catch (err) {
      console.error('Error triggering recovery:', err);
    } finally {
      setGeneratingRecoveryTaskId(null);
    }
  };

  // Stat metrics
  const totalTasksCount = tasks.length;
  const activeCount = activeTasks.length;
  const completedCount = completedTasks.length;
  const completionRate = totalTasksCount > 0 ? Math.round((completedCount / totalTasksCount) * 100) : 0;

  // Chart data 1: Priority volumes
  const priorityData = [
    { name: 'Low', count: tasks.filter(t => t.priority === 'low').length, fill: '#818cf8' },
    { name: 'Medium', count: tasks.filter(t => t.priority === 'medium').length, fill: '#f59e0b' },
    { name: 'High', count: tasks.filter(t => t.priority === 'high').length, fill: '#f43f5e' }
  ];

  // Chart data 2: Progress completion stages
  const completionStageData = [
    { name: 'Not Started', value: tasks.filter(t => t.progress === 0).length, color: '#475569' },
    { name: 'Started (25%)', value: tasks.filter(t => t.progress === 25).length, color: '#06b6d4' },
    { name: 'Midway (50%)', value: tasks.filter(t => t.progress === 50).length, color: '#6366f1' },
    { name: 'Completed (100%)', value: tasks.filter(t => t.progress === 100).length, color: '#10b981' }
  ];

  // Overdue countdown / formatted deadlines
  const getDaysRemaining = (deadlineStr: string) => {
    if (!deadlineStr) return '';
    const diff = new Date(deadlineStr).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return `Overdue by ${Math.abs(days)}d`;
    if (days === 0) return 'Due today';
    return `${days}d left`;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 bg-slate-950 text-slate-200 min-h-screen animate-fade-in" id="dashboard-layout">
      
      {/* 1. Welcome Card & Quick Summary */}
      <div className="relative bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-80 h-40 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-999 rounded-full text-[10px] font-mono font-medium text-slate-400 border border-slate-800 uppercase tracking-widest">
            <Clock className="h-3.5 w-3.5 text-indigo-450 animate-pulse" /> WAVE CADENCE IN FOCUS
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">
            Welcome back, <span className="text-indigo-400">{user.displayName || 'Alex'}</span>!
          </h2>
          <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
            Your high-frequency productivity dashboard has compiled all active milestones. 
            {overdueTasks.length > 0 
              ? ` Alert: You have ${overdueTasks.length} overdue item(s) requiring immediate Recovery actions.`
              : ' All scheduled tasks are currently running within safe margin thresholds.'}
          </p>
        </div>

        {/* Bulk Action Controls */}
        <button
          onClick={handleRecalculateRisks}
          disabled={analyzingRisks || activeCount === 0}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 font-bold text-white shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-40 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer w-full md:w-auto justify-center font-sans tracking-tight"
          id="recalc-risks-btn"
        >
          {analyzingRisks ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              Crunching Risk Matrix...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-white animate-pulse" />
              Recalculate AI Risk Forecasts
            </>
          )}
        </button>
      </div>

      {/* Background Notification Status Configuration Card */}
      <NotificationStatusCard />

      {/* 2. Bento Stats Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6" id="bento-stats-panel">
        <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl flex flex-col justify-between">
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Active Tasks</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl md:text-4xl font-extrabold text-white font-mono">{activeCount}</span>
            <span className="text-xs text-indigo-400 font-mono">Running</span>
          </div>
        </div>

        <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl flex flex-col justify-between">
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Completed Waves</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl md:text-4xl font-extrabold text-white font-mono">{completedCount}</span>
            <span className="text-xs text-indigo-400 font-mono">Finished</span>
          </div>
        </div>

        <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl flex flex-col justify-between">
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Completion Rate</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl md:text-4xl font-extrabold text-indigo-400 font-mono">{completionRate}%</span>
            <span className="text-xs text-slate-400 font-mono">Efficiency</span>
          </div>
        </div>

        <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl flex flex-col justify-between">
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">High Risk Threats</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className={`text-3xl md:text-4xl font-extrabold font-mono ${highRiskTasks.length > 0 ? 'text-red-400' : 'text-slate-450'}`}>
              {highRiskTasks.length}
            </span>
            <span className="text-xs text-red-500 font-mono">Bottlenecks</span>
          </div>
        </div>
      </div>

      {/* Core Systems Specifications Hub */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-6 space-y-6" id="core-systems-hub">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold font-sans text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
              Focused Wave Engine: Core Systems Hub
            </h3>
            <p className="text-xs text-slate-400">Diagnostic overview of the 5 key AI & orchestration models deployed across your workspace.</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-950/20 border border-emerald-500/20 px-3.5 py-1.5 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-400 tracking-wider uppercase">All Engines Active</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* 1. AI Task Analyzer */}
          <div className="p-4 bg-slate-950/40 border border-slate-850 hover:border-slate-800 rounded-2xl flex flex-col justify-between space-y-3 transition-colors">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="p-1.5 bg-indigo-950/30 text-indigo-400 border border-indigo-550/10 rounded-lg">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-400 font-extrabold bg-indigo-950/20 px-2 py-0.5 rounded border border-indigo-500/10">Engine 01</span>
              </div>
              <h4 className="text-xs font-bold text-white font-sans mt-1">AI Task Analyzer</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">Estimates task cognitive load, urgency scores (1-100), effort hours, and suggested times.</p>
            </div>
            <div className="pt-2 border-t border-slate-900 text-[10px] text-indigo-305 font-mono flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse shrink-0"></span>
              <span>Triggers via Add/Edit form</span>
            </div>
          </div>

          {/* 2. Wave Alert System */}
          <div className="p-4 bg-slate-950/40 border border-slate-850 hover:border-slate-800 rounded-2xl flex flex-col justify-between space-y-3 transition-colors">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="p-1.5 bg-indigo-950/30 text-indigo-400 border border-indigo-550/10 rounded-lg">
                  <Clock className="h-4 w-4" />
                </span>
                <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-400 font-extrabold bg-indigo-950/20 px-2 py-0.5 rounded border border-indigo-500/10">Engine 02</span>
              </div>
              <h4 className="text-xs font-bold text-white font-sans mt-1">Wave Alert System</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">Locks cognitive attention with automatic, time-based popups when your tasks schedule commences.</p>
            </div>
            <div className="pt-2 border-t border-slate-900 text-[10px] text-indigo-305 font-mono flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse shrink-0"></span>
              <span>Trigger manually on Tasks Page</span>
            </div>
          </div>

          {/* 3. AI Progress Validation */}
          <div className="p-4 bg-slate-950/40 border border-slate-850 hover:border-slate-800 rounded-2xl flex flex-col justify-between space-y-3 transition-colors">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="p-1.5 bg-indigo-950/30 text-indigo-400 border border-indigo-550/10 rounded-lg">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-400 font-extrabold bg-indigo-950/20 px-2 py-0.5 rounded border border-indigo-500/10">Engine 03</span>
              </div>
              <h4 className="text-xs font-bold text-white font-sans mt-1">Progress Validation</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">Analyzes completion commentaries dynamically to render energetic mentoring and next steps.</p>
            </div>
            <div className="pt-2 border-t border-slate-900 text-[10px] text-indigo-305 font-mono flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse shrink-0"></span>
              <span>Triggers via Update Progress</span>
            </div>
          </div>

          {/* 4. Deadline Risk Prediction */}
          <div className="p-4 bg-slate-950/40 border border-slate-850 hover:border-slate-800 rounded-2xl flex flex-col justify-between space-y-3 transition-colors">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="p-1.5 bg-indigo-950/30 text-indigo-400 border border-indigo-550/10 rounded-lg">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-400 font-extrabold bg-indigo-950/20 px-2 py-0.5 rounded border border-indigo-500/10">Engine 04</span>
              </div>
              <h4 className="text-xs font-bold text-white font-sans mt-1">Risk Prediction</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">Predicts the risk of tasks breaching set deadlines based on historical velocity factors.</p>
            </div>
            <div className="pt-2 border-t border-slate-900 text-[10px] text-indigo-305 font-mono flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse shrink-0"></span>
              <span>Click Recalculate risks button</span>
            </div>
          </div>

          {/* 5. AI Recovery Plan */}
          <div className="p-4 bg-slate-950/40 border border-slate-850 hover:border-slate-800 rounded-2xl flex flex-col justify-between space-y-3 transition-colors">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="p-1.5 bg-indigo-950/30 text-indigo-400 border border-indigo-550/10 rounded-lg">
                  <ShieldAlert className="h-4 w-4" />
                </span>
                <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-400 font-extrabold bg-indigo-950/20 px-2 py-0.5 rounded border border-indigo-500/10">Engine 05</span>
              </div>
              <h4 className="text-xs font-bold text-white font-sans mt-1">AI Recovery Plan</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">Formulates custom micro-sprints and scheduling mitigations for slippage tasks.</p>
            </div>
            <div className="pt-2 border-t border-slate-900 text-[10px] text-indigo-305 font-mono flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse shrink-0"></span>
              <span>Triggers via Recovery Panel below</span>
            </div>
          </div>

        </div>
      </div>

      {/* 3. Columns: Left Charts Panel & Right Risk forecasts list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="dashboard-visualizers">
        
        {/* Left main: Chart Visualization Panel */}
        <div className="lg:col-span-8 bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold font-sans text-white">Productivity Statistics</h3>
              <p className="text-xs text-slate-400">Breakdown of execution milestones, priority matrices, and performance metrics.</p>
            </div>
            <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-indigo-400 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider">REALTIME ANALYTICS</span>
          </div>

          {totalTasksCount === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-center p-6 bg-slate-950/45 rounded-2xl border border-slate-850">
              <TrendingUp className="h-10 w-10 text-slate-700 mb-2 animate-bounce-short" />
              <p className="text-xs text-slate-500 max-w-sm">
                No telemetry metadata mapped! Deploy tasks in the next-generation workspace to visualize performance waves.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Chart A: Priority Metrics */}
              <div className="space-y-4 bg-slate-950/40 p-5 rounded-2xl border border-slate-850">
                <span className="text-xs font-semibold text-slate-400 font-mono uppercase tracking-wider">Priority Breakdown</span>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '12px' }} 
                        labelStyle={{ color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                        itemStyle={{ fontSize: '11px', color: '#818cf8', fontFamily: 'monospace' }}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {priorityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart B: Distribution progress */}
              <div className="space-y-4 bg-slate-950/40 p-5 rounded-2xl border border-slate-850">
                <span className="text-xs font-semibold text-slate-400 font-mono uppercase tracking-wider">Execution Stage Mix</span>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={completionStageData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {completionStageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '12px' }} 
                        itemStyle={{ fontSize: '11px', color: '#fff', fontFamily: 'monospace' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legends */}
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono px-2">
                  {completionStageData.map((pt, i) => (
                    <div key={i} className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pt.color }}></span>
                      <span className="text-slate-400">{pt.name}: <strong className="text-white">{pt.value}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right sub: Risk Prediction Panel */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-6" id="dashboard-risk-panel">
          <div className="space-y-1 pb-4 border-b border-slate-800">
            <h3 className="text-lg font-bold font-sans flex items-center gap-1.5 text-red-400">
              <ShieldAlert className="h-5 w-5" />
              Risk Prediction Panel
            </h3>
            <p className="text-xs text-slate-400">Gemini model calculates risk levels based on outstanding progress, timelines, and priorities.</p>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[300px] space-y-3 pr-1">
            {activeTasks.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4">
                <p className="text-xs text-slate-550">No active tasks to analyze risks for. Add dynamic items to trigger forecast layers!</p>
              </div>
            ) : (
              activeTasks.map((t) => (
                <div 
                  key={t.id} 
                  className="p-4 bg-slate-800/40 hover:bg-slate-800/60 border border-slate-800 rounded-2xl flex flex-col gap-1.5 transition-colors cursor-pointer"
                  onClick={() => onOpenEditForm(t)}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-white truncate max-w-[150px]">{t.title}</span>
                    <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded font-mono border ${
                      t.riskLevel === 'high' 
                        ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                        : t.riskLevel === 'medium'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-indigo-500/10 text-indigo-405 border-indigo-550/20'
                    }`}>
                      {t.riskLevel || 'low'} Risk
                    </span>
                  </div>
                  
                  {t.riskExplanation ? (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-sans">{t.riskExplanation}</p>
                  ) : (
                    <p className="text-[11px] text-slate-450 italic">No prediction computed yet. Run the bulk recalculation above.</p>
                  )}

                  {/* Overdue/Urgency Indicator */}
                  <div className="flex items-center justify-between text-[10px] font-mono mt-1 text-slate-500">
                    <span className="flex items-center gap-1 text-indigo-400 font-bold">
                      <Calendar className="h-3 w-3" />
                      {getDaysRemaining(t.deadline)}
                    </span>
                    <span>Progress: {t.progress}%</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {activeCount > 0 && (
            <div className="pt-2 border-t border-slate-800">
              <p className="text-[10px] text-slate-500 italic leading-relaxed text-center font-mono">
                Bulk evaluation assesses task velocity arrays instantly.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Upcoming Deadlines + Immediate Recovery Actions list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="dashboard-deadlines-recovery">
        
        {/* Deadlines timeline list */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-lg font-bold font-sans flex items-center gap-2 text-white">
            <Calendar className="h-5 w-5 text-indigo-400" />
            Upcoming Deadlines Timeline
          </h3>

          <div className="space-y-3">
            {activeTasks.length === 0 ? (
              <p className="text-xs text-slate-550 py-6">All clear! No upcoming task deadlines scheduled.</p>
            ) : (
              activeTasks
                .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
                .slice(0, 4)
                .map((t) => {
                  const urgent = new Date(t.deadline).getTime() < Date.now();
                  return (
                    <div 
                      key={t.id} 
                      className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all duration-200 ${
                        urgent 
                          ? 'bg-red-950/10 border-red-500/20 hover:border-red-500/30' 
                          : 'bg-slate-950/40 border-slate-850 hover:bg-slate-950 hover:border-slate-800'
                      }`}
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-semibold text-white truncate font-sans">{t.title}</strong>
                          {urgent && (
                            <span className="text-[8px] uppercase tracking-wider font-bold text-red-400 bg-red-950/50 px-1.5 rounded border border-red-505/20">
                              OVERDUE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-1">{t.description || 'No description listed.'}</p>
                      </div>

                      {/* Right timeline info */}
                      <div className="text-right shrink-0">
                        <span className="block text-xs font-bold text-indigo-400 font-mono">
                          {getDaysRemaining(t.deadline)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {t.deadline ? new Date(t.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                        </span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* AI Recovery Plan display */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-4" id="dashboard-ai-recovery">
          <div className="space-y-1">
            <h3 className="text-lg font-bold font-sans flex items-center gap-1.5 text-white">
              <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
              AI Recovery Plan Frameworks
            </h3>
            <p className="text-xs text-slate-400">
              Formulates an operational recovery framework when any task exhibits extreme risk or surpasses deadline boundaries.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[300px]">
            {highRiskTasks.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4">
                <CheckCircle2 className="h-8 w-8 text-indigo-400 mb-2" />
                <p className="text-xs text-slate-200 font-bold font-sans">Strategic state safe.</p>
                <p className="text-[11px] text-slate-500 mt-0.5">No tasks are high risk or overdue. Speed velocity is healthy.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {highRiskTasks.slice(0, 2).map((t) => (
                  <div key={t.id} className="p-4 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-3 shadow-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-white truncate max-w-[200px]">{t.title}</span>
                      <span className="text-[9px] uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded font-mono font-bold">
                        Threat Warning
                      </span>
                    </div>

                    {t.recoveryPlan ? (
                      <div className="space-y-3 text-xs">
                        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                          <span className="text-[9px] font-bold font-mono text-indigo-400 block uppercase tracking-wider mb-1">📅 Revised Schedule Outline</span>
                          <p className="text-slate-200 leading-relaxed font-sans">{t.recoveryPlan.revisedSchedule}</p>
                        </div>
                        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                          <span className="text-[9px] font-bold font-mono text-indigo-400 block uppercase tracking-wider mb-1">🔥 Priority Alignment</span>
                          <p className="text-slate-200 leading-relaxed font-sans">{t.recoveryPlan.newPriorities}</p>
                        </div>
                        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                          <span className="text-[9px] font-bold font-mono text-amber-500 block uppercase tracking-wider mb-1 font-semibold">⚡ Action Steps</span>
                          <p className="text-slate-200 leading-relaxed font-sans">{t.recoveryPlan.actionPlan}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-400 leading-relaxed">
                          This task is critical and shows high risk of schedule slippage or failure. No active Recovery Plan generated.
                        </p>
                        <button
                          onClick={() => handleTriggerRecovery(t)}
                          disabled={generatingRecoveryTaskId === t.id}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold tracking-wide flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950/20 cursor-pointer transition-colors font-sans"
                        >
                          {generatingRecoveryTaskId === t.id ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin text-white" />
                              Compiling Action Blueprint...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5 text-white" />
                              Construct AI Recovery Framework
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
