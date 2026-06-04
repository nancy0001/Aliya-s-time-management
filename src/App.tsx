import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { Section } from "./components/Section";
import { StatCard } from "./components/StatCard";
import { DailyLog, EnvironmentFactor, Goal, LifeSystemState, MaslowLevelConfig, MaslowLevelKey } from "./types";

const levels: MaslowLevelConfig[] = [
  { key: "physiology", name: "生理", description: "健康是长期复利的底层资产" },
  { key: "safety", name: "安全", description: "现金流和抗风险能力" },
  { key: "love", name: "社交", description: "长期关系与合作网络" },
  { key: "esteem", name: "尊重", description: "独特能力与可验证作品" },
  { key: "selfActualization", name: "自我实现", description: "长期主义与人生杠杆" }
];

const levelNameMap: Record<MaslowLevelKey, string> = {
  physiology: "生理",
  safety: "安全",
  love: "社交",
  esteem: "尊重",
  selfActualization: "自我实现"
};

const today = new Date().toISOString().slice(0, 10);
const fixedAddress = `${window.location.origin}/`;
const LIFE_OS_VERSION = "v2026.05.05";
const GROWTH_INPUT_KEY = "aliya-growth-inputs-v1";
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface GrowthInput {
  id: string;
  date: string;
  module: "健康输入" | "认知输入" | "心理输入" | "资源环境输入";
  content: string;
  impact: string;
}
const quotePoolZh = [
  "有些人的生活只是吃、动、睡、重复。没有增长，没有思考，也没有真正的价值创造。— 阿克斯",
  "怕是最没用的，懒可以舒服一时。人要言行合一，不要太拧巴。— 曲曲",
  "从系统论和控制论的角度，任何事都要持续稳定地做，在反馈中修正，在迭代里成长。",
  "你对待自己的方式，就是别人对待你的终极态。爱自己是基础。",
  "价格不重要，重要的是价值。",
  "你不改变的，就是你选择的。",
  "不要惧怕 AI，要拥抱 AI。",
  "莫向外求，保持韧劲。",
  "你焦虑，是因为你本身就有完成这件事的能力；就像你不会为了造不出原子弹而焦虑。",
  "肉身就是一个人最大的正念。运动减肥带来的不只是健康，还有自信。",
  "只有光环才能带来溢价。别人爱你时的样子，取决于你值得被爱的程度。",
  "和长期主义者玩长期游戏。— 纳瓦尔",
  "靠真实性逃离竞争。— 纳瓦尔",
  "用头脑赚钱，而不是用时间换钱。— 纳瓦尔",
  "复利是世界第八大奇迹。— 常见归因于爱因斯坦"
];

const quotePoolEn = [
  "Some people live on eat, move, sleep, repeat. No growth, no thinking, no real value creation. — Aks",
  "Fear is useless. Laziness gives short comfort. Align words and actions; stop inner conflict. — 曲曲",
  "From systems and cybernetics: sustain action, correct by feedback, and grow by iteration.",
  "How you treat yourself sets the ceiling for how others treat you. Self-love is the base layer.",
  "Price is not important. Value is important.",
  "What you do not change is what you choose.",
  "Do not fear AI. Embrace AI.",
  "Do not seek externally. Stay resilient.",
  "You feel anxious because you are capable of doing it; you do not feel anxious about not building an atomic bomb.",
  "Your body is your strongest mindfulness anchor. Training and fat loss bring health and confidence.",
  "Only real aura creates premium. The way people love you reflects how worthy you are of being loved.",
  "Play long-term games with long-term people. — Naval Ravikant",
  "Escape competition through authenticity. — Naval Ravikant",
  "Earn with your mind, not your time. — Naval Ravikant",
  "Compound interest is the eighth wonder of the world. — (attributed to) Albert Einstein"
];

const quoteCycle = [
  ...quotePoolZh.map((text) => ({ lang: "zh" as const, text })),
  ...quotePoolEn.map((text) => ({ lang: "en" as const, text }))
];

