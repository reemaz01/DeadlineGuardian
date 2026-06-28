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
  try {
    const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Failed to parse AI response as JSON", text, err);
    throw err;
  }
}

// 1. POST /api/generate-plan
app.post("/api/generate-plan", async (req, res) => {
  const { title, category, deadline, currentTime } = req.body;
  const ai = getAIClient();

  if (!ai) {
    // Fallback logic if API key is missing
    const score = Math.floor(Math.random() * 40) + 40;
    return res.json({
      estimated_completion_time: "3-4 hours",
      priority: score > 70 ? "HIGH" : "MEDIUM",
      urgency_score: score,
      recommended_start_time: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      micro_steps: [
        { step: "Initial outline & planning", duration: "30 mins" },
        { step: "Core implementation & setup", duration: "1.5 hours" },
        { step: "Testing and refinements", duration: "1 hour" }
      ],
      summary: `Localized baseline roadmap generated for "${title}". Start early to keep risk minimal.`,
      motivation_tip: "Focus on the first 5 minutes. Motivation follows action!"
    });
  }

  try {
    const prompt = `You are an elite productivity planner called 'Deadline Guardian AI'.
Analyze the following task:
Title: "${title}"
Category: "${category}"
Deadline: "${deadline}"
Current Time: "${currentTime}"

Generate a personalized execution plan in JSON format. Provide estimated time, priority level, urgency score (0-100), recommended start time, step-by-step breakdown (micro-steps with durations), a high-level summary, and a tailored motivating tip.`;

    const response = await ai.models.generateContent({
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
    res.status(500).json({ error: error.message });
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
  const { title, creationDate, deadline, progress } = req.body;
  const ai = getAIClient();

  if (!ai) {
    const daysElapsed = Math.max(1, Math.floor((Date.now() - new Date(creationDate).getTime()) / (1000 * 60 * 60 * 24)));
    const mockScore = Math.min(100, Math.max(10, Math.floor((daysElapsed * 20) * (1 - (progress || 0) / 100))));
    return res.json({
      procrastination_score: mockScore,
      warning_message: mockScore > 60
        ? `Warning: This task has been in your register for ${daysElapsed} days with progress stuck at ${progress}%.`
        : "You are making steady progress! Keep it rolling.",
      quick_action: "Set a 5-minute timer and just open the core resources/documents right now."
    });
  }

  try {
    const prompt = `Analyze user procrastination patterns for this task:
Task Title: "${title}"
Created On: "${creationDate}"
Deadline: "${deadline}"
Current Progress: ${progress}%

Calculate procrastination score (0-100), write a witty Gen-Z warning message, and suggest a 5-minute quick start micro-action. Return in JSON format.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            procrastination_score: { type: Type.INTEGER, description: "0 to 100" },
            warning_message: { type: Type.STRING },
            quick_action: { type: Type.STRING }
          },
          required: ["procrastination_score", "warning_message", "quick_action"]
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
  const { message, tasks } = req.body;
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
    const prompt = `You are the ultimate Deadline Guardian AI chatbot assistant — an expert, witty, Gen-Z styled hyper-focused companion who helps professionals and students crush their goals. 
You use light humor, gaming analogies, and high-energy encouragement.

Current local time is: "${new Date().toISOString()}"

Current tasks in the user's ledger:
${JSON.stringify(tasks, null, 2)}

User's query/message: "${message}"

Your capabilities (leverage these models/concepts in response to the user's message):
1. **Generating Plans**: If they ask to plan, outline, or schedule a task (e.g. "plan for task X"), output a clear step-by-step roadmap with estimated completion, priority, recommended start time, and a table of 3-4 micro-steps with duration.
2. **Risk & Procrastination Analysis**: If they ask about procrastination, lazy progress, or risk (e.g. "Am I procrastinating?"), calculate a procrastination score (0-100%) for their tasks, give them a witty warning, and a highly specific "5-minute micro-action" to break the barrier.
3. **Emergency Rescue Mode**: If they are struggling under a tight deadline (under 2h) or ask for rescue advice (e.g. "rescue me" or "due soon"), generate an aggressive action timeline, list what they MUST skip, and define a 'Minimum Viable Submission' to save their grade/score.
4. **Motivational/Productivity Advice**: If they ask for productivity advice, sound tired, or ask for general tips, give them custom motivation tailored to their actual tasks.

Formatting Rules:
- Keep responses compact, extremely structured, and highly scannable using Markdown (use bold headings, lists, bullet points).
- Maximum 4-6 concise sentences or short bullet points.
- Sound encouraging, witty, slightly sarcastic but highly helpful and hyper-focused. Use formatting to make it look premium.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ response: response.text || "No response generated." });
  } catch (error: any) {
    console.error("Error in /api/chatbot:", error);
    res.status(500).json({ error: error.message });
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
