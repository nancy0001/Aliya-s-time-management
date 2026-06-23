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

// Timestamp format: 2026-06-23T15-30-00 (colons replaced for filesystem compatibility)
function backupFilename(exportedAt: string) {
  const ts = exportedAt.slice(0, 19).replace(/:/g, "-");
  return `aliya-time-manager-backup-${ts}.json`;
}

// Fallback: legacy anchor-click download
function downloadJsonFallback(json: string, filename: string) {
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function downloadJsonBackup(payload: TimeManagerBackupPayload) {
  const json = JSON.stringify(payload, null, 2);
  const filename = backupFilename(payload.exportedAt);

  // Try File System Access API (Chrome 86+, Edge 86+)
  // showSaveFilePicker lets the user pick a folder once; the browser remembers the permission.
  if (typeof (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker === "function") {
    try {
      const handle = await (window as unknown as {
        showSaveFilePicker: (opts: unknown) => Promise<{ createWritable: () => Promise<{ write: (d: string) => Promise<void>; close: () => Promise<void> }> }>
      }).showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: "JSON 备份", accept: { "application/json": [".json"] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      saveLastBackupMeta(payload);
      return;
    } catch (err) {
      // User cancelled the picker — don't fall through to the old method
      if ((err as { name?: string }).name === "AbortError") return;
      // Other errors (permission denied etc.) — fall through to fallback
      console.warn("[TimeManager] showSaveFilePicker failed, using fallback download:", err);
    }
  }

  // Fallback for Safari / Firefox / non-supporting browsers
  downloadJsonFallback(json, filename);
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
