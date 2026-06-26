/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini API client
let aiClient: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is not configured. Please add it to your environment secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// GMT Mumbai (Asia/Kolkata) is UTC + 5.5 hours (no DST)
const MUMBAI_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Converts any Date object to the timezone-specific elements of Asia/Kolkata (GMT Mumbai).
 */
function getMumbaiLocalDate(date: Date = new Date()): {
  year: number;
  month: number;
  date: number;
  hour: number;
  minute: number;
  second: number;
  totalMinutes: number;
  dateString: string;
  timeString: string;
} {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const map: Record<string, string> = {};
    for (const part of parts) {
      map[part.type] = part.value;
    }
    
    let hour = parseInt(map.hour, 10);
    if (hour === 24) hour = 0;

    const year = parseInt(map.year, 10);
    const month = parseInt(map.month, 10);
    const day = parseInt(map.day, 10);
    const minute = parseInt(map.minute, 10);
    const second = parseInt(map.second, 10);

    const pad = (n: number) => String(n).padStart(2, '0');
    const dateString = `${year}-${pad(month)}-${pad(day)}`;
    const timeString = `${pad(hour)}:${pad(minute)}`;

    return {
      year,
      month,
      date: day,
      hour,
      minute,
      second,
      totalMinutes: hour * 60 + minute,
      dateString,
      timeString
    };
  } catch (err) {
    const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
    const mumbaiDate = new Date(utcTime + MUMBAI_OFFSET_MS);
    const hour = mumbaiDate.getHours();
    const minute = mumbaiDate.getMinutes();
    const year = mumbaiDate.getFullYear();
    const month = mumbaiDate.getMonth() + 1;
    const day = mumbaiDate.getDate();

    const pad = (n: number) => String(n).padStart(2, '0');
    const dateString = `${year}-${pad(month)}-${pad(day)}`;
    const timeString = `${pad(hour)}:${pad(minute)}`;

    return {
      year,
      month,
      date: day,
      hour,
      minute,
      second: mumbaiDate.getSeconds(),
      totalMinutes: hour * 60 + minute,
      dateString,
      timeString
    };
  }
}

/**
 * Parses a "YYYY-MM-DDTHH:MM" string as a GMT Mumbai (Asia/Kolkata) date and returns a Date object.
 */
function parseMumbaiDateTimeToUtc(localStr: string | undefined | null): Date | null {
  if (!localStr) return null;
  try {
    const parts = localStr.split('T');
    if (parts.length < 1) return null;
    
    const datePart = parts[0];
    const timePart = parts[1] || "00:00";
    
    const [yearStr, monthStr, dayStr] = datePart.split('-');
    const [hourStr, minStr] = timePart.split(':');
    
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minStr, 10);
    
    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
      return null;
    }
    
    const tempUtc = Date.UTC(year, month, day, hour, minute, 0, 0);
    const actualUtcTimestamp = tempUtc - MUMBAI_OFFSET_MS;
    return new Date(actualUtcTimestamp);
  } catch (err) {
    console.error("Error parsing Mumbai local time string:", err);
    return null;
  }
}

/**
 * Parses estimated effort from strings like "1.5 hours", "45 min" to total minutes.
 */
function parseEffortToMinutes(effortStr: string): number {
  const lower = (effortStr || "").toLowerCase();
  let minutes = 60; // default 1 hour
  const hourMatch = lower.match(/(\d+(\.\d+)?)\s*hour/);
  const minMatch = lower.match(/(\d+)\s*min/);
  const dayMatch = lower.match(/(\d+)\s*day/);
  
  if (hourMatch) {
    minutes = Math.round(parseFloat(hourMatch[1]) * 60);
  } else if (minMatch) {
    minutes = parseInt(minMatch[1], 10);
  } else if (dayMatch) {
    minutes = parseInt(dayMatch[1], 10) * 24 * 60;
  }
  return minutes;
}

