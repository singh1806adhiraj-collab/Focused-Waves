/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Task } from '../types';
import { X, Sparkles, MessageSquare, ThumbsUp, ChevronRight, Loader2, Trophy, Clock } from 'lucide-react';

interface ProgressModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveProgress: (taskId: string, progress: number, progressFeedback: string, status: 'active' | 'completed') => Promise<void>;
}

export default function ProgressModal({ task, isOpen, onClose, onSaveProgress }: ProgressModalProps) {
  const [progress, setProgress] = useState<number>(0);
  const [commentary, setCommentary] = useState('');
  const [loading, setLoading] = useState(false);
  
  // States of Gemini feedback
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [aiNextSteps, setAiNextSteps] = useState<string[]>([]);
  const [stage, setStage] = useState<'input' | 'feedback'>('input'); // 'input' or 'feedback'

  React.useEffect(() => {
    if (task) {
      setProgress(task.progress || 0);
      setCommentary('');
      setAiFeedback(null);
      setAiNextSteps([]);
      setStage('input');
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const handleFetchAiValidation = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/validate-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          progress: progress,
          commentary: commentary
        }),
      });
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      
      setAiFeedback(data.feedback);
      setAiNextSteps(data.nextSteps || []);
      setStage('feedback');
    } catch (error) {
      console.error('Error validating progress:', error);
      setAiFeedback("Fantastic progress! Keep up your cadence of Focus Waves. Let's conquer the rest of this task!");
      setAiNextSteps(['Break down the outstanding deliverables', 'Focus on immediate milestones', 'Log your next Wave milestone!']);
      setStage('feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyProgress = async () => {
    setLoading(true);
    try {
      // Save progress to firebase
      const currentStatus = progress === 100 ? 'completed' : 'active';
      const feedbackString = aiFeedback ? `${aiFeedback}\n\n*Suggested Next Steps:*\n${aiNextSteps.map(s => `- ${s}`).join('\n')}` : '';
      await onSaveProgress(task.id!, progress, feedbackString, currentStatus);
      onClose();
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  const progressOptions = [
    { value: 0, label: 'Not Started' },
    { value: 25, label: 'Started (25%)' },
    { value: 50, label: 'Midpoint (50%)' },
    { value: 100, label: 'Finished (100%)' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 md:p-8 animate-in fade-in duration-200 font-sans"
        id="progress-modal-card"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-950 transition-colors cursor-pointer"
          id="progress-modal-close"
        >
          <X className="h-5 w-5" />
        </button>

        {stage === 'input' ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 bg-indigo-950/40 text-indigo-400 border border-indigo-800/20 rounded-lg">
                <Clock className="h-5 w-5 animate-pulse" />
              </span>
              <h3 className="text-xl font-extrabold text-white font-sans tracking-tight">
                Log Wave Progress
              </h3>
            </div>
            
            <p className="text-sm text-slate-400 mb-6 font-sans">
              Update your progress on <span className="text-indigo-400 font-bold">"{task.title}"</span> and trigger AI Progress Validation.
            </p>

            <div className="space-y-6">
              {/* Progress Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider font-mono">
                  Select Progress Level
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {progressOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setProgress(opt.value)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold font-sans transition-all cursor-pointer ${
                        progress === opt.value
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/15'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                      id={`prog-opt-${opt.value}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress Slider Display */}
              <div className="bg-slate-950 p-4.5 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center text-xs font-mono mb-2">
                  <span className="text-slate-500">Execution Wave Status</span>
                  <span className="text-indigo-400 font-bold">{progress}% Complete</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full transition-all duration-500" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Progress Commentary */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-indigo-400" />
                  What have you executed so far? (Optional)
                </label>
                <textarea
                  value={commentary}
                  onChange={(e) => setCommentary(e.target.value)}
                  placeholder="E.g. Setup database model, verified endpoint logs, or debugged routing schema..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans transition-colors resize-none h-24"
                />
              </div>

              {/* Fetch AI Feedback CTA */}
              <button
                type="button"
                onClick={handleFetchAiValidation}
                disabled={loading}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-550 disabled:opacity-50 text-white rounded-xl text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all cursor-pointer font-sans"
                id="progress-modal-ai-validate"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Consulting Wave AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-white animate-pulse" />
                    Validate Progress & Get AI Recommendations
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-lg">
                <Sparkles className="h-5 w-5" />
              </span>
              <h3 className="text-xl font-extrabold text-white font-sans tracking-tight">
                Progress Validated!
              </h3>
            </div>

            <p className="text-sm text-slate-400 mb-6 font-sans">
              Here is customized optimization advice based on your current Wave completion rate.
            </p>

            <div className="space-y-6">
              {/* Motivational Banner */}
              <div className="bg-slate-950 border border-indigo-500/10 rounded-2xl p-5 text-left relative overflow-hidden">
                <div className="absolute right-4 top-4 text-indigo-500/10">
                  {progress === 100 ? <Trophy className="h-16 w-16" /> : <ThumbsUp className="h-16 w-16" />}
                </div>
                <h4 className="text-xs uppercase font-mono tracking-wider text-indigo-400 font-bold mb-2 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 inline" /> Wave Engine Motivation
                </h4>
                <p className="text-sm text-slate-200 font-sans leading-relaxed relative z-10">
                  {aiFeedback}
                </p>
              </div>

              {/* Action Recommendations */}
              {aiNextSteps && aiNextSteps.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase font-mono tracking-wider text-indigo-400 font-semibold mb-2.5">
                    Recommended Focal Items
                  </h4>
                  <ul className="space-y-2">
                    {aiNextSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                        <ChevronRight className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                        <span className="font-sans leading-relaxed text-slate-205">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Apply/Save Progress buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStage('input')}
                  className="sm:w-1/3 py-2.5 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  id="progress-modal-back"
                >
                  Edit Values
                </button>
                <button
                  type="button"
                  onClick={handleApplyProgress}
                  disabled={loading}
                  className="sm:w-2/3 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/10 cursor-pointer transition-colors"
                  id="progress-modal-save"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Confirm & Save updates ({progress}%)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
