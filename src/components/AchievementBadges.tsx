import React from "react";
import { Award, Zap, Shield, Flame, CheckCircle2, Sparkles, AlertTriangle } from "lucide-react";
import { Task } from "../types";

interface AchievementBadgesProps {
  tasks: Task[];
  streak: number;
}

export default function AchievementBadges({ tasks, streak }: AchievementBadgesProps) {
  const completedCount = tasks.filter((t) => t.completed).length;
  const rescueCompletes = tasks.filter((t) => t.completed && t.rescuePlan).length;
  const procrastinationCompletes = tasks.filter((t) => t.completed && t.procrastinationScore > 50).length;

  const badges = [
    {
      id: "first_task",
      title: "Guardian Initiate",
      description: "Added your first task to the guardian ledger.",
      unlocked: tasks.length > 0,
      icon: <Award className="w-6 h-6 text-[#5B8CFF]" />,
      accent: "from-[#5B8CFF]/20 to-[#5B8CFF]/5 border-[#5B8CFF]/30",
    },
    {
      id: "first_complete",
      title: "Deadline Slayer",
      description: "Completed your first guarded task successfully.",
      unlocked: completedCount > 0,
      icon: <CheckCircle2 className="w-6 h-6 text-[#34D399]" />,
      accent: "from-[#34D399]/20 to-[#34D399]/5 border-[#34D399]/30",
    },
    {
      id: "streak_3",
      title: "Task Alchemist",
      description: "Earned a productivity streak of 3 or more days.",
      unlocked: streak >= 3,
      icon: <Flame className="w-6 h-6 text-[#FF6B6B]" />,
      accent: "from-[#FF6B6B]/20 to-[#FF6B6B]/5 border-[#FF6B6B]/30",
    },
    {
      id: "rescue_master",
      title: "Chronos Survivor",
      description: "Completed a task after activating emergency Rescue Mode.",
      unlocked: rescueCompletes > 0,
      icon: <Shield className="w-6 h-6 text-[#A855F7]" />,
      accent: "from-[#A855F7]/20 to-[#A855F7]/5 border-[#A855F7]/30",
    },
    {
      id: "procrastination_buster",
      title: "Sloth Exorcist",
      description: "Finished a task with a high (>50) procrastination score.",
      unlocked: procrastinationCompletes > 0,
      icon: <Zap className="w-6 h-6 text-yellow-400" />,
      accent: "from-yellow-400/20 to-yellow-400/5 border-yellow-400/30",
    },
    {
      id: "unstoppable",
      title: "Productivity Overlord",
      description: "Guarded and completed 5 or more total tasks.",
      unlocked: completedCount >= 5,
      icon: <Sparkles className="w-6 h-6 text-pink-400 animate-bounce" />,
      accent: "from-pink-400/20 to-pink-400/5 border-pink-400/30",
    },
  ];

  return (
    <div id="achievements-panel" className="p-6 rounded-[32px] border border-white/10 bg-white/5 shadow-xl">
      <div className="flex items-center gap-2 mb-6">
        <Award className="w-5 h-5 text-[#A855F7]" />
        <h3 className="font-display font-black text-lg uppercase tracking-tight text-white">Achievements & Badges</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={`relative p-4 rounded-[20px] border transition-all duration-300 flex items-start gap-3 overflow-hidden ${
              badge.unlocked
                ? `bg-gradient-to-br ${badge.accent} hover:scale-[1.02]`
                : "bg-white/[0.01] border-white/5 opacity-40 grayscale"
            }`}
          >
            {badge.unlocked && (
              <div className="absolute top-0 right-0 bg-[#34D399] text-black font-mono font-bold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-bl-xl">
                UNLOCKED
              </div>
            )}
            
            <div className={`p-2.5 rounded-xl border border-white/10 ${badge.unlocked ? "bg-white/5" : "bg-white/[0.02]"}`}>
              {badge.icon}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-display font-black text-xs text-white truncate">{badge.title}</h4>
              <p className="font-sans text-[11px] text-white/60 mt-1 leading-relaxed font-semibold">
                {badge.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
