import React, { useState } from "react";
import { Calendar, Circle, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Task } from "../types";
import CategoryIcon from "./CategoryIcon";

interface TimelineViewProps {
  tasks: Task[];
}

export default function TimelineView({ tasks }: TimelineViewProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  const filteredTasks = [...tasks]
    .filter((task) => {
      if (filter === "pending") return !task.completed;
      if (filter === "completed") return task.completed;
      return true;
    })
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  const getRelativeTimeLabel = (deadlineStr: string) => {
    const now = new Date();
    const deadline = new Date(deadlineStr);
    const diffMs = deadline.getTime() - now.getTime();
    if (diffMs < 0) return "Overdue";

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) {
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `${diffMins} mins left`;
      }
      return `${diffHours} hours left`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days left`;
  };

  return (
    <div id="timeline-panel" className="p-6 rounded-[32px] border border-white/10 bg-white/5 shadow-xl">
      {/* Header and filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#5B8CFF]" />
          <h3 className="font-display font-black text-lg uppercase tracking-tight text-white">Chronological Timeline</h3>
        </div>

        {/* Filter buttons */}
        <div className="flex bg-white/5 rounded-xl p-1 border border-white/10 self-start">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-display font-black uppercase tracking-wider transition-all ${
              filter === "all" ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
            }`}
          >
            All Tasks
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 rounded-lg text-xs font-display font-black uppercase tracking-wider transition-all ${
              filter === "pending" ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-display font-black uppercase tracking-wider transition-all ${
              filter === "completed" ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-white/10 rounded-[20px]">
          <Clock className="w-8 h-8 text-white/20 mx-auto mb-2" />
          <p className="font-sans text-xs text-white/40 font-semibold">No milestones found in this filter.</p>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 border-l border-white/10 space-y-6 ml-3">
          {filteredTasks.map((task, idx) => {
            const isOverdue = new Date(task.deadline).getTime() < Date.now() && !task.completed;
            const isSoon = !task.completed && (new Date(task.deadline).getTime() - Date.now() < 6 * 60 * 60 * 1000);

            return (
              <div key={task.id} className="relative group">
                {/* Node marker */}
                <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 flex items-center justify-center">
                  {task.completed ? (
                    <div className="w-5 h-5 rounded-full bg-[#34D399] flex items-center justify-center ring-4 ring-[#0F1115]">
                      <CheckCircle className="w-3.5 h-3.5 text-black" />
                    </div>
                  ) : isOverdue ? (
                    <div className="w-5 h-5 rounded-full bg-[#FF6B6B] flex items-center justify-center ring-4 ring-[#0F1115] animate-pulse">
                      <AlertCircle className="w-3.5 h-3.5 text-white" />
                    </div>
                  ) : isSoon ? (
                    <div className="w-5 h-5 rounded-full bg-[#FF6B6B] flex items-center justify-center ring-4 ring-[#0F1115] animate-pulse">
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-[#5B8CFF]/20 border-2 border-[#5B8CFF] flex items-center justify-center ring-4 ring-[#0F1115]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#5B8CFF]" />
                    </div>
                  )}
                </div>

                {/* Timeline Card */}
                <div className="p-4 rounded-[20px] border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white/5 rounded-xl shrink-0 mt-0.5 border border-white/10">
                      <CategoryIcon category={task.category} className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className={`font-display font-black text-sm text-white ${task.completed ? "line-through text-white/40" : ""}`}>
                        {task.title}
                      </h4>
                      <p className="font-sans text-[10px] text-white/40 mt-1 font-semibold">
                        Due: {new Date(task.deadline).toLocaleString()} | Category: <span className="text-[#5B8CFF] font-bold">{task.category}</span>
                      </p>
                    </div>
                  </div>

                  {/* Status pills */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <span className="text-[10px] font-mono bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-white/70">
                      {getRelativeTimeLabel(task.deadline)}
                    </span>

                    {task.completed ? (
                      <span className="text-[9px] font-mono uppercase bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/20 px-2.5 py-1 rounded-full font-bold">
                        Completed
                      </span>
                    ) : isOverdue ? (
                      <span className="text-[9px] font-mono uppercase bg-[#FF6B6B]/10 text-[#FF6B6B] border border-[#FF6B6B]/20 px-2.5 py-1 rounded-full font-bold">
                        Overdue
                      </span>
                    ) : isSoon ? (
                      <span className="text-[9px] font-mono uppercase bg-[#FF6B6B]/20 text-[#FF6B6B] px-2.5 py-1 rounded-full font-bold animate-pulse">
                        Rescue Mode Ready
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono uppercase bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/20 px-2.5 py-1 rounded-full">
                        Guarded
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
