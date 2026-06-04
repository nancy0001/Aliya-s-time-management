import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Horizon = "lifetime" | "fiveYear" | "yearly" | "quarterly" | "monthly" | "weekly";
type GoalStatus = "todo" | "doing" | "done" | "paused";
type IterationFlag = "unchanged" | "iterating" | "replanned";

interface GoalItem {
  id: string;
  horizon: Horizon;
  title: string;
  metric: string;
  target: string;
  status: GoalStatus;
  plan: string;
  progress: string;
  iteration: IterationFlag;
  milestoneDate: string;
  priority?: "P0" | "P1" | "P2" | "P3" | "P4" | "P5";
  completed?: boolean;
}
interface WeeklyScheduleItem {
  id: string;
  goalId: string;
  date: string;
  slot: string;
  task: string;
  priority?: "P0" | "P1" | "P2" | "P3" | "P4" | "P5";
}

interface ResourceItem {
  id: string;
  type: "time" | "energy" | "money" | "attention" | "network";
  name: string;
  current: string;
  target: string;
  action: string;
}

interface InputItem {
  id: string;
  category: "food" | "water" | "sleep" | "information" | "education" | "relationship" | "money" | "emotion" | "rules";
  name: string;
  current: string;
  target: string;
  action: string;
}

interface EnvironmentItem {
  id: string;
  category: "family" | "era" | "school" | "work" | "location" | "system" | "culture" | "network";
  name: string;
  impact: "positive" | "negative" | "mixed";
  strategy: string;
}
interface GoalOSState {
  goals: GoalItem[];
  resources: ResourceItem[];
  inputs: InputItem[];
  environments: EnvironmentItem[];
  schedules: WeeklyScheduleItem[];
}

const STORAGE_KEY = "aliya-life-goal-os-v1";
const GOAL_OS_VERSION = "v2026.05.05";
const LEGACY_STORAGE_KEYS = [
  "naval-life-goal-os-v1",
  "aliya-goals-os-v1",
  "naval-goals-os-v1",
  "life-goal-os-v1",
  "aliya-life-goal-os"
];

const horizonName: Record<Horizon, string> = {
  lifetime: "终生",
  fiveYear: "5年度",
  yearly: "年度",
  quarterly: "季度",
  monthly: "月度",
  weekly: "周度"
};

const statusName: Record<GoalStatus, string> = {
  todo: "未开始",
  doing: "进行中",
  done: "已完成",
  paused: "暂停"
};

const iterationName: Record<IterationFlag, string> = {
  unchanged: "否（保持）",
  iterating: "是（小步迭代）",
  replanned: "是（重规划）"
};

const seedGoals: GoalItem[] = [
  { id: "l1", horizon: "lifetime", title: "终生-健康自由", metric: "健康公式", target: "长期维持运动+饮食+睡眠", status: "doing", plan: "建立终生可持续训练与作息系统", progress: "已建立基础节奏", iteration: "iterating", milestoneDate: "2030-12-31" },
  { id: "l2", horizon: "lifetime", title: "终生-财富自由", metric: "财富公式", target: "专长×杠杆×判断力持续复利", status: "doing", plan: "搭建工资+投资+杠杆收入三层结构", progress: "工资和投资层已启动", iteration: "iterating", milestoneDate: "2030-12-31" },
  { id: "l3", horizon: "lifetime", title: "终生-关系质量", metric: "高质量关系数", target: "长期稳定深度关系", status: "doing", plan: "维护关键关系，减少低质量社交", progress: "已识别重点关系对象", iteration: "unchanged", milestoneDate: "2030-12-31" },
  { id: "l4", horizon: "lifetime", title: "终生-内心平静", metric: "情绪稳定度", target: "低内耗高觉察", status: "doing", plan: "冥想+复盘降低情绪波动", progress: "已开始每日觉察记录", iteration: "iterating", milestoneDate: "2030-12-31" },

  { id: "f1", horizon: "fiveYear", title: "5年-可复制收入系统", metric: "杠杆收入占比", target: "杠杆收入>工资收入", status: "todo", plan: "每年新增1个可复制收入模块", progress: "方案设计中", iteration: "unchanged", milestoneDate: "2030-12-31" },
  { id: "f2", horizon: "fiveYear", title: "5年-个人品牌资产", metric: "公开作品数量", target: "形成持续输出品牌", status: "todo", plan: "输出内容矩阵（文字/视频/产品）", progress: "账号定位中", iteration: "iterating", milestoneDate: "2030-06-30" },
  { id: "f3", horizon: "fiveYear", title: "5年-投资复利曲线", metric: "投资年化", target: "长期正复利并可抗回撤", status: "todo", plan: "建立资产配置和回撤纪律", progress: "复盘框架已搭建", iteration: "iterating", milestoneDate: "2030-12-31" },
  { id: "f4", horizon: "fiveYear", title: "5年-顶级专长形成", metric: "核心技能等级", target: "形成不可替代专长组合", status: "doing", plan: "围绕AI+产品+沟通深耕", progress: "技能图谱已明确", iteration: "unchanged", milestoneDate: "2029-12-31" },

  { id: "y1", horizon: "yearly", title: "年度-健康达标", metric: "体脂/睡眠/训练", target: "每周4练，睡眠均值>=7.5h", status: "doing", plan: "按周训练计划执行", progress: "本月完成率约60%", iteration: "iterating", milestoneDate: "2026-12-31" },
  { id: "y2", horizon: "yearly", title: "年度-财富净增长", metric: "净资产增长", target: "年度净资产达到目标值", status: "doing", plan: "月度预算+投资纪律", progress: "执行中", iteration: "unchanged", milestoneDate: "2026-12-31" },
  { id: "y3", horizon: "yearly", title: "年度-杠杆作品产出", metric: "作品数", target: "至少12个公开作品", status: "todo", plan: "每月1个公开作品", progress: "尚未启动", iteration: "replanned", milestoneDate: "2026-12-31" },
  { id: "y4", horizon: "yearly", title: "年度-关系经营", metric: "深度连接频次", target: "每月2次高质量连接", status: "todo", plan: "固定关系维护日程", progress: "待落地", iteration: "iterating", milestoneDate: "2026-12-31" },
  { id: "y5", horizon: "yearly", title: "年度-认知升级", metric: "阅读+复盘", target: "每周阅读与决策复盘", status: "doing", plan: "每周2次阅读+1次复盘", progress: "保持中", iteration: "unchanged", milestoneDate: "2026-12-31" },

  { id: "q1", horizon: "quarterly", title: "季度-12周战役", metric: "关键战役数", target: "每季度1-3个关键战役", status: "todo", plan: "确定当季唯一主战役", progress: "待确认", iteration: "iterating", milestoneDate: "2026-09-30" },
  { id: "m1", horizon: "monthly", title: "月度-项目推进", metric: "重点项目数", target: "每月3个重点项目", status: "todo", plan: "月初规划，月末复盘", progress: "待启动", iteration: "unchanged", milestoneDate: "2026-06-30" },
  { id: "m2", horizon: "monthly", title: "月初规划", metric: "规划完成率", target: "每月第1周完成月度规划", status: "doing", plan: "明确本月三大目标与资源分配", progress: "进行中", iteration: "unchanged", milestoneDate: "2026-06-05" },
  { id: "m3", horizon: "monthly", title: "月末复盘", metric: "复盘完成率", target: "每月最后1周完成复盘", status: "todo", plan: "复盘偏差与下月修正动作", progress: "待执行", iteration: "iterating", milestoneDate: "2026-06-30" },
  { id: "w1", horizon: "weekly", title: "周度-执行闭环", metric: "MIT完成率", target: "每周3个MIT，完成率>=85%", status: "doing", plan: "每周一设MIT，周日复盘", progress: "本周进行中", iteration: "iterating", milestoneDate: "2026-05-10" },
  { id: "w2", horizon: "weekly", title: "周度-健康基线", metric: "睡眠与训练", target: "睡眠均值>=7h，至少3次运动", status: "todo", plan: "提前排训练时段，晚间固定关机", progress: "待更新", iteration: "iterating", milestoneDate: "2026-05-10" },
  { id: "w3", horizon: "weekly", title: "周度-高杠杆输出", metric: "输出件数", target: "至少1个公开输出", status: "todo", plan: "周中完成初稿，周末发布", progress: "待更新", iteration: "unchanged", milestoneDate: "2026-05-10" },
  { id: "w4", horizon: "weekly", title: "周度-关系维护", metric: "高质量连接", target: "主动深度沟通2次", status: "todo", plan: "周三与周六各安排一次", progress: "待更新", iteration: "iterating", milestoneDate: "2026-05-10" },
  { id: "w5", horizon: "weekly", title: "周度-系统复盘", metric: "复盘完成度", target: "周日完成一次闭环复盘", status: "todo", plan: "记录偏差并给出下周修正动作", progress: "待更新", iteration: "unchanged", milestoneDate: "2026-05-10" }
];

