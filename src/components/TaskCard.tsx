import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  Sparkles,
  ShieldAlert,
  Flame,
  CheckCircle,
  XCircle,
  HelpCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sliders,
  Play,
  RotateCcw,
  Zap,
} from "lucide-react";
import { Task, TaskCategory } from "../types";
import CategoryIcon, { getCategoryBadgeStyles } from "./CategoryIcon";
import PlannerPanel from "./PlannerPanel";
import RescuePanel from "./RescuePanel";

interface TaskCardProps {
  key?: string;
  task: Task;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

export default function TaskCard({ task, onUpdateTask, onDeleteTask }: TaskCardProps) {
  const [countdown, setCountdown] = useState("");
  const [isOverdue, setIsOverdue] = useState(false);
  const [isRescueEligible, setIsRescueEligible] = useState(false);

  const [activeTab, setActiveTab] = useState<"none" | "plan" | "rescue" | "procrastination">("none");
  const [isLoading, setIsLoading] = useState(false);

  // Precision planning settings state
  const [granularity, setGranularity] = useState<"detailed" | "milestone">("detailed");
  const [focusInterval, setFocusInterval] = useState<25 | 45 | 60 | 90>(25);
  const [workStyle, setWorkStyle] = useState<"bulletproof" | "speed" | "flexible">("bulletproof");
  const [showPlanConfig, setShowPlanConfig] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastClickTimeRef = useRef<number>(0);

  // Countdown timer logic
  useEffect(() => {
    const calcTime = () => {
      const now = new Date();
      const target = new Date(task.deadline);
      const diffMs = target.getTime() - now.getTime();

      if (diffMs <= 0) {
        setCountdown("OVERDUE");
        setIsOverdue(true);
        setIsRescueEligible(false);
        return;
      }

      setIsOverdue(false);
      const hoursLeft = diffMs / (1000 * 60 * 60);
      setIsRescueEligible(hoursLeft < 2 && hoursLeft > 0);

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

      if (days > 0) {
        setCountdown(`${days}d ${hours}h ${mins}m ${secs}s`);
      } else {
        setCountdown(`${hours}h ${mins}m ${secs}s`);
      }
    };

    calcTime();
    const interval = setInterval(calcTime, 1000);
    return () => clearInterval(interval);
  }, [task.deadline]);

  // Handle slide progress updates
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    const isCompleted = val === 100;
    
    let updatedMicroSteps = task.completedMicroSteps || {};
    if (isCompleted && task.aiPlan) {
      const newSteps: Record<number, boolean> = {};
      task.aiPlan.micro_steps.forEach((_, idx) => {
        newSteps[idx] = true;
      });
      updatedMicroSteps = newSteps;
    } else if (!isCompleted && task.aiPlan && task.completed) {
      const newSteps: Record<number, boolean> = {};
      task.aiPlan.micro_steps.forEach((_, idx) => {
        newSteps[idx] = false;
      });
      updatedMicroSteps = newSteps;
    }

    const updated: Task = {
      ...task,
      progress: val,
      completed: isCompleted,
      completedAt: isCompleted ? new Date().toISOString() : undefined,
      completedMicroSteps: updatedMicroSteps,
      lastUpdated: new Date().toISOString(),
      ...(isCompleted ? {
        status: "ON TRACK" as const,
        riskScore: 0,
        procrastinationScore: 0,
        reason: "Task completed securely!",
        suggestedAction: "None. Rest up!",
      } : {})
    };
    onUpdateTask(updated);
  };

  const handleToggleComplete = () => {
    const nextCompleted = !task.completed;
    
    let updatedMicroSteps = task.completedMicroSteps || {};
    if (nextCompleted && task.aiPlan) {
      const newSteps: Record<number, boolean> = {};
      task.aiPlan.micro_steps.forEach((_, idx) => {
        newSteps[idx] = true;
      });
      updatedMicroSteps = newSteps;
    } else if (!nextCompleted && task.aiPlan) {
      const newSteps: Record<number, boolean> = {};
      task.aiPlan.micro_steps.forEach((_, idx) => {
        newSteps[idx] = false;
      });
      updatedMicroSteps = newSteps;
    }

    const updated: Task = {
      ...task,
      completed: nextCompleted,
      progress: nextCompleted ? 100 : 0,
      completedAt: nextCompleted ? new Date().toISOString() : undefined,
      completedMicroSteps: updatedMicroSteps,
      lastUpdated: new Date().toISOString(),
      ...(nextCompleted ? {
        status: "ON TRACK" as const,
        riskScore: 0,
        procrastinationScore: 0,
        reason: "Task completed securely!",
        suggestedAction: "None. Rest up!",
      } : {
        status: "ON TRACK" as const,
        riskScore: 20,
        reason: "Standard tracking activated.",
        suggestedAction: "Continue progress.",
      })
    };
    onUpdateTask(updated);
  };

