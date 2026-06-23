import type { FormEvent } from "react";
import type { TimeCategory, TimeEntry } from "../../time-manager-types";
import { shiftDate, sumMinutes } from "../../time-manager-utils";

interface TodayActionPanelProps {
  date: string;
  category: TimeCategory;
  minutes: string;
  note: string;
  todayEntries: TimeEntry[];
  biEntries: TimeEntry[];
  allEntries: TimeEntry[];
  today: string;
  onSubmit: (event: FormEvent) => void;
  onDateChange: (value: string) => void;
  onCategoryChange: (value: TimeCategory) => void;
  onMinutesChange: (value: string) => void;
  onNoteChange: (value: string) => void;
}

export function TodayActionPanel({
  date,
  category,
  minutes,
  note,
  todayEntries,
  biEntries,
  allEntries,
  today,
  onSubmit,
  onDateChange,
  onCategoryChange,
  onMinutesChange,
  onNoteChange
}: TodayActionPanelProps) {
  const todayTotal = sumMinutes(todayEntries);
  const yesterday = shiftDate(today, -1);
  const yesterdayEntries = allEntries.filter((x) => x.date === yesterday);

  return (
    <section className="section">
      <div className="section-heading"><h2>今日行动台</h2><p>优先完成今日登记、查看投入结构和补录遗漏。</p></div>
      <div className="grid dual-grid">
        <div className="card">
          <strong>今日登记</strong>
          <form className="form-grid" onSubmit={onSubmit} style={{ marginTop: "0.6rem" }}>
            <label><span>日期</span><input type="date" value={date} onChange={(e) => onDateChange(e.target.value)} /></label>
            <label><span>分类</span><select value={category} onChange={(e) => onCategoryChange(e.target.value as TimeCategory)}><option>深度工作</option><option>沟通协作</option><option>学习成长</option><option>健康运动</option><option>生活事务</option><option>娱乐放松</option></select></label>
            <label><span>投入分钟</span><input type="number" min="5" step="5" value={minutes} onChange={(e) => onMinutesChange(e.target.value)} /></label>
            <label><span>说明</span><textarea rows={2} value={note} onChange={(e) => onNoteChange(e.target.value)} /></label>
            <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
              {[15, 30, 45, 60, 90, 120].map((m) => (
                <button key={m} type="button" className="entry-toggle" onClick={() => onMinutesChange(String(m))}>{m}m</button>
              ))}
            </div>
            <button type="submit">保存记录</button>
          </form>
          {yesterdayEntries.length > 0 && (
            <div style={{ marginTop: "0.75rem" }}>
              <p className="muted-copy" style={{ marginBottom: "0.35rem" }}>昨日复制（点击预填表单）</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                {yesterdayEntries.map((item) => (
                  <button
                    key={`copy-${item.id}`}
                    type="button"
                    className="entry-toggle"
                    style={{ fontSize: "0.78rem" }}
                    onClick={() => {
                      onDateChange(today);
                      onCategoryChange(item.category);
                      onMinutesChange(String(item.minutes));
                      onNoteChange(item.note || "");
                    }}
                  >
                    {item.category} · {item.minutes}m
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="card">
          <strong>今日概览</strong>
          <div className="grid stats-grid" style={{ marginTop: "0.6rem" }}>
            <div className="card stat-card"><div className="stat-label">今日投入</div><div className="stat-value">{todayTotal} 分钟</div><div className="stat-detail">{todayTotal < 240 ? "核心时间未满4小时" : "核心投入已达基础线"}</div></div>
            <div className="card stat-card"><div className="stat-label">两日投入</div><div className="stat-value">{sumMinutes(biEntries)} 分钟</div><div className="stat-detail">用于观察短周期波动</div></div>
          </div>
          <ul className="log-list" style={{ marginTop: "0.6rem", maxHeight: "240px" }}>
            {todayEntries.length === 0 ? <li><span>今日暂无登记</span></li> : todayEntries.map((item) => (
              <li key={`today-${item.id}`}><strong>{item.category}</strong><span>{item.minutes} 分钟 · {item.note || "-"}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
