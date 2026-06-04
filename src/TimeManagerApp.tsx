import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  buildTimeManagerPayload,
  decodePayload,
  downloadJsonBackup,
  encodePayload,
  readImportSnapshot,
  readJsonFile,
  readLastBackupMeta,
  saveImportSnapshot,
  saveLastBackupMeta,
  BACKUP_KEY,
  LEGACY_PLAN_KEY as STORAGE_LEGACY_PLAN_KEY,
  PLAN_KEY as STORAGE_PLAN_KEY,
  SNAPSHOT_KEY,
  STORAGE_KEY as STORAGE_ENTRY_KEY,
  SYNC_VERSION as STORAGE_SYNC_VERSION
} from "./time-manager-storage";
import {
  CATEGORIES,
  CATEGORY_COLORS,
  activeSopDateByClock,
  aggregateByCategory,
  biWeekStartOf,
  buildMonthCells,
  donutSlices,
  formatHm,
  formatLocalDate,
  minutesToDays,
  minutesToHours,
  shiftDate,
  shiftDateBy,
  sumMinutes,
  toDays,
  toHm,
  weekStartOf
} from "./time-manager-utils";
import { DataSafetyPanel } from "./components/time-manager/DataSafetyPanel";
import { GoalBoard } from "./components/time-manager/GoalBoard";
import { TodayActionPanel } from "./components/time-manager/TodayActionPanel";
import { AiInsightPanel } from "./components/time-manager/AiInsightPanel";
import { buildTimeManagerAnalysis } from "./time-manager-analysis";

type TimeCategory = "深度工作" | "沟通协作" | "学习成长" | "健康运动" | "生活事务" | "娱乐放松";
type GoalCycle = "日度" | "周度" | "月度";
type GoalPriority = "P0" | "P1" | "P2" | "P3" | "P4" | "P5";
type GoalStatus = "未开始" | "进行中" | "已完成" | "暂停";

interface TimeEntry {
  id: string;
  date: string;
  category: TimeCategory;
  minutes: number;
  note: string;
}

