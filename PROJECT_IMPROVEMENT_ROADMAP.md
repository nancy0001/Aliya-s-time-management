# Time Manager 项目修改建议与迭代规划

## 2026-05-24 项目理解与初次评估

### 项目定位

Time Manager 是 Aliya's Life OS 中的个人时间管理页面，主要服务于日常时间投入记录、周期复盘、目标管理和投资 SOP 管理。

当前目录 `time-manager_bundle` 原本是关键文件集中查看包。为了便于后续独立评估与迭代，已将本地原始源码复制到：

- `original-source/apps-web/src/`
- `original-source/scripts/`

原始代码未移动，避免影响上级项目的真实运行目录。

### 当前主要功能

- 时间记录：按日期、分类、分钟数、说明记录时间投入。
- 周期复盘：支持双日、双周、周度、月度维度的时间汇总和可视化。
- 目标管理：支持日度、周度、月度目标，包含优先级、描述、备注、复制和排序。
- 日历视图：展示月历、日/周/月倒计时和选中日期的时间明细。
- 投资 SOP：按日期维护盘后复盘、盘前准备、盘中盯盘和执行红线等流程。
- 本地同步：通过同步码或自动导入链接在不同本地 origin 之间迁移数据。
- 本地开发脚本：提供 web dev 服务启动、停止、重启、状态检查和 watchdog 自动重启。

### 当前优势

- 产品价值明确：围绕个人时间投入、目标和复盘形成闭环，不只是简单打卡。
- 功能覆盖较完整：已经包含记录、计划、统计、复盘、SOP、同步等核心能力。
- 本地使用成本低：无需后端即可运行，适合个人快速迭代。
- 数据模型已有雏形：时间记录、目标、周期计划、SOP 节点等类型边界基本清楚。
- 有迁移意识：代码中保留了 legacy localStorage key 的兼容逻辑。
- 有运行维护意识：脚本支持后台运行和健康检查。

### 当前问题

- 单组件过大：`TimeManagerApp.tsx` 超过 1600 行，混合了 UI、状态、统计、存储、迁移、同步和 SOP 编辑逻辑。
- 数据可靠性不足：历史数据存储在浏览器 `localStorage`，清缓存或换设备容易丢失。
- 同步机制偏手动：同步码和 hash 链接适合临时迁移，不适合长期稳定同步。
- 页面信息密度高：时间记录、周期复盘、目标管理和投资 SOP 都在同一页面，日常高频操作容易被淹没。
- 缺少测试：日期计算、双周归档、统计汇总、数据迁移、同步导入导出等关键逻辑没有独立测试保护。
- 代码复用度不足：周度/月度看板、SOP 流程编辑等区域存在相似结构，后续改动成本较高。
- 数据结构演进风险高：localStorage 中的 schema 依赖前端代码迁移，缺少显式 schema 校验和版本化导入策略。

## 2026-05-24 运行依赖文件清单

### 运行入口

当前 Time Manager 页面的实际运行地址是：

- `http://localhost:5174/time-manager`

运行入口链路：

- 根项目脚本：`/Users/xibeijingxiang/Desktop/codex_test/package.json`
- Web 工作区脚本：`/Users/xibeijingxiang/Desktop/codex_test/apps/web/package.json`
- Vite HTML 入口：`/Users/xibeijingxiang/Desktop/codex_test/apps/web/index.html`
- React 入口：`/Users/xibeijingxiang/Desktop/codex_test/apps/web/src/main.tsx`
- Time Manager 页面组件：`/Users/xibeijingxiang/Desktop/codex_test/apps/web/src/TimeManagerApp.tsx`
- 全局样式：`/Users/xibeijingxiang/Desktop/codex_test/apps/web/src/styles.css`

注意：`apps/web/vite.config.ts` 中默认 server port 是 `5173`，但 `apps/web/package.json` 的 `dev` 脚本显式使用 `vite --host 0.0.0.0 --port 5174`，所以实际开发访问端口是 `5174`。

### 当前页面直接依赖

Time Manager 页面本身直接依赖：

