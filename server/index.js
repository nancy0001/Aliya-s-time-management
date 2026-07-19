"use strict";
const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = process.env.API_PORT || 4000;
const DIST_DIR = path.join(__dirname, "..", "dist");
const fs = require("fs");

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ── Time Entries ──────────────────────────────────────────────────────────────

// GET /api/entries  — return all entries sorted newest first
app.get("/api/entries", (_req, res) => {
  const rows = db.prepare("SELECT id, date, category, minutes, note FROM time_entries ORDER BY date DESC, created_at DESC").all();
  res.json(rows);
});

// POST /api/entries  — create one entry
app.post("/api/entries", (req, res) => {
  const { id, date, category, minutes, note } = req.body;
  if (!id || !date || !category || typeof minutes !== "number") {
    return res.status(400).json({ error: "id, date, category, minutes are required" });
  }
  db.prepare(`
    INSERT INTO time_entries (id, date, category, minutes, note)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      date = excluded.date,
      category = excluded.category,
      minutes = excluded.minutes,
      note = excluded.note,
      updated_at = datetime('now')
  `).run(id, date, category, minutes, note || "");
  res.status(201).json({ ok: true });
});

// PUT /api/entries/:id  — update one entry
app.put("/api/entries/:id", (req, res) => {
  const { date, category, minutes, note } = req.body;
  const result = db.prepare(`
    UPDATE time_entries SET
      date = COALESCE(?, date),
      category = COALESCE(?, category),
      minutes = COALESCE(?, minutes),
      note = COALESCE(?, note),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(date, category, minutes, note, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
});

// DELETE /api/entries/:id  — delete one entry
app.delete("/api/entries/:id", (req, res) => {
  const result = db.prepare("DELETE FROM time_entries WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
});

// POST /api/entries/bulk  — bulk upsert (used for initial import / sync)
app.post("/api/entries/bulk", (req, res) => {
  const { entries } = req.body;
  if (!Array.isArray(entries)) return res.status(400).json({ error: "entries must be an array" });
  const upsert = db.prepare(`
    INSERT INTO time_entries (id, date, category, minutes, note)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      date = excluded.date,
      category = excluded.category,
      minutes = excluded.minutes,
      note = excluded.note,
      updated_at = datetime('now')
  `);
  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      if (row.id && row.date && row.category && typeof row.minutes === "number") {
        upsert.run(row.id, row.date, row.category, row.minutes, row.note || "");
      }
    }
  });
  insertMany(entries);
  res.json({ ok: true, count: entries.length });
});

// ── Plans (goalTargets, weeklyPlans, monthlyPlans, biWeeklyPlans, investSop, investMind) ──

// GET /api/plans  — return full plans object
app.get("/api/plans", (_req, res) => {
  const rows = db.prepare("SELECT period_type, period_key, data_json FROM bucket_plans").all();
  const plans = {};
  for (const row of rows) {
    if (!plans[row.period_type]) plans[row.period_type] = {};
    try { plans[row.period_type][row.period_key] = JSON.parse(row.data_json); } catch { /* skip malformed */ }
  }
  // Also read the flat keys (goalTargets etc.) stored under special period_type 'flat'
  const flat = plans["flat"] || {};
  const result = {
    goalTargets: flat.goalTargets || [],
    weeklyPlansByBucket: plans["weekly"] || {},
    monthlyPlansByBucket: plans["monthly"] || {},
    biWeeklyPlansByBucket: plans["biweekly"] || {},
    investSopByDate: plans["investSop"] || {},
    investMindByDate: plans["investMind"] || {}
  };
  res.json(result);
});

// PUT /api/plans  — save full plans object (replaces all)
app.put("/api/plans", (req, res) => {
  const plans = req.body;
  if (!plans || typeof plans !== "object") return res.status(400).json({ error: "plans object required" });

  const upsert = db.prepare(`
    INSERT INTO bucket_plans (period_type, period_key, data_json)
    VALUES (?, ?, ?)
    ON CONFLICT(period_type, period_key) DO UPDATE SET
      data_json = excluded.data_json,
      updated_at = datetime('now')
  `);

  const savePlans = db.transaction(() => {
    // Save goalTargets as flat/goalTargets
    upsert.run("flat", "goalTargets", JSON.stringify({ goalTargets: plans.goalTargets || [] }));
    // Save bucketed plans
    for (const [key, val] of Object.entries(plans.weeklyPlansByBucket || {})) {
      upsert.run("weekly", key, JSON.stringify(val));
    }
    for (const [key, val] of Object.entries(plans.monthlyPlansByBucket || {})) {
      upsert.run("monthly", key, JSON.stringify(val));
    }
    for (const [key, val] of Object.entries(plans.biWeeklyPlansByBucket || {})) {
      upsert.run("biweekly", key, JSON.stringify(val));
    }
    for (const [key, val] of Object.entries(plans.investSopByDate || {})) {
      upsert.run("investSop", key, JSON.stringify(val));
    }
    for (const [key, val] of Object.entries(plans.investMindByDate || {})) {
      upsert.run("investMind", key, JSON.stringify(val));
    }
  });
  savePlans();
  res.json({ ok: true });
});

// ── Backup / Export ───────────────────────────────────────────────────────────

// GET /api/backup  — export full snapshot as JSON (same format as existing backup)
app.get("/api/backup", (_req, res) => {
  const entries = db.prepare("SELECT id, date, category, minutes, note FROM time_entries ORDER BY date DESC").all();
  const planRows = db.prepare("SELECT period_type, period_key, data_json FROM bucket_plans").all();
  const planMap = {};
  for (const row of planRows) {
    if (!planMap[row.period_type]) planMap[row.period_type] = {};
    try { planMap[row.period_type][row.period_key] = JSON.parse(row.data_json); } catch { /* skip */ }
  }
  const flat = planMap["flat"] || {};
  const plans = {
    goalTargets: flat.goalTargets || [],
    weeklyPlansByBucket: planMap["weekly"] || {},
    monthlyPlansByBucket: planMap["monthly"] || {},
    biWeeklyPlansByBucket: planMap["biweekly"] || {},
    investSopByDate: planMap["investSop"] || {},
    investMindByDate: planMap["investMind"] || {}
  };
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    origin: "server",
    backupKind: "server-export",
    entries,
    plans
  };
  res.setHeader("Content-Disposition", `attachment; filename="aliya-time-manager-backup-${new Date().toISOString().slice(0,10)}.json"`);
  res.json(payload);
});

// GET /api/health  — liveness probe
app.get("/api/health", (_req, res) => {
  const count = db.prepare("SELECT COUNT(*) as n FROM time_entries").get();
  res.json({ ok: true, entries: count.n });
});

// ── Feishu OAuth callback ─────────────────────────────────────────────────────
// After user authorizes, Feishu redirects here with ?code=XXX
// The server exchanges the code for user_access_token and stores it in the KV table.
app.get("/feishu-callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("Missing code parameter");
  }
  const APP_ID = process.env.FEISHU_APP_ID || "";
  const APP_SECRET = process.env.FEISHU_APP_SECRET || "";
  if (!APP_ID || !APP_SECRET) {
    return res.status(500).send("FEISHU_APP_ID / FEISHU_APP_SECRET not configured");
  }
  try {
    const fetch = (await import("node-fetch")).default;
    // Exchange code for user_access_token
    const tokenResp = await fetch("https://open.feishu.cn/open-apis/authen/v1/oidc/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "authorization_code", code, app_access_token: "" })
    });
    // Use the older v1 endpoint which works with app credentials
    const tenantResp = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
    });
    const tenantData = await tenantResp.json();
    const appToken = tenantData.tenant_access_token;

    const userResp = await fetch("https://open.feishu.cn/open-apis/authen/v1/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${appToken}` },
      body: JSON.stringify({ grant_type: "authorization_code", code })
    });
    const userData = await userResp.json();
    if (userData.code !== 0) {
      return res.status(400).send(`Token exchange failed: ${JSON.stringify(userData)}`);
    }
    const userToken = userData.data.access_token;
    const refreshToken = userData.data.refresh_token;
    const expiresIn = userData.data.expires_in;
    // Store in KV table
    db.prepare("INSERT INTO app_kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')")
      .run("feishu_user_token", userToken);
    db.prepare("INSERT INTO app_kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')")
      .run("feishu_refresh_token", refreshToken);
    console.log(`[feishu-oauth] user token stored, expires in ${expiresIn}s`);
    res.send(`<html><body><h2>✅ 授权成功！</h2><p>用户 token 已保存，现在可以关闭此页面。</p><script>setTimeout(()=>window.close(),3000)</script></body></html>`);
  } catch (err) {
    console.error("[feishu-oauth] error:", err);
    res.status(500).send(`Error: ${err.message}`);
  }
});

// GET /api/feishu-token-status — check if user token is stored
app.get("/api/feishu-token-status", (_req, res) => {
  const row = db.prepare("SELECT value, updated_at FROM app_kv WHERE key = 'feishu_user_token'").get();
  if (!row) return res.json({ stored: false });
  res.json({ stored: true, updated_at: row.updated_at });
});

// ── Serve frontend static files in production ─────────────────────────────────
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[time-manager-server] listening on port ${PORT}`);
});
