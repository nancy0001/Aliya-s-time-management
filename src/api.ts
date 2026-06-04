import { DailyLog, EnvironmentFactor, Goal, LifeSystemState, WeeklyReview } from "./types";

const STORAGE_KEY = "lifeos-state-v1";

const seedState: LifeSystemState = {
  profileName: "Aliya's life OS",
  goals: [
    { id: "g1", level: "physiology", title: "睡眠稳定", targetValue: 7.5, unit: "小时/天", weeklyTarget: 6, active: true },
    { id: "g2", level: "safety", title: "应急储备", targetValue: 6, unit: "个月", weeklyTarget: 1, active: true },
    { id: "g3", level: "love", title: "深度连接", targetValue: 2, unit: "次/周", weeklyTarget: 2, active: true },
    { id: "g4", level: "esteem", title: "能力输出", targetValue: 3, unit: "次/周", weeklyTarget: 3, active: true },
    { id: "g5", level: "selfActualization", title: "长期项目推进", targetValue: 4, unit: "步/月", weeklyTarget: 1, active: true }
  ],
  logs: [],
  environment: [
    { id: "e1", category: "tool", name: "手机夜间模式", impact: "positive", rule: "22:30 后禁止短视频" },
    { id: "e2", category: "place", name: "深度工作角", impact: "positive", rule: "每天早晨固定 90 分钟" }
  ],
  reviews: []
};

function readState(): LifeSystemState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return seedState;
  }
  try {
    return JSON.parse(raw) as LifeSystemState;
  } catch {
    return seedState;
  }
}

function writeState(state: LifeSystemState): LifeSystemState {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

export const api = {
  getState: async () => readState(),
  updateProfileName: async (profileName: string) => writeState({ ...readState(), profileName }),
  addGoal: async (goal: Goal) => {
    const state = readState();
    return writeState({ ...state, goals: [goal, ...state.goals] });
  },
  toggleGoal: async (id: string) => {
    const state = readState();
    return writeState({
      ...state,
      goals: state.goals.map((goal) => (goal.id === id ? { ...goal, active: !goal.active } : goal))
    });
  },
  addDailyLog: async (log: DailyLog) => {
    const state = readState();
    const logs = [log, ...state.logs.filter((item) => item.date !== log.date)].slice(0, 30);
    return writeState({ ...state, logs });
  },
  addEnvironmentFactor: async (factor: EnvironmentFactor) => {
    const state = readState();
    return writeState({ ...state, environment: [factor, ...state.environment] });
  },
  addWeeklyReview: async (review: WeeklyReview) => {
    const state = readState();
    return writeState({ ...state, reviews: [review, ...state.reviews].slice(0, 12) });
  }
};
