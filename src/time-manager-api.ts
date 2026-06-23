/**
 * time-manager-api.ts
 *
 * Thin client for the Node/SQLite backend API.
 * All functions fail gracefully — callers fall back to localStorage when
 * `serverAvailable()` returns false or any request throws.
 */

import type { PeriodPlanState, TimeEntry } from "./time-manager-types";

const BASE = "/api";

// ── availability probe ────────────────────────────────────────────────────────

let _available: boolean | null = null; // null = not yet probed

export async function serverAvailable(): Promise<boolean> {
  if (_available !== null) return _available;
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(2000) });
    _available = res.ok;
  } catch {
    _available = false;
  }
  return _available;
}

// Reset cache (called after a failed request so we re-probe next time)
function markUnavailable() {
  _available = false;
}

// ── entries ───────────────────────────────────────────────────────────────────

export async function apiGetEntries(): Promise<TimeEntry[]> {
  const res = await fetch(`${BASE}/entries`);
  if (!res.ok) throw new Error(`GET /api/entries ${res.status}`);
  return res.json();
}

export async function apiAddEntry(entry: TimeEntry): Promise<void> {
  const res = await fetch(`${BASE}/entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry)
  });
  if (!res.ok) { markUnavailable(); throw new Error(`POST /api/entries ${res.status}`); }
}

export async function apiUpdateEntry(id: string, patch: Partial<TimeEntry>): Promise<void> {
  const res = await fetch(`${BASE}/entries/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch)
  });
  if (!res.ok) { markUnavailable(); throw new Error(`PUT /api/entries/${id} ${res.status}`); }
}

export async function apiDeleteEntry(id: string): Promise<void> {
  const res = await fetch(`${BASE}/entries/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) { markUnavailable(); throw new Error(`DELETE /api/entries/${id} ${res.status}`); }
}

export async function apiBulkUpsertEntries(entries: TimeEntry[]): Promise<void> {
  const res = await fetch(`${BASE}/entries/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entries })
  });
  if (!res.ok) { markUnavailable(); throw new Error(`POST /api/entries/bulk ${res.status}`); }
}

// ── plans ─────────────────────────────────────────────────────────────────────

export async function apiGetPlans(): Promise<PeriodPlanState> {
  const res = await fetch(`${BASE}/plans`);
  if (!res.ok) throw new Error(`GET /api/plans ${res.status}`);
  return res.json();
}

export async function apiSavePlans(plans: PeriodPlanState): Promise<void> {
  const res = await fetch(`${BASE}/plans`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plans)
  });
  if (!res.ok) { markUnavailable(); throw new Error(`PUT /api/plans ${res.status}`); }
}