// Helper to guarantee suggested start time is before user's deadline
function sanitizeSuggestedStartTime(
  suggestedStartTime: string,
  deadlineStr: string | undefined | null,
  currentLocalTimeStr: string | undefined | null
): string {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!suggestedStartTime || !timeRegex.test(suggestedStartTime)) {
    suggestedStartTime = "09:00";
  }

  // Get current Mumbai time parts
  let now = new Date();
  const mumbaiNow = getMumbaiLocalDate(now);
  let nowHour = mumbaiNow.hour;
  let nowMin = mumbaiNow.minute;

  if (currentLocalTimeStr) {
    if (timeRegex.test(currentLocalTimeStr)) {
      const [h, m] = currentLocalTimeStr.split(':');
      nowHour = parseInt(h, 10);
      nowMin = parseInt(m, 10);
    } else {
      const parsed = new Date(currentLocalTimeStr);
      if (!isNaN(parsed.getTime())) {
        const pMumbai = getMumbaiLocalDate(parsed);
        nowHour = pMumbai.hour;
        nowMin = pMumbai.minute;
      }
    }
  }

  const nowTotalMinutes = nowHour * 60 + nowMin;

  if (!deadlineStr) {
    return suggestedStartTime;
  }

  try {
    const parts = deadlineStr.split('T');
    if (parts.length !== 2) return suggestedStartTime;

    const [deadlineDatePart, deadlineTimePart] = parts;
    const [dlHourStr, dlMinStr] = deadlineTimePart.split(':');
    const dlHour = parseInt(dlHourStr, 10);
    const dlMin = parseInt(dlMinStr, 10);

    if (isNaN(dlHour) || isNaN(dlMin)) return suggestedStartTime;

    const [sugHourStr, sugMinStr] = suggestedStartTime.split(':');
    const sugHour = parseInt(sugHourStr, 10);
    const sugMin = parseInt(sugMinStr, 10);

    const deadlineTotalMinutes = dlHour * 60 + dlMin;
    let suggestedTotalMinutes = sugHour * 60 + sugMin;

    const isDeadlineToday = (deadlineDatePart === mumbaiNow.dateString);

    if (isDeadlineToday) {
      // Must start before the deadline today
      if (suggestedTotalMinutes >= deadlineTotalMinutes - 30) {
        suggestedTotalMinutes = Math.max(0, deadlineTotalMinutes - 90); // Suggest 1.5 hours before deadline
      }

      // If that calculated start is in the past or before now, push it to now + 5 mins
      if (suggestedTotalMinutes <= nowTotalMinutes) {
        const potentialStart = nowTotalMinutes + 5;
        if (potentialStart < deadlineTotalMinutes - 5) {
          suggestedTotalMinutes = potentialStart;
        } else {
          suggestedTotalMinutes = Math.max(nowTotalMinutes, deadlineTotalMinutes - 2);
        }
      }
    } else {
      // If deadline is tomorrow or later, but the suggested hour/minute is after the deadline's hour/minute
      if (suggestedTotalMinutes >= deadlineTotalMinutes - 30) {
        suggestedTotalMinutes = Math.max(0, deadlineTotalMinutes - 120); // Suggest 2 hours before that time
      }
    }

    if (suggestedTotalMinutes < 0) suggestedTotalMinutes = 0;
    if (suggestedTotalMinutes >= 1440) suggestedTotalMinutes = 1439;

    const finalHour = Math.floor(suggestedTotalMinutes / 60);
    const finalMin = suggestedTotalMinutes % 60;
    return `${String(finalHour).padStart(2, '0')}:${String(finalMin).padStart(2, '0')}`;
  } catch (err) {
    console.error("Error sanitizing suggested start time:", err);
  }

  return suggestedStartTime;
}