interface GoalTarget {
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

interface BucketPlan {
  targets: Record<TimeCategory, number>;
  notes: Record<TimeCategory, string>;
}

interface BiWeekPlan {
  note: string;
}

type InvestSopSectionId = "preMarket" | "intraday" | "postMarket" | "rules";

interface InvestSopItem {
  id: string;
  title: string;
  note: string;
  children?: { id: string; title: string }[];
}

interface InvestSopSection {
  id: InvestSopSectionId;
  title: string;
  intro: string;
  notes: string;
  items: InvestSopItem[];
}

interface MindNode {
  id: string;
  title: string;
  children: MindNode[];
}

interface PeriodPlanState {
  goalTargets: GoalTarget[];
  weeklyPlansByBucket: Record<string, BucketPlan>;
  monthlyPlansByBucket: Record<string, BucketPlan>;
  biWeeklyPlansByBucket: Record<string, BiWeekPlan>;
  investSopByDate: Record<string, InvestSopSection[]>;
  investMindByDate: Record<string, MindNode>;
}
interface LinePointSelection {
  bucketStart: string;
  date: string;
  category: TimeCategory;
  minutes: number;
}
interface TimeManagerSyncPayload {
  version: number;
  exportedAt: string;
  entries: TimeEntry[];
  plans: PeriodPlanState;
}

const STORAGE_KEY = STORAGE_ENTRY_KEY;
const PLAN_KEY = STORAGE_PLAN_KEY;
const LEGACY_PLAN_KEY = STORAGE_LEGACY_PLAN_KEY;
const FLOW_BASELINE_DATE = "2026-05-07";
const VERSION = "v2026.05.05.2";
const today = formatLocalDate(new Date());
const SYNC_VERSION = STORAGE_SYNC_VERSION;

const timeQuotes = [
  "你不是没时间 你是时间预算没有优先级",
  "日程排满不等于有效产出 忙碌感不等于进展",
  "时间管理不是填满每分钟 而是守住高价值时间块",
  "先安排最重要的事 剩下的时间才有意义",
  "短期靠冲刺 长期靠可重复的时间结构",
  "注意力放在哪里 结果就长在哪里",
  "能复利的事情要放进黄金时段 不能只放碎片时间",
  "先做难而正确的事 再做容易而次要的事",
  "把任务变成日程 执行力才会变成现实",
  "拖延的本质是决策延迟 不是时间不够"
];

const SEEDED_ENTRIES: TimeEntry[] = [
  { id: "seed-0504-1", date: "2026-05-04", category: "深度工作", minutes: 180, note: "项目推进" },
  { id: "seed-0504-2", date: "2026-05-04", category: "学习成长", minutes: 90, note: "课程学习" },
  { id: "seed-0504-3", date: "2026-05-04", category: "健康运动", minutes: 60, note: "力量训练" },
  { id: "seed-0505-1", date: "2026-05-05", category: "深度工作", minutes: 210, note: "需求拆解" },
  { id: "seed-0505-2", date: "2026-05-05", category: "沟通协作", minutes: 70, note: "例会沟通" },
  { id: "seed-0505-3", date: "2026-05-05", category: "生活事务", minutes: 80, note: "家庭事项" },
  { id: "seed-0506-1", date: "2026-05-06", category: "深度工作", minutes: 160, note: "文档输出" },
  { id: "seed-0506-2", date: "2026-05-06", category: "学习成长", minutes: 120, note: "AI工具训练" },
  { id: "seed-0507-1", date: "2026-05-07", category: "深度工作", minutes: 190, note: "关键任务" },
  { id: "seed-0507-2", date: "2026-05-07", category: "健康运动", minutes: 50, note: "有氧" },
  { id: "seed-0508-1", date: "2026-05-08", category: "沟通协作", minutes: 120, note: "对齐评审" },
  { id: "seed-0508-2", date: "2026-05-08", category: "深度工作", minutes: 130, note: "方案实现" },
  { id: "seed-0509-1", date: "2026-05-09", category: "生活事务", minutes: 140, note: "周末事务" },
  { id: "seed-0509-2", date: "2026-05-09", category: "娱乐放松", minutes: 100, note: "休息恢复" },
  { id: "seed-0510-1", date: "2026-05-10", category: "学习成长", minutes: 90, note: "周复盘" }
];
const RECOVERY_ENTRIES_0510_0511: TimeEntry[] = [
  { id: "recover-0511-1", date: "2026-05-11", category: "学习成长", minutes: 60, note: "早上8.30-10点 盯盘" },
  { id: "recover-0511-2", date: "2026-05-11", category: "健康运动", minutes: 120, note: "早上10-12点 健身房" },
  { id: "recover-0511-3", date: "2026-05-11", category: "深度工作", minutes: 480, note: "下午2-10 8小时。。。 开会&资源需求沟通&项目汇报&周会&垂类资源口径" },
  { id: "recover-0511-4", date: "2026-05-11", category: "生活事务", minutes: 90, note: "早上12.30-2点 和yuya吃饭" },
  { id: "recover-0511-5", date: "2026-05-11", category: "深度工作", minutes: 60, note: "晚上10-11点 资源预算文档" },
  { id: "recover-0510-1", date: "2026-05-10", category: "学习成长", minutes: 90, note: "周复盘" },
  { id: "recover-0510-2", date: "2026-05-10", category: "健康运动", minutes: 180, note: "9-12点 3小时健身房" },
  { id: "recover-0510-3", date: "2026-05-10", category: "娱乐放松", minutes: 480, note: "2-8点 和闪电吃饭外出" }
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyCategoryNumbers(weekly = true): Record<TimeCategory, number> {
  return weekly
    ? { 深度工作: 10, 沟通协作: 4, 学习成长: 5, 健康运动: 3.5, 生活事务: 6, 娱乐放松: 3 }
    : { 深度工作: 5.4, 沟通协作: 2.1, 学习成长: 2.5, 健康运动: 1.9, 生活事务: 3.1, 娱乐放松: 1.9 };
}
function emptyCategoryNotes(): Record<TimeCategory, string> {
  return { 深度工作: "", 沟通协作: "", 学习成长: "", 健康运动: "", 生活事务: "", 娱乐放松: "" };
}

function sumPlanTargets(plan: BucketPlan, unitMinutes: number) {
  return Math.round(CATEGORIES.reduce((sum, name) => sum + (Number(plan.targets[name]) || 0) * unitMinutes, 0));
}

function reviewTone(actual: number, expected: number) {
  if (expected <= 0) return "先设预期";
  const ratio = actual / expected;
  if (ratio >= 1) return "已超过预期";
  if (ratio >= 0.8) return "接近预期";
  if (ratio >= 0.5) return "明显滞后";
  return "需要重排";
}

function formatSignedMinutes(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value} 分钟`;
}

function goalDefaultsByCycle(cycle: GoalCycle) {
  if (cycle === "日度") {
    return { expectedMinutes: 90, deadline: today, linkedCategory: "深度工作" as TimeCategory };
  }
  if (cycle === "周度") {
    return { expectedMinutes: 480, deadline: shiftDateBy(weekStartOf(today), 6), linkedCategory: "深度工作" as TimeCategory };
  }
  return { expectedMinutes: 2400, deadline: `${today.slice(0, 7)}-28`, linkedCategory: "学习成长" as TimeCategory };
}

function normalizeGoalTarget(goal: GoalTarget): GoalTarget {
  const defaults = goalDefaultsByCycle(goal.cycle);
  return {
    ...goal,
    expectedMinutes: goal.expectedMinutes ?? defaults.expectedMinutes,
    deadline: goal.deadline ?? defaults.deadline,
    status: goal.status ?? "进行中",
    linkedCategory: goal.linkedCategory ?? defaults.linkedCategory,
    reviewNote: goal.reviewNote ?? goal.note ?? ""
  };
}

function defaultGoalTargets(): GoalTarget[] {
  return [
    { id: uid(), cycle: "日度", taskName: "日度核心任务", priority: "P1", targetDesc: "今天必须推进的1-3件事，先占用高价值时间块", note: "建议先完成高价值任务", expectedMinutes: 90, deadline: today, status: "进行中", linkedCategory: "深度工作", reviewNote: "完成后记录偏差原因" },
    { id: uid(), cycle: "周度", taskName: "周度关键结果", priority: "P1", targetDesc: "本周要完成的关键结果，并在周中检查偏差", note: "周中检查偏差并修正", expectedMinutes: 480, deadline: shiftDateBy(weekStartOf(today), 6), status: "进行中", linkedCategory: "深度工作", reviewNote: "周日复盘预期与实际差异" },
    { id: uid(), cycle: "月度", taskName: "月度阶段成果", priority: "P2", targetDesc: "本月阶段性成果或里程碑，拆到每周执行", note: "月末复盘结构与投入比例", expectedMinutes: 2400, deadline: `${today.slice(0, 7)}-28`, status: "未开始", linkedCategory: "学习成长", reviewNote: "月末复盘成果是否沉淀" }
  ];
}

function defaultInvestSopSections(): InvestSopSection[] {
  return [
    {
      id: "postMarket",
      title: "盘后复盘 + 次日选股（15:30-21:00）",
      intro: "复盘结论要可用于次日执行。",
      notes: "",
      items: [
        { id: uid(), title: "市场与题材复盘", note: "·量能变化\n·赚钱效应\n·主线持续性", children: defaultThirdItemsFromNote("·量能变化\n·赚钱效应\n·主线持续性") },
        { id: uid(), title: "次日观察池", note: "·保留5-10只\n·标记触发条件\n·写清风控位", children: defaultThirdItemsFromNote("·保留5-10只\n·标记触发条件\n·写清风控位") }
      ]
    },
    {
      id: "preMarket",
      title: "盘前准备（8:30-9:25）",
      intro: "先定环境、定主线、定风险边界。",
      notes: "",
      items: [
        { id: uid(), title: "看环境", note: "·美股/A50/港股夜盘\n·风险偏好变化\n·外盘联动信号", children: defaultThirdItemsFromNote("·美股/A50/港股夜盘\n·风险偏好变化\n·外盘联动信号") },
        { id: uid(), title: "看消息", note: "·行业政策\n·利好利空\n·隔夜热点/龙虎榜方向", children: defaultThirdItemsFromNote("·行业政策\n·利好利空\n·隔夜热点/龙虎榜方向") },
        { id: uid(), title: "判风格", note: "·进攻/震荡/防守\n·主线1-2个\n·回避噪音题材", children: defaultThirdItemsFromNote("·进攻/震荡/防守\n·主线1-2个\n·回避噪音题材") },
        { id: uid(), title: "看竞价", note: "·涨跌家数\n·涨跌停数量\n·题材高开强度/量能匹配", children: defaultThirdItemsFromNote("·涨跌家数\n·涨跌停数量\n·题材高开强度/量能匹配") },
        { id: uid(), title: "定计划", note: "·止损位\n·开仓条件\n·单日最大出手次数", children: defaultThirdItemsFromNote("·止损位\n·开仓条件\n·单日最大出手次数") }
      ]
    },
    {
      id: "intraday",
      title: "盘中盯盘流程（9:30-15:00）",
      intro: "只做计划内动作，不临时扩池。",
      notes: "",
      items: [
        { id: uid(), title: "开盘30分钟定方向", note: "·指数方向\n·量能强弱\n·主线分歧/加强", children: defaultThirdItemsFromNote("·指数方向\n·量能强弱\n·主线分歧/加强") },
        { id: uid(), title: "分时确认再操作", note: "·回踩确认\n·转强信号\n·计划内执行", children: defaultThirdItemsFromNote("·回踩确认\n·转强信号\n·计划内执行") }
      ]
    },
    {
      id: "rules",
      title: "执行红线",
      intro: "纪律先于判断，先控风险再谈收益。",
      notes: "",
      items: [
        { id: uid(), title: "计划外不开仓", note: "·无触发不交易\n·不临时扩池\n·不情绪化追单", children: defaultThirdItemsFromNote("·无触发不交易\n·不临时扩池\n·不情绪化追单") },
        { id: uid(), title: "先定止损再下单", note: "·先写止损\n·再下单\n·单票风险不超预设", children: defaultThirdItemsFromNote("·先写止损\n·再下单\n·单票风险不超预设") }
      ]
    }
  ];
}

function defaultInvestMindTree(): MindNode {
  return {
    id: uid(),
    title: "投资 SOP",
    children: [
      { id: uid(), title: "盘后复盘 + 次日选股", children: [] },
      { id: uid(), title: "盘前准备", children: [] },
      { id: uid(), title: "盘中盯盘", children: [] },
      { id: uid(), title: "执行红线", children: [] }
    ]
  };
}

function normalizeSopSections(sections: InvestSopSection[]): InvestSopSection[] {
  return sortInvestSections(sections).map((section) => ({
    ...section,
    items: section.items.map((item) => {
      const hasChildren = !!(item.children && item.children.length);
      const normalizedChildren = hasChildren ? item.children! : defaultThirdItemsFromNote(item.note || "");
      const normalizedNote = normalizedChildren.length ? noteFromChildren(normalizedChildren) : (item.note || "");
      return { ...item, children: normalizedChildren, note: normalizedNote };
    })
  }));
}

function normalizeSopByDateMap(rawMap: Record<string, InvestSopSection[]>) {
  const next: Record<string, InvestSopSection[]> = {};
  Object.keys(rawMap || {}).forEach((dateKey) => {
    const sections = rawMap[dateKey];
    if (Array.isArray(sections) && sections.length) {
      next[dateKey] = normalizeSopSections(sections);
    }
  });
  if (!next[FLOW_BASELINE_DATE] || next[FLOW_BASELINE_DATE].length === 0) {
    next[FLOW_BASELINE_DATE] = normalizeSopSections(defaultInvestSopSections());
  }
  if (!next[today] || next[today].length === 0) {
    next[today] = normalizeSopSections(defaultInvestSopSections());
  }
  return next;
}

function defaultPlans(): PeriodPlanState {
  return {
    goalTargets: defaultGoalTargets(),
    weeklyPlansByBucket: {},
    monthlyPlansByBucket: {},
    biWeeklyPlansByBucket: {},
    investSopByDate: normalizeSopByDateMap({ [today]: defaultInvestSopSections(), [FLOW_BASELINE_DATE]: defaultInvestSopSections() }),
    investMindByDate: { [today]: defaultInvestMindTree() }
  };
}

function migrateLegacyPlanInto(base: PeriodPlanState, legacy: any): PeriodPlanState {
  const weekKey = weekStartOf(today);
  const monthKey = today.slice(0, 7);
  const biWeekKey = biWeekStartOf(today);
  const weeklyBase = base.weeklyPlansByBucket[weekKey] || { targets: emptyCategoryNumbers(true), notes: emptyCategoryNotes() };
  const monthlyBase = base.monthlyPlansByBucket[monthKey] || { targets: emptyCategoryNumbers(false), notes: emptyCategoryNotes() };
  const biWeekBase = base.biWeeklyPlansByBucket[biWeekKey] || { note: "" };

  const merged: PeriodPlanState = {
    ...base,
    weeklyPlansByBucket: {
      ...base.weeklyPlansByBucket,
      [weekKey]: {
        targets: { ...weeklyBase.targets, ...(legacy.weeklyTargets || {}) },
        notes: { ...weeklyBase.notes, ...(legacy.weeklyNotes || {}) }
      }
    },
    monthlyPlansByBucket: {
      ...base.monthlyPlansByBucket,
      [monthKey]: {
        targets: { ...monthlyBase.targets, ...(legacy.monthlyTargets || {}) },
        notes: { ...monthlyBase.notes, ...(legacy.monthlyNotes || {}) }
      }
    },
    biWeeklyPlansByBucket: {
      ...base.biWeeklyPlansByBucket,
      [biWeekKey]: {
        ...biWeekBase,
        note: legacy.biWeeklyNote ?? biWeekBase.note ?? ""
      }
    }
  };

  if (Array.isArray(legacy.goalTargets) && legacy.goalTargets.length) {
    merged.goalTargets = legacy.goalTargets.map((g: any) => ({
      id: g.id || uid(),
      taskName: g.taskName || "目标",
      cycle: g.cycle || "周度",
      priority: g.priority || "P1",
      targetDesc: g.targetDesc || "",
      note: g.note || ""
    }));
  }
  return merged;
}

function readEntries(): TimeEntry[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  const legacyKeys = ["aliya-time-manager-v0", "aliya-time-manager", "time-manager-entries"];
  const mergeMap = new Map<string, TimeEntry>();
  const pushEntries = (list: TimeEntry[]) => {
    list.forEach((item) => {
      const key = `${item.date}-${item.category}-${item.minutes}-${item.note || ""}`;
      mergeMap.set(key, item);
    });
  };
  pushEntries(RECOVERY_ENTRIES_0510_0511);
  const persistedEntries: TimeEntry[] = [];
  legacyKeys.forEach((key) => {
    const legacyRaw = localStorage.getItem(key);
    if (!legacyRaw) return;
    try {
      const legacyParsed = JSON.parse(legacyRaw) as TimeEntry[];
      if (Array.isArray(legacyParsed)) persistedEntries.push(...legacyParsed.filter((x) => x?.date && x?.category));
    } catch {
      // ignore malformed legacy entries
    }
  });
  if (!raw) {
    if (persistedEntries.length) {
      pushEntries(persistedEntries);
      return Array.from(mergeMap.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
    }
    return SEEDED_ENTRIES;
  }
  try {
    const parsed = JSON.parse(raw) as TimeEntry[];
    if (Array.isArray(parsed) && parsed.length) {
      pushEntries([...persistedEntries, ...parsed.filter((x) => x?.date && x?.category)]);
      return Array.from(mergeMap.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
    }
    if (persistedEntries.length) {
      pushEntries(persistedEntries);
      return Array.from(mergeMap.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
    }
    return SEEDED_ENTRIES;
  } catch {
    if (persistedEntries.length) {
      pushEntries(persistedEntries);
      return Array.from(mergeMap.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
    }
    return SEEDED_ENTRIES;
  }
}
function saveEntries(entries: TimeEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function readPlans(): PeriodPlanState {
  const raw = localStorage.getItem(PLAN_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<PeriodPlanState>;
      let next: PeriodPlanState = {
        ...defaultPlans(),
        ...parsed,
        goalTargets: parsed.goalTargets && parsed.goalTargets.length ? parsed.goalTargets.map(normalizeGoalTarget) : defaultGoalTargets(),
        weeklyPlansByBucket: parsed.weeklyPlansByBucket || {},
        monthlyPlansByBucket: parsed.monthlyPlansByBucket || {},
        biWeeklyPlansByBucket: parsed.biWeeklyPlansByBucket || {},
        investSopByDate: parsed.investSopByDate || {},
        investMindByDate: parsed.investMindByDate || {}
      };
      if (!Object.keys(next.investSopByDate || {}).length) {
        const legacySop = (parsed as any).investSopSections;
        if (Array.isArray(legacySop) && legacySop.length) {
          next.investSopByDate = normalizeSopByDateMap({ [today]: legacySop as InvestSopSection[], [FLOW_BASELINE_DATE]: legacySop as InvestSopSection[] });
        } else {
          next.investSopByDate = normalizeSopByDateMap({ [today]: defaultInvestSopSections(), [FLOW_BASELINE_DATE]: defaultInvestSopSections() });
        }
      } else {
        next.investSopByDate = normalizeSopByDateMap(next.investSopByDate);
      }
      if (!Object.keys(next.investMindByDate || {}).length) {
        next.investMindByDate = { [today]: defaultInvestMindTree() };
      }
      const legacyRaw = localStorage.getItem(LEGACY_PLAN_KEY);
      if (legacyRaw) {
        const hasWeekly = Object.keys(next.weeklyPlansByBucket).length > 0;
        const hasMonthly = Object.keys(next.monthlyPlansByBucket).length > 0;
        const hasBiWeekly = Object.keys(next.biWeeklyPlansByBucket).length > 0;
        if (!hasWeekly || !hasMonthly || !hasBiWeekly) {
          try {
            const legacy = JSON.parse(legacyRaw);
            next = migrateLegacyPlanInto(next, legacy);
          } catch {
            // ignore malformed legacy plan
          }
        }
      }
      return next;
    } catch {
      return defaultPlans();
    }
  }

  const legacyRaw = localStorage.getItem(LEGACY_PLAN_KEY);
  if (legacyRaw) {
    try {
      const legacy = JSON.parse(legacyRaw) as any;
      return migrateLegacyPlanInto(defaultPlans(), legacy);
    } catch {
      return defaultPlans();
    }
  }

  return defaultPlans();
}
function savePlans(plan: PeriodPlanState) {
  localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

function noteLines(note: string): string[] {
  const lines = (note || "").split("\n").map((line) => line.trim());
  return lines.length ? lines : [""];
}

function defaultThirdItemsFromNote(note: string) {
  const lines = noteLines(note)
    .map((line) => line.replace(/^·\s*/, "").trim())
    .filter(Boolean);
  return lines.map((title) => ({ id: uid(), title }));
}

function itemThirdChildren(item: InvestSopItem) {
  return item.children && item.children.length ? item.children : defaultThirdItemsFromNote(item.note);
}

function noteFromChildren(children: { id: string; title: string }[]) {
  return children.map((child) => `·${child.title || ""}`).join("\n");
}

function sortInvestSections(sections: InvestSopSection[]): InvestSopSection[] {
  const order: Record<InvestSopSectionId, number> = {
    postMarket: 0,
    preMarket: 1,
    intraday: 2,
    rules: 3
  };
  return [...sections].sort((a, b) => (order[a.id] ?? 99) - (order[b.id] ?? 99));
}

function updateMindNodeById(node: MindNode, nodeId: string, updater: (target: MindNode) => MindNode): MindNode {
  if (node.id === nodeId) return updater(node);
  return { ...node, children: node.children.map((child) => updateMindNodeById(child, nodeId, updater)) };
}

function removeMindNodeById(node: MindNode, nodeId: string): MindNode {
  return {
    ...node,
    children: node.children
      .filter((child) => child.id !== nodeId)
      .map((child) => removeMindNodeById(child, nodeId))
  };
}

function MindTreeEditor({
  node,
  level,
  onTitleChange,
  onAddChild,
  onDelete
}: {
  node: MindNode;
  level: number;
  onTitleChange: (id: string, title: string) => void;
  onAddChild: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="mind-node" style={{ marginLeft: `${Math.min(level, 6) * 16}px` }}>
      <div className="mind-node-row">
        <input value={node.title} onChange={(e) => onTitleChange(node.id, e.target.value)} />
        <button type="button" className="entry-toggle" onClick={() => onAddChild(node.id)}>+子节点</button>
        {level > 0 && <button type="button" className="entry-toggle" onClick={() => onDelete(node.id)}>删除</button>}
      </div>
      {node.children.length > 0 && (
        <div className="mind-children">
          {node.children.map((child) => (
            <MindTreeEditor
              key={child.id}
              node={child}
              level={level + 1}
              onTitleChange={onTitleChange}
              onAddChild={onAddChild}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TimeManagerApp() {
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>(readEntries());
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState<TimeCategory>("深度工作");
  const [minutes, setMinutes] = useState("60");
  const [note, setNote] = useState("");
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [selectedLinePoint, setSelectedLinePoint] = useState<LinePointSelection | null>(null);
  const [plans, setPlans] = useState<PeriodPlanState>(readPlans());
  const [syncMessage, setSyncMessage] = useState("");
  const [backupMeta, setBackupMeta] = useState(readLastBackupMeta());
  const [snapshotMeta, setSnapshotMeta] = useState(() => readImportSnapshot());
  const [sopDate, setSopDate] = useState(activeSopDateByClock());
  const [calendarBase, setCalendarBase] = useState(today);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(today);

  const addEntry = (event: FormEvent) => {
    event.preventDefault();
    const m = Number(minutes);
    if (!m || m <= 0) return;
    const next = [{ id: uid(), date, category, minutes: m, note: note.trim() }, ...entries].slice(0, 500);
    setEntries(next);
    saveEntries(next);
    setNote("");
  };

  const updateEntry = (id: string, patch: Partial<TimeEntry>) => {
    const next = entries.map((x) => (x.id === id ? { ...x, ...patch } : x));
    setEntries(next);
    saveEntries(next);
  };

  const goalMove = (id: string, dir: -1 | 1) => {
    setPlans((prev) => {
      const idx = prev.goalTargets.findIndex((x) => x.id === id);
      if (idx < 0) return prev;
      const to = idx + dir;
      if (to < 0 || to >= prev.goalTargets.length) return prev;
      const arr = [...prev.goalTargets];
      const [row] = arr.splice(idx, 1);
      arr.splice(to, 0, row);
      return { ...prev, goalTargets: arr };
    });
  };
  const goalCopy = (id: string) => {
    setPlans((prev) => {
      const idx = prev.goalTargets.findIndex((x) => x.id === id);
      if (idx < 0) return prev;
      const src = prev.goalTargets[idx];
      const copy: GoalTarget = { ...src, id: uid(), taskName: `${src.taskName} 副本` };
      const arr = [...prev.goalTargets];
      arr.splice(idx + 1, 0, copy);
      return { ...prev, goalTargets: arr };
    });
  };
  const goalAdd = () => {
    setPlans((prev) => ({
      ...prev,
      goalTargets: [
        ...prev.goalTargets,
        normalizeGoalTarget({ id: uid(), taskName: "新增周度目标", cycle: "周度", priority: "P2", targetDesc: "本周关键结果", note: "周日复盘预期与实际偏差" })
      ]
    }));
  };
  const updateGoal = (id: string, patch: Partial<GoalTarget>) => {
    setPlans((prev) => ({ ...prev, goalTargets: prev.goalTargets.map((g) => (g.id === id ? normalizeGoalTarget({ ...g, ...patch }) : g)) }));
  };

  const todayEntries = useMemo(() => entries.filter((x) => x.date === today), [entries]);
  const biDays = useMemo(() => [today, shiftDate(today, -1)], []);
  const biEntries = useMemo(() => entries.filter((x) => biDays.includes(x.date)), [entries, biDays]);

  const biWeekBuckets = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    entries.forEach((e) => {
      const key = biWeekStartOf(e.date);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    });
    const currentKey = biWeekStartOf(today);
    const planKeys = Object.keys(plans.biWeeklyPlansByBucket || {});
    const allKeys = new Set<string>([currentKey, ...planKeys, ...Array.from(map.keys())]);
    allKeys.forEach((key) => {
      if (!map.has(key)) map.set(key, []);
    });
    return Array.from(map.entries())
      .map(([start, list]) => {
        const dates = Array.from({ length: 14 }, (_, i) => shiftDateBy(start, i));
        return { start, end: shiftDateBy(start, 13), dates, list, total: sumMinutes(list), categoryMap: aggregateByCategory(list) };
      })
      .sort((a, b) => (a.start < b.start ? 1 : -1));
  }, [entries, plans.biWeeklyPlansByBucket]);
  const currentBiWeekKey = useMemo(() => biWeekStartOf(today), []);

  const weeklyBuckets = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    entries.forEach((e) => {
      const key = weekStartOf(e.date);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    });
    const currentKey = weekStartOf(today);
    if (!map.has(currentKey)) map.set(currentKey, []);
    return Array.from(map.entries())
      .map(([start, list]) => ({ start, end: shiftDateBy(start, 6), list, total: sumMinutes(list), categoryMap: aggregateByCategory(list) }))
      .sort((a, b) => (a.start < b.start ? 1 : -1));
  }, [entries]);

  const monthlyBuckets = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    entries.forEach((e) => {
      const key = e.date.slice(0, 7);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    });
    const currentMonth = today.slice(0, 7);
    if (!map.has(currentMonth)) map.set(currentMonth, []);
    return Array.from(map.entries())
      .map(([monthKey, list]) => ({ monthKey, list, total: sumMinutes(list), categoryMap: aggregateByCategory(list) }))
      .sort((a, b) => (a.monthKey < b.monthKey ? 1 : -1));
  }, [entries]);

  const getWeeklyPlan = (key: string): BucketPlan => plans.weeklyPlansByBucket[key] || { targets: emptyCategoryNumbers(true), notes: emptyCategoryNotes() };
  const getMonthlyPlan = (key: string): BucketPlan => plans.monthlyPlansByBucket[key] || { targets: emptyCategoryNumbers(false), notes: emptyCategoryNotes() };
  const getBiWeekPlan = (key: string): BiWeekPlan => plans.biWeeklyPlansByBucket[key] || { note: "" };
  const getSopSectionsByDate = (dateKey: string): InvestSopSection[] => plans.investSopByDate[dateKey] || defaultInvestSopSections();
  const getMindByDate = (dateKey: string): MindNode => plans.investMindByDate[dateKey] || defaultInvestMindTree();

  const currentWeekReview = useMemo(() => {
    const start = weekStartOf(today);
    const bucket = weeklyBuckets.find((item) => item.start === start);
    const plan = getWeeklyPlan(start);
    const expected = sumPlanTargets(plan, 60);
    const actual = bucket?.total ?? 0;
    const delta = actual - expected;
    const completion = expected > 0 ? Math.round((actual / expected) * 100) : 0;
    return { label: `${start} ~ ${shiftDateBy(start, 6)}`, expected, actual, delta, completion, tone: reviewTone(actual, expected) };
  }, [weeklyBuckets, plans.weeklyPlansByBucket]);

  const currentMonthReview = useMemo(() => {
    const monthKey = today.slice(0, 7);
    const bucket = monthlyBuckets.find((item) => item.monthKey === monthKey);
    const plan = getMonthlyPlan(monthKey);
    const expected = sumPlanTargets(plan, 24 * 60);
    const actual = bucket?.total ?? 0;
    const delta = actual - expected;
    const completion = expected > 0 ? Math.round((actual / expected) * 100) : 0;
    return { label: monthKey, expected, actual, delta, completion, tone: reviewTone(actual, expected) };
  }, [monthlyBuckets, plans.monthlyPlansByBucket]);

  const ensureSopDate = (dateKey: string) => {
    setPlans((prev) => {
      if (prev.investSopByDate[dateKey]) return prev;
      return {
        ...prev,
        investSopByDate: {
          ...prev.investSopByDate,
          [dateKey]: normalizeSopSections(defaultInvestSopSections())
        },
        investMindByDate: {
          ...prev.investMindByDate,
          [dateKey]: prev.investMindByDate[dateKey] || defaultInvestMindTree()
        }
      };
    });
  };

  const updateSopSectionsByDate = (dateKey: string, updater: (sections: InvestSopSection[]) => InvestSopSection[]) => {
    setPlans((prev) => {
      const current = prev.investSopByDate[dateKey] || defaultInvestSopSections();
      const updated = normalizeSopSections(updater(current));
      return {
        ...prev,
        investSopByDate: {
          ...prev.investSopByDate,
          [dateKey]: updated
        }
      };
    });
  };

  const updateMindByDate = (dateKey: string, updater: (root: MindNode) => MindNode) => {
    setPlans((prev) => {
      const current = prev.investMindByDate[dateKey] || defaultInvestMindTree();
      return {
        ...prev,
        investMindByDate: {
          ...prev.investMindByDate,
          [dateKey]: updater(current)
        }
      };
    });
  };

  const updateWeeklyPlan = (key: string, patch: Partial<BucketPlan>) => {
    setPlans((prev) => {
      const base = prev.weeklyPlansByBucket[key] || { targets: emptyCategoryNumbers(true), notes: emptyCategoryNotes() };
      return {
        ...prev,
        weeklyPlansByBucket: {
          ...prev.weeklyPlansByBucket,
          [key]: { ...base, ...patch, targets: { ...base.targets, ...(patch.targets || {}) }, notes: { ...base.notes, ...(patch.notes || {}) } }
        }
      };
    });
  };
  const updateMonthlyPlan = (key: string, patch: Partial<BucketPlan>) => {
    setPlans((prev) => {
      const base = prev.monthlyPlansByBucket[key] || { targets: emptyCategoryNumbers(false), notes: emptyCategoryNotes() };
      return {
        ...prev,
        monthlyPlansByBucket: {
          ...prev.monthlyPlansByBucket,
          [key]: { ...base, ...patch, targets: { ...base.targets, ...(patch.targets || {}) }, notes: { ...base.notes, ...(patch.notes || {}) } }
        }
      };
    });
  };
  const updateBiWeekPlan = (key: string, patch: Partial<BiWeekPlan>) => {
    setPlans((prev) => ({
      ...prev,
      biWeeklyPlansByBucket: {
        ...prev.biWeeklyPlansByBucket,
        [key]: { ...(prev.biWeeklyPlansByBucket[key] || { note: "" }), ...patch }
      }
    }));
  };

  const updateInvestSopSection = (sectionId: InvestSopSectionId, patch: Partial<InvestSopSection>, dateKey = sopDate) => {
    updateSopSectionsByDate(dateKey, (sections) => sections.map((section) => (
      section.id === sectionId ? { ...section, ...patch } : section
    )));
  };

  const addInvestSopItem = (sectionId: InvestSopSectionId, dateKey = sopDate) => {
    updateSopSectionsByDate(dateKey, (sections) => sections.map((section) => (
        section.id === sectionId
          ? { ...section, items: [...section.items, { id: uid(), title: "新增小项", note: "" }] }
          : section
      )));
  };

  const updateInvestSopItem = (sectionId: InvestSopSectionId, itemId: string, patch: Partial<InvestSopItem>, dateKey = sopDate) => {
    updateSopSectionsByDate(dateKey, (sections) => sections.map((section) => (
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) => {
                if (item.id !== itemId) return item;
                const next = { ...item, ...patch };
                if (Object.prototype.hasOwnProperty.call(patch, "note")) {
                  const derivedChildren = defaultThirdItemsFromNote(String(patch.note || ""));
                  next.children = derivedChildren;
                }
                if (Object.prototype.hasOwnProperty.call(patch, "children")) {
                  next.note = noteFromChildren((patch.children || []) as { id: string; title: string }[]);
                }
                return next;
              })
            }
          : section
      )));
  };

  const removeInvestSopItem = (sectionId: InvestSopSectionId, itemId: string) => {
    updateSopSectionsByDate(sopDate, (sections) => sections.map((section) => (
        section.id === sectionId
          ? { ...section, items: section.items.filter((item) => item.id !== itemId) }
          : section
      )));
  };

  const updateInvestSopItemNoteLine = (sectionId: InvestSopSectionId, itemId: string, lineIndex: number, value: string) => {
    const section = getSopSectionsByDate(sopDate).find((s) => s.id === sectionId);
    const item = section?.items.find((it) => it.id === itemId);
    if (!item) return;
    const lines = noteLines(item.note);
    lines[lineIndex] = value;
    updateInvestSopItem(sectionId, itemId, { note: lines.join("\n") });
  };

  const addInvestSopItemNoteLine = (sectionId: InvestSopSectionId, itemId: string) => {
    const section = getSopSectionsByDate(sopDate).find((s) => s.id === sectionId);
    const item = section?.items.find((it) => it.id === itemId);
    if (!item) return;
    const lines = noteLines(item.note);
    lines.push("");
    updateInvestSopItem(sectionId, itemId, { note: lines.join("\n") });
  };

  const removeInvestSopItemNoteLine = (sectionId: InvestSopSectionId, itemId: string, lineIndex: number) => {
    const section = getSopSectionsByDate(sopDate).find((s) => s.id === sectionId);
    const item = section?.items.find((it) => it.id === itemId);
    if (!item) return;
    const lines = noteLines(item.note);
    if (lines.length <= 1) {
      updateInvestSopItem(sectionId, itemId, { note: "" });
      return;
    }
    lines.splice(lineIndex, 1);
    updateInvestSopItem(sectionId, itemId, { note: lines.join("\n") });
  };

  const exportTodaySopSummary = async () => {
    const lines: string[] = [];
    lines.push(`# ${sopDate} 投资SOP复盘摘要`);
    lines.push("");
    sortInvestSections(getSopSectionsByDate(sopDate)).forEach((section, sectionIndex) => {
      lines.push(`${sectionIndex + 1}. ${section.title}`);
      if (section.notes?.trim()) lines.push(`模块备注：${section.notes.trim()}`);
      section.items.forEach((item, itemIndex) => {
        lines.push(`- ${sectionIndex + 1}.${itemIndex + 1} ${item.title}`);
        const detailLines = noteLines(item.note).map((x) => x.trim()).filter(Boolean);
        if (detailLines.length === 0) {
          lines.push("  · （未填写）");
        } else {
          detailLines.forEach((detail) => lines.push(`  · ${detail}`));
        }
      });
      lines.push("");
    });
    const content = lines.join("\n");
    try {
      await navigator.clipboard.writeText(content);
      window.alert("已复制今日SOP复盘摘要到剪贴板。");
    } catch {
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `aliya-sop-summary-${sopDate}.txt`;
      link.click();
      URL.revokeObjectURL(link.href);
    }
  };

