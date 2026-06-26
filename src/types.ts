/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TaskAnalysis {
  priority: 'low' | 'medium' | 'high';
  estimatedEffort: string; // e.g. "2 hours", "45 minutes"
  urgencyScore: number; // 1-100 scale
  suggestedStartTime: string; // ISO time string or "HH:MM"
}

export interface RecoveryPlan {
  revisedSchedule: string;
  newPriorities: string;
  actionPlan: string;
}

export interface Task {
  id?: string;
  userId: string;
  title: string;
  description: string;
  deadline: string; // "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM"
  priority: 'low' | 'medium' | 'high';
  progress: number; // 0, 25, 50, 100
  status: 'active' | 'completed';
  riskLevel: 'low' | 'medium' | 'high' | 'pending';
  riskExplanation?: string;
  aiAnalysis?: TaskAnalysis | null;
  progressFeedback?: string;
  recoveryPlan?: RecoveryPlan | null;
  createdAt: number;

  // Wave Lock Flagship Feature States
  waveLevel?: 'low' | 'medium' | 'high'; // 'low' = gentle, 'medium' = stronger, 'high' = critical
  lastInteraction?: number; // timestamp of last interaction
  completionState?: 'not_started' | 'started' | 'completed';
  waveLockActive?: boolean;
  waveLockInterval?: number; // Configurable interval in minutes (e.g. 1, 5, 10)
  waveLockBypassedUntil?: number; // Timestamp until which the lock is temporarily bypassed
  waveLockBypassedReason?: string; // Reason user gave for temporary bypass
  missedInteractions?: number; // Count of times they closed/bypassed without action
  waveLockMotivation?: string; // AI generated motivation/accountability message
  waveLockRecoveryPlan?: string; // AI generated recovery recommendations if high-risk
  strictWaveLock?: boolean; // If true, the snooze/escape option is completely disabled
  focusDurationMinutes?: number; // Focus block timer in minutes
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
}