const seedResources: ResourceItem[] = [
  { id: "r1", type: "time", name: "深度工作时间", current: "每周15h", target: "每周25h", action: "每天上午2h无干扰" },
  { id: "r2", type: "energy", name: "睡眠+训练", current: "睡眠6.8h", target: "8h+每周4练", action: "固定22:30入睡" },
  { id: "r3", type: "money", name: "投资本金", current: "稳定投入", target: "长期复利", action: "月度定投+季度复盘" },
  { id: "r4", type: "attention", name: "信息输入", current: "社媒偏多", target: "高质量输入", action: "输入配额制" },
  { id: "r5", type: "network", name: "长期合作者", current: "少量", target: "高质量圈层", action: "每月2次深度连接" }
];

const seedInputs: InputItem[] = [
  { id: "i1", category: "food", name: "食物", current: "外食偏多", target: "天然食物为主", action: "工作日自备或轻食优先" },
  { id: "i2", category: "water", name: "饮水", current: "约1L/天", target: "2L/天", action: "固定时段补水" },
  { id: "i3", category: "sleep", name: "睡眠", current: "6.8h", target: "8h+", action: "22:30上床，早晨自然醒" },
  { id: "i4", category: "information", name: "信息输入", current: "碎片化偏多", target: "高质量输入", action: "设定输入白名单与时段" },
  { id: "i5", category: "education", name: "学习输入", current: "不稳定", target: "每周深度学习4次", action: "固定学习时间块" },
  { id: "i6", category: "relationship", name: "关系输入", current: "偶发交流", target: "持续深度连接", action: "每周主动连接关键关系" },
  { id: "i7", category: "money", name: "资金输入", current: "工资主导", target: "多元现金流", action: "薪资+投资+杠杆收入分层" },
  { id: "i8", category: "emotion", name: "情绪刺激", current: "易受外界干扰", target: "低波动", action: "冥想+情绪记录+延迟反应" },
  { id: "i9", category: "rules", name: "社会规则", current: "被动遵从", target: "主动理解规则", action: "基于规则设计路径" }
];

const seedEnvironments: EnvironmentItem[] = [
  { id: "e1", category: "family", name: "原生家庭影响", impact: "mixed", strategy: "识别模式，保留支持，剥离内耗" },
  { id: "e2", category: "era", name: "时代技术（AI）", impact: "positive", strategy: "主动拥抱AI做杠杆工具" },
  { id: "e3", category: "school", name: "教育背景", impact: "mixed", strategy: "补齐短板，放大优势学科" },
  { id: "e4", category: "work", name: "工作环境", impact: "mixed", strategy: "争取高成长项目，减少低价值消耗" },
  { id: "e5", category: "location", name: "地理位置", impact: "mixed", strategy: "围绕机会密度优化城市与通勤" },
  { id: "e6", category: "system", name: "制度与政策", impact: "mixed", strategy: "关注税务、社保、投资制度红利" },
  { id: "e7", category: "network", name: "人际关系网络", impact: "positive", strategy: "长期主义合作，远离高内耗关系" },
  { id: "e8", category: "culture", name: "文化叙事", impact: "mixed", strategy: "拒绝盲从比较，建立个人价值观" }
];