- `/Users/xibeijingxiang/Desktop/codex_test/apps/web/src/TimeManagerApp.tsx`
- `/Users/xibeijingxiang/Desktop/codex_test/apps/web/src/main.tsx`
- `/Users/xibeijingxiang/Desktop/codex_test/apps/web/src/styles.css`
- `/Users/xibeijingxiang/Desktop/codex_test/apps/web/index.html`
- `/Users/xibeijingxiang/Desktop/codex_test/apps/web/package.json`
- `/Users/xibeijingxiang/Desktop/codex_test/apps/web/tsconfig.json`
- `/Users/xibeijingxiang/Desktop/codex_test/apps/web/tsconfig.node.json`
- `/Users/xibeijingxiang/Desktop/codex_test/apps/web/vite.config.ts`
- `/Users/xibeijingxiang/Desktop/codex_test/tsconfig.base.json`
- `/Users/xibeijingxiang/Desktop/codex_test/package.json`
- `/Users/xibeijingxiang/Desktop/codex_test/package-lock.json`

### 同一 Web 应用中 main.tsx 依赖的其他页面

虽然访问 `/time-manager` 时渲染的是 `TimeManagerApp`，但 `main.tsx` 静态 import 了同一 Web 应用的其他页面，所以构建和运行时也需要这些文件存在：

- `/Users/xibeijingxiang/Desktop/codex_test/apps/web/src/App.tsx`
- `/Users/xibeijingxiang/Desktop/codex_test/apps/web/src/NavalGoalsApp.tsx`
- `/Users/xibeijingxiang/Desktop/codex_test/apps/web/src/SlimSupervisorApp.tsx`
- `/Users/xibeijingxiang/Desktop/codex_test/apps/web/src/api.ts`
- `/Users/xibeijingxiang/Desktop/codex_test/apps/web/src/types.ts`
- `/Users/xibeijingxiang/Desktop/codex_test/apps/web/src/components/Section.tsx`
- `/Users/xibeijingxiang/Desktop/codex_test/apps/web/src/components/StatCard.tsx`

这些文件已经复制到当前 bundle 的归档目录：

- `original-source/apps-web/src/App.tsx`
- `original-source/apps-web/src/NavalGoalsApp.tsx`
- `original-source/apps-web/src/SlimSupervisorApp.tsx`
- `original-source/apps-web/src/api.ts`
- `original-source/apps-web/src/types.ts`
- `original-source/apps-web/src/components/Section.tsx`
- `original-source/apps-web/src/components/StatCard.tsx`

### 启动和守护脚本依赖

Web dev 服务依赖以下脚本：

- `/Users/xibeijingxiang/Desktop/codex_test/scripts/web-daemon.sh`
- `/Users/xibeijingxiang/Desktop/codex_test/scripts/web-watchdog.sh`

脚本行为：

- `web-daemon.sh` 管理 `5174` 端口上的 Vite dev 服务。
- `web-watchdog.sh` 每 10 秒检查一次健康状态，失败时调用 `npm run dev:web:start`。

这些脚本也已复制到：

- `original-source/scripts/web-daemon.sh`
- `original-source/scripts/web-watchdog.sh`

### npm 依赖

根项目依赖：

- `npm-run-all`

Web 工作区依赖：

- `react`
- `react-dom`

Web 工作区开发依赖：

- `@vitejs/plugin-react`
- `vite`
- `typescript`
- `@types/react`
- `@types/react-dom`

这些第三方依赖不应该复制进文档目录或源码归档目录，应该由根项目的 `package.json` 和 `package-lock.json` 管理，并通过 `npm install` 恢复。

### localStorage 运行数据依赖

Time Manager 的历史数据不在源码文件里，而在浏览器 `localStorage` 中。

依赖的 key：

- `aliya-time-manager-v1`
- `aliya-time-manager-plan-v2`
- `aliya-time-manager-plan-v1`

稳定使用时应优先访问：

- `http://localhost:5174/time-manager`

不要混用 `localhost` 和 `127.0.0.1`，因为它们对应不同的浏览器存储空间。

### 可选但相关的服务端文件

访问 `/time-manager` 当前主要依赖前端和 localStorage，不强依赖后端 API。但同一个 monorepo 还有 server 工作区，完整项目构建或运行根级 `npm run dev` 时会用到：

