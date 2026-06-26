/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Task } from './types';
import { createNewTask, updateTask, generateWaveLockMotivation } from './lib/taskService';

// Import Custom components
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import LandingPage from './components/LandingPage';
import DashboardPage from './components/DashboardPage';
import TasksPage from './components/TasksPage';
import TaskFormModal from './components/TaskFormModal';
import ProgressModal from './components/ProgressModal';
import WaveLockOverlay from './components/WaveLockOverlay';

// Helper to reliably trigger browser/PWA notifications in background or foreground
const triggerSystemNotification = (
  title: string, 
  body: string, 
  requireInteraction = false, 
  ongoing = false, 
  tag?: string
) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const resolvedTag = tag || 'wave-notification-' + Date.now();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        body: body,
        tag: resolvedTag,
        requireInteraction: requireInteraction || ongoing, // enforce interaction if ongoing
        ongoing: ongoing, // native lock on Android/Chrome
        vibrate: [200, 100, 200],
        badge: '/favicon.ico',
        icon: '/favicon.ico',
        data: {
          sticky: requireInteraction || ongoing,
          ongoing: ongoing,
          wasClicked: false
        },
        actions: (requireInteraction || ongoing) ? [
          { action: 'open', title: '🔓 Open Focused Waves' }
        ] : []
      } as any);
    }).catch((err) => {
      console.error('Service worker registration failed or not ready:', err);
      // Fallback
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        requireInteraction,
        tag: resolvedTag
      } as any);
    });
  } else {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      requireInteraction,
      tag: resolvedTag
    } as any);
  }
};