const goalQuotes = [
  "人生靠少数关键决策而非无数琐碎目标",
  "放弃短期快感用复利思维做长期目标",
  "幸福等于现实减欲望 目标管理的本质是欲望管理",
  "把自己产品化 目标是定位 行动是打磨 杠杆是放大",
  "目标是方向不是枷锁 系统是底层决定结果",
  "少定目标多建规则 自律是设计出来的不是咬牙坚持的",
  "目标要反脆弱 能调整 不崩溃 可迭代",
  "目标导向 情绪靠边 做结果的主人不做情绪的傀儡",
  "规划靠近达成 目标与行动必须百分之百对齐 否则全是内耗",
  "理性 戒情绪 绝对目标导向 动作可控 等于顶级人生模式",
  "目标要精准 价值要匹配 一切关系与行动皆为价值交换",
  "搞钱是核心目标 感情是锦上添花 先立住自己再谈其他",
  "人生要会止损更要会止盈 不甘心是弱者借口 目标清晰才是强者逻辑",
  "一切为我所用 一切为我赋能 目标是终点更是筛选一切的标准",
  "普通人沉迷定目标 聪明人只搭建人生运行系统",
  "短期靠目标拉扯 长期靠结构复利",
  "降低无效欲望就是最高级的目标管理",
  "别追即时结果 把时间投入能叠加增值的事",
  "人生不用排满计划 只守住三个核心长期锚点",
  "选对赛道和规则远比拼命完成小目标更重要",
  "真正的自由是不用被世俗目标绑架人生",
  "优化输入 固化机制 输出会自动兑现目标",
  "少做低价值忙碌 多做有杠杆的长期布局",
  "目标越贪心 执行力越崩塌 极简目标才容易落地",
  "所有内耗都源于目标不清 欲望混乱",
  "靠决策翻身 不靠努力硬熬"
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function withDefaults(parsed?: {
  goals?: GoalItem[];
  resources?: ResourceItem[];
  inputs?: InputItem[];
  environments?: EnvironmentItem[];
  schedules?: WeeklyScheduleItem[];
}): GoalOSState {
  return {
    goals: (parsed?.goals ?? seedGoals).map((g) => ({
      ...g,
      plan: g.plan ?? "待补充",
      progress: g.progress ?? "未更新",
      iteration: g.iteration ?? "unchanged",
      milestoneDate: g.milestoneDate ?? "待定",
      priority: g.priority ?? "P2",
      completed: g.completed ?? false
    })),
    resources: parsed?.resources ?? seedResources,
    inputs: parsed?.inputs ?? seedInputs,
    environments: parsed?.environments ?? seedEnvironments,
    schedules: (parsed?.schedules ?? []).map((s) => ({ ...s, priority: s.priority ?? "P2" }))
  };
}

function dedupeBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const map = new Map<string, T>();
  items.forEach((item) => {
    const key = keyFn(item);
    if (!map.has(key)) {
      map.set(key, item);
    }
  });
  return Array.from(map.values());
}

function ensureWeeklyBackfill(goals: GoalItem[]): GoalItem[] {
  const weekly = goals.filter((g) => g.horizon === "weekly");
  if (weekly.length >= 5) {
    return goals;
  }
  const existingTitles = new Set(goals.map((g) => `${g.horizon}|${g.title}`));
  const weeklySeeds = seedGoals.filter((g) => g.horizon === "weekly");
  const toAdd = weeklySeeds.filter((g) => !existingTitles.has(`${g.horizon}|${g.title}`));
  return [...goals, ...toAdd].map((g) => ({ ...g, priority: g.priority ?? "P2", completed: g.completed ?? false }));
}

function mergeState(base: GoalOSState, incoming: GoalOSState): GoalOSState {
  const goals = dedupeBy(
    [...base.goals, ...incoming.goals].map((g) => ({
      ...g,
      priority: g.priority ?? "P2",
      completed: g.completed ?? false
    })),
    (g) => `${g.id}|${g.horizon}|${g.title}`
  );
  const resources = dedupeBy([...base.resources, ...incoming.resources], (r) => `${r.id}|${r.type}|${r.name}`);
  const inputs = dedupeBy([...base.inputs, ...incoming.inputs], (i) => `${i.id}|${i.category}|${i.name}`);
  const environments = dedupeBy([...base.environments, ...incoming.environments], (e) => `${e.id}|${e.category}|${e.name}`);
  const schedules = dedupeBy([...base.schedules, ...incoming.schedules], (s) => `${s.id}|${s.goalId}|${s.date}|${s.slot}|${s.task}`);
  return { goals: ensureWeeklyBackfill(goals), resources, inputs, environments, schedules };
}

function readState(): GoalOSState {
  const raw = localStorage.getItem(STORAGE_KEY);
  let current = withDefaults();
  if (raw) {
    try {
      current = withDefaults(JSON.parse(raw));
    } catch {
      current = withDefaults();
    }
  }

  const localKeys = Object.keys(localStorage);
  const dynamicLegacyKeys = localKeys.filter((k) => {
    if (k === STORAGE_KEY) return false;
    return /goal|naval|aliya/i.test(k);
  });
  const legacyKeys = Array.from(new Set([...LEGACY_STORAGE_KEYS, ...dynamicLegacyKeys]));

  let merged = current;
  const currentCounts = {
    goals: current.goals.length,
    resources: current.resources.length,
    inputs: current.inputs.length,
    environments: current.environments.length,
    schedules: current.schedules.length
  };
  legacyKeys.forEach((key) => {
    const legacyRaw = localStorage.getItem(key);
    if (!legacyRaw) return;
    try {
      const legacyParsed = withDefaults(JSON.parse(legacyRaw));
      merged = mergeState(merged, legacyParsed);
    } catch {
      // ignore malformed legacy snapshot
    }
  });

  const normalized = {
    ...merged,
    goals: merged.goals.map((g) => ({ ...g, priority: g.priority ?? "P2", completed: g.completed ?? false })),
    schedules: merged.schedules.map((s) => ({ ...s, priority: s.priority ?? "P2" }))
  };
  const hasNewData =
    normalized.goals.length > currentCounts.goals
    || normalized.resources.length > currentCounts.resources
    || normalized.inputs.length > currentCounts.inputs
    || normalized.environments.length > currentCounts.environments
    || normalized.schedules.length > currentCounts.schedules;
  if (hasNewData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

function parseImportFile(text: string) {
  try {
    const parsed = JSON.parse(text);
    return withDefaults(parsed);
  } catch {
    return null;
  }
}

function writeState(goals: GoalItem[], resources: ResourceItem[], inputs: InputItem[], environments: EnvironmentItem[], schedules: WeeklyScheduleItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ goals, resources, inputs, environments, schedules }));
}

