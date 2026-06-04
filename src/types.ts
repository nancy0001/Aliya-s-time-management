export type MaslowLevelKey = "physiology" | "safety" | "love" | "esteem" | "selfActualization";

export interface MaslowLevelConfig {
  key: MaslowLevelKey;
  name: string;
  description: string;
}

export interface Goal {
  id: string;
  level: MaslowLevelKey;
  title: string;
  targetValue: number;
  unit: string;
  weeklyTarget: number;
  active: boolean;
}

export interface DailyLog {
  date: string;
  sleepHours: number;
  exerciseMinutes: number;
  focusMinutes: number;
  socialScore: number;
  outputScore: number;
  moodScore: number;
}

export interface EnvironmentFactor {
  id: string;
  category: "person" | "place" | "tool" | "information";
  name: string;
  impact: "positive" | "negative";
  rule: string;
}

export interface WeeklyReview {
  weekOf: string;
  wins: string;
  blockers: string;
  nextAction: string;
}

export interface LifeSystemState {
  profileName: string;
  goals: Goal[];
  logs: DailyLog[];
  environment: EnvironmentFactor[];
  reviews: WeeklyReview[];
}
