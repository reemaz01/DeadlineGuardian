import React, { useState } from "react";
import { Sparkles, CalendarRange, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw } from "lucide-react";
import { Task, SmartScheduleResult } from "../types";

interface SmartSchedulerProps {
  tasks: Task[];
}

export default function SmartScheduler({ tasks }: SmartSchedulerProps) {
  const [scheduleResult, setScheduleResult] = useState<SmartScheduleResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTasks = tasks.filter((t) => !t.completed);

  const handleOptimizeSchedule = async () => {
    if (activeTasks.length === 0) {
      setError("Add some pending tasks first so we can schedule them!");
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/smart-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: activeTasks.map((t) => ({
            id: t.id,
            title: t.title,
            category: t.category,
            deadline: t.deadline,
            progress: t.progress,
            creationDate: t.creationDate,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to optimize schedule with AI.");
      }

      const data = await response.json();
      setScheduleResult(data);
    } catch (err: any) {
      console.error(err);
      setError("AI schedule optimizer failed. Falling back to local slotting.");
      
      // Local fallback
      const sorted = [...activeTasks].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
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

      setScheduleResult({
        ranked_tasks,
        scheduled_slots,
        predicted_workload: activeTasks.length > 3 ? "Heavy & Concentrated" : "Balanced workload",
        schedule_health: activeTasks.length > 4 ? "Critical" : activeTasks.length > 2 ? "Tight" : "Good",
        health_reason: `Calculated local ranking based on standard deadline distances.`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getHealthBadgeStyle = (health?: string) => {
    switch (health) {
      case "Critical":
        return "bg-red-400/10 text-red-400 border-red-400/20";
      case "Tight":
        return "bg-amber-400/10 text-amber-400 border-amber-400/20";
      case "Good":
      default:
        return "bg-[#34D399]/10 text-[#34D399] border-[#34D399]/20";
    }
  };

  const getHealthIcon = (health?: string) => {
    switch (health) {
      case "Critical":
        return <AlertCircle className="w-5 h-5 text-red-400 animate-bounce" />;
      case "Tight":
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case "Good":
      default:
        return <CheckCircle2 className="w-5 h-5 text-[#34D399]" />;
    }
  };

  return (
    <div id="scheduler-panel" className="p-6 rounded-[32px] border border-white/10 bg-white/5 relative overflow-hidden shadow-xl">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#5B8CFF]/5 rounded-full blur-3xl -z-10" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <CalendarRange className="w-5 h-5 text-[#5B8CFF]" />
          <h3 className="font-display font-black text-lg uppercase tracking-tight text-white">Smart AI Scheduler</h3>
        </div>

        <button
          onClick={handleOptimizeSchedule}
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-display font-black uppercase tracking-wider text-xs bg-gradient-to-r from-[#5B8CFF] to-[#A855F7] hover:opacity-90 active:scale-95 disabled:opacity-55 text-white transition-all shadow-lg"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Optimizing Timelines...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
              <span>Generate AI Optimal Schedule</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 mb-6 rounded-xl bg-red-400/10 text-red-400 border border-red-400/20 text-xs font-sans font-bold">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="space-y-4 py-8 animate-pulse">
          <div className="h-6 bg-white/5 rounded-lg w-1/3" />
          <div className="h-24 bg-white/5 rounded-[20px]" />
          <div className="h-24 bg-white/5 rounded-[20px]" />
        </div>
      )}

      {!isLoading && !scheduleResult && (
        <div className="text-center py-12 border border-dashed border-white/10 rounded-[24px]">
          <CalendarRange className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <h4 className="font-display font-black text-sm text-white mb-1 uppercase tracking-wider">Schedule Not Yet Generated</h4>
          <p className="font-sans text-xs text-white/40 max-w-sm mx-auto mb-5 font-semibold">
            Optimize your day using our deep learning task slot allocation. This ranks tasks by danger-zone proximity.
          </p>
          <button
            onClick={handleOptimizeSchedule}
            className="text-xs font-display font-black uppercase tracking-wider text-[#5B8CFF] hover:underline"
          >
            Optimize Tasks Now &rarr;
          </button>
        </div>
      )}

      {!isLoading && scheduleResult && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3">
          {/* Health and workload cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-[20px] border flex items-start gap-3 ${getHealthBadgeStyle(scheduleResult.schedule_health)}`}>
              {getHealthIcon(scheduleResult.schedule_health)}
              <div>
                <span className="block text-[10px] uppercase font-mono tracking-wider font-bold opacity-60">Schedule Health</span>
                <span className="block font-sans font-black text-sm mt-0.5">{scheduleResult.schedule_health}</span>
              </div>
            </div>

            <div className="p-4 rounded-[20px] border border-white/10 bg-white/5 flex items-start gap-3 text-white">
              <div className="p-2 bg-white/5 rounded-xl text-[#A855F7]">
                <CalendarRange className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] uppercase font-mono tracking-wider text-white/50 font-bold">Predicted Workload</span>
                <span className="block font-sans font-bold text-sm mt-0.5">{scheduleResult.predicted_workload}</span>
              </div>
            </div>

            <div className="p-4 rounded-[20px] border border-white/10 bg-white/5 flex items-center justify-between md:col-span-1 text-white">
              <div className="min-w-0">
                <span className="block text-[10px] uppercase font-mono tracking-wider text-white/50 font-bold">Diagnosis</span>
                <span className="block font-sans text-xs text-white/70 mt-1 leading-normal truncate max-w-xs sm:max-w-none font-medium">
                  {scheduleResult.health_reason}
                </span>
              </div>
            </div>
          </div>

          {/* Slots visual layout */}
          <div>
            <h4 className="font-display font-black text-xs text-white/80 uppercase tracking-widest mb-3">Today's Micro-Timeline Allocations</h4>
            <div className="space-y-3">
              {scheduleResult.scheduled_slots.map((slot, index) => (
                <div
                  key={index}
                  className="p-3.5 rounded-[20px] border border-white/10 bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center font-mono text-[10px] text-white/60 font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <h5 className="font-sans font-bold text-xs text-white">{slot.title}</h5>
                      <p className="font-sans text-[10px] text-white/40 mt-0.5">Duration: {slot.duration}</p>
                    </div>
                  </div>
                  <div className="text-right self-start sm:self-center">
                    <span className="inline-block font-mono text-[10px] bg-[#5B8CFF]/15 text-[#5B8CFF] px-2.5 py-1 rounded-full border border-[#5B8CFF]/35 font-bold">
                      {slot.slot}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Execution sequence */}
          <div className="p-5 rounded-[24px] bg-[#A855F7]/10 border border-[#A855F7]/20">
            <h4 className="font-display font-black text-xs text-[#A855F7] uppercase tracking-wider mb-2">Recommended Sequence Reasons</h4>
            <ul className="space-y-2 text-xs font-sans text-white/80 font-medium">
              {scheduleResult.ranked_tasks.map((task, idx) => (
                <li key={idx} className="flex gap-2 items-start">
                  <span className="text-[#A855F7] font-bold shrink-0">{idx + 1}.</span>
                  <span>
                    <strong className="text-white">{task.title}</strong>: {task.reason}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
