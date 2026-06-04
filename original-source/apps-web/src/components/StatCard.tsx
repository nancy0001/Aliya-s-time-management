import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  tone?: "default" | "good" | "warn" | "danger";
  detail?: ReactNode;
}

export function StatCard({ label, value, tone = "default", detail }: StatCardProps) {
  return (
    <div className={`card stat-card tone-${tone}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {detail ? <div className="stat-detail">{detail}</div> : null}
    </div>
  );
}