const dismissSystemNotification = (tag: string) => {
  if (!('Notification' in window)) return;

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      // Find and close any active notification with this tag
      registration.getNotifications({ tag }).then((notifications) => {
        notifications.forEach((notification) => {
          if (notification.data) {
            notification.data.wasClicked = true; // flag to bypass recreate on close
          }
          notification.close();
        });
      });
      // Also send message for background safety
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLOSE_NOTIFICATION',
          tag
        });
      }
    }).catch((err) => {
      console.error('Error getting service worker for closing notification:', err);
    });
  }
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // Tab/Page Navigation
  const [activeTab, setActiveTab] = useState<'landing' | 'dashboard' | 'tasks'>('landing');

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [activeTaskForProgress, setActiveTaskForProgress] = useState<Task | null>(null);

  // Wave Alert System states
  const [triggeredAlertTask, setTriggeredAlertTask] = useState<Task | null>(null);
  const [alertCooldowns, setAlertCooldowns] = useState<Record<string, number>>({}); // tracks last trigger timestamps to avoid duplicate popup loops

  const lastNotifiedProgress = useRef<Record<string, number>>({});

  // 4. Ongoing task notification manager (unswipeable / locked notification bar)
  useEffect(() => {
    if (!user) return;

    // Check for deleted tasks: if a task ID is in lastNotifiedProgress but no longer exists in tasks, dismiss its notification
    const currentTaskIds = new Set(tasks.map(t => t.id).filter(Boolean));
    Object.keys(lastNotifiedProgress.current).forEach(id => {
      if (!currentTaskIds.has(id)) {
        dismissSystemNotification(`wave-lock-${id}`);
        delete lastNotifiedProgress.current[id];
      }
    });

    tasks.forEach(t => {
      if (!t.id) return;

      const prevProg = lastNotifiedProgress.current[t.id];
      const currProg = t.progress;

      if (t.status === 'active' && currProg > 0 && currProg < 100) {
        // If progress changed, or it hasn't been notified yet:
        if (prevProg === undefined || prevProg !== currProg) {
          triggerSystemNotification(
            `🔒 Active Wave Locked: ${t.title}`,
            `Progress is at ${currProg}%. Your focus lock is fully engaged! Complete your wave.`,
            true, // requireInteraction
            true, // ongoing (locks notification bar)
            `wave-lock-${t.id}`
          );
          lastNotifiedProgress.current[t.id] = currProg;
        }
      } else if (t.status === 'completed' || currProg === 100) {
        if (prevProg !== undefined) {
          dismissSystemNotification(`wave-lock-${t.id}`);
          delete lastNotifiedProgress.current[t.id];
        }
      }
    });
  }, [tasks, user]);

  // 1. Firebase Authentication Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setAuthChecking(false);
      if (authUser) {
        setActiveTab('dashboard'); // Auto redirect to dashboard once logged in
      } else {
        setActiveTab('landing'); // Otherwise fallback to landing
      }
    });

    return unsubscribe;
  }, []);

  // 2. Real-time Tasks collection synchronization
  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }

    // Safeguard: Query simply on userId to bypass composite index constraints.
    const colRef = collection(db, 'tasks');
    const q = query(colRef, where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbTasksList: Task[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        dbTasksList.push({
          id: docSnap.id,
          ...data,
        } as Task);
      });

      // Sort tasks client-side (createdAt desc) to ensure robust performance without custom index rules
      dbTasksList.sort((a, b) => b.createdAt - a.createdAt);
      setTasks(dbTasksList);
    }, (error) => {
      console.error("Firestore tasks listener error:", error);
    });

    return unsubscribe;
  }, [user]);

  // Current time tracker to force reactive re-renders when bypass intervals expire
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 5000); // Check and tick every 5 seconds
    return () => clearInterval(timer);
  }, []);

  // 3. Chronological Wave Lock clock checking
  useEffect(() => {
    if (!user || tasks.length === 0) return;

    const intervalId = setInterval(() => {
      const now = new Date();
      const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      tasks.forEach(async (t) => {
        if (t.status !== 'active' || !t.aiAnalysis?.suggestedStartTime) return;
        
        // Exact time match
        const isTimeMatch = t.aiAnalysis.suggestedStartTime === currentHourMin;
        
        // Cooldown to prevent triggering multiple times within the same minute
        const lastTriggerTime = alertCooldowns[t.id!] || 0;
        const cooldownActive = Date.now() - lastTriggerTime < 65000;
        
        if (isTimeMatch && !cooldownActive && !t.waveLockActive) {
          setAlertCooldowns(prev => ({
            ...prev,
            [t.id!]: Date.now()
          }));
          
          try {
            // Instantly activate the Wave Lock overlay
            await updateTask(t.id!, {
              waveLockActive: true,
              waveLevel: 'low',
              completionState: 'not_started',
              missedInteractions: 0,
              lastInteraction: Date.now(),
              waveLockBypassedUntil: 0
            });

            // Dispatch a real-time native device notification
            triggerSystemNotification(
              `⚡ Deep Focus Wave Locked In!`,
              `Time to work on your task: "${t.title}". All distraction elements are locked.`,
              true,
              true,
              `wave-lock-${t.id}`
            );

            // Pre-generate Wave Lock coaching using Gemini asynchronously
            generateWaveLockMotivation(t, 'low', 0).catch(err => {
              console.error("Failed to generate Wave Lock coaching in background:", err);
            });
          } catch (err) {
            console.error("Failed to trigger Wave Lock on scheduled time:", err);
          }
        }
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(intervalId);
  }, [user, tasks, alertCooldowns]);

  // Operations: Create / Modify task
  const fetchAiAnalysisInBackground = async (taskId: string, originalTask: Partial<Task>) => {
    try {
      const response = await fetch('/api/analyze-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: originalTask.title,
          description: originalTask.description,
          deadline: originalTask.deadline,
          priority: originalTask.priority,
          currentLocalTime: new Date().toString()
        })
      });
      const data = await response.json();
      if (data && !data.error) {
        await updateTask(taskId, {
          aiAnalysis: data
        });
      } else {
        await updateTask(taskId, {
          aiAnalysis: {
            priority: originalTask.priority || 'medium',
            estimatedEffort: '1.5 hours',
            urgencyScore: originalTask.priority === 'high' ? 80 : originalTask.priority === 'medium' ? 50 : 20,
            suggestedStartTime: '09:00'
          }
        });
      }
    } catch (err) {
      console.error('Background AI analysis failed:', err);
      await updateTask(taskId, {
        aiAnalysis: {
          priority: originalTask.priority || 'medium',
          estimatedEffort: '1.5 hours',
          urgencyScore: originalTask.priority === 'high' ? 80 : originalTask.priority === 'medium' ? 50 : 20,
          suggestedStartTime: '09:00'
        }
      });
    }
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (taskData.id) {
      // Update
      const id = taskData.id;
      delete taskData.id;
      await updateTask(id, taskData);
      if (taskData.aiAnalysis?.estimatedEffort === 'Calculating...') {
        fetchAiAnalysisInBackground(id, { ...taskData });
      }
    } else {
      // Create
      const newId = await createNewTask(taskData as Omit<Task, 'id'>);
      if (newId && taskData.aiAnalysis?.estimatedEffort === 'Calculating...') {
        fetchAiAnalysisInBackground(newId, { ...taskData });
      }
    }
    setTaskToEdit(null);
  };

  // Operations: Submit progress completion metrics
  const handleSaveProgress = async (taskId: string, progress: number, progressFeedback: string, status: 'active' | 'completed') => {
    await updateTask(taskId, {
      progress,
      progressFeedback,
      status,
      // If completed (100%), set low risk
      ...(progress === 100 ? { riskLevel: 'low', riskExplanation: 'Completed successfully.' } : {})
    });
  };

  // Wave Lock Flagship Actions
  const handleStartWaveLock = async (taskId: string) => {
    try {
      const existingTask = tasks.find(t => t.id === taskId);
      await updateTask(taskId, {
        progress: existingTask ? (existingTask.progress || 0) : 0,
        completionState: 'started',
        waveLockActive: false, // unlock!
        lastInteraction: Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateWaveLockProgress = async (
    taskId: string, 
    progress: number, 
    completionState?: 'not_started' | 'started' | 'completed', 
    commentary?: string
  ) => {
    try {
      let status: 'active' | 'completed' = progress === 100 ? 'completed' : 'active';
      let updates: Partial<Task> = {
        progress,
        completionState,
        status,
        lastInteraction: Date.now(),
        waveLockActive: false // Unlock!
      };

      if (commentary) {
        updates.progressFeedback = `Interacted with progress update: "${commentary}"`;
      }

      if (progress === 100) {
        updates.riskLevel = 'low';
        updates.riskExplanation = 'Completed successfully.';
      }

      await updateTask(taskId, updates);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteWaveLock = async (taskId: string) => {
    try {
      await updateTask(taskId, {
        progress: 100,
        status: 'completed',
        completionState: 'completed',
        riskLevel: 'low',
        riskExplanation: 'Marked completed on Wave Lock overlay.',
        waveLockActive: false, // Unlock!
        lastInteraction: Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleBypassWaveLock = async (taskId: string, minutes: number, reason: string) => {
    try {
      const taskObj = tasks.find(t => t.id === taskId);
      if (!taskObj) return;

      const newMissed = (taskObj.missedInteractions || 0) + 1;
      let newWaveLevel: 'low' | 'medium' | 'high' = 'medium';
      if (taskObj.waveLevel === 'medium' || taskObj.waveLevel === 'high') {
        newWaveLevel = 'high';
      }

      const bypassDurationMs = minutes * 60000;
      const bypassedUntil = Date.now() + bypassDurationMs;

      // Update task bypass properties to Firestore instantly
      await updateTask(taskId, {
        waveLevel: newWaveLevel,
        missedInteractions: newMissed,
        waveLockBypassedUntil: bypassedUntil,
        waveLockBypassedReason: reason,
        lastInteraction: Date.now(),
        waveLockActive: true
      });

      // Generate updated Gemini motivation for increased pressure asynchronously
      generateWaveLockMotivation(taskObj, newWaveLevel, newMissed).catch(err => {
        console.error("Failed to update wave lock motivation in background:", err);
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerManualWaveLock = async (task: Task) => {
    try {
      const currentWave = task.waveLevel || 'low';
      const currentMissed = task.missedInteractions || 0;

      // Activate wave lock instantly in database
      await updateTask(task.id!, {
        waveLockActive: true,
        completionState: 'not_started',
        lastInteraction: Date.now(),
        waveLockBypassedUntil: 0 // Show overlay instantly
      });

      // Dispatch a real-time native device notification
      triggerSystemNotification(
        `⚡ Focused Wave Lock Activated!`,
        `Your manual focus lock for "${task.title}" has been engaged. Execute now!`,
        true,
        true,
        `wave-lock-${task.id}`
      );

      // Fetch AI generated motivation/coaching asynchronously in the background
      generateWaveLockMotivation(task, currentWave, currentMissed).catch(err => {
        console.error("Failed to generate manual wave lock motivation in background:", err);
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (authChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#070b13] text-white">
        <div className="p-3 bg-gradient-to-tr from-cyan-500 to-indigo-500 rounded-2xl animate-pulse flex items-center justify-center shadow-lg shadow-cyan-500/10 mb-4">
          <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <p className="font-mono text-xs text-slate-500 uppercase tracking-widest animate-pulse">
          Synchronizing Workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#070b13] min-h-screen flex flex-col justify-between" id="app-wrapper">
      
      {/* Navbar always sticky */}
      <Navbar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenAuth={() => setAuthModalOpen(true)} 
      />

      {/* Main Pages router switch */}
      <main className="flex-1">
        {activeTab === 'landing' && (
          <LandingPage onGetStarted={() => setAuthModalOpen(true)} />
        )}
        
        {activeTab === 'dashboard' && user && (
          <DashboardPage 
            user={user} 
            tasks={tasks}
            onTriggerAlert={handleTriggerManualWaveLock}
            onOpenEditForm={(task) => {
              setTaskToEdit(task);
              setTaskFormOpen(true);
            }}
            onOpenProgressModal={(task) => {
              setActiveTaskForProgress(task);
              setProgressModalOpen(true);
            }}
          />
        )}

        {activeTab === 'tasks' && user && (
          <TasksPage 
            tasks={tasks}
            onOpenCreateForm={() => {
              setTaskToEdit(null);
              setTaskFormOpen(true);
            }}
            onOpenEditForm={(task) => {
              setTaskToEdit(task);
              setTaskFormOpen(true);
            }}
            onOpenProgressModal={(task) => {
              setActiveTaskForProgress(task);
              setProgressModalOpen(true);
            }}
            onTriggerAlert={handleTriggerManualWaveLock}
          />
        )}
      </main>

      {/* Persistence and Authentication Modals */}
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        onSuccess={() => {
          setActiveTab('dashboard');
        }}
      />

      <TaskFormModal 
        isOpen={taskFormOpen}
        onClose={() => {
          setTaskFormOpen(false);
          setTaskToEdit(null);
        }}
        taskToEdit={taskToEdit}
        userId={user?.uid || ''}
        onSave={handleSaveTask}
      />

      <ProgressModal 
        isOpen={progressModalOpen}
        onClose={() => {
          setProgressModalOpen(false);
          setActiveTaskForProgress(null);
        }}
        task={activeTaskForProgress}
        onSaveProgress={handleSaveProgress}
      />

      {/* Active Wave Lock Full-screen Overlay (Persistent and un-dismissible) */}
      {(() => {
        const activeLockTask = tasks.find(t => {
          return t.status === 'active' && 
                 t.waveLockActive === true && 
                 (!t.waveLockBypassedUntil || currentTime >= t.waveLockBypassedUntil);
        });

        return (
          <WaveLockOverlay 
            task={activeLockTask || null}
            onStart={handleStartWaveLock}
            onUpdateProgress={handleUpdateWaveLockProgress}
            onComplete={handleCompleteWaveLock}
            onBypass={handleBypassWaveLock}
          />
        );
      })()}

    </div>
  );
}
