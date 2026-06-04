import type { BucketPlan, PeriodPlanState, TimeCategory, TimeEntry } from "./time-manager-types";
import { CATEGORIES, aggregateByCategory, minutesToDays, minutesToHours, sumMinutes, weekStartOf } from "./time-manager-utils";

export interface CategoryDeviation {
  category: TimeCategory;
  actual: number;
  target: number;
  unit: "小时" | "天";
  delta: number;
  status: "ahead" | "behind" | "onTrack";
}

export interface TimeManagerAnalysis {
  weekKey: string;
  monthKey: string;
  todayTotal: number;
  weekTotalHours: number;
  monthTotalDays: number;
  biWeekTotalHours: number;
  focusRatio: number;
  noiseRatio: number;
  odyssey: OdysseyAnalysis;
  weeklyDeviations: CategoryDeviation[];
  monthlyDeviations: CategoryDeviation[];
  suggestions: string[];
  prompt: string;
}

export interface OdysseyTrack {
  id: "career" | "aiCommunication" | "media";
  title: string;
  minutes: number;
  hours: number;
  ratio: number;
  advice: string;
}

export interface OdysseyAnalysis {
  windowLabel: string;
  totalHours: number;
  tracks: OdysseyTrack[];
  encouragement: string;
}

function emptyPlanTarget(): Record<TimeCategory, number> {
  return { 深度工作: 0, 沟通协作: 0, 学习成长: 0, 健康运动: 0, 生活事务: 0, 娱乐放松: 0 };
}

function planOrEmpty(plan?: BucketPlan): BucketPlan {
  return plan || { targets: emptyPlanTarget(), notes: { 深度工作: "", 沟通协作: "", 学习成长: "", 健康运动: "", 生活事务: "", 娱乐放松: "" } };
}

function comparePlan(
  actualMap: Record<TimeCategory, number>,
  plan: BucketPlan,
  unit: "小时" | "天"
): CategoryDeviation[] {
  return CATEGORIES.map((category) => {
    const actual = unit === "小时" ? minutesToHours(actualMap[category]) : minutesToDays(actualMap[category]);
    const target = Number(plan.targets[category] || 0);
    const delta = Number((actual - target).toFixed(1));
    const tolerance = unit === "小时" ? 0.5 : 0.1;
    const status = delta > tolerance ? "ahead" : delta < -tolerance ? "behind" : "onTrack";
    return { category, actual, target, unit, delta, status };
  });
}

function topBehind(deviations: CategoryDeviation[]) {
  return deviations
    .filter((item) => item.target > 0 && item.status === "behind")
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 2);
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function buildOdysseyAnalysis(entries: TimeEntry[], today: string): OdysseyAnalysis {
  const end = new Date(`${today}T12:00:00`);
  const start = new Date(end);
  start.setDate(end.getDate() - 13);
  const startKey = start.toISOString().slice(0, 10);
  const windowEntries = entries.filter((item) => item.date >= startKey && item.date <= today);
  const total = Math.max(1, sumMinutes(windowEntries));
  const mediaKeywords = ["自媒体", "内容", "视频", "小红书", "公众号", "播客", "账号", "选题", "剪辑", "发布", "脚本"];
  const communicationKeywords = ["沟通", "表达", "汇报", "复盘", "会议", "演讲", "写作", "文档", "协作"];
  const mediaMinutes = windowEntries
    .filter((item) => includesAny(item.note || "", mediaKeywords))
    .reduce((sum, item) => sum + item.minutes, 0);
  const aiCommunicationMinutes = windowEntries
    .filter((item) => item.category === "学习成长" || includesAny(item.note || "", communicationKeywords) || /AI|ai|Codex|大模型/.test(item.note || ""))
    .reduce((sum, item) => sum + item.minutes, 0);
  const careerMinutes = windowEntries
    .filter((item) => item.category === "深度工作" || item.category === "沟通协作")
    .reduce((sum, item) => sum + item.minutes, 0);

  const track = (
    id: OdysseyTrack["id"],
    title: string,
    minutes: number,
    advice: string
  ): OdysseyTrack => ({
    id,
    title,
    minutes,
    hours: minutesToHours(minutes),
    ratio: Number(((minutes / total) * 100).toFixed(1)),
    advice
  });

  const tracks = [
    track(
      "career",
      "主业",
      careerMinutes,
      careerMinutes < 1200
        ? "主业是现金流和现实反馈的底盘。未来两周至少保留4个90分钟深度块，用于关键产出、汇报材料和可见成果。"
        : "主业投入有基本盘。下一步不要只堆时间，要把投入沉淀成可展示的成果、方法论和可复用模板。"
    ),
    track(
      "aiCommunication",
      "AI & 沟通能力建设",
      aiCommunicationMinutes,
      aiCommunicationMinutes < 600
        ? "AI和沟通是26岁阶段的杠杆能力。建议每天至少30分钟练习：用AI拆任务、写复盘、打磨表达或模拟汇报。"
        : "AI和沟通已有连续投入。下一步要做作品化训练：把一次AI工作流、一次汇报框架或一次沟通复盘沉淀成文档。"
    ),
    track(
      "media",
      "自媒体尝试",
      mediaMinutes,
      mediaMinutes < 240
        ? "自媒体先不要追求爆款，先做低成本试验。未来两周完成3个选题、1篇短文或1条视频脚本，验证表达方向。"
        : "自媒体已经开始有投入。下一步关注稳定节奏：固定选题池、固定发布时间、固定复盘指标。"
    )
  ];

  const encouragements = [
    "你已经在把混乱变成结构，这件事本身就很有力量。",
    "26岁不是要一次性证明自己，而是要持续搭建能复利的系统。",
    "今天只要守住一个高价值时间块，就已经在向长期版本的自己靠近。",
    "你不是从零开始，你是在把已有能力重新组织成更强的路径。",
    "稳定记录、稳定复盘、稳定修正，就是你穿越奥德赛时期的船。"
  ];
  const dayIndex = Math.abs(today.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0)) % encouragements.length;

  return {
    windowLabel: `${startKey} ~ ${today}`,
    totalHours: minutesToHours(total),
    tracks,
    encouragement: encouragements[dayIndex]
  };
}

