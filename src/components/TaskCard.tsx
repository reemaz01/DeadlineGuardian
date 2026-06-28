import React, { useState, useEffect } from "react";
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
    const updated: Task = {
      ...task,
      progress: val,
      completed: val === 100,
      lastUpdated: new Date().toISOString(),
    };
    onUpdateTask(updated);
  };

  // 1. Fetch AI execution plan
  const handleGeneratePlan = async () => {
    if (activeTab === "plan") {
      setActiveTab("none");
      return;
    }

    if (task.aiPlan) {
      setActiveTab("plan");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          category: task.category,
          deadline: task.deadline,
          currentTime: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error("Plan generation failed");
      const planData = await res.json();

      // Recalculate status and risk score based on AI output
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
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
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

        {/* Delete */}
        <button
          onClick={() => onDeleteTask(task.id)}
          className="p-2 hover:bg-red-400/10 text-white/40 hover:text-[#FF6B6B] rounded-xl transition-all shrink-0"
          title="Delete Task"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Time Remaining visual ticker */}
      <div className="mb-5 flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10">
        <span className="flex items-center gap-1.5 text-xs text-white/50 font-bold uppercase tracking-wider">
          <Clock className="w-4 h-4 text-[#5B8CFF]" />
          <span>Timer</span>
        </span>
        <span className={`font-mono text-sm font-black tracking-tight ${
          isOverdue || isRescueEligible ? "text-[#FF6B6B]" : "text-[#5B8CFF]"
        }`}>
          {countdown}
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
          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#5B8CFF] focus:outline-none"
        />

        <p className="text-[10px] font-sans text-white/50 leading-relaxed italic">
          {getProgressEvaluation()}
        </p>
      </div>

      {/* Quick Action buttons */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
        <button
          onClick={handleGeneratePlan}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-sans font-bold text-[10px] transition-all border ${
            activeTab === "plan"
              ? "bg-[#5B8CFF] text-white border-[#5B8CFF]"
              : "bg-white/5 text-white/80 border-white/10 hover:bg-white/10"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{task.aiPlan ? "View AI Plan" : "Generate Plan"}</span>
        </button>

        {/* Procrastination button */}
        <button
          onClick={handleCheckProcrastination}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-sans font-bold text-[10px] transition-all border ${
            activeTab === "procrastination"
              ? "bg-amber-400 text-black border-amber-400"
              : "bg-white/5 text-white/80 border-white/10 hover:bg-white/10"
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Procrastination</span>
        </button>

        {/* Emergency Rescue button */}
        {(isRescueEligible || task.rescuePlan) && (
          <button
            onClick={handleGenerateRescue}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-sans font-extrabold text-[10px] transition-all border animate-pulse ${
              activeTab === "rescue"
                ? "bg-red-500 text-white border-red-500"
                : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Emergency Rescue</span>
          </button>
        )}
      </div>

      {/* Loading state indicator */}
      {isLoading && (
        <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 animate-pulse">
          <div className="w-4 h-4 border-2 border-t-transparent border-[#5B8CFF] rounded-full animate-spin" />
          <span className="text-xs font-sans text-white/60">Guardian AI is computing strategies...</span>
        </div>
      )}

      {/* Expanded detailed content tab */}
      {!isLoading && activeTab === "plan" && task.aiPlan && (
        <div className="mt-4 border-t border-white/10 pt-4 animate-in fade-in slide-in-from-top-3">
          <PlannerPanel plan={task.aiPlan} taskTitle={task.title} />
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
