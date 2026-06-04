export type TimeCategory = "深度工作" | "沟通协作" | "学习成长" | "健康运动" | "生活事务" | "娱乐放松";
export type GoalCycle = "日度" | "周度" | "月度";
export type GoalPriority = "P0" | "P1" | "P2" | "P3" | "P4" | "P5";
export type GoalStatus = "未开始" | "进行中" | "已完成" | "暂停";
export type InvestSopSectionId = "preMarket" | "intraday" | "postMarket" | "rules";

export interface TimeEntry {
  id: string;
  date: string;
  category: TimeCategory;
  minutes: number;
  note: string;
}

export interface GoalTarget {
  id: string;
  taskName: string;
  cycle: GoalCycle;
  priority: GoalPriority;
  targetDesc: string;
  note: string;
  expectedMinutes?: number;
  deadline?: string;
  status?: GoalStatus;
  linkedCategory?: TimeCategory;
  reviewNote?: string;
}

export interface BucketPlan {
  targets: Record<TimeCategory, number>;
  notes: Record<TimeCategory, string>;
}

export interface BiWeekPlan {
  note: string;
}

export interface InvestSopItem {
  id: string;
  title: string;
  note: string;
  children?: { id: string; title: string }[];
}

export interface InvestSopSection {
  id: InvestSopSectionId;
  title: string;
  intro: string;
  notes: string;
  items: InvestSopItem[];
}

export interface MindNode {
  id: string;
  title: string;
  children: MindNode[];
}

export interface PeriodPlanState {
  goalTargets: GoalTarget[];
  weeklyPlansByBucket: Record<string, BucketPlan>;
  monthlyPlansByBucket: Record<string, BucketPlan>;
  biWeeklyPlansByBucket: Record<string, BiWeekPlan>;
  investSopByDate: Record<string, InvestSopSection[]>;
  investMindByDate: Record<string, MindNode>;
}

export interface TimeManagerSyncPayload {
  version: number;
  exportedAt: string;
  entries: TimeEntry[];
  plans: PeriodPlanState;
}
