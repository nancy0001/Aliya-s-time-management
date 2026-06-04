import type { RefObject } from "react";
import type { TimeManagerBackupMeta, TimeManagerBackupPayload } from "../../time-manager-storage";

interface DataSafetyPanelProps {
  entryCount: number;
  storageKey: string;
  backupKey: string;
  snapshotKey: string;
  backupMeta: TimeManagerBackupMeta | null;
  snapshotMeta: TimeManagerBackupPayload | null;
  syncMessage: string;
  importFileRef: RefObject<HTMLInputElement | null>;
  onExportJson: () => void;
  onImportJsonClick: () => void;
  onRestoreSnapshot: () => void;
  onExportSyncCode: () => void;
  onImportSyncCode: () => void;
  onCopySyncLink: () => void;
  onImportJsonChange: React.ChangeEventHandler<HTMLInputElement>;
}

export function DataSafetyPanel({
  entryCount,
  storageKey,
  backupKey,
  snapshotKey,
  backupMeta,
  snapshotMeta,
  syncMessage,
  importFileRef,
  onExportJson,
  onImportJsonClick,
  onRestoreSnapshot,
  onExportSyncCode,
  onImportSyncCode,
  onCopySyncLink,
  onImportJsonChange
}: DataSafetyPanelProps) {
  return (
    <section className="card" style={{ marginTop: "0.55rem", marginBottom: "0.65rem" }}>
      <strong>数据安全与跨页面同步</strong>
      <p className="muted-copy">当前数据存储在本浏览器 localStorage。导入会自动保存导入前快照，建议每周导出 JSON 备份。</p>
      <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
        <button type="button" className="entry-toggle" onClick={onExportJson}>导出JSON备份</button>
        <button type="button" className="entry-toggle" onClick={onImportJsonClick}>导入JSON备份</button>
        <button type="button" className="entry-toggle" onClick={onRestoreSnapshot} disabled={!snapshotMeta}>恢复导入前快照</button>
        <button type="button" className="entry-toggle" onClick={onExportSyncCode}>导出同步码</button>
        <button type="button" className="entry-toggle" onClick={onImportSyncCode}>导入同步码</button>
        <button type="button" className="entry-toggle" onClick={onCopySyncLink}>复制自动导入链接</button>
      </div>
      <input ref={importFileRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={onImportJsonChange} />
      <div className="grid stats-grid" style={{ marginTop: "0.6rem" }}>
        <div className="card stat-card">
          <div className="stat-label">当前记录数</div>
          <div className="stat-value">{entryCount} 条</div>
          <div className="stat-detail">存储键：{storageKey}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">最近备份</div>
          <div className="stat-value">{backupMeta ? backupMeta.exportedAt.slice(0, 10) : "未记录"}</div>
          <div className="stat-detail">{backupMeta ? `${backupMeta.entryCount} 条记录` : `建议导出 ${backupKey}`}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">导入前快照</div>
          <div className="stat-value">{snapshotMeta ? snapshotMeta.exportedAt.slice(0, 10) : "暂无"}</div>
          <div className="stat-detail">{snapshotMeta ? `${snapshotMeta.entries.length} 条记录，可恢复` : `快照键：${snapshotKey}`}</div>
        </div>
      </div>
      {syncMessage ? <p className="muted-copy" style={{ marginTop: "0.45rem" }}>{syncMessage}</p> : null}
    </section>
  );
}