// 1. AI Task Analyzer endpoint
app.post('/api/analyze-task', async (req, res) => {
  try {
    const { title, description, deadline, priority, currentLocalTime } = req.body;
    if (!title) {
       res.status(400).json({ error: 'Task title is required for analysis' });
       return;
    }

    // Get current time standard in GMT Mumbai (Asia/Kolkata, IST)
    const mumbaiNow = getMumbaiLocalDate(new Date());
    console.log(`[GMT Mumbai Task Deployment] User entering/analyzing task "${title}" at ${mumbaiNow.dateString} ${mumbaiNow.timeString} (GMT Mumbai timezone)`);

    const prompt = `Analyze this task to evaluate and suggest optimizations:
- Title: "${title}"
- Description: "${description || 'None'}"
- Current Deadline: "${deadline || 'Not set'}"
- User-Selected Priority: "${priority || 'Not set'}"
- Current Date & Time (GMT Mumbai): "${mumbaiNow.dateString} ${mumbaiNow.timeString}"
- Timezone Standard: GMT Mumbai (Indian Standard Time, UTC+5:30)

Provide a structured optimization feedback. Specifically:
- Priority level (must be "low", "medium", or "high") based on typical cognitive load and urgency
- Estimated effort to complete (e.g. "45 minutes", "3 hours", "2 days")
- Urgency score from 1 (lowest) to 100 (highest)
- Suggested start time in "HH:MM" format (24h) assumed for today or tomorrow, which represents a highly productive, upcoming time of day to tackle this type of task.
CRITICAL DEADLINE CONSTRAINT: If a deadline is set (e.g., "2026-06-24T12:00" in GMT Mumbai time) and it falls on the same day or very soon, the suggestedStartTime "HH:MM" MUST represent an upcoming slot strictly BEFORE that deadline, leaving enough hours (equivalent to or greater than the estimated effort) to complete the task before the deadline time. If the deadline time is already passed or extremely tight, suggest an immediate start time.`;

    let aiClientInstance;
    let fallbackToProgrammatic = false;
    try {
      aiClientInstance = getAI();
    } catch (keyErr) {
      console.warn('GEMINI_API_KEY is not configured. Falling back to programmatic task analyzer.');
      fallbackToProgrammatic = true;
    }

    let resultData: {
      priority: 'low' | 'medium' | 'high';
      estimatedEffort: string;
      urgencyScore: number;
      suggestedStartTime: string;
    } | null = null;

    if (!fallbackToProgrammatic && aiClientInstance) {
      try {
        const response = await aiClientInstance.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              required: ['priority', 'estimatedEffort', 'urgencyScore', 'suggestedStartTime'],
              properties: {
                priority: {
                  type: Type.STRING,
                  description: 'The adjusted priority of the task: low, medium, or high',
                },
                estimatedEffort: {
                  type: Type.STRING,
                  description: 'Estimated effort required, e.g. "1.5 hours" or "30 minutes"',
                },
                urgencyScore: {
                  type: Type.INTEGER,
                  description: 'Urgency score of the task from 1 to 100',
                },
                suggestedStartTime: {
                  type: Type.STRING,
                  description: 'A recommended productive start time for the task in HH:MM format, e.g. "09:30" or "14:15"',
                },
              },
            },
          },
        });

        const resultText = response.text;
        if (resultText) {
          resultData = JSON.parse(resultText);
        }
      } catch (apiErr) {
        console.error('Gemini API call failed, falling back to programmatic task analyzer:', apiErr);
      }
    }

    // Programmatic Smart Fallback if Gemini failed or is not available
    if (!resultData) {
      const lowerTitle = title.toLowerCase();
      let calculatedPriority = priority || 'medium';
      if (lowerTitle.includes('urgent') || lowerTitle.includes('asap') || lowerTitle.includes('critical') || lowerTitle.includes('fix')) {
        calculatedPriority = 'high';
      } else if (lowerTitle.includes('read') || lowerTitle.includes('study') || lowerTitle.includes('browse') || lowerTitle.includes('optional')) {
        calculatedPriority = 'low';
      }

      let calculatedEffort = '1.5 hours';
      if (lowerTitle.includes('report') || lowerTitle.includes('presentation') || lowerTitle.includes('document')) {
        calculatedEffort = '3 hours';
      } else if (lowerTitle.includes('meeting') || lowerTitle.includes('call') || lowerTitle.includes('discuss')) {
        calculatedEffort = '45 minutes';
      } else if (lowerTitle.includes('project') || lowerTitle.includes('build') || lowerTitle.includes('setup')) {
        calculatedEffort = '4 hours';
      }

      const calculatedUrgency = calculatedPriority === 'high' ? 85 : calculatedPriority === 'medium' ? 50 : 20;
      let suggestedStartTime = calculatedPriority === 'high' ? '09:30' : '14:15';

      resultData = {
        priority: calculatedPriority as 'low' | 'medium' | 'high',
        estimatedEffort: calculatedEffort,
        urgencyScore: calculatedUrgency,
        suggestedStartTime: suggestedStartTime
      };
    }

    // APPLY PROGRAMMATIC DETERMINISTIC OVERRIDES FOR EXTREME DEADLINE URGENCY
    // This addresses the user's specific feedback: if they need to complete by e.g. 11:30 AM (6 mins from now),
    // it MUST suggest starting immediately (now) and show extreme urgency!
    if (deadline && resultData) {
      const deadlineDate = parseMumbaiDateTimeToUtc(deadline);
      if (deadlineDate) {
        const nowUtc = new Date();
        const diffMs = deadlineDate.getTime() - nowUtc.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        const estimatedMinutes = parseEffortToMinutes(resultData.estimatedEffort);

        if (diffMinutes <= 0) {
          // Task deadline already passed
          resultData.urgencyScore = 100;
          resultData.suggestedStartTime = mumbaiNow.timeString;
        } else if (diffMinutes <= estimatedMinutes) {
          // DEFICIT: Not enough time remaining to complete the task comfortably!
          // Force high/critical urgency and suggest starting immediately (the current time).
          resultData.urgencyScore = Math.min(100, Math.max(90, Math.round(100 - (diffMinutes / estimatedMinutes) * 10)));
          resultData.suggestedStartTime = mumbaiNow.timeString; 
        } else {
          // Apply sanitization check to make sure it complies with rules and starts before deadline
          resultData.suggestedStartTime = sanitizeSuggestedStartTime(
            resultData.suggestedStartTime,
            deadline,
            mumbaiNow.timeString
          );

          // Raise urgency score dynamically if the safety window is extremely small
          const safetyMargin = diffMinutes - estimatedMinutes;
          if (safetyMargin < 60) {
            resultData.urgencyScore = Math.max(resultData.urgencyScore, 85);
          } else if (safetyMargin < 180) {
            resultData.urgencyScore = Math.max(resultData.urgencyScore, 65);
          }
        }
      }
    } else if (resultData) {
      // Normal sanitization with no deadline
      resultData.suggestedStartTime = sanitizeSuggestedStartTime(
        resultData.suggestedStartTime,
        deadline,
        mumbaiNow.timeString
      );
    }

    res.json(resultData);
  } catch (error: any) {
    console.error('Task Analyzer Error:', error);
    res.status(500).json({ error: error.message || 'An error occurred during task analysis' });
  }
});