- `/Users/xibeijingxiang/Desktop/codex_test/apps/server/package.json`
- `/Users/xibeijingxiang/Desktop/codex_test/apps/server/tsconfig.json`
- `/Users/xibeijingxiang/Desktop/codex_test/apps/server/src/index.ts`
- `/Users/xibeijingxiang/Desktop/codex_test/apps/server/src/state.ts`
- `/Users/xibeijingxiang/Desktop/codex_test/apps/server/src/storage.ts`
- `/Users/xibeijingxiang/Desktop/codex_test/apps/server/src/types.ts`
- `/Users/xibeijingxiang/Desktop/codex_test/apps/server/src/auth.ts`
- `/Users/xibeijingxiang/Desktop/codex_test/data/site-state.json`

### 当前 bundle 中已存在的副本

当前目录已包含 Time Manager 关键副本：

- `src/TimeManagerApp.tsx`
- `src/main.tsx`
- `src/styles.css`
- `src/index.html`
- `src/package.json`
- `scripts/web-daemon.sh`
- `scripts/web-watchdog.sh`
- `DATA_STORAGE.md`
- `README.md`

当前目录还新增了完整源码归档：

- `original-source/apps-web/src/`
- `original-source/scripts/`

### 当前 bundle 尚不能独立运行的原因

当前 `time-manager_bundle` 仍不是完整可运行项目，主要缺少：

- 根 `package.json`
- 根 `package-lock.json`
- 根 `tsconfig.base.json`
- `apps/web/package.json`
- `apps/web/index.html`
- `apps/web/vite.config.ts`
- `apps/web/tsconfig.json`
- `apps/web/tsconfig.node.json`
- 完整 workspace 目录结构
- `node_modules`

如果希望这个 bundle 后续完全独立运行，建议新增一个 `standalone-app/` 或直接把当前目录整理成标准 Vite 项目，而不是继续依赖上级 monorepo。

## 2026-05-24 后续迭代规划

## 2026-05-24 一二三阶段优化落地记录

### 已完成：第一阶段拆分与降复杂度

本阶段采用低风险渐进拆分，优先抽离纯逻辑和边界清晰的 UI 区块，避免一次性重构影响已有数据和页面行为。

- 新增 `src/time-manager-types.ts`
  - 集中定义 Time Manager 的核心数据类型。
  - 包含 `TimeEntry`、`PeriodPlanState`、`GoalTarget`、`InvestSopSection`、`MindNode` 等。
- 新增 `src/time-manager-storage.ts`
  - 集中维护存储 key。
  - 统一同步 payload 构建、编码、解码和校验。
  - 统一 JSON 备份导出、JSON 文件读取、导入前快照和最近备份元信息。
- 新增 `src/time-manager-utils.ts`
  - 抽离日期计算：`formatLocalDate`、`weekStartOf`、`biWeekStartOf`、`buildMonthCells` 等。
  - 抽离统计计算：`sumMinutes`、`minutesToHours`、`minutesToDays`、`aggregateByCategory` 等。
  - 抽离图表辅助：`donutSlices`、分类常量和分类颜色。
- 新增 `src/components/time-manager/DataSafetyPanel.tsx`
  - 承载数据备份、导入、同步码、快照状态展示。
- 新增 `src/components/time-manager/TodayActionPanel.tsx`
  - 承载今日登记、快捷分钟数、今日概览和今日记录。
- 新增 `src/components/time-manager/GoalBoard.tsx`
  - 承载周期目标管理、编辑、排序和复制。

保留事项：

- 双周、周度、月度和投资 SOP 区块仍在 `TimeManagerApp.tsx` 中。
- 这些区块 JSX 体量大且与页面状态耦合较多，后续建议在单独迭代中拆成 `BiWeekReview`、`WeeklyBoard`、`MonthlyBoard`、`InvestSopBoard`。
- 本阶段已完成第一层解耦，构建验证通过。

### 已完成：第二阶段数据安全优化

本次重点增强了本地数据的可靠性和可恢复性：

- 新增 JSON 备份导出。
- 新增 JSON 备份导入。
- 导入 JSON 或同步码前，会自动保存导入前快照。
- 新增“恢复导入前快照”入口。
- 新增最近备份元信息记录。
- 新增 payload 校验，避免错误 JSON 或错误同步码直接覆盖当前数据。
- 顶部展示当前记录数、最近备份时间、导入前快照状态。

