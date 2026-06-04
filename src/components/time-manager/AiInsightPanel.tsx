import type { TimeManagerAnalysis } from "../../time-manager-analysis";

interface AiInsightPanelProps {
  analysis: TimeManagerAnalysis;
}

export function AiInsightPanel({ analysis }: AiInsightPanelProps) {
  return (
    <section className="section">
      <div className="section-heading">
        <h2>26岁奥德赛复盘建议</h2>
        <p>参考近两周时间分布，从主业、AI&沟通能力建设、自媒体尝试三条线做规划复盘。</p>
      </div>
      <div className="grid dual-grid">
        <div className="card">
          <strong>本地分析摘要</strong>
          <div className="grid stats-grid" style={{ marginTop: "0.6rem" }}>
            <div className="card stat-card"><div className="stat-label">本周投入</div><div className="stat-value">{analysis.weekTotalHours} 小时</div><div className="stat-detail">周起始：{analysis.weekKey}</div></div>
            <div className="card stat-card"><div className="stat-label">深度工作占比</div><div className="stat-value">{analysis.focusRatio}%</div><div className="stat-detail">目标是持续抬高核心时间占比</div></div>
            <div className="card stat-card"><div className="stat-label">事务/娱乐占比</div><div className="stat-value">{analysis.noiseRatio}%</div><div className="stat-detail">过高会挤压复利型任务</div></div>
          </div>
          <ul className="log-list" style={{ marginTop: "0.6rem", maxHeight: "260px" }}>
            {analysis.suggestions.map((item) => <li key={item}><span>{item}</span></li>)}
          </ul>
        </div>
        <div className="card">
          <strong>奥德赛三线规划</strong>
          <p className="muted-copy">统计窗口：{analysis.odyssey.windowLabel} · 总投入 {analysis.odyssey.totalHours} 小时</p>
          <div className="card" style={{ marginTop: "0.6rem", background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(245,233,237,0.72))" }}>
            <div className="stat-label">今日肯定</div>
            <div className="stat-value">{analysis.odyssey.encouragement}</div>
          </div>
          <div className="grid" style={{ marginTop: "0.6rem" }}>
            {analysis.odyssey.tracks.map((track) => (
              <div key={track.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem", alignItems: "center" }}>
                  <strong>{track.title}</strong>
                  <span className="muted-copy">{track.hours}h · {track.ratio}%</span>
                </div>
                <div style={{ height: "9px", borderRadius: "999px", background: "rgba(114,99,107,0.15)", marginTop: "0.45rem" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, track.ratio))}%`, borderRadius: "999px", background: "linear-gradient(90deg, #b68494, #d1a8b4)" }} />
                </div>
                <p className="muted-copy" style={{ marginBottom: 0 }}>{track.advice}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