// 2. Deadline Risk Prediction endpoint
app.post('/api/predict-risks', async (req, res) => {
  try {
    const { tasks } = req.body; // Array of active task objects
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
       res.json({ risks: [] });
       return;
    }

    const mumbaiNow = getMumbaiLocalDate(new Date());

    const tasksPrompt = tasks.map((t: any, index: number) => {
      return `[Task Index: ${index}]
- ID: "${t.id}"
- Title: "${t.title}"
- Description: "${t.description || 'None'}"
- Priority: "${t.priority}"
- Deadline: "${t.deadline}"
- Current Progress: ${t.progress}%
- Status: "${t.status}"`;
    }).join('\n\n');

    const prompt = `Analyze these active productivity tasks relative to their current deadlines. Base your evaluation on the current Mumbai local date/time: "${mumbaiNow.dateString} ${mumbaiNow.timeString}" (GMT Mumbai timezone, Indian Standard Time, UTC+5:30).
Rate the risk of each task missing its deadline as low, medium, or high. Provide a concise explanation (1-2 sentences) of the risk factors for each task.

Tasks:
${tasksPrompt}

Respond in structured JSON containing risks for each task ID.`;

    let aiClientInstance;
    let fallbackToProgrammatic = false;
    try {
      aiClientInstance = getAI();
    } catch (keyErr) {
      console.warn('GEMINI_API_KEY is not configured. Falling back to programmatic risk prediction.');
      fallbackToProgrammatic = true;
    }

    if (!fallbackToProgrammatic && aiClientInstance) {
      try {
        const response = await aiClientInstance.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              required: ['risks'],
              properties: {
                risks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    required: ['taskId', 'riskLevel', 'riskExplanation'],
                    properties: {
                      taskId: {
                        type: Type.STRING,
                        description: 'The exact ID of the analyzed task',
                      },
                      riskLevel: {
                        type: Type.STRING,
                        description: 'Calculated risk level: "low", "medium", or "high"',
                      },
                      riskExplanation: {
                        type: Type.STRING,
                        description: 'Concise explanation why this risk level was set containing a logical reason.',
                      },
                    },
                  },
                },
              },
            },
          },
        });

        const resultText = response.text;
        if (resultText) {
          const data = JSON.parse(resultText);
          res.json(data);
          return;
        }
      } catch (apiErr) {
        console.error('Gemini API risk prediction failed, falling back to programmatic prediction:', apiErr);
      }
    }

    // Programmatic Smart Fallback for Risk Prediction
    const risks = tasks.map((t: any) => {
      const deadlineDate = parseMumbaiDateTimeToUtc(t.deadline);
      const isOverdue = deadlineDate ? deadlineDate.getTime() < Date.now() : false;
      const progress = Number(t.progress) || 0;
      
      let riskLevel = 'low';
      let riskExplanation = 'Task is in a comfortable schedule state. No immediate slippage risks detected.';
      
      if (t.status === 'completed') {
        riskLevel = 'low';
        riskExplanation = 'Completed successfully.';
      } else if (isOverdue) {
        riskLevel = 'high';
        riskExplanation = 'Deadline has elapsed. Immediate attention required to recover and deploy.';
      } else if (deadlineDate) {
        const msRemaining = deadlineDate.getTime() - Date.now();
        const hoursRemaining = Math.max(0, msRemaining / (1000 * 60 * 60));
        
        if (hoursRemaining < 24 && progress < 50) {
          riskLevel = 'high';
          riskExplanation = `Urgent: only ${Math.round(hoursRemaining)} hours remaining before deadline with just ${progress}% progress completed.`;
        } else if (hoursRemaining < 48 && progress < 75) {
          riskLevel = 'medium';
          riskExplanation = `Moderately tight timeline: ${Math.round(hoursRemaining)} hours remaining. Elevate speed to avoid schedule slippage.`;
        } else if (t.priority === 'high' && progress < 25) {
          riskLevel = 'medium';
          riskExplanation = `High priority task in early progress stages (${progress}%). Keep focus wave active.`;
        }
      }
      
      return {
        taskId: t.id,
        riskLevel,
        riskExplanation
      };
    });

    res.json({ risks });
  } catch (error: any) {
    console.error('Risk Prediction Error:', error);
    res.status(500).json({ error: error.message || 'An error occurred during risk prediction' });
  }
});

