import type { FormEvent } from "react";
import type { GoalCycle, GoalPriority, GoalStatus, GoalTarget, TimeCategory } from "../../time-manager-types";

const cycles: Array<{ key: GoalCycle; title: string; hint: string }> = [
  { key: "日度", title: "日度目标", hint: "今天必须推进的1-3件事，偏执行。" },
  { key: "周度", title: "周度目标", hint: "本周关键结果，偏成果交付。" },
  { key: "月度", title: "月度目标", hint: "本月里程碑，拆到每周执行。" }
];

const priorities: GoalPriority[] = ["P0", "P1", "P2", "P3", "P4", "P5"];
const statuses: GoalStatus[] = ["未开始", "进行中", "已完成", "暂停"];
const categories: TimeCategory[] = ["深度工作", "沟通协作", "学习成长", "健康运动", "生活事务", "娱乐放松"];

interface GoalBoardProps {
  goals: GoalTarget[];
  editingGoalId: string | null;
  onEditingGoalIdChange: (id: string | null) => void;
  onGoalAdd: () => void;
  onGoalMove: (id: string, dir: -1 | 1) => void;
  onGoalCopy: (id: string) => void;
  onGoalDelete: (id: string) => void;
  onGoalUpdate: (id: string, patch: Partial<GoalTarget>) => void;
}

function minutesLabel(minutes?: number) {
  const value = Number(minutes) || 0;
  if (value >= 60) return `${Math.round((value / 60) * 10) / 10} 小时`;
  return `${value} 分钟`;
}

export function GoalBoard({
  goals,
  editingGoalId,
  onEditingGoalIdChange,
  onGoalAdd,
  onGoalMove,
  onGoalCopy,
  onGoalDelete,
  onGoalUpdate
}: GoalBoardProps) {
  return (
    <section className="section">
      <div className="section-heading">
        <h2>周期目标管理</h2>
        <p>按日度、周度、月度拆小项；这里管理预期，实际执行回到时间管理记录。</p>
      </div>
      <div className="goal-cycle-toolbar">
        <button type="button" className="entry-toggle" onClick={onGoalAdd}>新增周度目标</button>
      </div>
      <div className="goal-cycle-grid">
        {cycles.map((cycle) => {
          const cycleGoals = goals.filter((goal) => goal.cycle === cycle.key);
          return (
            <div className="card goal-cycle-card" key={cycle.key}>
              <div className="goal-cycle-head">
                <div>
                  <strong>{cycle.title}</strong>
                  <p className="muted-copy">{cycle.hint}</p>
                </div>
                <span>{cycleGoals.length} 项</span>
              </div>
              <ul className="log-list goal-list">
                {cycleGoals.length === 0 ? <li><span>暂无{cycle.title}</span></li> : cycleGoals.map((g) => {
                  const globalIndex = goals.findIndex((item) => item.id === g.id);
                  return (
                    <li key={g.id} onClick={() => onEditingGoalIdChange(g.id)}>
                      {editingGoalId === g.id ? (
                        <form className="form-grid" onSubmit={(e: FormEvent) => { e.preventDefault(); onEditingGoalIdChange(null); }}>
                          <label><span>任务名</span><input value={g.taskName} onChange={(e) => onGoalUpdate(g.id, { taskName: e.target.value })} /></label>
                          <label><span>目标周期</span><select value={g.cycle} onChange={(e) => onGoalUpdate(g.id, { cycle: e.target.value as GoalCycle })}>{cycles.map((item) => <option key={item.key} value={item.key}>{item.key}</option>)}</select></label>
                          <label><span>优先级</span><select value={g.priority} onChange={(e) => onGoalUpdate(g.id, { priority: e.target.value as GoalPriority })}>{priorities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                          <label><span>状态</span><select value={g.status ?? "进行中"} onChange={(e) => onGoalUpdate(g.id, { status: e.target.value as GoalStatus })}>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                          <label><span>预期投入分钟</span><input type="number" min="0" step="15" value={g.expectedMinutes ?? 0} onChange={(e) => onGoalUpdate(g.id, { expectedMinutes: Number(e.target.value || 0) })} /></label>
                          <label><span>截止日期</span><input type="date" value={g.deadline ?? ""} onChange={(e) => onGoalUpdate(g.id, { deadline: e.target.value })} /></label>
                          <label><span>关联时间分类</span><select value={g.linkedCategory ?? "深度工作"} onChange={(e) => onGoalUpdate(g.id, { linkedCategory: e.target.value as TimeCategory })}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                          <label><span>目标描述</span><textarea rows={2} value={g.targetDesc} onChange={(e) => onGoalUpdate(g.id, { targetDesc: e.target.value })} /></label>
                          <label><span>执行说明</span><textarea rows={2} value={g.note} onChange={(e) => onGoalUpdate(g.id, { note: e.target.value })} /></label>
                          <label><span>复盘备注</span><textarea rows={2} value={g.reviewNote ?? ""} onChange={(e) => onGoalUpdate(g.id, { reviewNote: e.target.value })} /></label>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button type="submit">保存目标</button>
                            <button
                              type="button"
                              style={{ background: "linear-gradient(180deg,#c0392b,#922b21)" }}
                              onClick={(e) => { e.preventDefault(); if (window.confirm("确认删除这个目标？")) onGoalDelete(g.id); }}
                            >删除目标</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="goal-item-head">
                            <strong>{g.taskName}</strong>
                            <span>{g.priority}</span>
                          </div>
                          <span className="detail-line"><span className="detail-key">目标描述</span><span className="detail-value">{g.targetDesc || "-"}</span></span>
                          <div className="goal-meta-grid">
                            <span><em>预期</em>{minutesLabel(g.expectedMinutes)}</span>
                            <span><em>截止</em>{g.deadline || "-"}</span>
                            <span><em>状态</em>{g.status ?? "进行中"}</span>
                            <span><em>分类</em>{g.linkedCategory ?? "深度工作"}</span>
                          </div>
                          <span className="detail-line"><span className="detail-key">复盘</span><span className="detail-value">{g.reviewNote || g.note || "-"}</span></span>
                          <div className="goal-actions" onClick={(e) => e.stopPropagation()}>
                            <button type="button" className="entry-toggle" onClick={() => onGoalMove(g.id, -1)} disabled={globalIndex === 0}>上移</button>
                            <button type="button" className="entry-toggle" onClick={() => onGoalMove(g.id, 1)} disabled={globalIndex === goals.length - 1}>下移</button>
                            <button type="button" className="entry-toggle" onClick={() => onGoalCopy(g.id)}>复制</button>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
