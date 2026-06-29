import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini client
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined. All AI requests will fall back to intelligent rule-based calculations.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Helper to sanitize JSON response string
function extractJSON(text: string): any {
  if (!text) {
    throw new Error("Empty response received from AI");
  }
  const trimmed = text.trim();
  // Check if it's wrapped in markdown code blocks
  let cleaned = trimmed;
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch (err: any) {
    console.error("Failed to parse AI response as JSON. Original text:", text, "Error:", err);
    // Let's attempt to extract the first '{' and last '}' if there is junk text around it
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        const sliced = cleaned.slice(firstBrace, lastBrace + 1);
        return JSON.parse(sliced);
      } catch (innerErr) {
        throw new Error(`Failed to parse response as JSON: ${err.message}`);
      }
    }
    throw new Error(`Failed to parse response as JSON: ${err.message}`);
  }
}

// Helper to call Gemini with retry and exponential backoff on 503 Service Unavailable / RESOURCE_EXHAUSTED
async function callGeminiWithRetry(ai: any, args: any, retries = 3, delay = 2000): Promise<any> {
  try {
    const response = await ai.models.generateContent(args);
    return response;
  } catch (error: any) {
    const errorStr = String(error?.message || error || "");
    const is503 = error?.status === 503 || error?.statusCode === 503 || errorStr.includes("503") || errorStr.includes("UNAVAILABLE") || errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("busy");
    if (is503 && retries > 0) {
      console.warn(`Gemini API returned 503/UNAVAILABLE. Retrying in ${delay}ms... (${retries} retries left). Error: ${errorStr}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callGeminiWithRetry(ai, args, retries - 1, delay * 2);
    }
    throw error;
  }
}

// 1. POST /api/generate-plan
app.post("/api/generate-plan", async (req, res) => {
  const { title, task, category, deadline, currentTime, granularity, focusInterval, workStyle } = req.body;
  const taskTitle = title || task;
  const ai = getAIClient();

  const configGranularity = granularity || "detailed";
  const configFocusInterval = focusInterval || 25;
  const configWorkStyle = workStyle || "bulletproof";

  if (!ai) {
    // Fallback logic if API key is missing (respects configuration to feel alive!)
    const score = Math.floor(Math.random() * 30) + 45;
    const recommendedDelayMin = 10;
    
    // Custom steps based on settings
    let steps = [];
    if (configGranularity === "detailed") {
      steps = [
        { step: `Prepare setup & gather required resources for ${category}`, duration: "15 mins" },
        { step: `Draft core structure / initial design block`, duration: `${configFocusInterval} mins` },
        { step: `First implementation phase focusing on primary objectives`, duration: `${configFocusInterval} mins` },
        { step: `Refining and formatting draft details`, duration: "20 mins" },
        { step: `Double check requirements list & fix minor errors`, duration: "15 mins" }
      ];
    } else {
      steps = [
        { step: `Core implementation & development of ${category} objectives`, duration: `${configFocusInterval * 2} mins` },
        { step: `Comprehensive validation and final export`, duration: `${configFocusInterval} mins` }
      ];
    }

    if (configWorkStyle === "speed") {
      steps = steps.slice(0, 3); // speed mode is shorter
    }

    return res.json({
      estimated_completion_time: configWorkStyle === "speed" ? "1-2 hours" : "3-4 hours",
      priority: score > 75 ? "HIGH" : "MEDIUM",
      urgency_score: score,
      recommended_start_time: new Date(Date.now() + recommendedDelayMin * 60 * 1000).toISOString(),
      micro_steps: steps,
      summary: `Precise local blueprint crafted for "${taskTitle}". Strategy optimized for ${configWorkStyle} style, structured in ${configFocusInterval}-minute deep focus blocks with ${configGranularity} step tracking.`,
      motivation_tip: configWorkStyle === "speed" ? "Speed run active! Do not over-polish, get the MVP working first." : "Precision execution engaged. Trust the sequence and focus on one block at a time!"
    });
  }

  try {
    const prompt = `Generate a task plan in JSON format. Keep the summary and motivation_tip extremely short and under 150 words total.
Task: "${taskTitle}" (Category: "${category}", Deadline: "${deadline}", Time: "${currentTime}").
Options: Granularity: ${configGranularity}, Focus Interval: ${configFocusInterval}m, Style: ${configWorkStyle}.`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            estimated_completion_time: { type: Type.STRING },
            priority: { type: Type.STRING, description: "HIGH, MEDIUM, or LOW" },
            urgency_score: { type: Type.INTEGER, description: "0 to 100" },
            recommended_start_time: { type: Type.STRING, description: "ISO date-time or relative string" },
            micro_steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  step: { type: Type.STRING },
                  duration: { type: Type.STRING }
                },
                required: ["step", "duration"]
              }
            },
            summary: { type: Type.STRING },
            motivation_tip: { type: Type.STRING }
          },
          required: ["estimated_completion_time", "priority", "urgency_score", "recommended_start_time", "micro_steps", "summary", "motivation_tip"]
        }
      }
    });

    res.json(extractJSON(response.text || "{}"));
  } catch (error: any) {
    console.error("Error in /api/generate-plan:", error);
    // Return friendly error inside valid JSON with status 503 so frontend knows to retry or display busy message
    res.status(503).json({ error: "AI is currently busy. Please try again in a few moments." });
  }
});

// 2. POST /api/rescue-mode
app.post("/api/rescue-mode", async (req, res) => {
  const { title, category, deadline, currentTime } = req.body;
  const ai = getAIClient();

  if (!ai) {
    return res.json({
      emergency_timeline: [
        { time: "First 15 mins", action: "Turn off phone/block socials", priority: "CRITICAL" },
        { time: "Next 45 mins", action: "Write barebones content/skeleton draft", priority: "CRITICAL" },
        { time: "Last 30 mins", action: "Refine and submit immediately", priority: "HIGH" }
      ],
      exact_time_blocks: [
        { block: "Block 1 (45m)", duration: "45 mins", task: "Core build" },
        { block: "Block 2 (30m)", duration: "30 mins", task: "Assembly & packaging" }
      ],
      what_to_skip: ["Polishing design", "Extra research", "Secondary sections"],
      minimum_viable_submission: "Bare minimum draft containing only core requested elements.",
      survival_tips: ["Don't perfect it, just submit it.", "Drink water. Stay hyperfocused."]
    });
  }

  try {
    const prompt = `CRITICAL ASSISTANCE REQUIRED: We have a task in emergency mode (under 2 hours left!).
Task: "${title}"
Category: "${category}"
Deadline: "${deadline}"
Current Time: "${currentTime}"

Generate an aggressive, action-oriented 'Emergency Rescue Strategy' in JSON format. Provide an emergency timeline, exact time blocks, a list of things to skip, definition of a 'minimum viable submission', and strict survival tips to beat the clock.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            emergency_timeline: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  time: { type: Type.STRING },
                  action: { type: Type.STRING },
                  priority: { type: Type.STRING }
                },
                required: ["time", "action", "priority"]
              }
            },
            exact_time_blocks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  block: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  task: { type: Type.STRING }
                },
                required: ["block", "duration", "task"]
              }
            },
            what_to_skip: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            minimum_viable_submission: { type: Type.STRING },
            survival_tips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["emergency_timeline", "exact_time_blocks", "what_to_skip", "minimum_viable_submission", "survival_tips"]
        }
      }
    });

    res.json(extractJSON(response.text || "{}"));
  } catch (error: any) {
    console.error("Error in /api/rescue-mode:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. POST /api/smart-schedule
app.post("/api/smart-schedule", async (req, res) => {
  const { tasks } = req.body;
  const ai = getAIClient();

  if (!ai) {
    // Generate mock ranked & slotted list based on simple logic
    const sorted = [...tasks].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    const ranked_tasks = sorted.map((t, idx) => ({
      id: t.id,
      title: t.title,
      reason: `Ranked #${idx + 1} based on deadline proximity.`
    }));
    const scheduled_slots = sorted.map((t, idx) => ({
      taskId: t.id,
      title: t.title,
      slot: `${10 + idx}:00 - ${11 + idx}:30`,
      duration: "1.5 hours"
    }));

    return res.json({
      ranked_tasks,
      scheduled_slots,
      predicted_workload: tasks.length > 3 ? "Heavy & Jammed" : "Moderate & Manageable",
      schedule_health: tasks.length > 4 ? "Critical" : tasks.length > 2 ? "Tight" : "Good",
      health_reason: `You have ${tasks.length} active tasks registered.`
    });
  }

  try {
    const prompt = `Act as an intelligent master scheduler. Sort and allocate time blocks for these tasks:
${JSON.stringify(tasks, null, 2)}

Provide the optimized schedule back in JSON format. Rank them by urgency, allocate slots, estimate workload, and report schedule health status (Good/Tight/Critical) with a logical health explanation.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ranked_tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  reason: { type: Type.STRING }
                },
                required: ["id", "title", "reason"]
              }
            },
            scheduled_slots: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  taskId: { type: Type.STRING },
                  title: { type: Type.STRING },
                  slot: { type: Type.STRING },
                  duration: { type: Type.STRING }
                },
                required: ["taskId", "title", "slot", "duration"]
              }
            },
            predicted_workload: { type: Type.STRING },
            schedule_health: { type: Type.STRING, description: "Good, Tight, or Critical" },
            health_reason: { type: Type.STRING }
          },
          required: ["ranked_tasks", "scheduled_slots", "predicted_workload", "schedule_health", "health_reason"]
        }
      }
    });

    res.json(extractJSON(response.text || "{}"));
  } catch (error: any) {
    console.error("Error in /api/smart-schedule:", error);
    res.status(500).json({ error: error.message });
  }
});

// 4. POST /api/check-procrastination
app.post("/api/check-procrastination", async (req, res) => {
  const { title, creationDate, deadline, progress, currentTime } = req.body;
  const ai = getAIClient();

  const now = currentTime ? new Date(currentTime) : new Date();
  const dl = new Date(deadline);

  // If the deadline has already passed, automatically return missed deadline info
  if (now.getTime() > dl.getTime()) {
    return res.json({
      procrastination_score: 100,
      risk_level: "Critical",
      analysis: "This task has exceeded its scheduled deadline. It is currently in 'MISSED DEADLINE' status. Immediate action is required to resolve or reschedule.",
      reason: "Missed Deadline",
      quick_action: "Contact your instructor, client, or team immediately to request an extension, or archive the task.",
      motivation_tip: "Don't let one missed deadline discourage you. Reset, replan, and tackle the next task on your list!"
    });
  }

  if (!ai) {
    const daysElapsed = Math.max(1, Math.floor((now.getTime() - new Date(creationDate).getTime()) / (1000 * 60 * 60 * 24)));
    const score = Math.min(100, Math.max(10, Math.floor((daysElapsed * 20) * (1 - (progress || 0) / 100))));
    let risk_level = "Low";
    let analysis = "You are making steady progress! Keep it rolling.";
    let reason = "Steady paced workflow.";
    let quick_action = "Set a 5-minute timer and just open the core resources/documents right now.";
    let motivation_tip = "The best way to get something done is to begin. Five minutes is all it takes.";

    if (score >= 85) {
      risk_level = "Critical";
      analysis = "Extreme procrastination danger! The deadline is dangerously close, and progress is still minimal.";
      reason = "Severe task paralysis despite proximity to deadline.";
      quick_action = "Open your files and spend exactly 2 minutes outlining just one item.";
      motivation_tip = "Action precedes motivation. Start with 120 seconds of effort.";
    } else if (score >= 60) {
      risk_level = "High";
      analysis = "High procrastination detected! Time is running out fast.";
      reason = "Task added several days ago with minimal progress.";
      quick_action = "Set a 5-minute Pomodoro timer and start drafting.";
      motivation_tip = "A 5-minute draft is infinitely better than a perfect blank page.";
    } else if (score >= 30) {
      risk_level = "Medium";
      analysis = "You've let some days slip without progress. Let's regain the focus.";
      reason = "Minor inertia starting the next phase.";
      quick_action = "List 3 quick questions you can answer about this task.";
      motivation_tip = "Progress isn't all or nothing. Small steps compound.";
    }

    return res.json({
      procrastination_score: score,
      risk_level,
      analysis,
      reason,
      quick_action,
      motivation_tip
    });
  }

  try {
    const prompt = `Analyze user procrastination patterns for this task:
Task Title: "${title}"
Created On: "${creationDate}"
Deadline: "${deadline}"
Current Progress: ${progress}%
Current Reference Time: "${now.toISOString()}"

Calculate procrastination score (0-100), risk_level ("Low", "Medium", "High", or "Critical"), write an insightful, witty, and helpful analysis, identify the main reason of procrastination for this specific task, suggest a 5-minute quick start recommended next action, and write a motivational tip to overcome procrastination. Return in JSON format matching the schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            procrastination_score: { type: Type.INTEGER, description: "0 to 100" },
            risk_level: { type: Type.STRING, description: "Low, Medium, High, or Critical" },
            analysis: { type: Type.STRING },
            reason: { type: Type.STRING, description: "The main reason for procrastination" },
            quick_action: { type: Type.STRING, description: "5-minute recommended next action" },
            motivation_tip: { type: Type.STRING }
          },
          required: ["procrastination_score", "risk_level", "analysis", "reason", "quick_action", "motivation_tip"]
        }
      }
    });

    res.json(extractJSON(response.text || "{}"));
  } catch (error: any) {
    console.error("Error in /api/check-procrastination:", error);
    res.status(500).json({ error: error.message });
  }
});

