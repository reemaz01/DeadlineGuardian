import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  Flame,
  Plus,
  Search,
  Filter,
  Sparkles,
  Layers,
  CalendarRange,
  Calendar,
  Award,
  Volume2,
  Trash2,
  RotateCcw,
  Bell,
  HelpCircle,
  Clock,
  Sun,
  Moon,
} from "lucide-react";
import { Task, TaskCategory } from "./types";
import TaskCard from "./components/TaskCard";
import Dashboard from "./components/Dashboard";
import SmartScheduler from "./components/SmartScheduler";
import TimelineView from "./components/TimelineView";
import AchievementBadges from "./components/AchievementBadges";
import FocusTimer from "./components/FocusTimer";
import VoiceAssistant from "./components/VoiceAssistant";
import ChatBot from "./components/ChatBot";
import HabitTracker from "./components/HabitTracker";
import PlannerPanel from "./components/PlannerPanel";

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [streak, setStreak] = useState(3); // Prepopulate default streak for motivation
  
  // Navigation & filters
  const [currentSection, setCurrentSection] = useState<"tasks" | "scheduler" | "timeline" | "analytics" | "focus" | "habits" | "plans">("tasks");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | "All">("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "Completed" | "High Risk" | "Overdue">("All");

  // Appearance Theme state
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("deadline_guardian_theme") as "dark" | "light") || "dark";
  });

  // Theme synchronization with DOM
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("theme-light");
    } else {
      root.classList.remove("theme-light");
    }
  }, [theme]);

  // Manual Form Adder State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<TaskCategory>("Assignment");
  const [newDeadline, setNewDeadline] = useState("");

  // Notification permission states
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifiedThresholds, setNotifiedThresholds] = useState<Record<string, string[]>>({});

  // 1. Initial hydration & prepopulation
  useEffect(() => {
    const savedTasks = localStorage.getItem("deadline_guardian_tasks");
    const savedStreak = localStorage.getItem("deadline_guardian_streak");
    
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    } else {
      // Prepopulate default tasks for excellent initial experience
      const defaultTasks: Task[] = [
        {
          id: "task-1",
          title: "Physics Lab Simulation Report Submission",
          deadline: new Date(Date.now() + 1.5 * 60 * 60 * 1000).toISOString(), // 1.5 hours remaining
          category: "Assignment",
          progress: 25,
          creationDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          lastUpdated: new Date().toISOString(),
          completed: false,
          riskScore: 90,
          status: "HIGH RISK",
          reason: "Less than 2 hours left before deadline locks. Emergency rescue is advised.",
          suggestedAction: "Run AI Rescue Mode to structure micro-steps immediately.",
          procrastinationScore: 82,
          procrastinationWarning: "You added this assignment 3 days ago but have only reached 25% progress.",
          procrastinationQuickAction: "Open your formula sheet and structure the first paragraph now.",
          aiPlan: null,
          rescuePlan: null,
        },
        {
          id: "task-2",
          title: "Pitch Deck Review & Sync with Google Mentors",
          deadline: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // ~25 hours remaining
          category: "Meeting",
          progress: 50,
          creationDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          lastUpdated: new Date().toISOString(),
          completed: false,
          riskScore: 45,
          status: "ON TRACK",
          reason: "Sufficient buffers remain. Keep steady momentum.",
          suggestedAction: "Draft outline points before entering the sync.",
          procrastinationScore: 20,
          procrastinationWarning: "No immediate procrastination risk flagged.",
          procrastinationQuickAction: "List 3 core questions you want to ask your mentor.",
          aiPlan: null,
          rescuePlan: null,
        },
        {
          id: "task-3",
          title: "SaaS Database Invoicing & AWS Bill Sync",
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days remaining
          category: "Bill",
          progress: 100,
          creationDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          lastUpdated: new Date().toISOString(),
          completed: true,
          riskScore: 0,
          status: "ON TRACK",
          reason: "Task completed securely.",
          suggestedAction: "None. Rest up!",
          procrastinationScore: 0,
          procrastinationWarning: "",
          procrastinationQuickAction: "",
          aiPlan: null,
          rescuePlan: null,
        },
      ];
      setTasks(defaultTasks);
      localStorage.setItem("deadline_guardian_tasks", JSON.stringify(defaultTasks));
    }

    if (savedStreak) {
      setStreak(parseInt(savedStreak, 10));
    }

    // Ask for notification permission early
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  // Sync to local storage
  const saveTasksToStore = (newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem("deadline_guardian_tasks", JSON.stringify(newTasks));
  };

  const saveStreakToStore = (newStreak: number) => {
    setStreak(newStreak);
    localStorage.setItem("deadline_guardian_streak", String(newStreak));
  };

  // 2. Request Notifications Permission
  const enableNotifications = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        // Welcome notification
        new Notification("Deadline Guardian AI Enabled", {
          body: "We are now actively watching your deadlines to protect your score!",
          icon: "/favicon.ico",
        });
      }
    } else {
      alert("Browser push notifications are not supported by this platform.");
    }
  };

  // 3. Periodic Deadline Risk calculations & automated notifications checker
  useEffect(() => {
    const checker = setInterval(() => {
      const now = Date.now();
      let updatedSomeTasks = false;

      const updatedTasks = tasks.map((task) => {
        if (task.completed) return task;

        const deadlineTime = new Date(task.deadline).getTime();
        const diffMs = deadlineTime - now;
        const diffHours = diffMs / (1000 * 60 * 60);

        let newStatus: "ON TRACK" | "HIGH RISK" | "MISSED DEADLINE" = "ON TRACK";
        if (diffMs <= 0) {
          newStatus = "MISSED DEADLINE";
        } else if (diffHours < 6) {
          newStatus = "HIGH RISK";
        }

        // Check if status changed
        let statusChanged = task.status !== newStatus;
        if (statusChanged) {
          updatedSomeTasks = true;
        }

        // Notification thresholds check (24h, 6h, 2h, 30m)
        const taskNotifieds = notifiedThresholds[task.id] || [];
        const thresholdsToCheck = [
          { key: "24h", val: 24 },
          { key: "6h", val: 6 },
          { key: "2h", val: 2 },
          { key: "30m", val: 0.5 },
        ];

        thresholdsToCheck.forEach(({ key, val }) => {
          if (diffHours > 0 && diffHours <= val && !taskNotifieds.includes(key)) {
            // Trigger browser notification
            if (notificationsEnabled) {
              new Notification(`⚠️ Deadline Guardian Warning`, {
                body: `"${task.title}" is due in less than ${key}! Take action immediately.`,
              });
            }

            // Trigger Speech Synthesis
            if ("speechSynthesis" in window) {
              const speakText = `Heads up! Your ${task.category} task: ${task.title}, is due in less than ${key === "30m" ? "thirty minutes" : key}. Take action now.`;
              const utterance = new SpeechSynthesisUtterance(speakText);
              window.speechSynthesis.speak(utterance);
            }

            taskNotifieds.push(key);
            setNotifiedThresholds((prev) => ({
              ...prev,
              [task.id]: taskNotifieds,
            }));
          }
        });

        return {
          ...task,
          status: newStatus,
        };
      });

      if (updatedSomeTasks) {
        saveTasksToStore(updatedTasks);
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(checker);
  }, [tasks, notificationsEnabled, notifiedThresholds]);

  // 4. Create Task Callback
  const handleCreateTask = (title: string, category: TaskCategory, deadline: string) => {
    const isUnder2Hours = (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60) < 2;

    const newTask: Task = {
      id: "task-" + Date.now(),
      title,
      category,
      deadline,
      progress: 0,
      creationDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      completed: false,
      riskScore: isUnder2Hours ? 95 : 20,
      status: isUnder2Hours ? "HIGH RISK" : "ON TRACK",
      reason: isUnder2Hours
        ? "Deadline is in critical immediate zone. Activates emergency protocols."
        : "Standard tracking activated. Time buffers are green.",
      suggestedAction: isUnder2Hours ? "Run AI Rescue Mode immediately." : "Generate AI Planner schedule.",
      procrastinationScore: 0,
      procrastinationWarning: "Newly registered. No procrastination history yet.",
      procrastinationQuickAction: "Set up the workspace and spend 2 minutes outlining.",
      aiPlan: null,
      rescuePlan: null,
    };

    const updated = [newTask, ...tasks];
    saveTasksToStore(updated);

    // Increase streak upon adding task on active days
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem("deadline_guardian_last_add_date");
    if (lastDate !== today) {
      saveStreakToStore(streak + 1);
      localStorage.setItem("deadline_guardian_last_add_date", today);
    }
  };

  // Form submit handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDeadline) return;

    handleCreateTask(newTitle.trim(), newCategory, new Date(newDeadline).toISOString());
    setNewTitle("");
    setNewDeadline("");
    setIsFormOpen(false);
  };

  // Update single task
  const handleUpdateTask = (updatedTask: Task) => {
    const updated = tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    saveTasksToStore(updated);
  };

  // Delete task
  const handleDeleteTask = (id: string) => {
    const filtered = tasks.filter((t) => t.id !== id);
    saveTasksToStore(filtered);
  };

  // Voice Assistant create callback
  const handleVoiceTaskCreated = (parsed: { title: string; category: TaskCategory; deadline: string }) => {
    handleCreateTask(parsed.title, parsed.category, parsed.deadline);
  };

  // Export PDF layout by utilizing native print triggers formatted cleanly
  const handleExportPDF = () => {
    window.print();
  };

  // Filtering calculation logic
  const filteredTasksList = tasks.filter((task) => {
    // 1. Search Query
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 2. Category
    const matchesCategory = categoryFilter === "All" || task.category === categoryFilter;

    // 3. Status filter mapping
    let matchesStatus = true;
    if (statusFilter === "Pending") matchesStatus = !task.completed;
    else if (statusFilter === "Completed") matchesStatus = task.completed;
    else if (statusFilter === "High Risk") matchesStatus = task.status === "HIGH RISK" && !task.completed;
    else if (statusFilter === "Overdue") {
      matchesStatus = new Date(task.deadline).getTime() < Date.now() && !task.completed;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#0F1115] text-white selection:bg-[#5B8CFF] selection:text-black font-sans relative pb-16 antialiased">
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-[#5B8CFF]/10 to-[#A855F7]/10 rounded-full blur-3xl -z-20 pointer-events-none" />

      {/* Sticky Navigation bar */}
      <header className="sticky top-0 z-40 bg-[#0F1115]/80 backdrop-blur-md border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* App Branding */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-gradient-to-tr from-[#5B8CFF] to-[#A855F7] rounded-xl flex items-center justify-center shadow-lg shadow-[#5B8CFF]/20">
              <ShieldAlert className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="font-display font-black text-xl tracking-tight uppercase text-white leading-none">
                Deadline <span className="text-[#5B8CFF]">Guardian</span>
              </h1>
              <span className="text-[9px] font-mono tracking-widest text-[#A855F7] uppercase font-bold">THE LAST-MINUTE LIFE SAVER</span>
            </div>
          </div>

          {/* Quick Stats overview */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Streak counter */}
            <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full px-3.5 py-1">
              <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
              <span className="text-xs font-mono font-black text-orange-400">{streak} Day Streak</span>
            </div>

            {/* Notification alert activator */}
            <button
              onClick={enableNotifications}
              className={`flex items-center gap-1.5 text-xs font-sans px-3.5 py-1 rounded-full border transition-all ${
                notificationsEnabled
                  ? "bg-[#34D399]/10 text-[#34D399] border-[#34D399]/20 font-bold"
                  : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 font-semibold"
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{notificationsEnabled ? "Notifiers Live" : "Enable Alerts"}</span>
            </button>

            {/* Appearance Theme Toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center justify-center p-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all active:scale-95"
              title="Toggle Light/Dark Theme"
              aria-label="Toggle Light/Dark Theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-yellow-400 animate-spin-slow" />
              ) : (
                <Moon className="w-4 h-4 text-[#5B8CFF]" />
              )}
            </button>

            {/* Quick Add Form trigger */}
            <button
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#5B8CFF] hover:bg-[#5B8CFF]/90 text-white rounded-xl text-xs font-sans font-bold transition-all active:scale-95 shadow-md shadow-[#5B8CFF]/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Navigation / Control Sidebar Panel */}
        <div className="md:col-span-1 space-y-6">
          <div className="p-6 rounded-[32px] border border-white/10 bg-white/5 shadow-xl">
            <span className="block text-[10px] font-mono text-white/40 uppercase tracking-widest mb-4 font-bold">Command Deck</span>
            
            <nav className="space-y-1">
              <button
                onClick={() => setCurrentSection("tasks")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-display font-black uppercase tracking-wider text-left transition-all ${
                  currentSection === "tasks"
                    ? "bg-[#5B8CFF]/20 text-[#5B8CFF] border border-[#5B8CFF]/30"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Dashboard & Tasks</span>
              </button>

              <button
                onClick={() => setCurrentSection("plans")}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-display font-black uppercase tracking-wider text-left transition-all ${
                  currentSection === "plans"
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>AI Roadmaps</span>
                </div>
                <span className="text-[10px] font-mono font-black bg-purple-500/25 px-2 py-0.5 rounded-full text-purple-300">
                  {tasks.filter((t) => t.aiPlan).length}
                </span>
              </button>

              <button
                onClick={() => setCurrentSection("scheduler")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-display font-black uppercase tracking-wider text-left transition-all ${
                  currentSection === "scheduler"
                    ? "bg-[#5B8CFF]/20 text-[#5B8CFF] border border-[#5B8CFF]/30"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <CalendarRange className="w-4 h-4" />
                <span>Smart AI Scheduler</span>
              </button>

              <button
                onClick={() => setCurrentSection("timeline")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-display font-black uppercase tracking-wider text-left transition-all ${
                  currentSection === "timeline"
                    ? "bg-[#5B8CFF]/20 text-[#5B8CFF] border border-[#5B8CFF]/30"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Milestone Timeline</span>
              </button>

              <button
                onClick={() => setCurrentSection("analytics")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-display font-black uppercase tracking-wider text-left transition-all ${
                  currentSection === "analytics"
                    ? "bg-[#5B8CFF]/20 text-[#5B8CFF] border border-[#5B8CFF]/30"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Gamified Achievements</span>
              </button>

              <button
                onClick={() => setCurrentSection("focus")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-display font-black uppercase tracking-wider text-left transition-all ${
                  currentSection === "focus"
                    ? "bg-[#5B8CFF]/20 text-[#5B8CFF] border border-[#5B8CFF]/30"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Focus Pomodoro</span>
              </button>

              <button
                onClick={() => setCurrentSection("habits")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-display font-black uppercase tracking-wider text-left transition-all ${
                  currentSection === "habits"
                    ? "bg-[#5B8CFF]/20 text-[#5B8CFF] border border-[#5B8CFF]/30"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Flame className="w-4 h-4 animate-pulse text-orange-400" />
                <span>Daily Habit Tracker</span>
              </button>
            </nav>
          </div>

          {/* Quick Voice Assistant Widget */}
          <VoiceAssistant tasks={tasks} onTaskCreated={handleVoiceTaskCreated} />
        </div>

        {/* Dynamic Screen routing content */}
        <div className="md:col-span-3 space-y-8">
          
          {/* Quick Task creation popup modal */}
          {isFormOpen && (
            <div className="p-6 rounded-3xl bg-neutral-900 border border-[#5B8CFF]/30 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h3 className="font-sans font-black text-sm text-white flex items-center gap-1.5">
                  <Sparkles className="w-4.5 h-4.5 text-yellow-300 animate-pulse" />
                  <span>Enlist New Guarded Deadline</span>
                </h3>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="text-white/40 hover:text-white text-xs"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="space-y-1">
                    <label htmlFor="task-title" className="block text-[10px] uppercase font-mono text-white/50">Task Title</label>
                    <input
                      id="task-title"
                      type="text"
                      required
                      placeholder="e.g. Physics Final Lab Simulation"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5B8CFF]"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1">
                    <label htmlFor="task-category" className="block text-[10px] uppercase font-mono text-white/50">Category</label>
                    <select
                      id="task-category"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as TaskCategory)}
                      className="w-full bg-[#1A1C20] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5B8CFF]"
                    >
                      <option value="Assignment">Assignment</option>
                      <option value="Meeting">Meeting</option>
                      <option value="Interview">Interview</option>
                      <option value="Bill">Bill</option>
                      <option value="Personal">Personal</option>
                      <option value="General">General</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Deadline date selection */}
                  <div className="space-y-1 md:col-span-2">
                    <label htmlFor="task-deadline" className="block text-[10px] uppercase font-mono text-white/50">Target Deadline (Date & Time)</label>
                    <input
                      id="task-deadline"
                      type="datetime-local"
                      required
                      value={newDeadline}
                      onChange={(e) => setNewDeadline(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5B8CFF]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#5B8CFF] hover:bg-[#5B8CFF]/95 text-white font-sans font-bold text-xs"
                  >
                    Guard Task
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECTION 1: Tasks Dashboard & Interactive Board */}
          {currentSection === "tasks" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              
              {/* Analytics Summary */}
              <Dashboard 
                tasks={tasks} 
                streak={streak} 
                onExportPDF={handleExportPDF} 
                onNavigateToHabits={() => setCurrentSection("habits")} 
              />

              {/* Task search and filter panel */}
              <div className="p-5 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md flex flex-col md:flex-row items-center gap-4">
                
                {/* Search */}
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#5B8CFF]"
                  />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                  
                  {/* Category filter dropdown */}
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as any)}
                    aria-label="Filter by category"
                    className="bg-[#1C1F26] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white/80 focus:outline-none focus:border-[#5B8CFF]"
                  >
                    <option value="All">All Categories</option>
                    <option value="Assignment">Assignment</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Interview">Interview</option>
                    <option value="Bill">Bill</option>
                    <option value="Personal">Personal</option>
                    <option value="General">General</option>
                    <option value="Other">Other</option>
                  </select>

                  {/* Status filter dropdown */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    aria-label="Filter by status"
                    className="bg-[#1C1F26] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white/80 focus:outline-none focus:border-[#5B8CFF]"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="High Risk">High Risk</option>
                    <option value="Overdue">Overdue</option>
                  </select>

                  {/* Reset Filters button */}
                  {(searchQuery || categoryFilter !== "All" || statusFilter !== "All") && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setCategoryFilter("All");
                        setStatusFilter("All");
                      }}
                      className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/50 hover:text-white"
                      title="Clear Filters"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Grid Board of task cards */}
              <div className="space-y-8">
                {filteredTasksList.length === 0 ? (
                  <div>
                    <h3 className="font-sans font-bold text-sm text-white/80 uppercase tracking-wider mb-4">Guarded Deadlines Ledger</h3>
                    <div className="text-center py-16 border border-dashed border-white/10 rounded-3xl">
                      <Layers className="w-12 h-12 text-white/10 mx-auto mb-3 animate-pulse" />
                      <h4 className="font-sans font-bold text-sm text-white mb-1">No Guarded Tasks Found</h4>
                      <p className="font-sans text-xs text-white/40 max-w-sm mx-auto">
                        Adjust your filter inputs above, dictate a voice command, or add a task manually using the button in the header.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const activeTasks = statusFilter === "All" 
                        ? filteredTasksList.filter((t) => !t.completed)
                        : statusFilter === "Completed" ? [] : filteredTasksList;

                      const completedTasks = statusFilter === "All"
                        ? filteredTasksList.filter((t) => t.completed)
                        : statusFilter === "Completed" ? filteredTasksList : [];

                      return (
                        <>
                          {/* Active Section */}
                          {activeTasks.length > 0 && (
                            <div>
                              <h3 className="font-sans font-bold text-xs text-white/60 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#5B8CFF] animate-pulse" />
                                <span>Active Guarded Deadlines ({activeTasks.length})</span>
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {activeTasks.map((task) => (
                                  <TaskCard
                                    key={task.id}
                                    task={task}
                                    onUpdateTask={handleUpdateTask}
                                    onDeleteTask={handleDeleteTask}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Completed Section */}
                          {completedTasks.length > 0 && (
                            <div className="pt-4 border-t border-white/5">
                              <h3 className="font-sans font-bold text-xs text-[#34D399] uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#34D399]" />
                                <span>Completed Tasks & History ({completedTasks.length})</span>
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-85 hover:opacity-100 transition-opacity">
                                {completedTasks.map((task) => (
                                  <TaskCard
                                    key={task.id}
                                    task={task}
                                    onUpdateTask={handleUpdateTask}
                                    onDeleteTask={handleDeleteTask}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          )}

          {/* SECTION 2: Smart AI Scheduler */}
          {currentSection === "scheduler" && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <SmartScheduler tasks={tasks} />
            </div>
          )}

          {/* SECTION 3: Milestone Chronological Timeline */}
          {currentSection === "timeline" && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <TimelineView tasks={tasks} />
            </div>
          )}

          {/* SECTION 4: Gamified Achievements */}
          {currentSection === "analytics" && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <AchievementBadges tasks={tasks} streak={streak} />
            </div>
          )}

          {/* SECTION 5: Pomodoro Focus clock */}
          {currentSection === "focus" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 max-w-xl mx-auto">
              <FocusTimer />
            </div>
          )}

          {/* SECTION 6: Habit Tracker */}
          {currentSection === "habits" && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <HabitTracker onStreakUpdate={saveStreakToStore} externalStreak={streak} />
            </div>
          )}

          {/* SECTION 7: Centralized AI Roadmaps & Plans */}
          {currentSection === "plans" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div className="p-6 rounded-[32px] border border-white/10 bg-white/5 shadow-xl">
                <div className="flex items-center justify-between flex-wrap gap-4 mb-6 pb-4 border-b border-white/5">
                  <div>
                    <h3 className="font-sans font-black text-lg text-white uppercase flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      <span>Generated AI Roadmaps</span>
                    </h3>
                    <p className="text-xs text-white/40">Your central Command Deck workspace containing all custom-generated high-precision checklists.</p>
                  </div>
                  <span className="text-xs font-mono bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full border border-purple-500/20 font-black uppercase">
                    {tasks.filter((t) => t.aiPlan).length} Active Blueprints
                  </span>
                </div>

                {tasks.filter((t) => t.aiPlan).length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-white/10 rounded-3xl">
                    <Sparkles className="w-12 h-12 text-white/10 mx-auto mb-3 animate-pulse" />
                    <h4 className="font-sans font-bold text-sm text-white mb-1">No AI Roadmaps Crafted Yet</h4>
                    <p className="font-sans text-xs text-white/40 max-w-sm mx-auto mb-6">
                      Go to the Dashboard, choose any target task, and click "Generate Plan" to build a customized, highly granular timeline.
                    </p>
                    <button
                      onClick={() => setCurrentSection("tasks")}
                      className="px-5 py-2 bg-[#5B8CFF] hover:bg-[#5B8CFF]/90 text-white rounded-xl text-xs font-sans font-bold transition-all active:scale-95 shadow-md shadow-[#5B8CFF]/20"
                    >
                      Go to Dashboard
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {tasks.filter((t) => t.aiPlan).map((task) => (
                      <div key={task.id} className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-white/5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono bg-[#5B8CFF]/15 text-[#5B8CFF] border border-[#5B8CFF]/20 px-2 py-0.5 rounded-full font-bold uppercase">
                              {task.category}
                            </span>
                            <span className="text-xs font-bold text-white">{task.title}</span>
                          </div>
                          <button
                            onClick={() => {
                              setCurrentSection("tasks");
                            }}
                            className="text-[10px] font-mono text-[#5B8CFF] hover:underline uppercase font-bold"
                          >
                            Manage on Taskboard &rarr;
                          </button>
                        </div>
                        <PlannerPanel task={task} onUpdateTask={handleUpdateTask} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Floating AI chat bubble */}
      <ChatBot tasks={tasks} />
    </div>
  );
}