  // 1. Fetch AI execution plan with caching and robust retry/abort logic
  const handleGeneratePlan = async (forceRegenerate: boolean = false) => {
    // 1. Debounce rapid double-clicks (prevent multi-submissions under 1 second)
    const nowTimestamp = Date.now();
    if (nowTimestamp - lastClickTimeRef.current < 1000) {
      return;
    }
    lastClickTimeRef.current = nowTimestamp;

    if (!forceRegenerate && activeTab === "plan") {
      setActiveTab("none");
      return;
    }

    // Prepare cache key for the unique task settings configuration
    const cacheKey = `plan_${task.id}_${granularity}_${focusInterval}_${workStyle}`;

    // 2. Check local client cache first before calling API
    if (!forceRegenerate) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && Object.keys(parsed).length > 0) {
            onUpdateTask({
              ...task,
              aiPlan: parsed,
              riskScore: parsed.urgency_score,
              status: parsed.urgency_score > 70 ? "HIGH RISK" : "ON TRACK",
              reason: parsed.summary,
              suggestedAction: parsed.motivation_tip,
            });
            setActiveTab("plan");
            setShowPlanConfig(false);
            return;
          }
        } catch (_) {}
      }

      if (task.aiPlan) {
        setActiveTab("plan");
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    // 3. Keep only one active request at a time - cancel any duplicate/pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Helper for fetch with exponential backoff (retries up to 3 times on 503 UNAVAILABLE)
    const fetchWithBackoff = async (
      url: string,
      options: RequestInit,
      retriesLeft = 3,
      delayMs = 2000
    ): Promise<Response> => {
      try {
        const response = await fetch(url, options);
        if (response.status === 503 && retriesLeft > 0) {
          console.warn(`Gemini 503 received. Retrying in ${delayMs}ms... (${retriesLeft} retries left)`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          return fetchWithBackoff(url, options, retriesLeft - 1, delayMs * 2);
        }
        return response;
      } catch (fetchErr: any) {
        if (fetchErr.name === "AbortError") {
          throw fetchErr; // Do not retry if explicit cancel/abort
        }
        if (retriesLeft > 0) {
          console.warn(`Fetch connection error. Retrying in ${delayMs}ms... (${retriesLeft} retries left)`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          return fetchWithBackoff(url, options, retriesLeft - 1, delayMs * 2);
        }
        throw fetchErr;
      }
    };

    try {
      const res = await fetchWithBackoff("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          title: task.title,
          task: task.title,
          category: task.category,
          deadline: task.deadline,
          currentTime: new Date().toISOString(),
          granularity,
          focusInterval,
          workStyle,
        }),
      });

      if (!res.ok) {
        let errData;
        try {
          errData = await res.json();
        } catch (_) {}
        throw new Error(errData?.error || `Server responded with status ${res.status}`);
      }

      const planData = await res.json();
      if (!planData || Object.keys(planData).length === 0) {
        throw new Error("Empty plan data received from AI.");
      }

      // Save to client-side localStorage cache
      try {
        localStorage.setItem(cacheKey, JSON.stringify(planData));
      } catch (_) {}

      const score = planData.urgency_score;
      let status: "ON TRACK" | "HIGH RISK" | "MISSED DEADLINE" = "ON TRACK";
      if (score > 70) {
        status = "HIGH RISK";
      }

      onUpdateTask({
        ...task,
        aiPlan: planData,
        riskScore: score,
        status,
        reason: planData.summary,
        suggestedAction: planData.motivation_tip,
      });
      setActiveTab("plan");
      setShowPlanConfig(false);
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Plan generation request aborted by user/new request.");
        return;
      }
      console.error("Plan Generation Error:", err);
      // Friendly message instead of raw JSON error
      if (err.message?.includes("503") || err.message?.includes("busy") || err.message?.includes("UNAVAILABLE") || err.message?.includes("status 503")) {
        setError("AI is currently busy. Please try again in a few moments.");
      } else {
        setError(err.message || "An unexpected error occurred while generating the plan.");
      }
    } finally {
      // Clear the abort controller ref if it belongs to this execution block
      if (abortControllerRef.current === controller) {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  // 2. Fetch Rescue plan
  const handleGenerateRescue = async () => {
    if (activeTab === "rescue") {
      setActiveTab("none");
      return;
    }

    if (task.rescuePlan) {
      setActiveTab("rescue");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/rescue-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          category: task.category,
          deadline: task.deadline,
          currentTime: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error("Rescue failed");
      const rescueData = await res.json();

      onUpdateTask({
        ...task,
        rescuePlan: rescueData,
      });
      setActiveTab("rescue");
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Fetch Procrastination report
  const handleCheckProcrastination = async () => {
    if (activeTab === "procrastination") {
      setActiveTab("none");
      return;
    }

    if (task.procrastinationScore > 0) {
      setActiveTab("procrastination");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/check-procrastination", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          creationDate: task.creationDate,
          deadline: task.deadline,
          progress: task.progress,
        }),
      });

      if (!res.ok) throw new Error("Procrastination analysis failed");
      const procData = await res.json();

      onUpdateTask({
        ...task,
        procrastinationScore: procData.procrastination_score,
        procrastinationWarning: procData.warning_message,
        procrastinationQuickAction: procData.quick_action,
      });
      setActiveTab("procrastination");
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Custom AI Progress Evaluation
  const getProgressEvaluation = () => {
    if (task.completed) {
      return "Guardian Mastered! Outstanding discipline.";
    }
    if (task.progress === 0) {
      return "Critical Warning: Not yet commenced. Risk of complete default.";
    }
    if (task.progress < 30) {
      return "Vulnerable Stage: Slow momentum. AI advises generating micro-steps immediately.";
    }
    if (task.progress < 70) {
      return "Building Velocity: Healthy traction. Halfway to baseline delivery.";
    }
    return "Refinement State: High final-stage confidence. Proceed with polishing.";
  };

  const getRiskLabelColor = () => {
    if (task.completed) return "bg-[#34D399]/10 text-[#34D399] border-[#34D399]/20";
    if (isOverdue) return "bg-red-400/10 text-red-400 border-red-400/20";
    if (task.status === "HIGH RISK" || isRescueEligible) {
      return "bg-red-400/10 text-red-400 border-red-400/20 animate-pulse";
    }
    return "bg-[#5B8CFF]/10 text-[#5B8CFF] border-[#5B8CFF]/20";
  };

  return (
    <div
      id={`task-card-${task.id}`}
      className={`p-6 rounded-[32px] border transition-all duration-300 relative overflow-hidden ${
        task.completed
          ? "bg-white/5 border-[#34D399]/30"
          : isOverdue
          ? "bg-gradient-to-br from-[#FF6B6B]/15 to-[#0F1115] border-[#FF6B6B]/30"
          : task.status === "HIGH RISK" || isRescueEligible
          ? "bg-gradient-to-br from-[#FF6B6B]/15 via-[#A855F7]/10 to-[#0F1115] border-[#FF6B6B]/40 shadow-xl shadow-red-500/5 hover:scale-[1.01]"
          : "bg-white/5 border-white/10 hover:border-white/20 hover:scale-[1.01]"
      }`}
    >
      {/* Outer gradient subtle glow for high danger tasks */}
      {!task.completed && (task.status === "HIGH RISK" || isRescueEligible) && (
        <div className="absolute inset-0 border border-red-500/20 rounded-[32px] animate-pulse pointer-events-none" />
      )}

      {/* Top Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
            <CategoryIcon category={task.category} className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[9px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${getCategoryBadgeStyles(task.category)}`}>
                {task.category}
              </span>
              <span className={`text-[9px] px-2.5 py-0.5 rounded-full border font-mono font-black tracking-wider ${getRiskLabelColor()}`}>
                {task.completed ? "COMPLETED" : isOverdue ? "OVERDUE" : isRescueEligible ? "EMERGENCY" : task.status}
              </span>
            </div>
            <h3 className={`font-display font-black text-base text-white mt-2 leading-tight ${task.completed ? "line-through text-white/40" : ""}`}>
              {task.title}
            </h3>
          </div>
        </div>

        {/* Actions Container */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Complete Toggle */}
          <button
            onClick={handleToggleComplete}
            className={`p-2 rounded-xl transition-all flex items-center justify-center border ${
              task.completed
                ? "bg-[#34D399]/20 border-[#34D399]/40 text-[#34D399] hover:bg-[#34D399]/30"
                : "bg-white/5 border-white/10 text-white/40 hover:text-[#34D399] hover:border-[#34D399]/30 hover:bg-[#34D399]/10"
            }`}
            title={task.completed ? "Mark as In Progress" : "Mark as Complete"}
          >
            <CheckCircle className={`w-4 h-4 ${task.completed ? "animate-bounce" : ""}`} />
          </button>

          {/* Delete */}
          <button
            onClick={() => onDeleteTask(task.id)}
            className="p-2 hover:bg-red-400/10 text-white/40 hover:text-[#FF6B6B] rounded-xl transition-all"
            title="Delete Task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Time Remaining visual ticker / Completion banner */}
      <div className={`mb-5 flex items-center justify-between p-3.5 rounded-2xl border ${
        task.completed
          ? "bg-emerald-500/10 border-emerald-500/20 text-[#34D399] animate-bounce-subtle"
          : "bg-white/5 border-white/10"
      }`}>
        <span className="flex items-center gap-1.5 text-xs text-white/50 font-bold uppercase tracking-wider">
          <Clock className={`w-4 h-4 ${task.completed ? "text-[#34D399]" : "text-[#5B8CFF]"}`} />
          <span>{task.completed ? "Status" : "Timer"}</span>
        </span>
        <span className={`font-mono text-xs font-black tracking-tight ${
          task.completed
            ? "text-[#34D399]"
            : isOverdue || isRescueEligible
            ? "text-[#FF6B6B]"
            : "text-[#5B8CFF]"
        }`}>
          {task.completed ? "✅ Completed" : countdown}
        </span>
      </div>

      {/* Progress slider bar & feedback */}
      <div className="mb-6 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-white/40 font-mono uppercase font-bold tracking-wider">Velocity Check</span>
          <span className="text-xs font-mono font-black text-white">{task.progress}%</span>
        </div>
        
        {/* Slider */}
        <input
          type="range"
          min="0"
          max="100"
          value={task.progress}
          onChange={handleProgressChange}
          disabled={task.completed}
          className={`w-full h-1.5 bg-white/10 rounded-lg appearance-none focus:outline-none ${
            task.completed ? "cursor-not-allowed accent-[#34D399]" : "cursor-pointer accent-[#5B8CFF]"
          }`}
        />

        <p className="text-[10px] font-sans text-white/50 leading-relaxed italic">
          {getProgressEvaluation()}
        </p>

        {task.completed && task.completedAt && (
          <p className="text-[10px] font-mono text-[#34D399] leading-relaxed font-black uppercase mt-1 animate-pulse">
            Completed: {new Date(task.completedAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* Quick Action buttons */}
      <div className="flex flex-col gap-2 pt-3 border-t border-white/5 w-full">
        <div className="flex gap-2 w-full">
          <button
            onClick={() => handleGeneratePlan(false)}
            disabled={isLoading}
            className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-2xl font-sans font-bold text-[10px] uppercase tracking-wider transition-all duration-300 ease-in-out border ${
              activeTab === "plan"
                ? "bg-gradient-to-r from-[#5B8CFF] to-[#A855F7] text-white-force border-transparent shadow-lg shadow-[#5B8CFF]/25 scale-[1.01]"
                : "bg-neutral-950/80 hover:bg-[#15181F] text-white/80 hover:text-white border border-white/10 hover:border-white/30 hover:shadow-md hover:shadow-white/5"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{task.aiPlan ? "View AI Plan" : "Generate Plan"}</span>
          </button>

          {/* Plan precise customizer slider toggle */}
          <button
            onClick={() => {
              setShowPlanConfig(!showPlanConfig);
              if (!task.aiPlan) {
                setActiveTab("none");
              }
            }}
            disabled={isLoading}
            className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-300 ease-in-out border shrink-0 ${
              showPlanConfig
                ? "bg-gradient-to-r from-purple-500/20 to-[#A855F7]/30 text-purple-300 border-purple-500/40 shadow-lg shadow-purple-500/10"
                : "bg-neutral-950/80 hover:bg-[#15181F] text-white/60 hover:text-white border border-white/10 hover:border-white/30 hover:shadow-md hover:shadow-white/5"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Tweak Precise Planning Parameters"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={handleCheckProcrastination}
          disabled={isLoading}
          className={`w-full flex items-center justify-center gap-2 h-10 rounded-2xl font-sans font-bold text-[10px] uppercase tracking-wider transition-all duration-300 ease-in-out border ${
            activeTab === "procrastination"
              ? "bg-gradient-to-r from-amber-400 to-orange-500 text-black border-transparent shadow-lg shadow-amber-400/25 scale-[1.01]"
              : "bg-neutral-950/80 hover:bg-[#15181F] text-white/80 hover:text-white border border-white/10 hover:border-white/30 hover:shadow-md hover:shadow-white/5"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Procrastination Check</span>
        </button>

        {/* Emergency Rescue button */}
        {(isRescueEligible || task.rescuePlan) && (
          <button
            onClick={handleGenerateRescue}
            disabled={isLoading}
            className={`w-full flex items-center justify-center gap-2 h-10 rounded-2xl font-sans font-black text-[10px] uppercase tracking-wider transition-all duration-300 ease-in-out border animate-pulse ${
              activeTab === "rescue"
                ? "bg-gradient-to-r from-red-500 to-pink-600 text-white-force border-transparent shadow-lg shadow-red-500/25 scale-[1.01]"
                : "bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 hover:shadow-md hover:shadow-red-500/5"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Emergency Rescue Plan</span>
          </button>
        )}
      </div>

      {/* Precise Plan Configuration Panel */}
      {(showPlanConfig || (activeTab === "none" && !task.aiPlan && showPlanConfig)) && (
        <div className="mt-3 p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <h5 className="text-[10px] font-mono uppercase tracking-widest text-white/80 font-bold flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#5B8CFF]" />
              <span>Precise Plan Customizer</span>
            </h5>
            <button
              onClick={() => setShowPlanConfig(false)}
              className="text-[9px] font-mono text-white/40 hover:text-white"
            >
              Hide
            </button>
          </div>

          <div className="flex flex-col gap-5 sm:gap-6">
            {/* Granularity Selector Card */}
            <div className="flex flex-col gap-3.5 p-5 sm:p-6 rounded-[24px] bg-white/[0.01] border border-white/5">
              <span className="text-xs font-sans font-bold text-white tracking-wide">Granularity</span>
              <span className="text-[10px] font-mono text-white/40">Checklist detail level</span>
              <div className="flex justify-center w-full">
                <div className="flex items-center gap-1.5 bg-[#15181F] p-1 rounded-[20px] border border-white/10 shrink-0 w-[200px]" style={{ width: "200px" }}>
                  <button
                    type="button"
                    onClick={() => setGranularity("detailed")}
                    className={`flex-1 h-9 flex items-center justify-center rounded-[16px] text-[10px] font-mono font-bold uppercase transition-all duration-300 ease-in-out border ${
                      granularity === "detailed"
                        ? "bg-gradient-to-r from-[#5B8CFF] to-purple-500 text-white-force border-white/10 shadow-md shadow-[#5B8CFF]/15 scale-[1.02]"
                        : "text-white/50 hover:text-white border-transparent hover:bg-white/5"
                    }`}
                  >
                    Precise
                  </button>
                  <button
                    type="button"
                    onClick={() => setGranularity("milestone")}
                    className={`flex-1 h-9 flex items-center justify-center rounded-[16px] text-[10px] font-mono font-bold uppercase transition-all duration-300 ease-in-out border ${
                      granularity === "milestone"
                        ? "bg-gradient-to-r from-[#5B8CFF] to-purple-500 text-white-force border-white/10 shadow-md shadow-[#5B8CFF]/15 scale-[1.02]"
                        : "text-white/50 hover:text-white border-transparent hover:bg-white/5"
                    }`}
                  >
                    Milestone
                  </button>
                </div>
              </div>
            </div>

            {/* Focus Interval Selector Card */}
            <div className="flex flex-col gap-3.5 p-5 sm:p-6 rounded-[24px] bg-white/[0.01] border border-white/5">
              <span className="text-xs font-sans font-bold text-white tracking-wide">Focus Sprint</span>
              <span className="text-[10px] font-mono text-white/40">Pomodoro interval</span>
              <div className="flex justify-center w-full">
                <div className="flex items-center gap-1 bg-[#15181F] p-1 rounded-[20px] border border-white/10 shrink-0 w-[200px]" style={{ width: "200px" }}>
                  {[25, 45, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setFocusInterval(mins as any)}
                      className={`flex-1 h-9 flex items-center justify-center rounded-[16px] text-[10px] font-mono font-bold transition-all duration-300 ease-in-out border ${
                        focusInterval === mins
                          ? "bg-gradient-to-r from-[#5B8CFF] to-purple-500 text-white-force border-white/10 shadow-md shadow-[#5B8CFF]/15 scale-[1.02]"
                          : "text-white/50 hover:text-white border-transparent hover:bg-white/5"
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Work Style Selector Card */}
            <div className="flex flex-col gap-3.5 p-5 sm:p-6 rounded-[24px] bg-white/[0.01] border border-white/5">
              <span className="text-xs font-sans font-bold text-white tracking-wide">Execution Style</span>
              <span className="text-[10px] font-mono text-white/40">AI planning style</span>
              <div className="flex justify-center w-full">
                <div className="flex items-center gap-1 bg-[#15181F] p-1 rounded-[20px] border border-white/10 shrink-0 w-[200px]" style={{ width: "200px" }}>
                  {(["bulletproof", "speed", "flexible"] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setWorkStyle(style)}
                      className={`flex-1 h-9 flex items-center justify-center rounded-[16px] text-[9px] font-mono font-bold uppercase transition-all duration-300 ease-in-out border ${
                        workStyle === style
                          ? "bg-gradient-to-r from-[#5B8CFF] to-purple-500 text-white-force border-white/10 shadow-md shadow-[#5B8CFF]/15 scale-[1.02]"
                          : "text-white/50 hover:text-white border-transparent hover:bg-white/5"
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-7">
            <button
              onClick={() => handleGeneratePlan(true)}
              disabled={isLoading}
              className="px-6 h-10 bg-gradient-to-r from-[#5B8CFF] to-purple-500 hover:brightness-110 active:scale-95 disabled:opacity-50 text-white-force rounded-2xl text-[10px] font-sans font-black uppercase tracking-wider transition-all duration-300 ease-in-out shadow-lg shadow-[#5B8CFF]/20 hover:shadow-[#5B8CFF]/30 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{task.aiPlan ? "Regenerate Plan" : "Generate Plan"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading state indicator */}
      {isLoading && (
        <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 animate-pulse">
          <div className="w-4 h-4 border-2 border-t-transparent border-[#5B8CFF] rounded-full animate-spin" />
          <span className="text-xs font-sans text-white/60">Guardian AI is computing strategies...</span>
        </div>
      )}

      {/* Error State Indicator */}
      {error && (
        <div className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex flex-col gap-1 text-xs font-sans">
          <span className="font-bold">Execution Plan Error:</span>
          <span>{error}</span>
        </div>
      )}

      {/* Expanded detailed content tab */}
      {!isLoading && activeTab === "plan" && task.aiPlan && (
        <div className="mt-4 border-t border-white/10 pt-4 space-y-3 animate-in fade-in slide-in-from-top-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-[9px] font-mono text-white/40 uppercase">Interactive Roadmap</span>
            <button
              onClick={() => setShowPlanConfig(!showPlanConfig)}
              className="text-[9px] font-mono text-[#5B8CFF] hover:underline flex items-center gap-1"
            >
              <Sliders className="w-3 h-3" />
              <span>Tweak Precise Settings</span>
            </button>
          </div>
          <PlannerPanel task={task} onUpdateTask={onUpdateTask} />
        </div>
      )}

      {!isLoading && activeTab === "rescue" && task.rescuePlan && (
        <div className="mt-4 border-t border-white/10 pt-4 animate-in fade-in slide-in-from-top-3">
          <RescuePanel plan={task.rescuePlan} deadline={task.deadline} />
        </div>
      )}

      {!isLoading && activeTab === "procrastination" && task.procrastinationScore > 0 && (
        <div className="mt-4 p-4 rounded-2xl bg-amber-400/5 border border-amber-400/10 space-y-3 animate-in fade-in slide-in-from-top-3 text-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-amber-400 tracking-wider font-bold">Procrastination Alert</span>
            <span className="text-sm font-mono font-black text-amber-400">{task.procrastinationScore}% Score</span>
          </div>

          <p className="font-sans text-xs text-white/80 leading-normal">
            {task.procrastinationWarning}
          </p>

          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <span className="block text-[9px] uppercase font-mono text-white/40">5-Minute Micro-Action Starter</span>
            <p className="font-sans text-xs text-[#34D399] font-bold mt-1 leading-relaxed">
              {task.procrastinationQuickAction}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