新增 localStorage key：

- `aliya-time-manager-backup-v1`
- `aliya-time-manager-snapshot-v1`

继续保留原核心数据 key：

- `aliya-time-manager-v1`
- `aliya-time-manager-plan-v2`
- `aliya-time-manager-plan-v1`

### 已完成：第三阶段日常使用体验优化

新增“今日行动台”，把高频操作前置：

- 今日登记表单前置到页面靠前位置。
- 增加常用分钟数快捷按钮：15、30、45、60、90、120 分钟。
- 展示今日投入和双日投入摘要。
- 展示今日已登记记录，便于快速检查是否漏记。

保留事项：

- 原日历区域中的登记表单暂时保留，避免用户习惯路径突然消失。
- 后续可在确认新入口稳定后，把旧表单改为“补录入口”或完全移除。

## 2026-05-24 第四阶段优化与大模型接入落地记录

### 已完成：计划与复盘闭环优化

本次新增本地可解释分析模块，不依赖大模型也可以给出基础建议：

- 新增 `src/time-manager-analysis.ts`
  - 汇总今日、本周、本月投入。
  - 计算本周深度工作占比。
  - 计算本周生活事务 + 娱乐放松占比。
  - 对比周计划实际偏差。
  - 对比月计划实际偏差。
  - 基于规则生成可执行建议。
  - 自动生成可复制给大模型的分析 Prompt。
- 新增 `src/components/time-manager/AiInsightPanel.tsx`
  - 展示本地分析摘要。
  - 展示本地规则建议。
  - 展示落后计划项。
  - 支持复制 Prompt 到外部大模型工具。
  - 支持配置 OpenAI-compatible endpoint、model 和 API key 后直接调用大模型。

### 大模型接入策略

当前采用“不改变现有看板 + 新增独立 AI 复盘面板”的方式。后续大模型能力优先复用当前 Codex 已有接入形态，不单独为 Time Manager 维护一套新的模型接入链路。

- 不修改原双日、双周、周度、月度、投资 SOP 看板。
- 大模型面板只读取现有 entries、plans、goalTargets，不改变原始数据。
- 本地规则分析先生成结构化摘要，再作为 prompt 输入大模型。
- 没有 API key 时，用户仍可复制 prompt 到任意大模型工具使用。
- 如果当前运行环境已经具备 Codex/OpenAI 调用能力，Time Manager 只负责生成结构化分析上下文和 prompt，由统一的 Codex 接入层负责模型调用。

### 当前直连方案边界与调整方向

浏览器直连大模型接口只作为本地临时测试方式，不作为主路线。主路线是复用现有 Codex 接入或后端代理。

- API key 会保存在浏览器 localStorage。
- 浏览器跨域可能受模型服务商 CORS 限制。
- 无法做服务端限流、审计和脱敏。

后续建议：

- 优先复用当前 Codex 接入层，Time Manager 只提供 `analysis prompt + structured summary`。
- 如果需要脱离 Codex 独立运行，再新增轻量后端代理接口，例如 `/api/time-manager/ai-review`。
- API key 放在 Codex/后端环境中，不进入前端。
- 前端只发送结构化摘要，不发送完整历史原始数据。
- 统一做 prompt 模板、模型选择、超时控制和错误兜底。
- 对敏感内容做字段脱敏或日期范围裁剪。

### 2026-05-24 大模型入口隐藏与奥德赛规划面板调整

本次根据使用优先级调整 AI 区块：

- 暂时隐藏页面中的浏览器直连大模型配置入口。
- 不再在界面展示 endpoint、model、API key、直接调用按钮。
- 保留本地分析逻辑，不影响现有记录、看板和数据存储。
- 将原 `AI 复盘建议` 面板调整为 `26岁奥德赛复盘建议`。

新增奥德赛三线规划复盘：

- 主业
  - 参考近两周 `深度工作` 和 `沟通协作` 投入。
  - 用于判断现金流、现实反馈、关键产出和可见成果的投入是否足够。
- AI & 沟通能力建设
  - 参考近两周 `学习成长`、AI 关键词、沟通/表达/汇报/文档等关键词投入。
  - 用于判断杠杆能力建设是否连续。