// 3. Progress Validation endpoint
app.post('/api/validate-progress', async (req, res) => {
  try {
    const { title, description, progress, commentary } = req.body;
    if (!title) {
       res.status(400).json({ error: 'Task title is required' });
       return;
    }

    const prompt = `Provide constructive, highly motivational feedback and next-step action items for this progress update on a task:
- Task: "${title}"
- Description: "${description || 'None'}"
- Submitted Progress: ${progress}%
- User Commentary: "${commentary || 'None'}"

Provide a structured motivational paragraph and 2-3 specific recommendations or subtasks to make immediate progress.`;

    let aiClientInstance;
    let fallbackToProgrammatic = false;
    try {
      aiClientInstance = getAI();
    } catch (keyErr) {
      console.warn('GEMINI_API_KEY is not configured. Falling back to programmatic progress validation.');
      fallbackToProgrammatic = true;
    }

    if (!fallbackToProgrammatic && aiClientInstance) {
      try {
        const response = await aiClientInstance.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              required: ['feedback', 'nextSteps'],
              properties: {
                feedback: {
                  type: Type.STRING,
                  description: 'Energetic, encouraging, motivational feedback tailored to this percentage of completion and details.',
                },
                nextSteps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.STRING,
                  },
                  description: '2 or 3 distinct and highly clear immediate next steps to tackle now.',
                },
              },
            },
          },
        });

        const resultText = response.text;
        if (resultText) {
          const data = JSON.parse(resultText);
          res.json(data);
          return;
        }
      } catch (apiErr) {
        console.error('Gemini API progress validation failed, falling back to programmatic feedback:', apiErr);
      }
    }

    // Programmatic Smart Fallback for Progress Validation
    const numericProgress = Number(progress) || 0;
    let feedback = '';
    let nextSteps: string[] = [];

    if (numericProgress === 100) {
      feedback = `Phenomenal performance! Completing "${title}" is a major win for your productivity rhythm today. Keep this wave rolling!`;
      nextSteps = [
        'Perform a quick self-review to verify all specifications are met',
        'Mark the task status as officially "Completed" on your dashboard',
        'Reward yourself with a 5-minute cognitive rest before commencing your next Wave'
      ];
    } else if (numericProgress >= 50) {
      feedback = `Fantastic momentum! You have crossed the midpoint on "${title}". The commentary shows great tactical approach. Stay locked in!`;
      nextSteps = [
        'Focus entirely on the remaining minor details',
        'Limit any secondary communication or tabs to protect your momentum',
        'Aim to log another progress update within your next block of time'
      ];
    } else {
      feedback = `Excellent start on "${title}"! Commencing and establishing initial momentum is the highest cognitive hurdle. You are officially in the zone.`;
      nextSteps = [
        'Break down the remaining tasks into tiny, bite-sized checklists',
        'Work uninterrupted for another 25 minutes using the Pomodoro technique',
        'Note down any roadblocks to address them systemically'
      ];
    }

    res.json({ feedback, nextSteps });
  } catch (error: any) {
    console.error('Progress Validation Error:', error);
    res.status(500).json({ error: error.message || 'An error occurred during progress validation' });
  }
});

