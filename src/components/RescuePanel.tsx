import React, { useState, useEffect } from "react";
import { ShieldAlert, AlertTriangle, ListX, Heart, Info, Clock } from "lucide-react";
import { RescuePlan } from "../types";

interface RescuePanelProps {
  plan: RescuePlan;
  deadline: string;
}

export default function RescuePanel({ plan, deadline }: RescuePanelProps) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const target = new Date(deadline);
      const diffMs = target.getTime() - now.getTime();

      if (diffMs <= 0) {
        setTimeLeft("OVERDUE");
        return;
      }

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimeLeft(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <div id="rescue-panel" className="space-y-6 p-6 rounded-[32px] border border-red-500/30 bg-gradient-to-br from-red-950/30 via-[#0F1115] to-[#0F1115] text-white relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl -z-10" />

      {/* Header alert */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center animate-pulse border border-red-500/30">
            <ShieldAlert className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <span className="block text-[10px] font-mono tracking-widest text-red-400 font-black uppercase">RESCUE MODE ACTIVATED</span>
            <h4 className="font-display font-black text-sm text-white">Minimum Viable Emergency Execution</h4>
          </div>
        </div>

        {/* Big emergency clock */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2 text-center shrink-0 self-start sm:self-center">
          <span className="block text-[8px] font-mono text-red-400 uppercase tracking-widest font-black">Time Remaining</span>
          <span className="font-mono text-lg font-black text-white flex items-center gap-1.5 justify-center">
            <Clock className="w-4 h-4 text-red-400 animate-spin" style={{ animationDuration: "3s" }} />
            {timeLeft}
          </span>
        </div>
      </div>

      {/* Minimum Viable Submission goal */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-[20px]">
        <h5 className="font-display font-black text-xs text-amber-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <Info className="w-4 h-4 text-amber-300" />
          <span>Minimum Viable Submission (MVS) Target</span>
        </h5>
        <p className="font-sans text-xs text-white/90 leading-relaxed font-semibold">
          {plan.minimum_viable_submission}
        </p>
      </div>

      {/* Emergency step list */}
      <div>
        <h5 className="font-display font-black text-xs text-red-400 uppercase tracking-widest mb-3">Aggressive Action Timeline</h5>
        <div className="space-y-2">
          {plan.emergency_timeline.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 bg-white/5 border border-white/10 rounded-[16px] flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-black text-red-400">{item.time}</span>
                <span className="font-sans text-xs text-white/90 font-medium">{item.action}</span>
              </div>
              <span className="text-[9px] font-mono font-black uppercase bg-red-400/20 text-red-400 px-2.5 py-1 rounded border border-red-400/30">
                {item.priority}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Skips and survival tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Skip card */}
        <div className="p-4 rounded-[20px] bg-amber-400/5 border border-amber-400/20">
          <h5 className="font-display font-black text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <ListX className="w-4 h-4 text-amber-400" />
            <span>WHAT TO SKIP (Absolute Waste)</span>
          </h5>
          <ul className="space-y-1.5 text-xs font-sans text-white/70 list-disc list-inside font-medium">
            {plan.what_to_skip.map((item, idx) => (
              <li key={idx} className="hover:text-white transition-colors">{item}</li>
            ))}
          </ul>
        </div>

        {/* Survival tips */}
        <div className="p-4 rounded-[20px] bg-white/5 border border-white/10">
          <h5 className="font-display font-black text-xs text-white uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <Heart className="w-4 h-4 text-[#34D399]" />
            <span>Survival Protocol Tips</span>
          </h5>
          <ul className="space-y-1.5 text-xs font-sans text-white/70 list-disc list-inside font-medium">
            {plan.survival_tips.map((item, idx) => (
              <li key={idx} className="hover:text-white transition-colors">{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
