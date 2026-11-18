# 问迹 UI handoff（ui-fx-v12 → GPT）

交接时间：2026-11-18（Asia/Shanghai）。本目录为工作树 `/workspace/wenji-ui-fx`，分支 **`ui-fx-v12`**，验收 tip：**`346e801`**（`UI v26.1: unify mobile map card border color to #222`）。用户确认手机地图卡片底边白线已修好后结束本侧开发；正式站未发。

## Repo / 分支

- Remote：`https://github.com/jianguogao99-hue/-.git`（仓库名 `-`）
- 目标保存分支：优先 **`ui-fx-v12`**（或新建 `handoff/ui-fx-v12`）。**禁止** push/merge 到 **`main`**（会触达正式站）。
- 本地 tip：`346e8018a3347076869f4161e6e01c8496ffde27`（若本文件同批提交，tip 可能再前进 1 个 commit）。
- 远端当时仅有：`main` @ `79d3093`、`migration/vercel-supabase` @ `0e204ed`；**`ui-fx-v12` 此前未推到远端**。
- 相对 `origin/main` 约 39 个本地 UI 提交未上传。

## 源码结构（原生 HTML/CSS/JS，无前端打包）

| 路径 | 作用 |
|------|------|
| `public/` | 前端：`index.html`、`chat-layout.css`、`mindmap.js`、`layout.js`、`app.js`、主题/背景等 |
| `api/` | Vercel Node serverless |
| `worker/` | Preview 部署必需：`api.mjs` + `tools.mjs`（缺则 `/api/*` 500） |
| `server/` `src/` `scripts/` | 服务端/构建辅助 |
| `tests/` | `node --test` / `npm test` |
| `supabase/` | 客户端相关（**勿改 schema / RLS / 密钥**） |
| `vercel.json` | 路由与函数配置 |
| `AGENTS.md` | 给代理的详细 UI 约定与进度日志（更全） |
| `tmp/` | 本地 fixture，**勿提交**（已在 `.gitignore`） |

## 启动 / 测试

```bash
# 依赖：本工作树常 symlink 到 /workspace/wenji/node_modules；否则 npm ci
npm test
# 或：node --test tests/

# 本地静态核对（地图卡片边界 fixture，用户浏览器截图用）
python3 -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/tmp/map-bounds-fixture.html
```

改 CSS/JS 后 bump `public/index.html`（及测试里）的 `chat-layout.css?v=ui-fxNN` 等缓存串。当前：**`ui-fx36`**。

Preview 部署须**整包含 `worker/`**；`/api/health` 期望 **200** 且 body 可含已知缺失，例如 `{"ready":false,"encryption":"missing"}`——**不要为补 encryption 去改生产 env / Supabase**。

## 已验收 UI 状态（手机 ≤760px）

- **v26**：普通地图卡片在可视区（`100dvh`）内完整收口 + 圆角；全屏沉浸为不透明无边框覆盖；保留 **v24** 控件 safe-area。
- **v26.1（346e801）**：普通卡片四边统一 **`border: 1px solid #222`**（修复仅写 width/style、缺 color → `currentColor` 近白底边）。
- 桌面（>760）与球面业务逻辑本轮未作为验收范围改动目标。

## 未解决 / 可交给 GPT

1. **球面知识地图视觉精调**（对照小红书参考）——结构可用，观感未闭环。
2. Preview **`encryption: missing`**：已知；勿擅自写生产密钥或动 Supabase schema/RLS。
3. **正式站未发布**；用户未授权 production。仅可推 UI/handoff 分支。
4. 设备焦点：**iPhone / iOS Safari（含 Home Screen）**；注意 `100lvh` 涂底 vs `100dvh` + `safe-area` 交互边。

## 硬约束（延续）

- 不改 Supabase schema / RLS / 加密密钥；不提交 `.env` / 密钥；不碰无授权的生产发布。
- UI 大改优先读 `AGENTS.md`：在 `chat-layout.css` **文件末尾**加新 `/* UI vNN */` 段，勿盲改早期压缩行。
- 本交接**不含** Vercel share token、API key、凭据。

## 若 GitHub 未推上

本机当时：`gh` 未登录；HTTPS `git push` 因无 Username（`GIT_TERMINAL_PROMPT=0`）失败；SSH 不可用。备份见同批交付的 **git bundle** + **源码 ZIP**（已排除 `.agents/`、`tmp/`、`.env*`、密钥）。用 bundle：

```bash
git clone /path/to/wenji-ui-fx-*.bundle wenji-ui-fx
# 或：git fetch wenji-ui-fx-*.bundle ui-fx-v12:ui-fx-v12
```

再由有权限的机器 `git push -u origin ui-fx-v12`（**非 force**，勿推 main）。
