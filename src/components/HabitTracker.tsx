import React, { useState, useEffect } from "react";
import { 
  Flame, 
  Check, 
  Plus, 
  Trash2, 
  Award, 
  Sparkles, 
  Trophy, 
  TrendingUp, 
  Calendar,
  Zap,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface Habit {
  id: string;
  title: string;
  category: string;
  completedDays: { [dateStr: string]: boolean }; // YYYY-MM-DD -> boolean
  createdAt: string;
}

interface HabitTrackerProps {
  onStreakUpdate: (newStreak: number) => void;
  externalStreak: number;
}

export default function HabitTracker({ onStreakUpdate, externalStreak }: HabitTrackerProps) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Focus");
  const [showMilestoneAlert, setShowMilestoneAlert] = useState<number | null>(null);
  const [bonusPoints, setBonusPoints] = useState<number>(0);

  // Get date string helper
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const todayStr = getTodayStr();

  // Load from local storage
  useEffect(() => {
    const savedHabits = localStorage.getItem("deadline_guardian_habits");
    const savedBonus = localStorage.getItem("deadline_guardian_habit_bonus");

    if (savedHabits) {
      setHabits(JSON.parse(savedHabits));
    } else {
      // Default initial high-impact habits
      const defaults: Habit[] = [
        {
          id: "habit-1",
          title: "Focus Sprint (Complete 25m Pomodoro)",
          category: "Focus",
          completedDays: {
            [getRelativeDateStr(-2)]: true,
            [getRelativeDateStr(-1)]: true,
          },
          createdAt: new Date().toISOString(),
        },
        {
          id: "habit-2",
          title: "Triage Plan (Review AI schedules)",
          category: "Planning",
          completedDays: {
            [getRelativeDateStr(-2)]: true,
            [getRelativeDateStr(-1)]: true,
          },
          createdAt: new Date().toISOString(),
        },
        {
          id: "habit-3",
          title: "No Procrastination (Act before alarm)",
          category: "Discipline",
          completedDays: {
            [getRelativeDateStr(-2)]: true,
            [getRelativeDateStr(-1)]: true,
          },
          createdAt: new Date().toISOString(),
        },
        {
          id: "habit-4",
          title: "Hydration Check (Drink 1L water)",
          category: "Wellness",
          completedDays: {
            [getRelativeDateStr(-2)]: true,
            [getRelativeDateStr(-1)]: false,
          },
          createdAt: new Date().toISOString(),
        },
      ];
      setHabits(defaults);
      localStorage.setItem("deadline_guardian_habits", JSON.stringify(defaults));
    }

    if (savedBonus) {
      setBonusPoints(parseInt(savedBonus, 10));
    }
  }, []);

  // Helper to get relative date string (e.g. -1 for yesterday)
  function getRelativeDateStr(offset: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // Calculate global consecutive completion streak
  const calculateStreak = (currentHabits: Habit[]) => {
    if (currentHabits.length === 0) return 0;

    let tempStreak = 0;
    let checkOffset = 0;
    let continues = true;

    // We check backwards starting from today or yesterday
    // First, let's see if there is ANY completion today
    const completedToday = currentHabits.some(h => h.completedDays[getRelativeDateStr(0)]);
    const completedYesterday = currentHabits.some(h => h.completedDays[getRelativeDateStr(-1)]);

    if (!completedToday && !completedYesterday) {
      return 0;
    }

    // Start checking from today if any is completed, otherwise from yesterday
    if (completedToday) {
      checkOffset = 0;
    } else {
      checkOffset = -1;
    }

    while (continues) {
      const dateStr = getRelativeDateStr(checkOffset);
      const anyCompletedOnDate = currentHabits.some(h => h.completedDays[dateStr]);

      if (anyCompletedOnDate) {
        tempStreak++;
        checkOffset--;
      } else {
        continues = false;
      }
    }

    return tempStreak;
  };

  const saveHabits = (updatedHabits: Habit[]) => {
    setHabits(updatedHabits);
    localStorage.setItem("deadline_guardian_habits", JSON.stringify(updatedHabits));

    // Calculate and trigger streak update
    const newStreak = calculateStreak(updatedHabits);
    onStreakUpdate(newStreak);

    // Check if new streak reached a milestone
    if (newStreak > externalStreak) {
      if (newStreak === 3) {
        triggerMilestone(3, 150);
      } else if (newStreak === 7) {
        triggerMilestone(7, 400);
      }
    }
  };

  const triggerMilestone = (milestone: number, bonus: number) => {
    setShowMilestoneAlert(milestone);
    const updatedBonus = bonusPoints + bonus;
    setBonusPoints(updatedBonus);
    localStorage.setItem("deadline_guardian_habit_bonus", String(updatedBonus));
  };

  // Check/Uncheck habit for today
  const toggleHabitToday = (habitId: string) => {
    const updated = habits.map(h => {
      if (h.id === habitId) {
        const isCompleted = !h.completedDays[todayStr];
        return {
          ...h,
          completedDays: {
            ...h.completedDays,
            [todayStr]: isCompleted
          }
        };
      }
      return h;
    });
    saveHabits(updated);
  };

  // Add new habit
  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newHabit: Habit = {
      id: "habit-" + Date.now(),
      title: newTitle.trim(),
      category: newCategory,
      completedDays: {},
      createdAt: new Date().toISOString()
    };

    saveHabits([...habits, newHabit]);
    setNewTitle("");
  };

  // Delete habit
  const handleDeleteHabit = (id: string) => {
    const filtered = habits.filter(h => h.id !== id);
    saveHabits(filtered);
  };

  // Stats calculation
  const totalHabits = habits.length;
  const completedTodayCount = habits.filter(h => h.completedDays[todayStr]).length;
  const todayProgressPercent = totalHabits > 0 ? Math.round((completedTodayCount / totalHabits) * 100) : 0;

  // Past 5 days list for visual heat map/tracker
  const pastDays = [4, 3, 2, 1, 0].map(offset => {
    const dateStr = getRelativeDateStr(-offset);
    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() - offset);
    
    const label = offset === 0 ? "Today" : offset === 1 ? "Yest" : dateObj.toLocaleDateString([], { weekday: 'short' });
    const countCompleted = habits.filter(h => h.completedDays[dateStr]).length;
    
    return {
      dateStr,
      label,
      countCompleted,
      allCompleted: totalHabits > 0 && countCompleted === totalHabits,
      anyCompleted: countCompleted > 0
    };
  });

  return (
    <div id="habit-tracker-panel" className="space-y-6">
      
      {/* Milestone celebration overlay */}
      <AnimatePresence>
        {showMilestoneAlert && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative max-w-md w-full bg-[#181B22] border-2 border-orange-500/50 p-8 rounded-[40px] shadow-2xl text-center overflow-hidden"
            >
              {/* Sparkle burst decoration */}
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
              </div>

              <div className="relative z-10 space-y-6">
                <div className="w-20 h-20 bg-orange-500/20 border border-orange-500/30 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <Flame className="w-10 h-10 text-orange-400" />
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-orange-400 font-extrabold">Streak Milestone Achieved!</span>
                  <h3 className="font-display font-black text-2xl text-white uppercase">{showMilestoneAlert} Day Habit Streak!</h3>
                  <p className="text-white/60 text-xs max-w-xs mx-auto leading-relaxed">
                    Unstoppable consistency! You have unlocked the exclusive streak booster and secured bonus productivity scores.
                  </p>
                </div>

                {/* Reward section */}
                <div className="py-4 px-6 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <span className="text-xs font-sans text-white/80 font-bold">Streak Bonus Reward</span>
                  </div>
                  <span className="font-mono text-sm font-black text-[#34D399]">
                    +{showMilestoneAlert === 3 ? "150" : "400"} XP / Points
                  </span>
                </div>

                <button
                  onClick={() => setShowMilestoneAlert(null)}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 text-white rounded-2xl text-xs font-sans font-black uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-lg shadow-orange-500/20"
                >
                  Claim Bonus Reward
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Habit Header Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Streak Stats Card */}
        <div className="p-6 rounded-[32px] border border-white/10 bg-gradient-to-br from-[#1A1E26] to-[#0F1115] md:col-span-1 relative overflow-hidden flex flex-col justify-between h-48 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl group-hover:scale-125 transition-all duration-500" />
          
          <div className="flex justify-between items-start">
            <div>
              <span className="block text-[10px] text-white/40 font-mono uppercase tracking-wider font-bold">Habit Streak</span>
              <h4 className="font-sans font-black text-xs text-white uppercase tracking-tight mt-1">Discipline Index</h4>
            </div>
            <div className="p-2.5 bg-orange-500/10 rounded-xl border border-orange-500/20 animate-pulse">
              <Flame className="w-5 h-5 text-orange-400" />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mt-4">
            <span className="font-mono text-5xl font-black text-orange-400 tracking-tight">{externalStreak}</span>
            <span className="text-xs font-sans text-white/40 font-bold">consecutive days</span>
          </div>

          <div className="text-[10px] font-sans text-white/50 bg-white/5 border border-white/5 py-1 px-3 rounded-full flex items-center gap-1.5 w-fit">
            <Info className="w-3.5 h-3.5 text-orange-400" />
            <span>Complete 1 habit daily to defend the streak!</span>
          </div>
        </div>

        {/* Today's Habit Progress Card */}
        <div className="p-6 rounded-[32px] border border-white/10 bg-gradient-to-br from-[#1A1E26] to-[#0F1115] md:col-span-1 relative overflow-hidden flex flex-col justify-between h-48 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#5B8CFF]/5 rounded-full blur-3xl group-hover:scale-125 transition-all duration-500" />
          
          <div className="flex justify-between items-start">
            <div>
              <span className="block text-[10px] text-white/40 font-mono uppercase tracking-wider font-bold">Today's Balance</span>
              <h4 className="font-sans font-black text-xs text-white uppercase tracking-tight mt-1">Completion rate</h4>
            </div>
            <div className="p-2.5 bg-[#5B8CFF]/10 rounded-xl border border-[#5B8CFF]/20">
              <TrendingUp className="w-5 h-5 text-[#5B8CFF]" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="font-mono text-3xl font-black text-[#5B8CFF]">{todayProgressPercent}%</span>
              <span className="text-[10px] font-mono text-white/40 font-bold">{completedTodayCount} / {totalHabits} Done</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#5B8CFF] to-[#A855F7] transition-all duration-500 rounded-full"
                style={{ width: `${todayProgressPercent}%` }}
              />
            </div>
          </div>

          <span className="text-[10px] font-sans text-white/40 font-semibold italic">
            {todayProgressPercent === 100 ? "Perfect day! Keep the engine hot." : "Complete all tasks to maximize score."}
          </span>
        </div>

        {/* Streak Bonuses Card */}
        <div className="p-6 rounded-[32px] border border-white/10 bg-gradient-to-br from-[#1A1E26] to-[#0F1115] md:col-span-1 relative overflow-hidden flex flex-col justify-between h-48 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full blur-3xl group-hover:scale-125 transition-all duration-500" />
          
          <div className="flex justify-between items-start">
            <div>
              <span className="block text-[10px] text-white/40 font-mono uppercase tracking-wider font-bold">Score Modifier</span>
              <h4 className="font-sans font-black text-xs text-white uppercase tracking-tight mt-1">Accumulated Rewards</h4>
            </div>
            <div className="p-2.5 bg-yellow-400/10 rounded-xl border border-yellow-400/20">
              <Award className="w-5 h-5 text-yellow-400" />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mt-4">
            <span className="font-mono text-4xl font-black text-yellow-400">+{bonusPoints}</span>
            <span className="text-xs font-sans text-white/40 font-bold">Bonus XP</span>
          </div>

          <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
            <span>3d (+150 XP) • 7d (+400 XP) milestones</span>
          </div>
        </div>
      </div>

      {/* Habits Checklist & Add Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Checklist */}
        <div className="lg:col-span-2 p-6 rounded-[32px] border border-white/10 bg-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="font-sans font-black text-sm text-white uppercase tracking-wider">Daily Habit Registry</h3>
            <span className="text-[10px] font-mono text-white/40 font-bold uppercase">{todayStr}</span>
          </div>

          {habits.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
              <Calendar className="w-10 h-10 text-white/10 mx-auto mb-2" />
              <h4 className="font-sans font-bold text-xs text-white">No habits enlisted</h4>
              <p className="font-sans text-[10px] text-white/40 max-w-xs mx-auto mt-1">
                Add a habit using the custom form on the right to start tracking your daily discipline score.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {habits.map((habit) => {
                const isCompletedToday = !!habit.completedDays[todayStr];
                return (
                  <div 
                    key={habit.id}
                    className={`p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4 ${
                      isCompletedToday 
                        ? "bg-[#34D399]/5 border-[#34D399]/20" 
                        : "bg-white/[0.02] border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Check trigger button */}
                      <button
                        onClick={() => toggleHabitToday(habit.id)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all border ${
                          isCompletedToday
                            ? "bg-[#34D399] border-[#34D399] text-black scale-105"
                            : "border-white/20 text-transparent hover:border-white/40"
                        }`}
                        title={isCompletedToday ? "Mark Incomplete" : "Mark Complete"}
                      >
                        <Check className="w-4 h-4 stroke-[3px]" />
                      </button>

                      <div>
                        <h4 className={`text-xs font-sans font-extrabold ${isCompletedToday ? "text-[#34D399] line-through" : "text-white"}`}>
                          {habit.title}
                        </h4>
                        <span className="text-[9px] font-mono text-white/40 uppercase font-semibold">{habit.category}</span>
                      </div>
                    </div>

                    {/* Right side controls / delete */}
                    <button
                      onClick={() => handleDeleteHabit(habit.id)}
                      className="p-1.5 hover:bg-red-400/15 text-white/30 hover:text-red-400 rounded-lg transition-all"
                      title="Remove Habit"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Add Habit Form & Calendar heatmap */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Add Habit form */}
          <div className="p-6 rounded-[32px] border border-white/10 bg-white/5 space-y-4">
            <h4 className="font-sans font-black text-xs text-white uppercase tracking-wider">Enlist Habit</h4>
            
            <form onSubmit={handleAddHabit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase text-white/40">Habit Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Read tech docs for 15m"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase text-white/40">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-[#1A1C20] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="Focus">Focus</option>
                  <option value="Planning">Planning</option>
                  <option value="Discipline">Discipline</option>
                  <option value="Wellness">Wellness</option>
                  <option value="Learning">Learning</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-gradient-to-r from-[#5B8CFF] to-[#A855F7] hover:brightness-110 text-white rounded-xl text-xs font-sans font-bold uppercase transition-all duration-200 active:scale-95"
              >
                Create Habit
              </button>
            </form>
          </div>

          {/* Past 5 Days History Grid */}
          <div className="p-6 rounded-[32px] border border-white/10 bg-white/5 space-y-4">
            <h4 className="font-sans font-black text-xs text-white uppercase tracking-wider">Defense History</h4>
            
            <div className="grid grid-cols-5 gap-2 text-center">
              {pastDays.map(day => (
                <div key={day.dateStr} className="space-y-1">
                  <span className="block text-[8px] font-mono text-white/40 uppercase">{day.label}</span>
                  <div 
                    className={`w-full aspect-square rounded-lg flex items-center justify-center border transition-all ${
                      day.allCompleted 
                        ? "bg-[#34D399]/20 border-[#34D399]/40 text-[#34D399]" 
                        : day.anyCompleted
                        ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
                        : "bg-white/[0.01] border-white/5 text-white/20"
                    }`}
                    title={`${day.countCompleted} habits completed`}
                  >
                    {day.anyCompleted ? (
                      <Flame className={`w-4 h-4 ${day.allCompleted ? "animate-pulse" : ""}`} />
                    ) : (
                      <span className="text-[9px] font-mono font-bold">-</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
