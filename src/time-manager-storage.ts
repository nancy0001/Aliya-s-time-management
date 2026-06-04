import type { PeriodPlanState, TimeEntry, TimeManagerSyncPayload } from "./time-manager-types";

export const STORAGE_KEY = "aliya-time-manager-v1";
export const PLAN_KEY = "aliya-time-manager-plan-v2";
export const LEGACY_PLAN_KEY = "aliya-time-manager-plan-v1";
export const BACKUP_KEY = "aliya-time-manager-backup-v1";
export const SNAPSHOT_KEY = "aliya-time-manager-snapshot-v1";
export const SYNC_VERSION = 2;

export interface TimeManagerBackupMeta {
  exportedAt: string;
  entryCount: number;
  planCount: number;
}

export interface TimeManagerBackupPayload extends TimeManagerSyncPayload {
  origin: string;
  backupKind: "manual" | "snapshot" | "sync";
}

export function buildTimeManagerPayload(
  entries: TimeEntry[],
  plans: PeriodPlanState,
  backupKind: TimeManagerBackupPayload["backupKind"] = "manual"
): TimeManagerBackupPayload {
  return {
    version: SYNC_VERSION,
    exportedAt: new Date().toISOString(),
    origin: window.location.origin,
    backupKind,
    entries,
    plans
  };
}

export function validateTimeManagerPayload(raw: unknown): TimeManagerBackupPayload {
  const payload = raw as Partial<TimeManagerBackupPayload>;
  if (!payload || typeof payload !== "object") {
    throw new Error("payload is not an object");
  }
  if (!Array.isArray(payload.entries)) {
    throw new Error("entries is not an array");
  }
  if (!payload.plans || typeof payload.plans !== "object") {
    throw new Error("plans is missing");
  }
  const validEntries = payload.entries.every((item) => (
    item
    && typeof item.id === "string"
    && typeof item.date === "string"
    && typeof item.category === "string"
    && typeof item.minutes === "number"
  ));
  if (!validEntries) {
    throw new Error("entries contains invalid rows");
  }
  return {
    version: Number(payload.version || 1),
    exportedAt: String(payload.exportedAt || new Date().toISOString()),
    origin: String(payload.origin || "unknown"),
    backupKind: payload.backupKind || "sync",
    entries: payload.entries,
    plans: payload.plans as PeriodPlanState
  };
}

export function encodePayload(payload: TimeManagerSyncPayload) {
  return window.btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

export function decodePayload(code: string) {
  const json = decodeURIComponent(escape(window.atob(code.trim())));
  return validateTimeManagerPayload(JSON.parse(json));
}

export function saveLastBackupMeta(payload: TimeManagerBackupPayload) {
  const meta: TimeManagerBackupMeta = {
    exportedAt: payload.exportedAt,
    entryCount: payload.entries.length,
    planCount: Object.keys(payload.plans || {}).length
  };
  localStorage.setItem(BACKUP_KEY, JSON.stringify(meta));
  return meta;
}

export function readLastBackupMeta(): TimeManagerBackupMeta | null {
  const raw = localStorage.getItem(BACKUP_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TimeManagerBackupMeta;
  } catch {
    return null;
  }
}

export function saveImportSnapshot(entries: TimeEntry[], plans: PeriodPlanState) {
  const payload = buildTimeManagerPayload(entries, plans, "snapshot");
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(payload));
  return payload;
}

export function readImportSnapshot(): TimeManagerBackupPayload | null {
  const raw = localStorage.getItem(SNAPSHOT_KEY);
  if (!raw) return null;
  try {
    return validateTimeManagerPayload(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function downloadJsonBackup(payload: TimeManagerBackupPayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `aliya-time-manager-backup-${payload.exportedAt.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  saveLastBackupMeta(payload);
}

export function readJsonFile(file: File): Promise<TimeManagerBackupPayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(validateTimeManagerPayload(JSON.parse(String(reader.result || "{}"))));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error || new Error("file read failed"));
    reader.readAsText(file, "utf-8");
  });
}
