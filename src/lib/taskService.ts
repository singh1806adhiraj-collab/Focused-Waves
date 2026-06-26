/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db, handleFirestoreError, OperationType } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  onSnapshot
} from 'firebase/firestore';
import { Task, RecoveryPlan } from '../types';

const TASKS_COLL = 'tasks';

// Create tasks
export async function createNewTask(task: Omit<Task, 'id'>) {
  const pathForWrite = TASKS_COLL;
  try {
    const colRef = collection(db, TASKS_COLL);
    const docRef = await addDoc(colRef, task);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathForWrite);
  }
}

// Update task
export async function updateTask(taskId: string, updates: Partial<Task>) {
  const pathForWrite = `${TASKS_COLL}/${taskId}`;
  try {
    const docRef = doc(db, TASKS_COLL, taskId);
    await updateDoc(docRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathForWrite);
  }
}

// Delete task
export async function deleteTask(taskId: string) {
  const pathForWrite = `${TASKS_COLL}/${taskId}`;
  try {
    const docRef = doc(db, TASKS_COLL, taskId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathForWrite);
  }
}

// Recalculate deadline risk prediction
export async function runBulkRiskPrediction(userId: string, activeTasks: Task[]): Promise<{ taskId: string; riskLevel: string; riskExplanation: string }[]> {
  try {
    if (activeTasks.length === 0) return [];
    
    // Call server endpoint
    const response = await fetch('/api/predict-risks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tasks: activeTasks.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          priority: t.priority,
          deadline: t.deadline,
          progress: t.progress,
          status: t.status
        }))
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    const risksList = data.risks || [];
    
    // Update tasks in Firebase
    const updatePromises = risksList.map((r: any) => {
      return updateTask(r.taskId, {
        riskLevel: r.riskLevel as 'low' | 'medium' | 'high',
        riskExplanation: r.riskExplanation
      });
    });

    await Promise.all(updatePromises);
    return risksList;
  } catch (error) {
    console.error('Error in bulk risk prediction:', error);
    throw error;
  }
}

// Generate recovery plan
export async function generateRecoveryPlan(task: Task): Promise<RecoveryPlan> {
  try {
    const response = await fetch('/api/generate-recovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: task.title,
        description: task.description,
        deadline: task.deadline,
        priority: task.priority,
        progress: task.progress,
        riskExplanation: task.riskExplanation || 'Exceeding target timeline boundary thresholds'
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    const recoveryFeedback: RecoveryPlan = {
      revisedSchedule: data.revisedSchedule,
      newPriorities: data.newPriorities,
      actionPlan: data.actionPlan
    };

    // Update Firestore task doc
    await updateTask(task.id!, {
      recoveryPlan: recoveryFeedback
    });

    return recoveryFeedback;
  } catch (error) {
    console.error('Error creating recovery plan:', error);
    throw error;
  }
}

// Generate accountability/motivation for Wave Lock and save it
export async function generateWaveLockMotivation(
  task: Task, 
  waveLevel: 'low' | 'medium' | 'high', 
  missedCount: number
): Promise<{ motivation: string; recoveryRecommendation: string }> {
  try {
    const response = await fetch('/api/wave-lock-motivation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: task.title,
        description: task.description,
        deadline: task.deadline,
        priority: task.priority,
        waveLevel,
        missedInteractions: missedCount,
        riskLevel: task.riskLevel || 'low'
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    const result = {
      motivation: data.motivation,
      recoveryRecommendation: data.recoveryRecommendation
    };

    // Save directly to Firestore for full persistence
    await updateTask(task.id!, {
      waveLevel,
      missedInteractions: missedCount,
      lastInteraction: Date.now(),
      waveLockMotivation: result.motivation,
      waveLockRecoveryPlan: result.recoveryRecommendation
    });

    return result;
  } catch (error) {
    console.error('Error generating Wave Lock motivation:', error);
    // Return standard fallback if network or API key issue
    const fallbackMotivation = waveLevel === 'high' 
      ? `CRITICAL WAVE LOCK: Delaying "${task.title}" is causing severe scheduling risk. Take action right now!`
      : waveLevel === 'medium'
        ? `Procrastinating on "${task.title}" will build up scheduling pressure. Stay locked in and start now!`
        : `You planned this task for a reason. Starting now keeps you perfectly on track.`;
    const fallbackRec = task.riskLevel === 'high' || waveLevel === 'high'
      ? `This task is falling behind schedule. Begin within the next 30 minutes to avoid missing the deadline.`
      : `Begin with a focused 15-minute work block.`;

    await updateTask(task.id!, {
      waveLevel,
      missedInteractions: missedCount,
      lastInteraction: Date.now(),
      waveLockMotivation: fallbackMotivation,
      waveLockRecoveryPlan: fallbackRec
    });

    return { motivation: fallbackMotivation, recoveryRecommendation: fallbackRec };
  }
}