  const updateMindTitle = (nodeId: string, title: string) => {
    updateMindByDate(sopDate, (root) => updateMindNodeById(root, nodeId, (target) => ({ ...target, title })));
  };

  const addMindChild = (nodeId: string) => {
    updateMindByDate(sopDate, (root) => updateMindNodeById(root, nodeId, (target) => ({
      ...target,
      children: [...target.children, { id: uid(), title: "新节点", children: [] }]
    })));
  };

  const removeMindNode = (nodeId: string) => {
    const root = getMindByDate(sopDate);
    if (root.id === nodeId) return;
    updateMindByDate(sopDate, (nextRoot) => removeMindNodeById(nextRoot, nodeId));
  };

  const updateThirdItem = (sectionId: InvestSopSectionId, itemId: string, childId: string, title: string, dateKey = sopDate) => {
    updateSopSectionsByDate(dateKey, (sections) => sections.map((section) => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        items: section.items.map((item) => {
          if (item.id !== itemId) return item;
          const children = (item.children && item.children.length) ? item.children : defaultThirdItemsFromNote(item.note);
          return {
            ...item,
            children: children.map((child) => (child.id === childId ? { ...child, title } : child))
          };
        })
      };
    }));
  };

  const addThirdItem = (sectionId: InvestSopSectionId, itemId: string, dateKey = sopDate) => {
    updateSopSectionsByDate(dateKey, (sections) => sections.map((section) => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        items: section.items.map((item) => {
          if (item.id !== itemId) return item;
          const children = (item.children && item.children.length) ? item.children : defaultThirdItemsFromNote(item.note);
          return { ...item, children: [...children, { id: uid(), title: "新三级子项" }] };
        })
      };
    }));
  };

  const sopDates = useMemo(() => Object.keys(plans.investSopByDate || {}).sort((a, b) => (a < b ? 1 : -1)), [plans.investSopByDate]);
  const archivedSopDates = sopDates.filter((d) => d !== sopDate);
  const fixedFlowSections = useMemo(() => {
    const baseline = plans.investSopByDate[FLOW_BASELINE_DATE];
    if (baseline?.length) return sortInvestSections(baseline);
    const fallbackKey = sopDates[sopDates.length - 1];
    return sortInvestSections((fallbackKey && plans.investSopByDate[fallbackKey]) || defaultInvestSopSections());
  }, [plans.investSopByDate, sopDates]);

  const copyWeeklyBoard = (source: string) => {
    const target = window.prompt("复制到周起始日期 YYYY-MM-DD", shiftDateBy(source, 7));
    if (!target) return;
    const src = getWeeklyPlan(source);
    setPlans((prev) => ({
      ...prev,
      weeklyPlansByBucket: { ...prev.weeklyPlansByBucket, [target]: { targets: { ...src.targets }, notes: { ...src.notes } } }
    }));
  };
  const copyMonthlyBoard = (source: string) => {
    const target = window.prompt("复制到月份 YYYY-MM", source);
    if (!target) return;
    const src = getMonthlyPlan(source);
    setPlans((prev) => ({
      ...prev,
      monthlyPlansByBucket: { ...prev.monthlyPlansByBucket, [target]: { targets: { ...src.targets }, notes: { ...src.notes } } }
    }));
  };
  const copyBiWeekBoard = (source: string) => {
    const target = window.prompt("复制到双周起始日期 YYYY-MM-DD", shiftDateBy(source, 14));
    if (!target) return;
    const src = getBiWeekPlan(source);
    setPlans((prev) => ({
      ...prev,
      biWeeklyPlansByBucket: { ...prev.biWeeklyPlansByBucket, [target]: { ...src } }
    }));
  };

  const triggerManualNextDaySop = () => {
    const next = shiftDateBy(sopDate, 1);
    ensureSopDate(next);
    setSopDate(next);
  };

  useEffect(() => {
    const timer = window.setInterval(() => setQuoteIndex((prev) => (prev + 1) % timeQuotes.length), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    ensureSopDate(sopDate);
  }, [sopDate]);
  useEffect(() => {
    const tick = () => {
      const next = activeSopDateByClock();
      setSopDate((prev) => (prev === next ? prev : next));
      ensureSopDate(next);
    };
    tick();
    const timer = window.setInterval(tick, 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    savePlans(plans);
  }, [plans]);

  useEffect(() => {
    const hash = window.location.hash || "";
    const prefix = "#sync=";
    if (!hash.startsWith(prefix)) return;
    const code = decodeURIComponent(hash.slice(prefix.length));
    if (!code) return;
    try {
      saveImportSnapshot(entries, plans);
      setSnapshotMeta(readImportSnapshot());
      const payload = decodePayload(code);
      setEntries(payload.entries);
      saveEntries(payload.entries);
      setPlans(payload.plans);
      savePlans(payload.plans);
      setBackupMeta(saveLastBackupMeta(payload));
      setSyncMessage(`已从同步链接导入 ${payload.entries.length} 条记录`);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch {
      setSyncMessage("同步链接无效，请重试");
    }
  }, []);

  const exportSyncCode = async () => {
    const payload = buildTimeManagerPayload(entries, plans, "sync");
    const code = encodePayload(payload);
    try {
      await navigator.clipboard.writeText(code);
      setBackupMeta(saveLastBackupMeta(payload));
      setSyncMessage(`同步码已复制（${entries.length} 条记录）`);
    } catch {
      window.prompt("复制下面同步码到网页版导入", code);
      setBackupMeta(saveLastBackupMeta(payload));
      setSyncMessage("已生成同步码，请复制后在网页版导入");
    }
  };

  const importSyncCode = () => {
    const code = window.prompt("粘贴从 Codex 页面复制的同步码");
    if (!code) return;
    try {
      saveImportSnapshot(entries, plans);
      setSnapshotMeta(readImportSnapshot());
      const payload = decodePayload(code);
      setEntries(payload.entries);
      saveEntries(payload.entries);
      setPlans(payload.plans);
      savePlans(payload.plans);
      setBackupMeta(saveLastBackupMeta(payload));
      setSyncMessage(`导入成功：${payload.entries.length} 条记录`);
    } catch {
      setSyncMessage("导入失败：同步码格式不正确");
    }
  };

  const copySyncLink = async () => {
    const payload = buildTimeManagerPayload(entries, plans, "sync");
    const code = encodePayload(payload);
    const targetOrigin = window.location.origin.includes("127.0.0.1")
      ? "http://localhost:5174"
      : "http://127.0.0.1:5174";
    const link = `${targetOrigin}/time-manager#sync=${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(link);
      setBackupMeta(saveLastBackupMeta(payload));
      setSyncMessage("同步链接已复制，打开链接即可自动导入");
    } catch {
      window.prompt("复制链接到网页版打开", link);
      setBackupMeta(saveLastBackupMeta(payload));
      setSyncMessage("已生成同步链接，请手动打开");
    }
  };

  const exportJsonBackup = () => {
    const payload = buildTimeManagerPayload(entries, plans, "manual");
    downloadJsonBackup(payload);
    setBackupMeta(readLastBackupMeta());
    setSyncMessage(`JSON备份已导出：${entries.length} 条记录`);
  };

  const importJsonBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      saveImportSnapshot(entries, plans);
      setSnapshotMeta(readImportSnapshot());
      const payload = await readJsonFile(file);
      setEntries(payload.entries);
      saveEntries(payload.entries);
      setPlans(payload.plans);
      savePlans(payload.plans);
      setBackupMeta(saveLastBackupMeta(payload));
      setSyncMessage(`JSON导入成功：${payload.entries.length} 条记录`);
    } catch {
      setSyncMessage("JSON导入失败：文件格式不正确");
    }
  };

  const restoreSnapshot = () => {
    const snapshot = readImportSnapshot();
    if (!snapshot) {
      setSyncMessage("暂无可恢复快照");
      return;
    }
    setEntries(snapshot.entries);
    saveEntries(snapshot.entries);
    setPlans(snapshot.plans);
    savePlans(snapshot.plans);
    setSnapshotMeta(snapshot);
    setSyncMessage(`已恢复导入前快照：${snapshot.entries.length} 条记录`);
  };

  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(24, 0, 0, 0);
  const dayRemainMs = endOfDay.getTime() - now.getTime();
  const dayTotalMs = 24 * 60 * 60 * 1000;

  const weekStart = new Date(now);
  const day = weekStart.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const weekTotalMs = weekEnd.getTime() - weekStart.getTime();
  const weekRemainMs = weekEnd.getTime() - now.getTime();

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthTotalMs = monthEnd.getTime() - monthStart.getTime();
  const monthRemainMs = monthEnd.getTime() - now.getTime();

  const nowHm = { day: toHm(dayRemainMs), week: toHm(weekRemainMs), month: toHm(monthRemainMs) };
  const monthCells = useMemo(() => buildMonthCells(calendarBase), [calendarBase]);

  const selectedDayEntries = useMemo(() => entries.filter((x) => x.date === selectedCalendarDate), [entries, selectedCalendarDate]);
  const selectedDayTotal = useMemo(() => selectedDayEntries.reduce((s, x) => s + x.minutes, 0), [selectedDayEntries]);
  const timeAnalysis = useMemo(() => buildTimeManagerAnalysis(entries, plans, today), [entries, plans]);

  const monthTitle = useMemo(() => {
    const d = new Date(calendarBase);
    return `${d.getFullYear()}年${d.getMonth() + 1}月`;
  }, [calendarBase]);

  const moveMonth = (delta: number) => {
    const d = new Date(calendarBase);
    d.setMonth(d.getMonth() + delta);
    setCalendarBase(d.toISOString().slice(0, 10));
  };

  return (
    <main className="app-shell morandi-time">
      <div className="address-banner page-nav" aria-label="页面导航">
        <a className="active" href={`/`}>时间管理主页面</a>
        <a href={`/naval-goals`}>目标管理副页面</a>
      </div>
      <DataSafetyPanel
        entryCount={entries.length}
        storageKey={STORAGE_KEY}
        backupKey={BACKUP_KEY}
        snapshotKey={SNAPSHOT_KEY}
        backupMeta={backupMeta}
        snapshotMeta={snapshotMeta}
        syncMessage={syncMessage}
        importFileRef={importFileRef}
        onExportJson={exportJsonBackup}
        onImportJsonClick={() => importFileRef.current?.click()}
        onRestoreSnapshot={restoreSnapshot}
        onExportSyncCode={exportSyncCode}
        onImportSyncCode={importSyncCode}
        onCopySyncLink={copySyncLink}
        onImportJsonChange={importJsonBackup}
      />
      <header className="hero"><div><p className="eyebrow">Aliya Time Manager</p><h1>时间管理主页面</h1><p className="hero-copy">记录每天时间投入，围绕目标管理时间预算、执行记录与复盘。目标管理作为副页面，用来沉淀方向和优先级。版本 {VERSION}</p></div></header>
      <section className="quote-rotator"><span className="quote-meta">时间管理语录 {quoteIndex + 1}/{timeQuotes.length}</span><p>{timeQuotes[quoteIndex]}</p></section>

      <TodayActionPanel
        date={date}
        category={category}
        minutes={minutes}
        note={note}
        todayEntries={todayEntries}
        biEntries={biEntries}
        onSubmit={addEntry}
        onDateChange={setDate}
        onCategoryChange={setCategory}
        onMinutesChange={setMinutes}
        onNoteChange={setNote}
      />

      <GoalBoard
        goals={plans.goalTargets}
        editingGoalId={editingGoalId}
        onEditingGoalIdChange={setEditingGoalId}
        onGoalAdd={goalAdd}
        onGoalMove={goalMove}
        onGoalCopy={goalCopy}
        onGoalUpdate={updateGoal}
      />

      <section className="section">
        <div className="section-heading">
          <h2>预期 vs 实际执行复盘</h2>
          <p>预期来自周度/月度计划，实际来自时间登记；用偏差判断是否需要重排。</p>
        </div>
        <div className="grid dual-grid">
          {[{ title: "本周复盘", data: currentWeekReview, unit: "小时" }, { title: "本月复盘", data: currentMonthReview, unit: "小时" }].map((item) => (
            <div className="card review-card" key={item.title}>
              <div className="review-head">
                <strong>{item.title}</strong>
                <span className="review-badge">{item.data.tone}</span>
              </div>
              <p className="muted-copy">{item.data.label}</p>
              <div className="review-meter" aria-label={`${item.title}达成率`}>
                <div style={{ width: `${Math.min(100, Math.max(0, item.data.completion))}%` }} />
              </div>
              <div className="review-grid">
                <div><span>预期</span><strong>{minutesToHours(item.data.expected)} {item.unit}</strong></div>
                <div><span>实际</span><strong>{minutesToHours(item.data.actual)} {item.unit}</strong></div>
                <div><span>偏差</span><strong>{formatSignedMinutes(item.data.delta)}</strong></div>
                <div><span>达成率</span><strong>{item.data.completion}%</strong></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <AiInsightPanel analysis={timeAnalysis} />

      <section className="section"><div className="section-heading"><h2>周度倒计时日历</h2></div><div className="card">
        <p className="muted-copy">本周剩余 {formatHm(weekRemainMs)}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: "0.8rem", alignItems: "start" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}><strong>{monthTitle}</strong><div style={{ display: "flex", gap: "0.35rem" }}><button type="button" className="entry-toggle" onClick={() => moveMonth(-1)}>‹</button><button type="button" className="entry-toggle" onClick={() => setCalendarBase(today)}>今天</button><button type="button" className="entry-toggle" onClick={() => moveMonth(1)}>›</button></div></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "0.3rem", color: "#8e7f87", fontSize: "0.78rem", marginBottom: "0.3rem" }}>{["周日", "周一", "周二", "周三", "周四", "周五", "周六"].map((w) => <div key={w}>{w}</div>)}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "0.34rem" }}>
              {monthCells.map((cell) => {
                const spent = entries.filter((x) => x.date === cell.date).reduce((s, x) => s + x.minutes, 0);
                const isSelected = cell.date === selectedCalendarDate;
                return <div key={cell.date} onClick={() => setSelectedCalendarDate(cell.date)} style={{ border: isSelected ? "1px solid rgba(158,112,127,0.72)" : "1px solid rgba(114, 99, 107, 0.2)", borderRadius: "11px", overflow: "hidden", background: isSelected ? "rgba(245,233,237,0.96)" : (cell.inMonth ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.5)"), minHeight: "64px", cursor: "pointer" }}><div style={{ background: "linear-gradient(135deg, rgba(182,132,148,0.20), rgba(255,251,252,0.95))", padding: "0.2rem 0.32rem", fontSize: "0.72rem", color: cell.inMonth ? "#6b5b62" : "#ada3a8", borderBottom: "1px dashed rgba(114,99,107,0.18)" }}>{cell.day}日</div><div style={{ padding: "0.28rem 0.32rem", fontSize: "0.76rem", color: "#4b3f45" }}>{Math.round(spent / 60)}h</div></div>;
              })}
            </div>
          </div>
          <div className="flip-column" style={{ minHeight: "500px", display: "grid", gridTemplateRows: "1fr 1fr 1fr auto", gap: "0.23rem" }}>
            <div className="flip-row"><div className="flip-label">日倒计时</div><div className="flip-track"><div className="flip-card"><span>{String(nowHm.day.h)}</span><em>小时</em></div><div className="flip-sep">:</div><div className="flip-card"><span>{String(nowHm.day.m).padStart(2, "0")}</span><em>分钟</em></div></div></div>
            <div className="flip-row"><div className="flip-label">周倒计时</div><div className="flip-track"><div className="flip-card"><span>{String(nowHm.week.h)}</span><em>小时</em></div><div className="flip-sep">:</div><div className="flip-card"><span>{String(nowHm.week.m).padStart(2, "0")}</span><em>分钟</em></div></div></div>
            <div className="flip-row"><div className="flip-label">月倒计时</div><div className="flip-track"><div className="flip-card"><span>{String(nowHm.month.h)}</span><em>小时</em></div><div className="flip-sep">:</div><div className="flip-card"><span>{String(nowHm.month.m).padStart(2, "0")}</span><em>分钟</em></div></div></div>
            <div style={{ display: "grid", gap: "0.72rem", alignContent: "end", marginTop: "0.08rem" }}>
              <div><div className="muted-copy">日周期进度（倒计时 {Math.round((dayRemainMs / dayTotalMs) * 100)}% · {nowHm.day.h * 60 + nowHm.day.m} 分钟）</div><div style={{ height: "10px", borderRadius: "999px", background: "rgba(114,99,107,0.15)" }}><div style={{ height: "100%", width: `${Math.min(100, Math.max(0, (dayRemainMs / dayTotalMs) * 100))}%`, borderRadius: "999px", background: "linear-gradient(90deg, #b68494, #d1a8b4)" }} /></div></div>
              <div><div className="muted-copy">周周期进度（倒计时 {Math.round((weekRemainMs / weekTotalMs) * 100)}% · {nowHm.week.h} 小时）</div><div style={{ height: "10px", borderRadius: "999px", background: "rgba(114,99,107,0.15)" }}><div style={{ height: "100%", width: `${Math.min(100, Math.max(0, (weekRemainMs / weekTotalMs) * 100))}%`, borderRadius: "999px", background: "linear-gradient(90deg, #b68494, #d1a8b4)" }} /></div></div>
              <div><div className="muted-copy">月周期进度（倒计时 {Math.round((monthRemainMs / monthTotalMs) * 100)}% · {toDays(monthRemainMs)} 天）</div><div style={{ height: "10px", borderRadius: "999px", background: "rgba(114,99,107,0.15)" }}><div style={{ height: "100%", width: `${Math.min(100, Math.max(0, (monthRemainMs / monthTotalMs) * 100))}%`, borderRadius: "999px", background: "linear-gradient(90deg, #b68494, #d1a8b4)" }} /></div></div>
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: "0.8rem", alignItems: "start", marginTop: "0.5rem" }}>
          <div className="card"><strong>{selectedCalendarDate} 时间投入明细</strong><p className="muted-copy">当日总投入 {selectedDayTotal} 分钟</p><ul className="log-list">{selectedDayEntries.length === 0 ? <li><span>当日暂无登记</span></li> : selectedDayEntries.map((item) => <li key={`sel-${item.id}`}><strong>{item.category}</strong><span className="detail-line"><span className="detail-key">投入</span><span className="detail-value">{item.minutes} 分钟</span></span><span className="detail-line"><span className="detail-key">说明</span><span className="detail-value">{item.note || "-"}</span></span></li>)}</ul></div>
          <div className="card"><strong>今日登记</strong><form className="form-grid" onSubmit={addEntry}><label><span>日期</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><label><span>分类</span><select value={category} onChange={(e) => setCategory(e.target.value as TimeCategory)}><option>深度工作</option><option>沟通协作</option><option>学习成长</option><option>健康运动</option><option>生活事务</option><option>娱乐放松</option></select></label><label><span>投入分钟</span><input type="number" min="5" step="5" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></label><label><span>说明</span><textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label><button type="submit">保存记录</button></form></div>
        </div>
      </div></section>

      <section className="section"><div className="section-heading"><h2>双日复盘</h2></div><div className="grid stats-grid"><div className="card"><div className="stat-label">两日总投入</div><div className="stat-value">{sumMinutes(biEntries)} 分钟</div></div><div className="card"><div className="stat-label">今日投入</div><div className="stat-value">{sumMinutes(todayEntries)} 分钟</div></div><div className="card"><div className="stat-label">建议</div><div className="stat-value">{sumMinutes(todayEntries) < 240 ? "先补足核心4小时" : "结构可持续 继续保持"}</div></div></div></section>

      <section className="section">
        <div className="section-heading"><h2>日度时间看板（双周自然周）</h2></div>
        {biWeekBuckets.map((bucket, idx) => {
          const biWeekSeries = CATEGORIES.map((cat) => ({
            category: cat,
            points: bucket.dates.map((d) => ({ date: d, minutes: bucket.list.filter((x) => x.date === d && x.category === cat).reduce((s, x) => s + x.minutes, 0) }))
          }));
          const biWeekMax = Math.max(60, ...biWeekSeries.flatMap((s) => s.points.map((p) => p.minutes)), 1);
          const focus = bucket.list.filter((x) => x.category === "深度工作").reduce((s, x) => s + x.minutes, 0);
          const noise = bucket.list.filter((x) => x.category === "生活事务" || x.category === "娱乐放松").reduce((s, x) => s + x.minutes, 0);
          const biWeekSuggestion = focus < 1200 ? "双周深度工作偏少 建议每天固定2小时黄金时段" : (noise > focus ? "事务与娱乐高于核心产出 建议压缩低价值时间" : "投入结构较均衡 继续按计划推进");
          const biPlan = getBiWeekPlan(bucket.start);
          return (
            <details key={bucket.start} className="card" open={bucket.start === currentBiWeekKey || (idx === 0 && !biWeekBuckets.some((item) => item.start === currentBiWeekKey))}>
              <summary className="muted-copy">{bucket.start} ~ {bucket.end}（双周自然周） · 总投入 {bucket.total} 分钟</summary>
              <div style={{ display: "flex", justifyContent: "flex-end", margin: "0.35rem 0" }}><button type="button" className="entry-toggle" onClick={(e) => { e.preventDefault(); copyBiWeekBoard(bucket.start); }}>复制双周看板</button></div>
              <p className="muted-copy">按分类展示周期内每天投入变化（单位：分钟）</p>
              <svg viewBox="0 0 840 320" style={{ width: "100%", height: "320px" }}>
                {[0, 1, 2, 3, 4].map((i) => { const y = 280 - (220 / 4) * i; return <line key={`grid-${bucket.start}-${i}`} x1="50" y1={y} x2="810" y2={y} stroke="rgba(60,72,95,0.12)" />; })}
                <line x1="50" y1="280" x2="810" y2="280" stroke="rgba(60,72,95,0.25)" />
                <line x1="50" y1="40" x2="50" y2="280" stroke="rgba(60,72,95,0.25)" />
                {biWeekSeries.map((series) => { const points = series.points.map((p, i) => `${50 + (760 / 13) * i},${280 - (p.minutes / biWeekMax) * 220}`).join(" "); return <polyline key={`${bucket.start}-${series.category}`} fill="none" stroke={CATEGORY_COLORS[series.category]} strokeWidth="2.4" points={points} />; })}
                {biWeekSeries.map((series) => series.points.map((p, i) => {
                  const x = 50 + (760 / 13) * i;
                  const y = 280 - (p.minutes / biWeekMax) * 220;
                  const isActive = selectedLinePoint?.bucketStart === bucket.start
                    && selectedLinePoint?.date === p.date
                    && selectedLinePoint?.category === series.category;
                  return (
                    <circle
                      key={`pt-${bucket.start}-${series.category}-${p.date}`}
                      cx={x}
                      cy={y}
                      r={isActive ? 5.2 : 3.8}
                      fill={p.minutes === 0 ? "#ffffff" : CATEGORY_COLORS[series.category]}
                      stroke={CATEGORY_COLORS[series.category]}
                      strokeWidth={isActive ? 2.4 : 1.6}
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedLinePoint({ bucketStart: bucket.start, date: p.date, category: series.category, minutes: p.minutes })}
                    />
                  );
                }))}
                {[0, 1, 2, 3, 4].map((i) => { const y = 280 - (220 / 4) * i; const v = Math.round((biWeekMax / 4) * i); return <text key={`y-${bucket.start}-${i}`} x="8" y={y + 4} fontSize="9" fill="#6d7892">{v}</text>; })}
                <text x="20" y="28" fontSize="10" fill="#6d7892">Y轴：分钟(min)</text>
                {bucket.dates.map((d, i) => <text key={`${bucket.start}-${d}`} x={50 + (760 / 13) * i} y={300} fontSize="9" textAnchor="middle" fill="#6d7892">{d.slice(5)}</text>)}
                <text x="760" y="315" fontSize="10" fill="#6d7892">X轴：日期(月-日)</text>
              </svg>
              <details className="card" style={{ marginTop: "0.55rem" }} open>
                <summary className="muted-copy" style={{ cursor: "pointer" }}>折线点明细（可展开/收起）</summary>
                <div style={{ marginTop: "0.45rem" }}>
                  {selectedLinePoint && selectedLinePoint.bucketStart === bucket.start ? (
                    <>
                      <span className="detail-line"><span className="detail-key">日期</span><span className="detail-value">{selectedLinePoint.date}</span></span>
                      <span className="detail-line"><span className="detail-key">时间分类</span><span className="detail-value">{selectedLinePoint.category}</span></span>
                      <span className="detail-line"><span className="detail-key">投入时间</span><span className="detail-value">{selectedLinePoint.minutes} 分钟</span></span>
                    </>
                  ) : (
                    <span className="muted-copy">点击折线数据点可查看投入时间与时间分类标签（含0投入点）</span>
                  )}
                </div>
              </details>
              <div className="grid dual-grid">
                <div className="card" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}><svg viewBox="0 0 240 240" style={{ width: "260px", height: "260px" }}>{donutSlices(bucket.categoryMap, 120, 120, 88).map((s) => s.path ? <path key={`d-${bucket.start}-${s.category}`} d={s.path} fill={CATEGORY_COLORS[s.category]} stroke="#fff" strokeWidth="1" /> : null)}<circle cx="120" cy="120" r="46" fill="#fff" /><text x="120" y="116" textAnchor="middle" fontSize="13" fill="#44506b">双周</text><text x="120" y="136" textAnchor="middle" fontSize="13" fill="#44506b">{bucket.total}m</text></svg></div>
                <div className="card"><ul className="log-list" style={{ maxHeight: "220px", overflow: "auto" }}><li><strong>双周投入建议</strong><span className="detail-line"><span className="detail-key">建议</span><span className="detail-value">{biWeekSuggestion}</span></span></li><li><strong>个人备注（双周）</strong><label><span>备注内容</span><textarea rows={6} style={{ width: "100%", minHeight: "140px" }} value={biPlan.note} onChange={(e) => updateBiWeekPlan(bucket.start, { note: e.target.value })} /></label></li></ul></div>
              </div>
            </details>
          );
        })}
      </section>

      <section className="section"><div className="section-heading"><h2>周度看板（环形分布）</h2></div>
        {weeklyBuckets.map((bucket, idx) => {
          const plan = getWeeklyPlan(bucket.start);
          return (
            <details key={bucket.start} className="card" open={idx === 0}>
              <summary className="muted-copy">{bucket.start} ~ {bucket.end}（自然周） · 总投入 {minutesToHours(bucket.total)} 小时</summary>
              <div style={{ display: "flex", justifyContent: "flex-end", margin: "0.35rem 0" }}><button type="button" className="entry-toggle" onClick={(e) => { e.preventDefault(); copyWeeklyBoard(bucket.start); }}>复制周度看板</button></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem", alignItems: "center", marginTop: "0.6rem" }}><div style={{ display: "flex", justifyContent: "center" }}><div><svg viewBox="0 0 240 240" style={{ width: "280px", height: "280px" }}>{donutSlices(bucket.categoryMap, 120, 120, 88).map((s) => s.path ? <path key={`w-${bucket.start}-${s.category}`} d={s.path} fill={CATEGORY_COLORS[s.category]} stroke="#fff" strokeWidth="1" /> : null)}<circle cx="120" cy="120" r="46" fill="#fff" /><text x="120" y="116" textAnchor="middle" fontSize="13" fill="#44506b">周度</text><text x="120" y="136" textAnchor="middle" fontSize="13" fill="#44506b">{minutesToHours(bucket.total)}h</text></svg></div></div><div className="card" style={{ maxHeight: "360px", overflow: "auto" }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr 0.72fr 0.92fr", gap: "0.45rem", alignItems: "center" }}><strong>分类</strong><strong>实际汇总</strong><strong>预期时间(h)</strong><strong>复盘备注</strong>{CATEGORIES.map((name) => <><span key={`${bucket.start}-${name}-k`} style={{ whiteSpace: "nowrap" }}>{name}</span><span key={`${bucket.start}-${name}-a`} style={{ whiteSpace: "nowrap" }}>{minutesToHours(bucket.categoryMap[name])} 小时</span><input key={`${bucket.start}-${name}-p`} style={{ width: "100%", minWidth: "86px" }} type="number" min="0" step="0.5" value={plan.targets[name] ?? 0} onChange={(e) => updateWeeklyPlan(bucket.start, { targets: { ...plan.targets, [name]: Number(e.target.value || 0) } })} /><input key={`${bucket.start}-${name}-n`} style={{ width: "100%" }} value={plan.notes[name] ?? ""} onChange={(e) => updateWeeklyPlan(bucket.start, { notes: { ...plan.notes, [name]: e.target.value } })} placeholder="复盘备注" /></>)}</div></div></div>
            </details>
          );
        })}
      </section>

      <section className="section"><div className="section-heading"><h2>月度看板（环形分布）</h2></div>
        {monthlyBuckets.map((bucket, idx) => {
          const plan = getMonthlyPlan(bucket.monthKey);
          return (
            <details key={bucket.monthKey} className="card" open={idx === 0}>
              <summary className="muted-copy">{bucket.monthKey}（自然月） · 总投入 {minutesToDays(bucket.total)} 天</summary>
              <div style={{ display: "flex", justifyContent: "flex-end", margin: "0.35rem 0" }}><button type="button" className="entry-toggle" onClick={(e) => { e.preventDefault(); copyMonthlyBoard(bucket.monthKey); }}>复制月度看板</button></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem", alignItems: "center", marginTop: "0.6rem" }}><div style={{ display: "flex", justifyContent: "center" }}><div><svg viewBox="0 0 240 240" style={{ width: "280px", height: "280px" }}>{donutSlices(bucket.categoryMap, 120, 120, 88).map((s) => s.path ? <path key={`m-${bucket.monthKey}-${s.category}`} d={s.path} fill={CATEGORY_COLORS[s.category]} stroke="#fff" strokeWidth="1" /> : null)}<circle cx="120" cy="120" r="46" fill="#fff" /><text x="120" y="116" textAnchor="middle" fontSize="13" fill="#44506b">月度</text><text x="120" y="136" textAnchor="middle" fontSize="13" fill="#44506b">{minutesToDays(bucket.total)}d</text></svg></div></div><div className="card" style={{ maxHeight: "360px", overflow: "auto" }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr 0.72fr 0.92fr", gap: "0.45rem", alignItems: "center" }}><strong>分类</strong><strong>实际汇总</strong><strong>预期时间(d)</strong><strong>复盘备注</strong>{CATEGORIES.map((name) => <><span key={`${bucket.monthKey}-${name}-k`} style={{ whiteSpace: "nowrap" }}>{name}</span><span key={`${bucket.monthKey}-${name}-a`} style={{ whiteSpace: "nowrap" }}>{minutesToDays(bucket.categoryMap[name])} 天</span><input key={`${bucket.monthKey}-${name}-p`} style={{ width: "100%", minWidth: "86px" }} type="number" min="0" step="0.1" value={plan.targets[name] ?? 0} onChange={(e) => updateMonthlyPlan(bucket.monthKey, { targets: { ...plan.targets, [name]: Number(e.target.value || 0) } })} /><input key={`${bucket.monthKey}-${name}-n`} style={{ width: "100%" }} value={plan.notes[name] ?? ""} onChange={(e) => updateMonthlyPlan(bucket.monthKey, { notes: { ...plan.notes, [name]: e.target.value } })} placeholder="复盘备注" /></>)}</div></div></div>
            </details>
          );
        })}
      </section>

      <section className="section"><div className="section-heading"><h2>最近记录</h2></div><div className="card"><ul className="log-list">{entries.length === 0 ? <li><span>暂无记录</span></li> : entries.slice(0, 30).map((item) => (<li key={item.id} onClick={() => setEditingId(item.id)}>{editingId === item.id ? (<form className="form-grid" onSubmit={(e) => { e.preventDefault(); setEditingId(null); }}><label><span>日期</span><input type="date" value={item.date} onChange={(e) => updateEntry(item.id, { date: e.target.value })} /></label><label><span>分类</span><select value={item.category} onChange={(e) => updateEntry(item.id, { category: e.target.value as TimeCategory })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label><label><span>投入分钟</span><input type="number" min="5" step="5" value={item.minutes} onChange={(e) => updateEntry(item.id, { minutes: Number(e.target.value || 0) })} /></label><label><span>说明</span><textarea rows={2} value={item.note} onChange={(e) => updateEntry(item.id, { note: e.target.value })} /></label><button type="submit">保存修改</button></form>) : (<><strong>{item.date} · {item.category}</strong><span className="detail-line"><span className="detail-key">投入</span><span className="detail-value">{item.minutes} 分钟</span></span><span className="detail-line"><span className="detail-key">说明</span><span className="detail-value">{item.note || "-"}</span></span></>)}</li>))}</ul></div></section>

      <section className="section">
        <div className="section-heading">
          <h2>Aliya&apos;s 投资 SOP</h2>
          <p>日度新建全流程；历史日期自动存档并默认收起。</p>
        </div>
        <div className="card invest-sop-banner">
          <strong>流程总览</strong>
          <p className="muted-copy">固定总流程（基线：{FLOW_BASELINE_DATE}，支持编辑）</p>
          <div className="fixed-flow">
            {fixedFlowSections.map((section) => (
              <div key={`fixed-${section.id}`} className="fixed-flow-col">
                <input
                  className="fixed-flow-l2-input"
                  value={section.title}
                  onChange={(e) => updateInvestSopSection(section.id, { title: e.target.value }, FLOW_BASELINE_DATE)}
                />
                <div className="fixed-flow-l3">
                  {section.items.map((item) => (
                    <div key={`fixed-${section.id}-${item.id}`}>
                      <input
                        className="fixed-flow-l3-input"
                        value={item.title}
                        onChange={(e) => updateInvestSopItem(section.id, item.id, { title: e.target.value }, FLOW_BASELINE_DATE)}
                      />
                      {itemThirdChildren(item).map((child) => (
                        <input
                          key={`fixed-${section.id}-${item.id}-${child.id}`}
                          className="fixed-flow-l4-input"
                          value={child.title}
                          onChange={(e) => updateThirdItem(section.id, item.id, child.id, e.target.value, FLOW_BASELINE_DATE)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="muted-copy">当日可编辑流程图（按日度新建）</p>
          <div className="sop-flowchart">
            {sortInvestSections(getSopSectionsByDate(sopDate)).map((section, sectionIndex, allSections) => (
              <div key={`flow-${section.id}`} className="flow-stage">
                <div className="flow-stage-head">
                  <input
                    value={section.title}
                    onChange={(e) => updateInvestSopSection(section.id, { title: e.target.value })}
                    aria-label={`${section.title}-标题`}
                  />
                </div>
                <div className="flow-stage-items">
                  {section.items.map((item) => (
                    <details key={`flow-item-${item.id}`} className="flow-item">
                      <summary>
                        <span className="flow-item-title">{item.title || "未命名二级子项"}</span>
                      </summary>
                      <div className="flow-third-items">
                        <label className="invest-field" style={{ marginBottom: "0.2rem" }}>
                          <span>二级子项名称</span>
                          <input
                            value={item.title}
                            onChange={(e) => updateInvestSopItem(section.id, item.id, { title: e.target.value })}
                            aria-label={`${item.title}-节点`}
                          />
                        </label>
                        {itemThirdChildren(item).length === 0 && (
                          <div className="muted-copy">暂无三级子项，点击下方按钮新增。</div>
                        )}
                        {itemThirdChildren(item).map((child) => (
                          <div key={`flow-child-${child.id}`} className="flow-third-item">
                            <input
                              value={child.title}
                              onChange={(e) => updateThirdItem(section.id, item.id, child.id, e.target.value)}
                              aria-label={`${child.title}-子节点`}
                            />
                          </div>
                        ))}
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <button type="button" className="entry-toggle" onClick={() => addThirdItem(section.id, item.id)}>
                            新增三级子项
                          </button>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
                {sectionIndex < allSections.length - 1 && <div className="flow-arrow">→</div>}
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "0.5rem", alignItems: "center" }}>
            <input type="date" value={sopDate} onChange={(e) => setSopDate(e.target.value || today)} />
            <button type="button" className="entry-toggle" onClick={() => ensureSopDate(sopDate)}>新建当日流程</button>
            <button type="button" className="entry-toggle" onClick={triggerManualNextDaySop}>手动触发次日新建</button>
            <button type="button" className="entry-toggle" onClick={exportTodaySopSummary}>导出今日SOP摘要</button>
          </div>
          {archivedSopDates.length > 0 && (
            <details className="flow-archive-root">
              <summary className="muted-copy">流程图历史存档（按日期）</summary>
              <div className="flow-archive-list">
                {archivedSopDates.map((dateKey) => (
                  <details key={`flow-archive-${dateKey}`} className="flow-archive-day">
                    <summary>{dateKey}</summary>
                    <div className="sop-flowchart flowchart-readonly">
                      {sortInvestSections(getSopSectionsByDate(dateKey)).map((section, sectionIndex, allSections) => (
                        <div key={`flow-archive-stage-${dateKey}-${section.id}`} className="flow-stage">
                          <div className="flow-stage-head"><span>{section.title}</span></div>
                          <div className="flow-stage-items">
                            {section.items.map((item) => (
                              <details key={`flow-archive-item-${dateKey}-${item.id}`} className="flow-item">
                                <summary><span className="flow-item-title">{item.title || "未命名二级子项"}</span></summary>
                                <div className="flow-third-items">
                                  {itemThirdChildren(item).map((child) => (
                                    <div key={`flow-archive-child-${dateKey}-${item.id}-${child.id}`} className="flow-third-item">
                                      <span className="detail-value">{child.title}</span>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            ))}
                          </div>
                          {sectionIndex < allSections.length - 1 && <div className="flow-arrow">→</div>}
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </details>
          )}
        </div>
        <div className="card invest-sop-root">
          <div className="invest-sop-grid">
            {sortInvestSections(getSopSectionsByDate(sopDate)).map((section) => (
              <details key={section.id} className="invest-sop-section" open>
                <summary>
                  <div className="invest-sop-header">
                    <strong>{section.title}</strong>
                    <span className="muted-copy">{section.items.length} 个小项</span>
                  </div>
                  <p className="muted-copy">{section.intro}</p>
                </summary>
                <div className="invest-sop-body">
                  <div className="invest-sop-items">
                    {section.items.map((item) => (
                      <details key={item.id} className="invest-sop-item">
                        <summary className="invest-sop-item-summary">
                          <strong>{item.title || "未命名小项"}</strong>
                          <span className="muted-copy">{item.note ? item.note.slice(0, 40) : "点击展开填写执行内容"}</span>
                        </summary>
                        <div className="invest-sop-item-body">
                          <label className="invest-field">
                            <span>小项标题</span>
                            <input
                              value={item.title}
                              onChange={(e) => updateInvestSopItem(section.id, item.id, { title: e.target.value })}
                              placeholder="例如：竞价观察"
                            />
                          </label>
                          <label className="invest-field">
                            <span>执行内容（三级子项）</span>
                            <div className="invest-note-lines">
                              {itemThirdChildren(item).map((child, lineIndex) => (
                                <div key={`${item.id}-line-${child.id}`} className="invest-note-line">
                                  <input
                                    value={child.title}
                                    onChange={(e) => updateThirdItem(section.id, item.id, child.id, e.target.value)}
                                    placeholder={`第 ${lineIndex + 1} 条执行内容`}
                                  />
                                  <button
                                    type="button"
                                    className="entry-toggle"
                                    onClick={() => updateInvestSopItem(section.id, item.id, { children: itemThirdChildren(item).filter((c) => c.id !== child.id) })}
                                  >
                                    删行
                                  </button>
                                </div>
                              ))}
                              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                <button type="button" className="entry-toggle" onClick={() => addThirdItem(section.id, item.id)}>
                                  新增一行
                                </button>
                              </div>
                            </div>
                          </label>
                          <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <button type="button" className="entry-toggle" onClick={() => removeInvestSopItem(section.id, item.id)}>
                              删除小项
                            </button>
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                  <label className="invest-field">
                    <span>本模块执行备注</span>
                    <textarea
                      rows={3}
                      value={section.notes}
                      onChange={(e) => updateInvestSopSection(section.id, { notes: e.target.value })}
                      placeholder="记录今天的判断、风险点和执行结论"
                    />
                  </label>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button type="button" className="entry-toggle" onClick={() => addInvestSopItem(section.id)}>
                      新增小项
                    </button>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
        {archivedSopDates.length > 0 && (
          <div className="card invest-sop-root" style={{ marginTop: "0.75rem" }}>
            <strong>历史存档</strong>
            <div className="invest-sop-grid" style={{ marginTop: "0.6rem" }}>
              {archivedSopDates.map((dateKey) => (
                <details key={dateKey} className="invest-sop-section">
                  <summary>
                    <div className="invest-sop-header">
                      <strong>{dateKey}</strong>
                      <span className="muted-copy">已归档</span>
                    </div>
                  </summary>
                  <div className="invest-sop-body">
                    {sortInvestSections(getSopSectionsByDate(dateKey)).map((section) => (
                      <details key={`${dateKey}-${section.id}`} className="invest-sop-item" open>
                        <summary className="invest-sop-item-summary">
                          <strong>{section.title}</strong>
                          <span className="muted-copy">{section.notes ? section.notes.slice(0, 40) : "无模块备注"}</span>
                        </summary>
                        <div className="invest-sop-item-body">
                          {section.items.map((item) => (
                            <details key={item.id} className="flow-item">
                              <summary>
                                <span className="flow-item-title">{item.title || "未命名二级子项"}</span>
                              </summary>
                              <div className="flow-third-items">
                                {itemThirdChildren(item).map((child) => (
                                  <div key={`${dateKey}-${item.id}-${child.id}`} className="flow-third-item">
                                    <span className="detail-value">{child.title}</span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