export default function NavalGoalsApp() {
  const init = useMemo(() => readState(), []);
  const [goals, setGoals] = useState<GoalItem[]>(init.goals);
  const [resources, setResources] = useState<ResourceItem[]>(init.resources);
  const [inputs, setInputs] = useState<InputItem[]>(init.inputs);
  const [environments, setEnvironments] = useState<EnvironmentItem[]>(init.environments);
  const [schedules, setSchedules] = useState<WeeklyScheduleItem[]>(init.schedules ?? []);
  const [transferMessage, setTransferMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState("");
  const [horizon, setHorizon] = useState<Horizon>("weekly");
  const [metric, setMetric] = useState("");
  const [target, setTarget] = useState("");
  const [plan, setPlan] = useState("");
  const [progress, setProgress] = useState("");
  const [iteration, setIteration] = useState<IterationFlag>("unchanged");
  const [milestoneDate, setMilestoneDate] = useState("");
  const [goalPriority, setGoalPriority] = useState<"P0" | "P1" | "P2" | "P3" | "P4" | "P5">("P2");
  const [resourceType, setResourceType] = useState<ResourceItem["type"]>("time");
  const [resourceName, setResourceName] = useState("");
  const [resourceCurrent, setResourceCurrent] = useState("");
  const [resourceTarget, setResourceTarget] = useState("");
  const [resourceAction, setResourceAction] = useState("");
  const [inputCategory, setInputCategory] = useState<InputItem["category"]>("food");
  const [inputName, setInputName] = useState("");
  const [inputCurrent, setInputCurrent] = useState("");
  const [inputTarget, setInputTarget] = useState("");
  const [inputAction, setInputAction] = useState("");
  const [envCategory, setEnvCategory] = useState<EnvironmentItem["category"]>("family");
  const [envName, setEnvName] = useState("");
  const [envImpact, setEnvImpact] = useState<EnvironmentItem["impact"]>("mixed");
  const [envStrategy, setEnvStrategy] = useState("");
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [showInputForm, setShowInputForm] = useState(false);
  const [showEnvironmentForm, setShowEnvironmentForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [editingInputId, setEditingInputId] = useState<string | null>(null);
  const [editingEnvironmentId, setEditingEnvironmentId] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [scheduleGoalId, setScheduleGoalId] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleSlot, setScheduleSlot] = useState("09:00-10:30");
  const [scheduleTask, setScheduleTask] = useState("");
  const [schedulePriority, setSchedulePriority] = useState<"P0" | "P1" | "P2" | "P3" | "P4" | "P5">("P2");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % goalQuotes.length);
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const grouped = useMemo(() => {
    return {
      lifetime: goals.filter((x) => x.horizon === "lifetime"),
      fiveYear: goals.filter((x) => x.horizon === "fiveYear"),
      yearly: goals.filter((x) => x.horizon === "yearly"),
      quarterly: goals.filter((x) => x.horizon === "quarterly"),
      monthly: goals.filter((x) => x.horizon === "monthly"),
      weekly: goals.filter((x) => x.horizon === "weekly")
    };
  }, [goals]);

  const addGoal = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }
    const created: GoalItem = {
      id: uid(),
      horizon,
      title: title.trim(),
      metric: metric.trim() || "待定义",
      target: target.trim() || "待定义",
      status: "todo",
      plan: plan.trim() || "待补充",
      progress: progress.trim() || "未更新",
      iteration,
      milestoneDate: milestoneDate || "待定",
      priority: goalPriority,
      completed: false
    };
    const next: GoalItem[] = [created, ...goals].map((g) => ({
      ...g,
      plan: g.plan ?? "待补充",
      progress: g.progress ?? "未更新",
      iteration: g.iteration ?? "unchanged",
      milestoneDate: g.milestoneDate ?? "待定"
    }));
    setGoals(next);
    writeState(next, resources, inputs, environments, schedules);
    setTitle("");
    setMetric("");
    setTarget("");
    setPlan("");
    setProgress("");
    setIteration("unchanged");
    setMilestoneDate("");
    setGoalPriority("P2");
  };

  const cycleStatus = (id: string) => {
    const order: GoalStatus[] = ["todo", "doing", "done", "paused"];
    const next = goals.map((g) => {
      if (g.id !== id) return g;
      const idx = order.indexOf(g.status);
      return { ...g, status: order[(idx + 1) % order.length] };
    });
    setGoals(next);
    writeState(next, resources, inputs, environments, schedules);
  };

  const addResource = (event: FormEvent) => {
    event.preventDefault();
    if (!resourceName.trim()) return;
    const next = [{ id: uid(), type: resourceType, name: resourceName.trim(), current: resourceCurrent.trim() || "-", target: resourceTarget.trim() || "-", action: resourceAction.trim() || "-" }, ...resources];
    setResources(next);
    writeState(goals, next, inputs, environments, schedules);
    setResourceName(""); setResourceCurrent(""); setResourceTarget(""); setResourceAction("");
  };

  const addInput = (event: FormEvent) => {
    event.preventDefault();
    if (!inputName.trim()) return;
    const next = [{ id: uid(), category: inputCategory, name: inputName.trim(), current: inputCurrent.trim() || "-", target: inputTarget.trim() || "-", action: inputAction.trim() || "-" }, ...inputs];
    setInputs(next);
    writeState(goals, resources, next, environments, schedules);
    setInputName(""); setInputCurrent(""); setInputTarget(""); setInputAction("");
  };

  const addEnvironment = (event: FormEvent) => {
    event.preventDefault();
    if (!envName.trim()) return;
    const next = [{ id: uid(), category: envCategory, name: envName.trim(), impact: envImpact, strategy: envStrategy.trim() || "-" }, ...environments];
    setEnvironments(next);
    writeState(goals, resources, inputs, next, schedules);
    setEnvName(""); setEnvStrategy("");
  };

  const addSchedule = (event: FormEvent) => {
    event.preventDefault();
    if (!scheduleGoalId || !scheduleDate || !scheduleTask.trim()) return;
    const next = [{ id: uid(), goalId: scheduleGoalId, date: scheduleDate, slot: scheduleSlot, task: scheduleTask.trim(), priority: schedulePriority }, ...schedules];
    setSchedules(next);
    writeState(goals, resources, inputs, environments, next);
    setScheduleTask("");
    setSchedulePriority("P2");
  };

  const updateResource = (id: string, patch: Partial<ResourceItem>) => {
    const next = resources.map((item) => item.id === id ? { ...item, ...patch } : item);
    setResources(next);
    writeState(goals, next, inputs, environments, schedules);
  };

  const updateInput = (id: string, patch: Partial<InputItem>) => {
    const next = inputs.map((item) => item.id === id ? { ...item, ...patch } : item);
    setInputs(next);
    writeState(goals, resources, next, environments, schedules);
  };

  const updateEnvironment = (id: string, patch: Partial<EnvironmentItem>) => {
    const next = environments.map((item) => item.id === id ? { ...item, ...patch } : item);
    setEnvironments(next);
    writeState(goals, resources, inputs, next, schedules);
  };

  const updateGoal = (id: string, patch: Partial<GoalItem>) => {
    const next = goals.map((item) => item.id === id ? { ...item, ...patch } : item);
    setGoals(next);
    writeState(next, resources, inputs, environments, schedules);
  };

  const toggleGoalCompleted = (id: string, completed: boolean) => {
    const next: GoalItem[] = goals.map((item) => {
      if (item.id !== id) return item;
      const nextStatus: GoalStatus = completed ? "done" : (item.status === "done" ? "doing" : item.status);
      return { ...item, completed, status: nextStatus };
    });
    setGoals(next);
    writeState(next, resources, inputs, environments, schedules);
  };

  const setGoalProgressState = (id: string, state: "todo" | "doing" | "done") => {
    const next: GoalItem[] = goals.map((item) => {
      if (item.id !== id) return item;
      return { ...item, status: state, completed: state === "done" };
    });
    setGoals(next);
    writeState(next, resources, inputs, environments, schedules);
  };

  const goalBadge = (goal: GoalItem) => {
    if (goal.status === "done") return "✅";
    if (goal.status === "doing") return "🎯";
    return "❌";
  };

  const exportData = () => {
    const payload = { goals, resources, inputs, environments, schedules, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aliya-life-goal-os-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setTransferMessage("已导出当前目标系统数据");
  };

  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseImportFile(text);
    if (!parsed) {
      setTransferMessage("导入失败：文件格式不正确");
      return;
    }
    const nextGoals = ensureWeeklyBackfill(parsed.goals);
    setGoals(nextGoals);
    setResources(parsed.resources);
    setInputs(parsed.inputs);
    setEnvironments(parsed.environments);
    setSchedules(parsed.schedules);
    writeState(nextGoals, parsed.resources, parsed.inputs, parsed.environments, parsed.schedules);
    setTransferMessage(`导入完成：目标 ${nextGoals.length} 项，周度目标 ${nextGoals.filter((g) => g.horizon === "weekly").length} 项`);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const recoverFromLegacy = () => {
    const merged = readState();
    setGoals(merged.goals);
    setResources(merged.resources);
    setInputs(merged.inputs);
    setEnvironments(merged.environments);
    setSchedules(merged.schedules);
    setTransferMessage(`已尝试恢复旧数据：周度目标 ${merged.goals.filter((g) => g.horizon === "weekly").length} 项`);
  };

  return (
    <main className="app-shell">
      <div className="address-banner">新目标系统地址: <a href="/naval-goals">/naval-goals</a></div>
      <div className="address-banner">
        数据迁移工具：
        <button className="entry-toggle" onClick={recoverFromLegacy}>恢复旧版本数据</button>
        {" "}
        <button className="entry-toggle" onClick={exportData}>导出JSON</button>
        {" "}
        <button className="entry-toggle" onClick={() => fileInputRef.current?.click()}>导入JSON</button>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={importData} style={{ display: "none" }} />
        {transferMessage ? <span style={{ marginLeft: "0.6rem", color: "#5f6982" }}>{transferMessage}</span> : null}
      </div>
      <header className="hero">
        <div>
          <p className="eyebrow">Aliya's Life Goal OS</p>
          <h1>Aliya's Life Goal OS 目标管理系统</h1>
          <p className="hero-copy">终生 → 5年 → 年度 → 季度 → 月度 → 周度，配套资源系统管理。版本 {GOAL_OS_VERSION}</p>
        </div>
      </header>
      <section className="quote-rotator">
        <span className="quote-meta">目标管理名言 {quoteIndex + 1}/{goalQuotes.length}</span>
        <p>{goalQuotes[quoteIndex]}</p>
      </section>

      <section className="section">
        <div className="section-heading"><h2>月度与周度重点</h2></div>
        <div className="grid dual-grid">
          <div className="card">
            <h3>月度目标</h3>
            <ul className="log-list">
              {goals.filter((g) => g.horizon === "monthly").map((g) => (
                <li key={`top-m-${g.id}`}>
                  <strong>{goalBadge(g)} {g.title}</strong>
                  <label><span>推进状态</span><select className="mini-select" value={g.status} onChange={(e) => setGoalProgressState(g.id, e.target.value as "todo" | "doing" | "done")}>
                    <option value="todo">未完成 ❌</option>
                    <option value="doing">推进中 🎯</option>
                    <option value="done">已完成 ✅</option>
                  </select></label>
                  <span className="detail-line"><span className="detail-key">优先级</span><span className="detail-value">{g.priority ?? "P2"}</span></span>
                  <span className="detail-line"><span className="detail-key">时间节点</span><span className="detail-value">{g.milestoneDate}</span></span>
                  <span className="detail-line"><span className="detail-key">进度</span><span className="detail-value">{g.progress}</span></span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3>周度目标</h3>
            <ul className="log-list">
              {goals.filter((g) => g.horizon === "weekly").map((g) => (
                <li key={`top-w-${g.id}`}>
                  <strong>{goalBadge(g)} {g.title}</strong>
                  <label><span>推进状态</span><select className="mini-select" value={g.status} onChange={(e) => setGoalProgressState(g.id, e.target.value as "todo" | "doing" | "done")}>
                    <option value="todo">未完成 ❌</option>
                    <option value="doing">推进中 🎯</option>
                    <option value="done">已完成 ✅</option>
                  </select></label>
                  <span className="detail-line"><span className="detail-key">优先级</span><span className="detail-value">{g.priority ?? "P2"}</span></span>
                  <span className="detail-line"><span className="detail-key">时间节点</span><span className="detail-value">{g.milestoneDate}</span></span>
                  <span className="detail-line"><span className="detail-key">进度</span><span className="detail-value">{g.progress}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading"><h2>新增目标</h2></div>
        <div className="entry-row">
          <span className="entry-row-label">目标字段管理</span>
          <button className="entry-toggle" onClick={() => setShowGoalForm((prev) => !prev)}>
            数据登记入口 {showGoalForm ? "（收起）" : "（展开）"}
          </button>
        </div>
        {showGoalForm ? (
          <div className="card">
            <form className="form-grid" onSubmit={addGoal}>
              <label><span>目标名称</span><input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
              <label><span>层级</span><select value={horizon} onChange={(e) => setHorizon(e.target.value as Horizon)}>{Object.keys(horizonName).map((k) => <option key={k} value={k}>{horizonName[k as Horizon]}</option>)}</select></label>
              <label><span>衡量指标</span><textarea rows={2} value={metric} onChange={(e) => setMetric(e.target.value)} /></label>
              <label><span>目标值</span><textarea rows={2} value={target} onChange={(e) => setTarget(e.target.value)} /></label>
              <label><span>规划</span><textarea rows={3} value={plan} onChange={(e) => setPlan(e.target.value)} /></label>
              <label><span>进度</span><textarea rows={3} value={progress} onChange={(e) => setProgress(e.target.value)} /></label>
              <label><span>是否修改迭代</span><select value={iteration} onChange={(e) => setIteration(e.target.value as IterationFlag)}>
                <option value="unchanged">否（保持）</option>
                <option value="iterating">是（小步迭代）</option>
                <option value="replanned">是（重规划）</option>
              </select></label>
              <label><span>优先级</span><select value={goalPriority} onChange={(e) => setGoalPriority(e.target.value as "P0" | "P1" | "P2" | "P3" | "P4" | "P5")}>
                <option value="P0">P0</option><option value="P1">P1</option><option value="P2">P2</option><option value="P3">P3</option><option value="P4">P4</option><option value="P5">P5</option>
              </select></label>
              <label><span>时间节点</span><input type="date" value={milestoneDate} onChange={(e) => setMilestoneDate(e.target.value)} /></label>
              <button type="submit">保存目标</button>
            </form>
          </div>
        ) : null}
      </section>

      <section className="section">
        <div className="section-heading"><h2>周度目标日程匹配</h2></div>
        <div className="entry-row">
          <span className="entry-row-label">周度日程字段管理</span>
          <button className="entry-toggle" onClick={() => setShowScheduleForm((prev) => !prev)}>
            数据登记入口 {showScheduleForm ? "（收起）" : "（展开）"}
          </button>
        </div>
        {showScheduleForm ? (
          <div className="card">
            <form className="form-grid" onSubmit={addSchedule}>
              <label><span>周度目标</span><select value={scheduleGoalId} onChange={(e) => setScheduleGoalId(e.target.value)}>
                <option value="">请选择</option>
                {goals.filter((g) => g.horizon === "weekly").map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select></label>
              <label><span>日期</span><input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} /></label>
              <label><span>时段</span><input value={scheduleSlot} onChange={(e) => setScheduleSlot(e.target.value)} /></label>
              <label><span>优先级</span><select value={schedulePriority} onChange={(e) => setSchedulePriority(e.target.value as "P0" | "P1" | "P2" | "P3" | "P4" | "P5")}>
                <option value="P0">P0</option><option value="P1">P1</option><option value="P2">P2</option><option value="P3">P3</option><option value="P4">P4</option><option value="P5">P5</option>
              </select></label>
              <label><span>任务</span><textarea rows={2} value={scheduleTask} onChange={(e) => setScheduleTask(e.target.value)} /></label>
              <button type="submit">登记日程</button>
            </form>
            <ul className="log-list">
              {schedules.length === 0 ? <li><span>暂无日程匹配记录</span></li> : schedules.slice(0, 12).map((s) => (
                <li key={s.id}>
                  <strong>{goals.find((g) => g.id === s.goalId)?.title ?? "周度目标"}</strong>
                  <span className="detail-line"><span className="detail-key">日期</span><span className="detail-value">{s.date}</span></span>
                  <span className="detail-line"><span className="detail-key">时段</span><span className="detail-value">{s.slot}</span></span>
                  <span className="detail-line"><span className="detail-key">优先级</span><span className="detail-value">{s.priority ?? "P2"}</span></span>
                  <span className="detail-line"><span className="detail-key">任务</span><span className="detail-value">{s.task}</span></span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {(["lifetime", "fiveYear", "yearly", "quarterly", "monthly", "weekly"] as Horizon[]).map((h) => (
        <section className="section" key={h}>
          <div className="section-heading"><h2>{horizonName[h]}</h2></div>
          {(h === "lifetime" || h === "fiveYear" || h === "yearly") ? (
            <p className="hero-copy">该层级采用单项拆解：每条目标只表达一个结果，便于跟踪和迭代。</p>
          ) : null}
          <ul className="log-list">
            {grouped[h].length === 0 ? <li><span>暂无目标</span></li> : grouped[h].map((g) => (
              <li key={g.id} onClick={() => setEditingGoalId(g.id)}>
                <strong>{g.title}</strong>
                {editingGoalId === g.id ? (
                  <form className="form-grid" onSubmit={(e) => { e.preventDefault(); setEditingGoalId(null); }}>
                    <label><span>目标名称</span><input value={g.title} onChange={(e) => updateGoal(g.id, { title: e.target.value })} /></label>
                    <label><span>层级</span><select value={g.horizon} onChange={(e) => updateGoal(g.id, { horizon: e.target.value as Horizon })}>
                      <option value="lifetime">终生</option>
                      <option value="fiveYear">5年度</option>
                      <option value="yearly">年度</option>
                      <option value="quarterly">季度</option>
                      <option value="monthly">月度</option>
                      <option value="weekly">周度</option>
                    </select></label>
                    <label><span>衡量指标</span><textarea rows={2} value={g.metric} onChange={(e) => updateGoal(g.id, { metric: e.target.value })} /></label>
                    <label><span>目标值</span><textarea rows={2} value={g.target} onChange={(e) => updateGoal(g.id, { target: e.target.value })} /></label>
                    <label><span>规划</span><textarea rows={3} value={g.plan} onChange={(e) => updateGoal(g.id, { plan: e.target.value })} /></label>
                    <label><span>进度</span><textarea rows={3} value={g.progress} onChange={(e) => updateGoal(g.id, { progress: e.target.value })} /></label>
                    <label><span>是否修改迭代</span><select value={g.iteration} onChange={(e) => updateGoal(g.id, { iteration: e.target.value as IterationFlag })}>
                      <option value="unchanged">否（保持）</option>
                      <option value="iterating">是（小步迭代）</option>
                      <option value="replanned">是（重规划）</option>
                    </select></label>
                    <label><span>优先级</span><select value={g.priority ?? "P2"} onChange={(e) => updateGoal(g.id, { priority: e.target.value as "P0" | "P1" | "P2" | "P3" | "P4" | "P5" })}>
                      <option value="P0">P0</option><option value="P1">P1</option><option value="P2">P2</option><option value="P3">P3</option><option value="P4">P4</option><option value="P5">P5</option>
                    </select></label>
                    <label><span>时间节点</span><input type="date" value={g.milestoneDate} onChange={(e) => updateGoal(g.id, { milestoneDate: e.target.value })} /></label>
                    <label><span>状态</span><select value={g.status} onChange={(e) => updateGoal(g.id, { status: e.target.value as GoalStatus })}>
                      <option value="todo">未开始</option>
                      <option value="doing">进行中</option>
                      <option value="done">已完成</option>
                      <option value="paused">暂停</option>
                    </select></label>
                    <button type="submit">保存修改</button>
                  </form>
                ) : (
                  <>
                    <span className="detail-line"><span className="detail-key">衡量指标</span><span className="detail-value">{g.metric}</span></span>
                    <span className="detail-line"><span className="detail-key">目标值</span><span className="detail-value">{g.target}</span></span>
                    <span className="detail-line"><span className="detail-key">规划</span><span className="detail-value">{g.plan}</span></span>
                    <span className="detail-line"><span className="detail-key">进度</span><span className="detail-value">{g.progress}</span></span>
                    <span className="detail-line"><span className="detail-key">是否迭代</span><span className="detail-value">{iterationName[g.iteration]}</span></span>
                    <span className="detail-line"><span className="detail-key">优先级</span><span className="detail-value">{g.priority ?? "P2"}</span></span>
                    <span className="detail-line"><span className="detail-key">时间节点</span><span className="detail-value">{g.milestoneDate}</span></span>
                    <span className="detail-line"><span className="detail-key">状态</span><span className="detail-value">{statusName[g.status]}</span></span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="section">
        <div className="section-heading"><h2>系统资源</h2></div>
        <div className="entry-row">
          <span className="entry-row-label">资源字段管理</span>
          <button className="entry-toggle" onClick={() => setShowResourceForm((prev) => !prev)}>
            数据登记入口 {showResourceForm ? "（收起）" : "（展开）"}
          </button>
        </div>
        {showResourceForm ? (
          <div className="card">
            <form className="form-grid" onSubmit={addResource}>
              <label><span>类型</span><select value={resourceType} onChange={(e) => setResourceType(e.target.value as ResourceItem["type"])}><option value="time">time</option><option value="energy">energy</option><option value="money">money</option><option value="attention">attention</option><option value="network">network</option></select></label>
              <label><span>名称</span><input value={resourceName} onChange={(e) => setResourceName(e.target.value)} /></label>
              <label><span>当前</span><input value={resourceCurrent} onChange={(e) => setResourceCurrent(e.target.value)} /></label>
              <label><span>目标</span><input value={resourceTarget} onChange={(e) => setResourceTarget(e.target.value)} /></label>
              <label><span>动作</span><input value={resourceAction} onChange={(e) => setResourceAction(e.target.value)} /></label>
              <button type="submit">新增资源明细</button>
            </form>
          </div>
        ) : null}
        <ul className="log-list">
          {resources.map((r) => (
            <li key={r.id} onClick={() => setEditingResourceId(r.id)}>
              <strong>{r.name}</strong>
              {editingResourceId === r.id ? (
                <form className="form-grid" onSubmit={(e) => { e.preventDefault(); setEditingResourceId(null); }}>
                  <label><span>类型</span><select value={r.type} onChange={(e) => updateResource(r.id, { type: e.target.value as ResourceItem["type"] })}><option value="time">time</option><option value="energy">energy</option><option value="money">money</option><option value="attention">attention</option><option value="network">network</option></select></label>
                  <label><span>当前</span><input value={r.current} onChange={(e) => updateResource(r.id, { current: e.target.value })} /></label>
                  <label><span>目标</span><input value={r.target} onChange={(e) => updateResource(r.id, { target: e.target.value })} /></label>
                  <label><span>动作</span><input value={r.action} onChange={(e) => updateResource(r.id, { action: e.target.value })} /></label>
                  <button type="submit">保存修改</button>
                </form>
              ) : (
                <>
                  <span className="detail-line"><span className="detail-key">类型</span><span className="detail-value">{r.type}</span></span>
                  <span className="detail-line"><span className="detail-key">当前</span><span className="detail-value">{r.current}</span></span>
                  <span className="detail-line"><span className="detail-key">目标</span><span className="detail-value">{r.target}</span></span>
                  <span className="detail-line"><span className="detail-key">动作</span><span className="detail-value">{r.action}</span></span>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <div className="section-heading"><h2>输入管理（Input）</h2></div>
        <div className="entry-row">
          <span className="entry-row-label">输入字段管理</span>
          <button className="entry-toggle" onClick={() => setShowInputForm((prev) => !prev)}>
            数据登记入口 {showInputForm ? "（收起）" : "（展开）"}
          </button>
        </div>
        <p className="muted-copy">输入决定处理质量。先优化食物、水、睡眠、信息、教育、关系、金钱、情绪刺激与规则理解。</p>
        {showInputForm ? (
          <div className="card">
            <form className="form-grid" onSubmit={addInput}>
              <label><span>类别</span><select value={inputCategory} onChange={(e) => setInputCategory(e.target.value as InputItem["category"])}><option value="food">food</option><option value="water">water</option><option value="sleep">sleep</option><option value="information">information</option><option value="education">education</option><option value="relationship">relationship</option><option value="money">money</option><option value="emotion">emotion</option><option value="rules">rules</option></select></label>
              <label><span>名称</span><input value={inputName} onChange={(e) => setInputName(e.target.value)} /></label>
              <label><span>当前</span><textarea rows={2} value={inputCurrent} onChange={(e) => setInputCurrent(e.target.value)} /></label>
              <label><span>目标</span><textarea rows={2} value={inputTarget} onChange={(e) => setInputTarget(e.target.value)} /></label>
              <label><span>动作</span><textarea rows={3} value={inputAction} onChange={(e) => setInputAction(e.target.value)} /></label>
              <button type="submit">新增输入明细</button>
            </form>
          </div>
        ) : null}
        <ul className="log-list">
          {inputs.map((item) => (
            <li key={item.id} onClick={() => setEditingInputId(item.id)}>
              <strong>{item.name}</strong>
              {editingInputId === item.id ? (
                <form className="form-grid" onSubmit={(e) => { e.preventDefault(); setEditingInputId(null); }}>
                  <label><span>类别</span><select value={item.category} onChange={(e) => updateInput(item.id, { category: e.target.value as InputItem["category"] })}><option value="food">food</option><option value="water">water</option><option value="sleep">sleep</option><option value="information">information</option><option value="education">education</option><option value="relationship">relationship</option><option value="money">money</option><option value="emotion">emotion</option><option value="rules">rules</option></select></label>
                  <label><span>当前</span><textarea rows={2} value={item.current} onChange={(e) => updateInput(item.id, { current: e.target.value })} /></label>
                  <label><span>目标</span><textarea rows={2} value={item.target} onChange={(e) => updateInput(item.id, { target: e.target.value })} /></label>
                  <label><span>动作</span><textarea rows={3} value={item.action} onChange={(e) => updateInput(item.id, { action: e.target.value })} /></label>
                  <button type="submit">保存修改</button>
                </form>
              ) : (
                <>
                  <span className="detail-line"><span className="detail-key">类别</span><span className="detail-value">{item.category}</span></span>
                  <span className="detail-line"><span className="detail-key">当前</span><span className="detail-value">{item.current}</span></span>
                  <span className="detail-line"><span className="detail-key">目标</span><span className="detail-value">{item.target}</span></span>
                  <span className="detail-line"><span className="detail-key">动作</span><span className="detail-value">{item.action}</span></span>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <div className="section-heading"><h2>环境管理（Environment）</h2></div>
        <div className="entry-row">
          <span className="entry-row-label">环境字段管理</span>
          <button className="entry-toggle" onClick={() => setShowEnvironmentForm((prev) => !prev)}>
            数据登记入口 {showEnvironmentForm ? "（收起）" : "（展开）"}
          </button>
        </div>
        <p className="muted-copy">环境不是背景变量，而是可设计杠杆。识别影响方向，再配置适配策略。</p>
        {showEnvironmentForm ? (
          <div className="card">
            <form className="form-grid" onSubmit={addEnvironment}>
              <label><span>类别</span><select value={envCategory} onChange={(e) => setEnvCategory(e.target.value as EnvironmentItem["category"])}><option value="family">family</option><option value="era">era</option><option value="school">school</option><option value="work">work</option><option value="location">location</option><option value="system">system</option><option value="culture">culture</option><option value="network">network</option></select></label>
              <label><span>名称</span><input value={envName} onChange={(e) => setEnvName(e.target.value)} /></label>
              <label><span>影响</span><select value={envImpact} onChange={(e) => setEnvImpact(e.target.value as EnvironmentItem["impact"])}><option value="positive">positive</option><option value="negative">negative</option><option value="mixed">mixed</option></select></label>
              <label><span>策略</span><textarea rows={4} value={envStrategy} onChange={(e) => setEnvStrategy(e.target.value)} /></label>
              <button type="submit">新增环境明细</button>
            </form>
          </div>
        ) : null}
        <ul className="log-list">
          {environments.map((item) => (
            <li key={item.id} onClick={() => setEditingEnvironmentId(item.id)}>
              <strong>{item.name}</strong>
              {editingEnvironmentId === item.id ? (
                <form className="form-grid" onSubmit={(e) => { e.preventDefault(); setEditingEnvironmentId(null); }}>
                  <label><span>类别</span><select value={item.category} onChange={(e) => updateEnvironment(item.id, { category: e.target.value as EnvironmentItem["category"] })}><option value="family">family</option><option value="era">era</option><option value="school">school</option><option value="work">work</option><option value="location">location</option><option value="system">system</option><option value="culture">culture</option><option value="network">network</option></select></label>
                  <label><span>影响</span><select value={item.impact} onChange={(e) => updateEnvironment(item.id, { impact: e.target.value as EnvironmentItem["impact"] })}><option value="positive">positive</option><option value="negative">negative</option><option value="mixed">mixed</option></select></label>
                  <label><span>策略</span><textarea rows={4} value={item.strategy} onChange={(e) => updateEnvironment(item.id, { strategy: e.target.value })} /></label>
                  <button type="submit">保存修改</button>
                </form>
              ) : (
                <>
                  <span className="detail-line"><span className="detail-key">类别</span><span className="detail-value">{item.category}</span></span>
                  <span className="detail-line"><span className="detail-key">影响</span><span className="detail-value">{item.impact}</span></span>
                  <span className="detail-line"><span className="detail-key">策略</span><span className="detail-value">{item.strategy}</span></span>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
