export type TaskCategory =
  | "Assignment"
  | "Meeting"
  | "Interview"
  | "Bill"
  | "Personal"
  | "General"
  | "Other";

export interface MicroStep {
  step: string;
  duration: string;
}

export interface AIPlan {
  estimated_completion_time: string;
  priority: string;
  urgency_score: number;
  recommended_start_time: string;
  micro_steps: MicroStep[];
  summary: string;
  motivation_tip: string;
}

export interface EmergencyTimeline {
  time: string;
  action: string;
  priority: string;
}

export interface ExactTimeBlock {
  block: string;
  duration: string;
  task: string;
}

export interface RescuePlan {
  emergency_timeline: EmergencyTimeline[];
  exact_time_blocks: ExactTimeBlock[];
  what_to_skip: string[];
  minimum_viable_submission: string;
  survival_tips: string[];
}

export interface Task {
  id: string;
  title: string;
  deadline: string; // ISO String
  category: TaskCategory;
  progress: number; // 0 to 100
  creationDate: string; // ISO String
  lastUpdated: string; // ISO String
  completed: boolean;
  
  // Risk Analysis fields
  riskScore: number; // 0 - 100
  status: "ON TRACK" | "HIGH RISK" | "MISSED DEADLINE";
  reason: string;
  suggestedAction: string;

  // Procrastination detector fields
  procrastinationScore: number;
  procrastinationWarning: string;
  procrastinationQuickAction: string;

  // AI-generated results
  aiPlan: AIPlan | null;
  rescuePlan: RescuePlan | null;
}

export interface HabitHistory {
  date: string; // YYYY-MM-DD
  completedTasksCount: number;
  productivityScore: number; // calculated day score
}

export interface HabitStats {
  completedTodayCount: number;
  streak: number;
  lastCompletedDate: string | null;
  weeklyHistory: HabitHistory[];
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface ScheduledTaskSlot {
  taskId: string;
  title: string;
  slot: string;
  duration: string;
}

export interface RankedTask {
  id: string;
  title: string;
  reason: string;
}

export interface SmartScheduleResult {
  ranked_tasks: RankedTask[];
  scheduled_slots: ScheduledTaskSlot[];
  predicted_workload: string;
  schedule_health: "Good" | "Tight" | "Critical";
  health_reason: string;
}