// 4. AI Recovery Plan endpoint
app.post('/api/generate-recovery', async (req, res) => {
  try {
    const { title, description, deadline, priority, progress, riskExplanation } = req.body;
    if (!title) {
       res.status(400).json({ error: 'Task title is required for recovery planning' });
       return;
    }

    const prompt = `This task is marked as High Risk or has missed/is missing its deadline. Formulate an AI-powered Recovery Plan to get back on track:
- Task Title: "${title}"
- Description: "${description || 'None'}"
- Current Deadline: "${deadline}"
- Priority: "${priority}"
- Current Progress: ${progress}%
- Risk Context: "${riskExplanation || 'Exceeding target timeline or complexity'}"

Create:
1. Revised schedule suggestion (how to split remaining work)
2. New focus priority list
3. Direct action items for rapid resolution`;

    let aiClientInstance;
    let fallbackToProgrammatic = false;
    try {
      aiClientInstance = getAI();
    } catch (keyErr) {
      console.warn('GEMINI_API_KEY is not configured. Falling back to programmatic recovery generation.');
      fallbackToProgrammatic = true;
    }

    if (!fallbackToProgrammatic && aiClientInstance) {
      try {
        const response = await aiClientInstance.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              required: ['revisedSchedule', 'newPriorities', 'actionPlan'],
              properties: {
                revisedSchedule: {
                  type: Type.STRING,
                  description: 'A proposed micro-schedule adjustments list to catch up on this task',
                },
                newPriorities: {
                  type: Type.STRING,
                  description: 'Adjusted sub-priority areas or specific focal focus for the user',
                },
                actionPlan: {
                  type: Type.STRING,
                  description: 'Step-by-step recovery process, clear and actionable',
                },
              },
            },
          },
        });

        const resultText = response.text;
        if (resultText) {
          const data = JSON.parse(resultText);
          res.json(data);
          return;
        }
      } catch (apiErr) {
        console.error('Gemini API recovery plan failed, falling back to programmatic template:', apiErr);
      }
    }

    // Programmatic Smart Fallback for Recovery Plan
    const revisedSchedule = "Micro-sprints: Allocate two 45-minute Focus Waves spaced by 10-minute mental resets. Perform final integration tests at the start of tomorrow morning.";
    const newPriorities = "1. Deliver core functionality. 2. Establish fallback validation parameters. 3. Finalize interface alignment.";
    const actionPlan = "1. Completely disable background notifications. 2. Timeblock a 90-minute slot this afternoon. 3. Request peer review or sanity-check immediately upon completion.";

    res.json({
      revisedSchedule,
      newPriorities,
      actionPlan
    });
  } catch (error: any) {
    console.error('Recovery Plan Error:', error);
    res.status(500).json({ error: error.message || 'An error occurred generating the recovery plan' });
  }
});