- 自媒体尝试
  - 参考近两周备注中的自媒体、内容、视频、小红书、公众号、选题、剪辑、发布等关键词。
  - 用于判断低成本内容实验是否启动。

新增每日鼓励：

- 每天基于日期稳定生成一句肯定和加油的话。
- 文案方向围绕 26 岁奥德赛时期、长期主义、系统建设、稳定复盘和自我肯定。

实现文件：

- `src/time-manager-analysis.ts`
  - 新增近两周窗口统计。
  - 新增 `OdysseyAnalysis` 和三条成长线分析。
  - 新增每日鼓励生成逻辑。
- `src/components/time-manager/AiInsightPanel.tsx`
  - 隐藏大模型直连接入。
  - 改为展示本地分析摘要、奥德赛三线规划、时间占比和每日肯定。

后续改进建议：

- 如果 Codex 内已有更完整的个人奥德赛推演资料，可将其整理为本地配置文件或后端上下文。
- 三条成长线的分类规则可以从关键词识别升级为可配置规则。
- 自媒体尝试可以新增独立分类或标签，避免只依赖备注关键词。
- 大模型接入回归时，应复用 Codex 接入层，只发送近两周结构化摘要和奥德赛三线数据。

## 2026-05-24 后端系统与部署形态建议

### 推荐方向

当前 Time Manager 最适合先做轻量本地化后端，而不是直接上云。

推荐中间态：

- React/Vite 前端继续保留。
- 新增只监听 `localhost` 的本地 Node API。
- 使用 SQLite 作为本地数据库。
- 增加本地自动备份。
- 大模型调用优先复用当前 Codex 接入；如果未来需要脱离 Codex 独立运行，再通过本地后端代理承接，不在浏览器保存生产 API key。

目标架构：

```text
React 前端 + localhost Node API + SQLite + 本地备份 + Codex/本地 AI 代理
```

### 本地化后端建议结构

```text
time-manager_bundle/
  src/
  server/
    index.ts
    db.ts
    schema.sql
    migrations/
    services/
      timeEntries.ts
      plans.ts
      aiReview.ts
      backup.ts
  data/
    time-manager.db
    backups/
```

建议 API：

- `GET /api/time-entries`
- `POST /api/time-entries`
- `PUT /api/time-entries/:id`
- `DELETE /api/time-entries/:id`
- `GET /api/plans`
- `PUT /api/plans`
- `POST /api/backup/export`
- `POST /api/backup/import`
- `POST /api/ai-review`

### SQLite 数据模型建议

优先结构化时间记录和目标，复杂 SOP 与周期计划可以先用 JSON 字段承载。

建议表：

- `time_entries`
  - `id`
  - `date`
  - `category`
  - `minutes`
  - `note`
  - `created_at`
  - `updated_at`
- `goals`
  - `id`
  - `cycle`
  - `priority`
  - `task_name`
  - `target_desc`
  - `note`
  - `sort_order`
  - `active`
  - `created_at`
  - `updated_at`
- `bucket_plans`
  - `id`
  - `period_type`
  - `period_key`
  - `data_json`
  - `updated_at`
- `invest_sop_days`
  - `date`
  - `data_json`
  - `updated_at`
- `ai_reviews`
  - `id`
  - `period_type`
  - `period_key`
  - `prompt`
  - `result`
  - `model`
  - `created_at`
- `backups`
  - `id`
  - `kind`
  - `path`
  - `entry_count`
  - `created_at`

### 完全本地化可行性

可以完全本地化，不依赖外部数据库系统和外部机器。

本地化可以做到：

- 本地持久保存，避免浏览器清缓存导致数据丢失。
- 本地自动备份。
- 本地导入和导出。
- 本地 AI 代理。
- 本地定时任务，例如每天自动生成复盘。
- 离线可用。
- 通过复制 `.db` 文件或 JSON 备份完成迁移。

本地化天然不擅长：

- 多设备实时同步。
- 手机和电脑共享同一份实时数据。
- 远程访问。
- 多用户协作。
- 云端容灾。

### 轻量本地化与云端部署区别

轻量本地化优点：

- 隐私强，数据不出本机。
- 成本低，不需要服务器。
- 可离线。
- 运维简单。
- SQLite 文件易备份。
- API key 可以放在本机 `.env`。