export function buildTimeManagerAnalysis(entries: TimeEntry[], plans: PeriodPlanState, today: string): TimeManagerAnalysis {
  const weekKey = weekStartOf(today);
  const monthKey = today.slice(0, 7);
  const todayEntries = entries.filter((item) => item.date === today);
  const weekEntries = entries.filter((item) => weekStartOf(item.date) === weekKey);
  const monthEntries = entries.filter((item) => item.date.startsWith(monthKey));
  const odyssey = buildOdysseyAnalysis(entries, today);
  const weekMap = aggregateByCategory(weekEntries);
  const monthMap = aggregateByCategory(monthEntries);
  const weekTotal = sumMinutes(weekEntries);
  const monthTotal = sumMinutes(monthEntries);
  const focus = weekMap["深度工作"];
  const noise = weekMap["生活事务"] + weekMap["娱乐放松"];
  const focusRatio = weekTotal > 0 ? Number(((focus / weekTotal) * 100).toFixed(1)) : 0;
  const noiseRatio = weekTotal > 0 ? Number(((noise / weekTotal) * 100).toFixed(1)) : 0;
  const weeklyDeviations = comparePlan(weekMap, planOrEmpty(plans.weeklyPlansByBucket[weekKey]), "小时");
  const monthlyDeviations = comparePlan(monthMap, planOrEmpty(plans.monthlyPlansByBucket[monthKey]), "天");
  const suggestions: string[] = [];
  const weekBehind = topBehind(weeklyDeviations);
  const monthBehind = topBehind(monthlyDeviations);

  if (sumMinutes(todayEntries) < 240) suggestions.push("今日核心投入低于4小时，建议先补一个不被打断的90-120分钟深度工作块。");
  if (focusRatio < 35) suggestions.push("本周深度工作占比偏低，建议把深度工作提前到每天最稳定的黄金时段。");
  if (noiseRatio > focusRatio) suggestions.push("生活事务与娱乐放松占比高于深度工作，建议设置低价值时间上限。");
  weekBehind.forEach((item) => suggestions.push(`本周「${item.category}」落后计划 ${Math.abs(item.delta)}${item.unit}，建议在未来两天补齐。`));
  monthBehind.forEach((item) => suggestions.push(`本月「${item.category}」低于月计划 ${Math.abs(item.delta)}${item.unit}，需要重新安排月内时间预算。`));
  if (suggestions.length === 0) suggestions.push("当前计划与实际投入基本匹配，建议保持记录节奏，并把下一步关注放在产出质量上。");

  const goalLines = plans.goalTargets.slice(0, 8).map((goal, index) => (
    `${index + 1}. [${goal.priority}/${goal.cycle}] ${goal.taskName}：${goal.targetDesc || "未填写目标描述"}；备注：${goal.note || "无"}`
  ));
  const weeklyLines = weeklyDeviations.map((item) => (
    `- ${item.category}: 实际 ${item.actual}${item.unit} / 计划 ${item.target}${item.unit} / 偏差 ${item.delta}${item.unit}`
  ));
  const prompt = [
    "你是一个严谨的个人时间管理教练。请基于下面的数据，输出可执行的时间分配建议。",
    "要求：",
    "1. 先指出最关键的2-3个结构性问题。",
    "2. 再给出未来48小时的具体行动安排。",
    "3. 区分时间投入和结果产出，不要只鼓励多花时间。",
    "4. 输出中文，语气直接、简洁、可执行。",
    "",
    `日期：${today}`,
    `本周起始：${weekKey}`,
    `本月：${monthKey}`,
    `今日投入：${sumMinutes(todayEntries)} 分钟`,
    `本周总投入：${minutesToHours(weekTotal)} 小时`,
    `本月总投入：${minutesToDays(monthTotal)} 天`,
    `本周深度工作占比：${focusRatio}%`,
    `本周事务/娱乐占比：${noiseRatio}%`,
    "",
    "周计划偏差：",
    ...weeklyLines,
    "",
    "当前目标：",
    ...(goalLines.length ? goalLines : ["暂无目标"]),
    "",
    "本地规则建议：",
    ...suggestions.map((item) => `- ${item}`)
  ].join("\n");

  return {
    weekKey,
    monthKey,
    todayTotal: sumMinutes(todayEntries),
    weekTotalHours: minutesToHours(weekTotal),
    monthTotalDays: minutesToDays(monthTotal),
    biWeekTotalHours: odyssey.totalHours,
    focusRatio,
    noiseRatio,
    odyssey,
    weeklyDeviations,
    monthlyDeviations,
    suggestions,
    prompt
  };
}