// 5. POST /api/parse-voice
app.post("/api/parse-voice", async (req, res) => {
  const { text, currentTime } = req.body;
  const ai = getAIClient();

  if (!ai) {
    // Basic extraction fallback
    const normalized = text.toLowerCase();
    let category = "General";
    if (normalized.includes("assignment") || normalized.includes("homework") || normalized.includes("study")) {
      category = "Assignment";
    } else if (normalized.includes("meeting") || normalized.includes("sync") || normalized.includes("zoom")) {
      category = "Meeting";
    } else if (normalized.includes("interview") || normalized.includes("recruit")) {
      category = "Interview";
    } else if (normalized.includes("bill") || normalized.includes("pay") || normalized.includes("rent")) {
      category = "Bill";
    } else if (normalized.includes("personal") || normalized.includes("gym") || normalized.includes("health")) {
      category = "Personal";
    }

    // Default deadline to tomorrow
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(17, 0, 0, 0);

    return res.json({
      title: text.length > 50 ? text.substring(0, 50) + "..." : text,
      deadline: tomorrow.toISOString(),
      category
    });
  }

  try {
    const prompt = `You are a voice commands processor for 'Deadline Guardian AI'.
Parse the spoken text: "${text}"
Current Reference Time: "${currentTime}"

Extract and format details into:
- Title (a clean, concise task description)
- Category (must be strictly one of: Assignment, Meeting, Interview, Bill, Personal, General, Other)
- Deadline (calculate the exact deadline time relative to current time and output as ISO 8601 YYYY-MM-DDTHH:mm:ss format). If no specific time or date is mentioned, assign a reasonable default (e.g., tomorrow at 5PM).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            deadline: { type: Type.STRING, description: "ISO 8601 date string" },
            category: { type: Type.STRING, description: "Assignment, Meeting, Interview, Bill, Personal, General, or Other" }
          },
          required: ["title", "deadline", "category"]
        }
      }
    });

    res.json(extractJSON(response.text || "{}"));
  } catch (error: any) {
    console.error("Error in /api/parse-voice:", error);
    res.status(500).json({ error: error.message });
  }
});

// 6. POST /api/chatbot
app.post("/api/chatbot", async (req, res) => {
  const { message, history, tasks } = req.body;
  const ai = getAIClient();

  if (!ai) {
    return res.json({
      response: `👋 Yo! I'm your Deadline Guardian AI chatbot assistant. 

I see you have **${tasks ? tasks.length : 0} task(s)** in your registry. 
To get full-powered AI personalized planning, procrastination score checking, and custom rescue schedules, please configure your **GEMINI_API_KEY** in the Secrets panel!

For now, here is some rule-based advice:
${tasks && tasks.length > 0 
  ? `🎯 Focus on **"${tasks[0].title}"** first! It's currently in your queue. Try setting a 5-minute timer and getting just the first step done. Momentum is everything!`
  : "📝 Let's get started by adding a task or habit in the Command Deck to protect your day!"}`
    });
  }

  try {
    const isComplex = message.length > 200 || 
                      /\b(plan|schedule|optimize|algorithm|code|math|science|complex|detailed|generate|create)\b/i.test(message);
    const modelToUse = isComplex ? "gemini-3.5-flash" : "gemini-3.1-flash-lite";

    const needsHistory = /\b(that|it|previous|before|last|explain|why|elaborate|again|tell me more|what about|how so|yes|no)\b/i.test(message);
    const simplifiedHistory = (needsHistory && history && history.length > 0)
      ? history.slice(-2).map((msg: any) => `${msg.sender === "user" ? "User" : "Guardian"}: ${msg.text}`).join("\n")
      : "";

    let tasksContext = "";
    if (tasks && tasks.length > 0 && /\b(task|list|todo|job|deadline|schedule|done|progress|work)\b/i.test(message)) {
      tasksContext = "Active tasks:\n" + tasks.map((t: any) => `- ${t.title} (${t.category}, ${t.status || "PENDING"})`).slice(0, 5).join("\n");
    }

    const systemInstruction = `You are "Deadline Guardian AI", a concise productivity assistant.
CRITICAL RULES:
1. Limit responses strictly to 50-80 words. Be direct, crisp, and extremely brief.
2. Provide witty and highly actionable advice. No conversational fillers.
3. Use simple, clean formatting.`;

    const prompt = `${tasksContext ? tasksContext + "\n\n" : ""}${simplifiedHistory ? "Recent Context:\n" + simplifiedHistory + "\n\n" : ""}User: ${message}

(Note: Reply within 50 to 80 words maximum, without filler intro/outro.)`;

    const response = await callGeminiWithRetry(ai, {
      model: modelToUse,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3, // low temperature for fast, low-effort reasoning
      }
    }, 1); // retry only once for chatbot

    res.json({ response: response.text || "No response generated." });
  } catch (error: any) {
    console.error("Error in /api/chatbot:", error);
    res.status(503).json({
      status: "temporarily_unavailable",
      error: "⚠️ Guardian AI is currently experiencing high demand. Please try again in a few moments."
    });
  }
});

// Serve static assets in production, use Vite dev server in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
