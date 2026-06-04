import { FormEvent, useMemo, useState } from "react";

interface SlimLog {
  date: string;
  weightKg: number;
  bodyFatPct: number;
  calories: number;
  exerciseMin: number;
  sleepHours: number;
  moodScore: number;
  stressScore: number;
  anxietyScore: number;
  energyScore: number;
  triggerNote: string;
  recoveryAction: string;
  note: string;
}

const STORAGE_KEY = "aliya-slim-supervisor-v1";
const SLIM_OS_VERSION = "v2026.05.05";

function readLogs(): SlimLog[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<SlimLog>[];
    return parsed.map((item) => ({
      date: item.date ?? new Date().toISOString().slice(0, 10),
      weightKg: item.weightKg ?? 52,
      bodyFatPct: item.bodyFatPct ?? 24,
      calories: item.calories ?? 1600,
      exerciseMin: item.exerciseMin ?? 45,
      sleepHours: item.sleepHours ?? 7,
      moodScore: item.moodScore ?? 7,
      stressScore: item.stressScore ?? 4,
      anxietyScore: item.anxietyScore ?? 4,
      energyScore: item.energyScore ?? 7,
      triggerNote: item.triggerNote ?? "",
      recoveryAction: item.recoveryAction ?? "",
      note: item.note ?? ""
    }));
  } catch {
    return [];
  }
}