轻量本地化缺点：

- 多设备同步麻烦。
- 机器损坏时依赖备份恢复。
- 手机访问不方便。
- 不适合多人协作。

云端部署优点：

- 多设备同步自然。
- 手机、电脑、平板访问同一份数据。
- 可做账号、权限、自动备份。
- 更适合长期产品化。
- 大模型代理、安全审计、定时任务更规范。

云端部署缺点：

- 需要服务器或云平台。
- 有运维成本。
- 隐私风险更高。
- 需要认真处理数据库、鉴权、HTTPS、备份和日志。

### 建议推进顺序

1. 保留当前 React 前端。
2. 新增本地 Node API。
3. 将 `localStorage` 数据迁移到 SQLite。
4. 保留 JSON 导入导出作为备份和迁移工具。
5. 增加每日自动备份。
6. 将大模型调用接入当前 Codex 能力；如需独立运行，再迁移到本地后端代理。
7. 稳定后再评估云端同步或云端部署。

### 第一阶段：整理与降复杂度

目标：在不改变产品行为的前提下，让代码更容易维护。

- 拆分 `TimeManagerApp.tsx`：
  - `TimeEntryForm`
  - `CalendarBoard`
  - `GoalBoard`
  - `BiWeekReview`
  - `WeeklyBoard`
  - `MonthlyBoard`
  - `InvestSopBoard`
- 抽离纯函数：
  - 日期计算放入 `utils/date.ts`
  - 时间统计放入 `utils/timeStats.ts`
  - localStorage 读写和迁移放入 `storage/timeManagerStorage.ts`
  - 同步码导入导出放入 `sync/timeManagerSync.ts`
- 为核心类型单独建文件：
  - `types/timeManager.ts`
- 保持 UI 行为不变，避免重构同时引入产品变更。

### 第二阶段：提升数据安全

目标：降低个人历史数据丢失风险。

- 增加 JSON 文件导出和导入。
- 增加“备份提醒”或“最近备份时间”提示。
- 导入时做 schema 校验，避免错误数据覆盖现有数据。
- 导入前自动创建当前数据快照，提供回滚入口。
- 评估从 `localStorage` 迁移到 IndexedDB。

### 第三阶段：优化日常使用体验

目标：让每日打开页面时，优先完成最高频任务。

- 将首屏聚焦到：
  - 今日时间登记
  - 今日已投入
  - 与计划的偏差
  - 下一步建议
- 将周度、月度、投资 SOP 放入 Tab 或可折叠工作区。
- 增加快速录入：
  - 常用分钟数按钮
  - 常用分类快捷键
  - 昨日复制
  - 批量补录
- 增加筛选和搜索：
  - 按日期范围
  - 按分类
  - 按关键词

### 第四阶段：强化计划与复盘闭环

目标：从“记录发生了什么”升级为“指导接下来怎么分配时间”。

- 周/月计划与实际投入做偏差分析。
- 为每个目标绑定时间分类或关键任务。
- 增加目标进度字段，区分时间投入和结果产出。
- 自动生成周复盘摘要：
  - 深度工作占比
  - 低价值时间占比
  - 最大偏差分类
  - 下周调整建议
- 支持导出 Markdown 周报/月报。

### 第五阶段：工程质量建设

目标：让后续迭代更稳。

- 增加单元测试：
  - `weekStartOf`
  - `biWeekStartOf`
  - `aggregateByCategory`
  - 导入导出 payload 校验
  - legacy 数据迁移
- 增加基础端到端测试：
  - 新增时间记录
  - 编辑记录
  - 导出/导入同步码
  - 创建 SOP 日期
- 增加 lint、format 和 typecheck 脚本。
- 建立简单 changelog，记录每次 schema 和产品行为变更。

### 第六阶段：长期方向

目标：从本地个人工具升级为更可靠的个人效率系统。

- 接入后端数据库或云同步。
- 支持账号或至少支持本机多端数据一致。
- 支持移动端优先录入体验。
- 增加可配置分类体系，不把分类写死在代码中。
- 增加仪表盘：
  - 本周核心时间完成率
  - 连续记录天数
  - 最近 30 天时间结构趋势
  - 目标投入排行榜
- 评估与日历、任务系统、投资复盘系统做数据联动。
