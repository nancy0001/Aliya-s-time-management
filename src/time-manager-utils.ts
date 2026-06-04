import type { TimeCategory, TimeEntry } from "./time-manager-types";

export const CATEGORIES: TimeCategory[] = ["深度工作", "沟通协作", "学习成长", "健康运动", "生活事务", "娱乐放松"];

export const CATEGORY_COLORS: Record<TimeCategory, string> = {
  深度工作: "#7C8FB2",
  沟通协作: "#A48FBF",
  学习成长: "#88A88A",
  健康运动: "#C29A7A",
  生活事务: "#7FA0A1",
  娱乐放松: "#C08C9B"
};

export function formatLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function activeSopDateByClock(now = new Date()) {
  const base = new Date(now);
  const hour = base.getHours();
  if (hour >= 18) {
    base.setDate(base.getDate() + 1);
  }
  return formatLocalDate(base);
}

export function shiftDate(date: string, delta: number) {
  const d = parseLocalDate(date);
  d.setDate(d.getDate() + delta);
  return formatLocalDate(d);
}

export function shiftDateBy(base: string, delta: number) {
  const d = parseLocalDate(base);
  d.setDate(d.getDate() + delta);
  return formatLocalDate(d);
}

export function sumMinutes(list: TimeEntry[]) {
  return list.reduce((s, x) => s + x.minutes, 0);
}

export function minutesToHours(minutes: number) {
  return Number((minutes / 60).toFixed(1));
}

export function minutesToDays(minutes: number) {
  return Number((minutes / 480).toFixed(1));
}

export function weekStartOf(dateStr: string) {
  const d = parseLocalDate(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return formatLocalDate(d);
}

export function biWeekStartOf(dateStr: string) {
  const wk = weekStartOf(dateStr);
  const base = new Date(1970, 0, 5, 12, 0, 0, 0).getTime();
  const cur = parseLocalDate(wk).getTime();
  const weekIndex = Math.floor((cur - base) / (7 * 24 * 60 * 60 * 1000));
  const biIndex = weekIndex - (weekIndex % 2);
  const startTime = base + biIndex * 7 * 24 * 60 * 60 * 1000;
  return formatLocalDate(new Date(startTime));
}

export function monthDates(baseDate: string) {
  const d = parseLocalDate(baseDate);
  const y = d.getFullYear();
  const m = d.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const dates: string[] = [];
  for (let i = 0; i < 31; i += 1) {
    const cur = new Date(first);
    cur.setDate(first.getDate() + i);
    if (cur > last) break;
    dates.push(formatLocalDate(cur));
  }
  return dates;
}

export function buildMonthCells(baseDate: string) {
  const d = parseLocalDate(baseDate);
  const year = d.getFullYear();
  const month = d.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const cur = new Date(start);
    cur.setDate(start.getDate() + i);
    return { date: formatLocalDate(cur), day: cur.getDate(), inMonth: cur.getMonth() === month };
  });
}

export function formatHm(ms: number) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}小时 ${m}分`;
}

export function toHm(ms: number) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  return { h: Math.floor(totalMin / 60), m: totalMin % 60 };
}

export function toDays(ms: number) {
  return Math.max(0, Number((ms / (24 * 60 * 60 * 1000)).toFixed(1)));
}

export function aggregateByCategory(items: TimeEntry[]) {
  const map: Record<TimeCategory, number> = { 深度工作: 0, 沟通协作: 0, 学习成长: 0, 健康运动: 0, 生活事务: 0, 娱乐放松: 0 };
  items.forEach((item) => {
    map[item.category] += item.minutes;
  });
  return map;
}

export function donutSlices(categoryMap: Record<TimeCategory, number>, cx = 100, cy = 100, r = 70) {
  const total = Object.values(categoryMap).reduce((s, x) => s + x, 0);
  let start = 0;
  return CATEGORIES.map((category) => {
    const value = categoryMap[category];
    const ratio = total > 0 ? value / total : 0;
    const end = start + ratio * Math.PI * 2;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const largeArc = ratio > 0.5 ? 1 : 0;
    const path = ratio === 0 ? "" : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    start = end;
    return { category, value, path };
  });
}