function avg(values: number[]) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, item) => sum + item, 0) / values.length;
}

export default function App() {
  const [state, setState] = useState<LifeSystemState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalLevel, setNewGoalLevel] = useState<MaslowLevelKey>("physiology");
  const [newGoalTarget, setNewGoalTarget] = useState("1");
  const [newGoalUnit, setNewGoalUnit] = useState("次/周");

  const [logForm, setLogForm] = useState<DailyLog>({
    date: today,
    sleepHours: 7,
    exerciseMinutes: 30,
    focusMinutes: 90,
    socialScore: 7,
    outputScore: 7,
    moodScore: 7
  });

  const [envName, setEnvName] = useState("");
  const [envCategory, setEnvCategory] = useState<EnvironmentFactor["category"]>("tool");
  const [envImpact, setEnvImpact] = useState<EnvironmentFactor["impact"]>("positive");
  const [envRule, setEnvRule] = useState("");

  const [reviewWins, setReviewWins] = useState("");
  const [reviewBlockers, setReviewBlockers] = useState("");
  const [reviewAction, setReviewAction] = useState("");
  const [dailyCapacityMinutes, setDailyCapacityMinutes] = useState(360);
  const [plannedMinutes, setPlannedMinutes] = useState(210);
  const [capitalHealth, setCapitalHealth] = useState(35);
  const [capitalSkill, setCapitalSkill] = useState(45);
  const [capitalNetwork, setCapitalNetwork] = useState(20);
  const [xp, setXp] = useState(120);
  const [level, setLevel] = useState(2);
  const [streakDays, setStreakDays] = useState(3);
  const [decisionTitle, setDecisionTitle] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionResult, setDecisionResult] = useState("");
  const [decisionLogs, setDecisionLogs] = useState<Array<{ id: string; date: string; title: string; reason: string; result: string }>>([]);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [growthModule, setGrowthModule] = useState<GrowthInput["module"]>("健康输入");
  const [growthContent, setGrowthContent] = useState("");
  const [growthImpact, setGrowthImpact] = useState("");
  const [growthInputs, setGrowthInputs] = useState<GrowthInput[]>(() => {
    const raw = localStorage.getItem(GROWTH_INPUT_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as GrowthInput[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    api.getState().then(setState).catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : "加载失败");
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % quoteCycle.length);
    }, 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(GROWTH_INPUT_KEY, JSON.stringify(growthInputs));
  }, [growthInputs]);

  const recentLogs = state?.logs.slice(0, 7) ?? [];

  const metrics = useMemo(() => {
    const sleep = avg(recentLogs.map((item) => item.sleepHours));
    const exercise = avg(recentLogs.map((item) => item.exerciseMinutes));
    const focus = avg(recentLogs.map((item) => item.focusMinutes));
    const mood = avg(recentLogs.map((item) => item.moodScore));
    const completion = state ? Math.round((state.goals.filter((item) => item.active).length / Math.max(state.goals.length, 1)) * 100) : 0;
    return { sleep, exercise, focus, mood, completion };
  }, [recentLogs, state]);

  const navalSignal = useMemo(() => {
    const health = metrics.sleep >= 7 && metrics.exercise >= 30;
    const leverage = metrics.focus >= 100;
    const calm = metrics.mood >= 7;
    const score = [health, leverage, calm].filter(Boolean).length;
    return {
      score,
      text: score <= 1 ? "先修健康和专注，别急着扩张目标" : score === 2 ? "系统可持续，开始增加一个高杠杆输出" : "进入复利区间，保持长期主义节奏"
    };
  }, [metrics.exercise, metrics.focus, metrics.mood, metrics.sleep]);

  const investmentGuidance = useMemo(() => {
    if (!recentLogs.length) {
      return "先连续记录 7 天，形成可用数据，再做资源配置决策。";
    }
    if (metrics.sleep < 7) {
      return "优先投资健康资本：固定睡眠窗口，这是所有回报的底层。";
    }
    if (metrics.focus < 80) {
      return "优先投资专注资本：减少输入噪音，把每天深度工作提升到 90 分钟以上。";
    }
    return "可以增加杠杆资本：每周新增 1 次公开输出（文章、代码、产品迭代）。";
  }, [metrics.focus, metrics.sleep, recentLogs.length]);

  const focusGoal = useMemo(() => {
    return state?.goals.find((item) => item.active) ?? null;
  }, [state]);

  const loadRatio = Math.round((plannedMinutes / Math.max(dailyCapacityMinutes, 1)) * 100);
  const totalCapital = capitalHealth + capitalSkill + capitalNetwork;
  const recentFocus = recentLogs.slice(0, 7).map((item) => item.focusMinutes).reverse();
  const redLine = recentFocus.map((_item, index) => 60 + index * 5);
  const redLineRiskDays = recentFocus.filter((item, index) => item < redLine[index]).length;

  if (!state) {
    return <main className="app-shell"><div className="loading">正在加载你的 LifeOS...</div>{error ? <div className="error-banner">{error}</div> : null}</main>;
  }

  const save = (next: Promise<LifeSystemState>) => {
    next.then((payload) => {
      setState(payload);
      setError(null);
    }).catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : "保存失败");
    });
  };

  const addGoal = (event: FormEvent) => {
    event.preventDefault();
    if (!newGoalTitle.trim()) {
      return;
    }
    const goal: Goal = {
      id: makeId(),
      level: newGoalLevel,
      title: newGoalTitle.trim(),
      targetValue: Number(newGoalTarget) || 1,
      unit: newGoalUnit.trim() || "次/周",
      weeklyTarget: 1,
      active: true
    };
    save(api.addGoal(goal));
    setNewGoalTitle("");
  };

  const addLog = (event: FormEvent) => {
    event.preventDefault();
    const todayScore = (logForm.sleepHours >= 7 ? 10 : 0)
      + (logForm.exerciseMinutes >= 30 ? 10 : 0)
      + (logForm.focusMinutes >= 90 ? 15 : 0)
      + (logForm.moodScore >= 7 ? 5 : 0);
    const nextStreak = todayScore >= 25 ? streakDays + 1 : 0;
    const gainedXp = todayScore + Math.min(nextStreak, 7) * 2;
    const totalXp = xp + gainedXp;
    const xpPerLevel = 100;
    const nextLevel = Math.max(1, Math.floor(totalXp / xpPerLevel) + 1);
    setStreakDays(nextStreak);
    setXp(totalXp);
    setLevel(nextLevel);
    save(api.addDailyLog(logForm));
  };

  const addEnv = (event: FormEvent) => {
    event.preventDefault();
    if (!envName.trim() || !envRule.trim()) {
      return;
    }
    save(api.addEnvironmentFactor({ id: makeId(), category: envCategory, impact: envImpact, name: envName.trim(), rule: envRule.trim() }));
    setEnvName("");
    setEnvRule("");
  };

  const addReview = (event: FormEvent) => {
    event.preventDefault();
    if (!reviewWins.trim() && !reviewBlockers.trim() && !reviewAction.trim()) {
      return;
    }
    save(api.addWeeklyReview({ weekOf: today, wins: reviewWins.trim(), blockers: reviewBlockers.trim(), nextAction: reviewAction.trim() }));
    setReviewWins("");
    setReviewBlockers("");
    setReviewAction("");
  };

  const addDecision = (event: FormEvent) => {
    event.preventDefault();
    if (!decisionTitle.trim()) {
      return;
    }
    setDecisionLogs((prev) => [
      {
        id: makeId(),
        date: today,
        title: decisionTitle.trim(),
        reason: decisionReason.trim(),
        result: decisionResult.trim()
      },
      ...prev
    ].slice(0, 30));
    setDecisionTitle("");
    setDecisionReason("");
    setDecisionResult("");
  };

  const addGrowthInput = (event: FormEvent) => {
    event.preventDefault();
    if (!growthContent.trim()) return;
    setGrowthInputs((prev) => [
      { id: makeId(), date: today, module: growthModule, content: growthContent.trim(), impact: growthImpact.trim() || "-" },
      ...prev
    ].slice(0, 120));
    setGrowthContent("");
    setGrowthImpact("");
  };

  return (
    <main className="app-shell">
      <div className="address-banner">
        固定访问地址: <a href={fixedAddress} target="_blank" rel="noreferrer">{fixedAddress}</a>
      </div>
      <div className="address-banner">
        时间管理系统入口: <a href="/time-manager" target="_blank" rel="noreferrer">/time-manager</a>
      </div>
      <header className="hero">
        <div>
          <p className="eyebrow">LifeOS x Naval Framework</p>
          <h1>Aliya&apos;s life OS</h1>
          <p className="hero-copy">人生是长期复利游戏。先建立判断力，再配置时间资本，最后用杠杆放大价值。版本 {LIFE_OS_VERSION}</p>
        </div>
      </header>
      <section className="quote-rotator">
        <span className="quote-meta">
          {quoteCycle[quoteIndex].lang === "zh" ? `中文 ${quoteIndex + 1}/${quotePoolZh.length}` : `English ${quoteIndex - quotePoolZh.length + 1}/${quotePoolEn.length}`}
        </span>
        <p>{quoteCycle[quoteIndex].text}</p>
      </section>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="overview-strip">
        <div className="overview-item"><span>活跃目标</span><strong>{state.goals.filter((item) => item.active).length} 个</strong></div>
        <div className="overview-item"><span>近7日深度专注</span><strong>{Math.round(metrics.focus)} min</strong></div>
        <div className="overview-item"><span>系统活跃度</span><strong>{metrics.completion}%</strong></div>
        <div className="overview-item"><span>Naval 信号</span><strong>{navalSignal.score}/3</strong></div>
      </section>

      <Section title="Naval 决策面板" subtitle="判断力、长期主义、杠杆、复利">
        <div className="grid stats-grid">
          <StatCard label="核心建议" value={navalSignal.text} tone={navalSignal.score >= 2 ? "good" : "warn"} />
          <StatCard label="资源配置" value={investmentGuidance} tone={metrics.focus >= 80 ? "good" : "warn"} />
          <StatCard label="健康资本" value={`${metrics.sleep.toFixed(1)} h / ${Math.round(metrics.exercise)} min`} tone={metrics.sleep >= 7 && metrics.exercise >= 30 ? "good" : "warn"} />
          <StatCard label="心智资本" value={`${metrics.mood.toFixed(1)} / 10`} tone={metrics.mood >= 7 ? "good" : "warn"} />
        </div>
      </Section>

      <Section title="成长系统" subtitle="行为会积累经验，经验带来升级">
        <div className="grid dual-grid">
          <div className="grid stats-grid">
            <StatCard label="当前等级" value={`Lv.${level}`} tone="good" />
            <StatCard label="总经验值" value={`${xp} XP`} tone="good" />
            <StatCard label="连续连击" value={`${streakDays} 天`} tone={streakDays >= 3 ? "good" : "warn"} />
            <StatCard label="升级进度" value={`${xp % 100}/100`} tone="warn" detail="每日达标行为会获得 XP，连击有额外加成。" />
          </div>
          <div className="card">
            <h3>成长系统输入项</h3>
            <form className="form-grid" onSubmit={addGrowthInput}>
              <label><span>日期</span><input type="date" value={today} readOnly /></label>
              <label><span>模块</span><select value={growthModule} onChange={(e) => setGrowthModule(e.target.value as GrowthInput["module"])}>
                <option value="健康输入">健康输入</option>
                <option value="认知输入">认知输入</option>
                <option value="心理输入">心理输入</option>
                <option value="资源环境输入">资源环境输入</option>
              </select></label>
              <label><span>输入内容</span><textarea rows={2} value={growthContent} onChange={(e) => setGrowthContent(e.target.value)} /></label>
              <label><span>影响与反馈</span><textarea rows={2} value={growthImpact} onChange={(e) => setGrowthImpact(e.target.value)} /></label>
              <button type="submit">保存成长输入</button>
            </form>
            <ul className="log-list">
              {growthInputs.length === 0 ? <li><span>暂无成长输入记录</span></li> : growthInputs.slice(0, 12).map((item) => (
                <li key={item.id}>
                  <strong>{item.date} · {item.module}</strong>
                  <span className="detail-line"><span className="detail-key">输入</span><span className="detail-value">{item.content}</span></span>
                  <span className="detail-line"><span className="detail-key">反馈</span><span className="detail-value">{item.impact}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section title="红线预警" subtitle="像 Beeminder 一样，用最低轨道约束执行">
        <div className="card">
          <div className="grid stats-grid">
            <StatCard label="近7日低于红线" value={`${redLineRiskDays} 天`} tone={redLineRiskDays <= 1 ? "good" : redLineRiskDays <= 3 ? "warn" : "danger"} />
            <StatCard label="当前红线规则" value="专注分钟: 60 -> 90" detail="每天最低专注门槛递增 5 分钟，形成温和拉升。" />
          </div>
          <ul className="log-list">
            {recentFocus.length === 0 ? <li><span>先记录打卡，系统会生成红线。</span></li> : recentFocus.map((value, index) => (
              <li key={`red-${index}`}>
                <strong>第 {index + 1} 天</strong>
                <span>实际: {value} min</span>
                <span>红线: {redLine[index]} min {value < redLine[index] ? "（低于红线）" : "（达标）"}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section title="对标优化模块" subtitle="融合市面成熟产品的方法论">
        <div className="grid stats-grid">
          <StatCard
            label="单焦点挑战（Fabulous）"
            value={focusGoal ? `本周只攻: ${focusGoal.title}` : "先激活 1 个核心目标"}
            tone={focusGoal ? "good" : "warn"}
            detail="一次只强化一个关键习惯，降低系统复杂度。"
          />
          <StatCard
            label="工作量预算（Sunsama）"
            value={`${plannedMinutes} / ${dailyCapacityMinutes} min (${loadRatio}%)`}
            tone={loadRatio <= 85 ? "good" : loadRatio <= 100 ? "warn" : "danger"}
            detail={loadRatio > 100 ? "已超载，建议延期低杠杆任务。" : "工作量处于可持续区间。"}
          />
          <StatCard
            label="资本分配（YNAB）"
            value={`${totalCapital}% 已分配`}
            tone={totalCapital === 100 ? "good" : "warn"}
            detail="把每周可支配时间分配给健康、能力和关系。"
          />
        </div>
      </Section>

      <Section title="五层仪表盘" subtitle="用马斯洛层级做系统平衡">
        <div className="grid stats-grid">
          {levels.map((level) => {
            const levelGoals = state.goals.filter((item) => item.level === level.key);
            const activeCount = levelGoals.filter((item) => item.active).length;
            return (
              <StatCard
                key={level.key}
                label={`${level.name}层`}
                value={`${activeCount}/${Math.max(levelGoals.length, 1)} 项`}
                tone={activeCount > 0 ? "good" : "warn"}
                detail={level.description}
              />
            );
          })}
        </div>
      </Section>

      <Section title="目标系统" subtitle="把抽象理想变成可执行指标">
        <p className="muted-copy">进入完整目标管理系统：<a href="/naval-goals">Aliya&apos;s Life Goal OS</a></p>
        <div className="grid dual-grid">
          <div className="card">
            <h3>新增目标</h3>
            <form className="form-grid" onSubmit={addGoal}>
              <label><span>目标名</span><input value={newGoalTitle} onChange={(event) => setNewGoalTitle(event.target.value)} /></label>
              <label><span>需求层级</span><select value={newGoalLevel} onChange={(event) => setNewGoalLevel(event.target.value as MaslowLevelKey)}>{levels.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</select></label>
              <label><span>目标值</span><input type="number" min="0" step="0.1" value={newGoalTarget} onChange={(event) => setNewGoalTarget(event.target.value)} /></label>
              <label><span>单位</span><input value={newGoalUnit} onChange={(event) => setNewGoalUnit(event.target.value)} /></label>
              <button type="submit">保存目标</button>
            </form>
          </div>
          <div className="card">
            <h3>目标列表</h3>
            <ul className="log-list">
              {state.goals.map((goal) => (
                <li key={goal.id}>
                  <strong>{goal.title}</strong>
                  <span>{levelNameMap[goal.level]}层 · 目标 {goal.targetValue} {goal.unit}</span>
                  <button onClick={() => save(api.toggleGoal(goal.id))}>{goal.active ? "设为暂停" : "重新激活"}</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section title="每日打卡" subtitle="可测量，才可调节">
        <p className="muted-copy">减肥监督机入口：<a href="http://127.0.0.1:8768/fit-supervisor-pwa/index.html" target="_blank" rel="noreferrer">进入减肥监督机</a></p>
        <div className="grid dual-grid">
          <div className="card">
            <h3>今日输入</h3>
            <form className="form-grid" onSubmit={addLog}>
              <label><span>日期</span><input type="date" value={logForm.date} onChange={(event) => setLogForm({ ...logForm, date: event.target.value })} /></label>
              <label><span>睡眠(h)</span><input type="number" step="0.1" value={logForm.sleepHours} onChange={(event) => setLogForm({ ...logForm, sleepHours: Number(event.target.value) })} /></label>
              <label><span>运动(min)</span><input type="number" value={logForm.exerciseMinutes} onChange={(event) => setLogForm({ ...logForm, exerciseMinutes: Number(event.target.value) })} /></label>
              <label><span>专注(min)</span><input type="number" value={logForm.focusMinutes} onChange={(event) => setLogForm({ ...logForm, focusMinutes: Number(event.target.value) })} /></label>
              <label><span>社交(1-10)</span><input type="number" min="1" max="10" value={logForm.socialScore} onChange={(event) => setLogForm({ ...logForm, socialScore: Number(event.target.value) })} /></label>
              <label><span>输出(1-10)</span><input type="number" min="1" max="10" value={logForm.outputScore} onChange={(event) => setLogForm({ ...logForm, outputScore: Number(event.target.value) })} /></label>
              <label><span>情绪(1-10)</span><input type="number" min="1" max="10" value={logForm.moodScore} onChange={(event) => setLogForm({ ...logForm, moodScore: Number(event.target.value) })} /></label>
              <button type="submit">保存打卡</button>
            </form>
          </div>
          <div className="card">
            <h3>最近记录</h3>
            <ul className="log-list">
              {state.logs.length === 0 ? <li><span>暂无数据</span></li> : state.logs.slice(0, 10).map((log) => (
                <li key={log.date}>
                  <strong>{log.date}</strong>
                  <span>睡眠 {log.sleepHours}h · 运动 {log.exerciseMinutes}min · 专注 {log.focusMinutes}min</span>
                  <span>社交 {log.socialScore} / 输出 {log.outputScore} / 情绪 {log.moodScore}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section title="每日计划预算" subtitle="先定容量，再塞任务，避免过载">
        <div className="card">
          <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
            <label><span>今日可用容量(min)</span><input type="number" min="60" value={dailyCapacityMinutes} onChange={(event) => setDailyCapacityMinutes(Number(event.target.value))} /></label>
            <label><span>已计划任务(min)</span><input type="number" min="0" value={plannedMinutes} onChange={(event) => setPlannedMinutes(Number(event.target.value))} /></label>
          </form>
        </div>
      </Section>

      <Section title="时间资本配置" subtitle="像预算金钱一样预算时间">
        <div className="card">
          <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
            <label><span>健康资本 %</span><input type="number" min="0" max="100" value={capitalHealth} onChange={(event) => setCapitalHealth(Number(event.target.value))} /></label>
            <label><span>能力资本 %</span><input type="number" min="0" max="100" value={capitalSkill} onChange={(event) => setCapitalSkill(Number(event.target.value))} /></label>
            <label><span>关系资本 %</span><input type="number" min="0" max="100" value={capitalNetwork} onChange={(event) => setCapitalNetwork(Number(event.target.value))} /></label>
          </form>
          <p className="hero-copy">{totalCapital === 100 ? "分配平衡，可执行。" : `当前总和 ${totalCapital}%，建议调整到 100%。`}</p>
        </div>
      </Section>

      <Section title="环境杠杆" subtitle="先设计环境，再谈自律">
        <div className="grid dual-grid">
          <div className="card">
            <h3>新增环境规则</h3>
            <form className="form-grid" onSubmit={addEnv}>
              <label><span>名称</span><input value={envName} onChange={(event) => setEnvName(event.target.value)} /></label>
              <label><span>类型</span><select value={envCategory} onChange={(event) => setEnvCategory(event.target.value as EnvironmentFactor["category"])}><option value="person">人</option><option value="place">空间</option><option value="tool">工具</option><option value="information">信息</option></select></label>
              <label><span>影响</span><select value={envImpact} onChange={(event) => setEnvImpact(event.target.value as EnvironmentFactor["impact"])}><option value="positive">正向</option><option value="negative">负向</option></select></label>
              <label><span>规则</span><input value={envRule} onChange={(event) => setEnvRule(event.target.value)} /></label>
              <button type="submit">保存规则</button>
            </form>
          </div>
          <div className="card">
            <h3>环境清单</h3>
            <ul className="log-list">
              {state.environment.map((item) => (
                <li key={item.id}>
                  <strong>{item.name}</strong>
                  <span>{item.category} · {item.impact === "positive" ? "正向" : "负向"}</span>
                  <span>{item.rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section title="周复盘" subtitle="偏差 -> 原因 -> 调整动作">
        <div className="grid dual-grid">
          <div className="card">
            <h3>新增复盘</h3>
            <form className="form-grid" onSubmit={addReview}>
              <label><span>本周做得好</span><input value={reviewWins} onChange={(event) => setReviewWins(event.target.value)} /></label>
              <label><span>主要阻碍</span><input value={reviewBlockers} onChange={(event) => setReviewBlockers(event.target.value)} /></label>
              <label><span>下周单点优化</span><input value={reviewAction} onChange={(event) => setReviewAction(event.target.value)} /></label>
              <button type="submit">保存复盘</button>
            </form>
          </div>
          <div className="card">
            <h3>复盘历史</h3>
            <ul className="log-list">
              {state.reviews.map((item) => (
                <li key={`${item.weekOf}-${item.nextAction}`}>
                  <strong>{item.weekOf}</strong>
                  <span>亮点: {item.wins || "-"}</span>
                  <span>阻碍: {item.blockers || "-"}</span>
                  <span>行动: {item.nextAction || "-"}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section title="决策日志" subtitle="记录重大决策，追踪结果，迭代判断力">
        <div className="grid dual-grid">
          <div className="card">
            <h3>新增决策</h3>
            <form className="form-grid" onSubmit={addDecision}>
              <label><span>决策主题</span><input value={decisionTitle} onChange={(event) => setDecisionTitle(event.target.value)} /></label>
              <label><span>决策理由</span><input value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} /></label>
              <label><span>结果复盘</span><input value={decisionResult} onChange={(event) => setDecisionResult(event.target.value)} /></label>
              <button type="submit">保存决策</button>
            </form>
          </div>
          <div className="card">
            <h3>决策历史</h3>
            <ul className="log-list">
              {decisionLogs.length === 0 ? <li><span>暂无决策记录</span></li> : decisionLogs.map((item) => (
                <li key={item.id}>
                  <strong>{item.date} · {item.title}</strong>
                  <span>理由: {item.reason || "-"}</span>
                  <span>结果: {item.result || "-"}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>
    </main>
  );
}