export default function SlimSupervisorApp() {
  const [logs, setLogs] = useState<SlimLog[]>(readLogs());
  const [form, setForm] = useState<SlimLog>({
    date: new Date().toISOString().slice(0, 10),
    weightKg: 52,
    bodyFatPct: 24,
    calories: 1600,
    exerciseMin: 45,
    sleepHours: 7,
    moodScore: 7,
    stressScore: 4,
    anxietyScore: 4,
    energyScore: 7,
    triggerNote: "",
    recoveryAction: "",
    note: ""
  });

  const save = (next: SlimLog[]) => {
    setLogs(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = [form, ...logs.filter((item) => item.date !== form.date)].slice(0, 90);
    save(next);
  };

  const trend = useMemo(() => {
    if (logs.length < 2) return "先连续记录两天";
    const latest = logs[0].weightKg;
    const previous = logs[1].weightKg;
    if (latest < previous) return "体重趋势下降 继续保持";
    if (latest > previous) return "体重趋势上升 注意饮食和活动";
    return "体重趋势持平 可提高训练强度";
  }, [logs]);

  const mentalInsight = useMemo(() => {
    if (!logs.length) return "先连续记录三天心理状态";
    const latest = logs[0];
    const mentalScore = latest.moodScore + latest.energyScore - latest.stressScore - latest.anxietyScore;
    if (mentalScore >= 8) return "心理状态稳定 可继续保持训练节奏";
    if (mentalScore >= 3) return "状态中性 建议增加恢复动作和情绪复盘";
    return "心理负荷偏高 建议降负荷并优先睡眠与放松";
  }, [logs]);

  return (
    <main className="app-shell">
      <div className="address-banner">
        <a href={`/`} target="_blank" rel="noreferrer">返回 Life OS</a> · <a href={`/naval-goals`} target="_blank" rel="noreferrer">目标管理系统</a>
      </div>
      <header className="hero">
        <div>
          <p className="eyebrow">Aliya Slim Supervisor</p>
          <h1>减肥监督机</h1>
          <p className="hero-copy">每日记录体重 体脂 热量 运动 睡眠 形成可持续减脂闭环 版本 {SLIM_OS_VERSION}</p>
        </div>
      </header>

      <section className="section">
        <div className="section-heading"><h2>今日登记</h2></div>
        <div className="card">
          <form className="form-grid" onSubmit={submit}>
            <label><span>日期</span><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
            <label><span>体重 kg</span><input type="number" step="0.1" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: Number(e.target.value) })} /></label>
            <label><span>体脂 %</span><input type="number" step="0.1" value={form.bodyFatPct} onChange={(e) => setForm({ ...form, bodyFatPct: Number(e.target.value) })} /></label>
            <label><span>热量 kcal</span><input type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: Number(e.target.value) })} /></label>
            <label><span>运动 min</span><input type="number" value={form.exerciseMin} onChange={(e) => setForm({ ...form, exerciseMin: Number(e.target.value) })} /></label>
            <label><span>睡眠 h</span><input type="number" step="0.1" value={form.sleepHours} onChange={(e) => setForm({ ...form, sleepHours: Number(e.target.value) })} /></label>
            <label><span>情绪评分 1-10</span><input type="number" min="1" max="10" value={form.moodScore} onChange={(e) => setForm({ ...form, moodScore: Number(e.target.value) })} /></label>
            <label><span>压力评分 1-10</span><input type="number" min="1" max="10" value={form.stressScore} onChange={(e) => setForm({ ...form, stressScore: Number(e.target.value) })} /></label>
            <label><span>焦虑评分 1-10</span><input type="number" min="1" max="10" value={form.anxietyScore} onChange={(e) => setForm({ ...form, anxietyScore: Number(e.target.value) })} /></label>
            <label><span>精力评分 1-10</span><input type="number" min="1" max="10" value={form.energyScore} onChange={(e) => setForm({ ...form, energyScore: Number(e.target.value) })} /></label>
            <label><span>压力触发源</span><textarea rows={2} value={form.triggerNote} onChange={(e) => setForm({ ...form, triggerNote: e.target.value })} /></label>
            <label><span>恢复动作</span><textarea rows={2} value={form.recoveryAction} onChange={(e) => setForm({ ...form, recoveryAction: e.target.value })} /></label>
            <label><span>备注</span><textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
            <button type="submit">保存记录</button>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="section-heading"><h2>心理健康模块</h2></div>
        <div className="card">
          <p className="muted-copy">参考市面心理健康产品的量表打卡与恢复闭环：情绪 压力 焦虑 精力 触发源 恢复动作</p>
          <p className="muted-copy">心理提示 {mentalInsight}</p>
        </div>
      </section>

      <section className="section">
        <div className="section-heading"><h2>监督看板</h2></div>
        <div className="card">
          <p className="muted-copy">趋势提示 {trend}</p>
          <ul className="log-list">
            {logs.length === 0 ? <li><span>暂无记录</span></li> : logs.map((item) => (
              <li key={item.date}>
                <strong>{item.date}</strong>
                <span className="detail-line"><span className="detail-key">体重</span><span className="detail-value">{item.weightKg} kg</span></span>
                <span className="detail-line"><span className="detail-key">体脂</span><span className="detail-value">{item.bodyFatPct} %</span></span>
                <span className="detail-line"><span className="detail-key">热量</span><span className="detail-value">{item.calories} kcal</span></span>
                <span className="detail-line"><span className="detail-key">运动</span><span className="detail-value">{item.exerciseMin} min</span></span>
                <span className="detail-line"><span className="detail-key">睡眠</span><span className="detail-value">{item.sleepHours} h</span></span>
                <span className="detail-line"><span className="detail-key">情绪</span><span className="detail-value">{item.moodScore}/10</span></span>
                <span className="detail-line"><span className="detail-key">压力</span><span className="detail-value">{item.stressScore}/10</span></span>
                <span className="detail-line"><span className="detail-key">焦虑</span><span className="detail-value">{item.anxietyScore}/10</span></span>
                <span className="detail-line"><span className="detail-key">精力</span><span className="detail-value">{item.energyScore}/10</span></span>
                <span className="detail-line"><span className="detail-key">触发源</span><span className="detail-value">{item.triggerNote || "-"}</span></span>
                <span className="detail-line"><span className="detail-key">恢复动作</span><span className="detail-value">{item.recoveryAction || "-"}</span></span>
                <span className="detail-line"><span className="detail-key">备注</span><span className="detail-value">{item.note || "-"}</span></span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