// 5. Wave Lock Motivation & Accountability message generator
app.post('/api/wave-lock-motivation', async (req, res) => {
  try {
    const { title, description, deadline, priority, waveLevel, missedInteractions, riskLevel } = req.body;
    if (!title) {
      res.status(400).json({ error: 'Task title is required for generating motivation' });
      return;
    }

    const currentWave = waveLevel || 'low';
    const currentMissed = missedInteractions || 0;

    let toneDescription = 'gentle, encouraging, positive, focusing on building easy momentum and starting small';
    if (currentWave === 'medium') {
      toneDescription = 'firm, direct, focusing on accountability, stating clearly that procrastination will compile stress, and urging the user to commit';
    } else if (currentWave === 'high') {
      toneDescription = 'extremely direct, urgent, commanding, high-accountability, emphasizing that delay is no longer an option, and giving a direct call to action';
    }

    const mumbaiNow = getMumbaiLocalDate(new Date());

    const prompt = `You are the core intelligence of "Focused Waves", an accountability-driven productivity engine.
Generate an action-forcing motivation message and a recovery recommendation for this task that has reached its start time:
- Task: "${title}"
- Description: "${description || 'None'}"
- Deadline: "${deadline || 'Not specified'}"
- User-Selected Priority: "${priority || 'medium'}"
- Wave Lock Level: "${currentWave.toUpperCase()} WAVE"
- Missed Interactions / Escapes: ${currentMissed}
- Current Risk Level: "${riskLevel || 'low'}"
- Current Local Time (GMT Mumbai): "${mumbaiNow.dateString} ${mumbaiNow.timeString}"
- Timezone Standard: GMT Mumbai (Indian Standard Time, UTC+5:30)

Requirements:
1. "motivation": Write a single, highly tailored, engaging paragraph (2-3 sentences) using a ${toneDescription} tone. Mention the task name or theme directly. Do not use generic filler.
2. "recoveryRecommendation": If the risk level is "high" or Wave Lock Level is "HIGH", generate a concise, urgent recovery recommendation (e.g. "This task is falling behind schedule. Begin within the next 30 minutes to avoid missing the deadline."). If not high risk, provide a clean, 1-sentence tactical action to begin.`;

    let aiClientInstance;
    let fallbackToProgrammatic = false;
    try {
      aiClientInstance = getAI();
    } catch (keyErr) {
      console.warn('GEMINI_API_KEY is not configured. Falling back to programmatic Wave Lock generator.');
      fallbackToProgrammatic = true;
    }

    if (!fallbackToProgrammatic && aiClientInstance) {
      try {
        const response = await aiClientInstance.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              required: ['motivation', 'recoveryRecommendation'],
              properties: {
                motivation: {
                  type: Type.STRING,
                  description: 'Dynamic, contextual accountability message matching the specified wave tone',
                },
                recoveryRecommendation: {
                  type: Type.STRING,
                  description: 'Actionable recovery action or immediate subtask recommendation',
                },
              },
            },
          },
        });

        const resultText = response.text;
        if (resultText) {
          const data = JSON.parse(resultText);
          res.json(data);
          return;
        }
      } catch (apiErr) {
        console.error('Gemini API wave lock generation failed:', apiErr);
      }
    }

    // Programmatic Fallback
    let fallbackMotivation = `You planned to tackle "${title}" for a reason. Starting now will clear your mind and ensure you stay ahead of your commitments.`;
    let fallbackRec = `Click "Start Task" to register your initial wave slot and log progress.`;

    if (currentWave === 'medium') {
      fallbackMotivation = `Procrastinating on "${title}" is compile-scheduling stress for later today. Take control of your rhythm now and build momentum!`;
      fallbackRec = `Break this down into a single 15-minute action block and begin immediately.`;
    } else if (currentWave === 'high') {
      fallbackMotivation = `CRITICAL ALERT: You have bypassed this task ${currentMissed} times. Delaying "${title}" is causing severe scheduling risk. Take action right now!`;
      fallbackRec = `This task is falling behind schedule. Begin within the next 15 minutes to avoid missing the deadline!`;
    }

    if (riskLevel === 'high') {
      fallbackRec = `This task is falling behind schedule. Begin within the next 30 minutes to avoid missing the deadline.`;
    }

    res.json({
      motivation: fallbackMotivation,
      recoveryRecommendation: fallbackRec
    });
  } catch (error: any) {
    console.error('Wave Lock Motivation API Error:', error);
    res.status(500).json({ error: error.message || 'An error occurred during wave lock processing' });
  }
});

// Setup Vite & Static Assets serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Focused Waves] Server listening at http://localhost:${PORT}`);
  });
}

startServer();
