import React, { useState } from "react";
import { Sparkles, CheckSquare, Square, Calendar, Clock, Compass, ShieldAlert } from "lucide-react";
import { AIPlan } from "../types";

interface PlannerPanelProps {
  plan: AIPlan;
  taskTitle: string;
}

export default function PlannerPanel({ plan, taskTitle }: PlannerPanelProps) {
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const toggleStep = (idx: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const progressPercent = plan.micro_steps.length
    ? Math.round((completedCount / plan.micro_steps.length) * 100)
    : 0;

  return (
    <div className="space-y-6 p-6 rounded-[28px] border border-white/10 bg-white/5 text-white">
      {/* Intro */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-[9px] font-mono tracking-widest text-[#5B8CFF] uppercase font-black">Generated AI Blueprint</span>
          <h4 className="font-display font-black text-sm text-white mt-1">Plan for: "{taskTitle}"</h4>
        </div>
        <div className="text-right shrink-0">
          <span className="block text-[10px] uppercase font-mono text-white/50 font-bold">Urgency Score</span>
          <span className="text-xl font-mono font-black text-[#FF6B6B]">{plan.urgency_score}%</span>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
          <span className="block text-[10px] text-white/50 font-mono uppercase">Est. Effort</span>
          <span className="block font-sans font-bold text-xs mt-1 text-[#5B8CFF]">{plan.estimated_completion_time}</span>
        </div>
        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
          <span className="block text-[10px] text-white/50 font-mono uppercase">Priority</span>
          <span className={`block font-sans font-black text-xs mt-1 uppercase ${
            plan.priority === "HIGH" ? "text-[#FF6B6B]" : plan.priority === "MEDIUM" ? "text-amber-400" : "text-[#34D399]"
          }`}>{plan.priority}</span>
        </div>
        <div className="p-3 bg-white/5 rounded-xl border border-white/10 col-span-2 md:col-span-1">
          <span className="block text-[10px] text-white/50 font-mono uppercase">Start Zone</span>
          <span className="block font-sans text-xs font-bold mt-1 text-white/90 truncate">
            {new Date(plan.recommended_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || plan.recommended_start_time}
          </span>
        </div>
      </div>

      {/* Summary Box */}
      <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 leading-relaxed text-xs text-white/80 font-sans">
        {plan.summary}
      </div>

      {/* Micro Steps Checklist */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h5 className="font-sans font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-[#34D399]" />
            <span>AI Guided Micro-Steps ({completedCount}/{plan.micro_steps.length})</span>
          </h5>
          <span className="text-[10px] font-mono text-[#34D399]">{progressPercent}% complete</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white/10 h-1.5 rounded-full mb-4 overflow-hidden">
          <div
            className="bg-[#34D399] h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {plan.micro_steps.map((item, idx) => {
            const isCompleted = completedSteps[idx];
            return (
              <button
                key={idx}
                onClick={() => toggleStep(idx)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-200 ${
                  isCompleted
                    ? "bg-[#34D399]/5 border-[#34D399]/20 text-white/50"
                    : "bg-white/[0.01] border-white/5 hover:bg-white/5 hover:border-white/10 text-white"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isCompleted ? (
                    <CheckSquare className="w-4 h-4 text-[#34D399]" />
                  ) : (
                    <Square className="w-4 h-4 text-white/40 group-hover:text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-sans text-xs ${isCompleted ? "line-through text-white/40" : "text-white"}`}>
                    {item.step}
                  </p>
                </div>
                <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded text-white/50 shrink-0">
                  {item.duration}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Motivation Tip */}
      <div className="p-3.5 bg-gradient-to-r from-[#A855F7]/10 to-[#5B8CFF]/5 border border-[#A855F7]/20 rounded-xl flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-yellow-300 shrink-0 mt-0.5 animate-pulse" />
        <div>
          <span className="block text-[9px] font-mono text-[#A855F7] uppercase tracking-wider font-extrabold">Guardian Motivation Tip</span>
          <p className="text-xs text-white/90 italic font-sans mt-0.5 leading-relaxed">
            "{plan.motivation_tip}"
          </p>
        </div>
      </div>
    </div>
  );
}
