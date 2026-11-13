# 问迹 (wenji) — notes for Codex

Read this first. Do NOT read whole big files; use `rg -n` and read only the line ranges you need.

## What it is
Native HTML/CSS/JS chat app + Vercel Node serverless (`api/`) + Supabase. No frameworks, no build step for `public/`.
Production: https://wenji-ten.vercel.app (do not deploy; the human operator deploys previews).

## Files that matter for UI
- `public/index.html` — markup; bump `?v=ui-fxNN` cache strings for any changed css/js.
- `public/chat-layout.css` (~1700 lines, ~95KB). Minified early lines 1–48, then commented sections. LATER RULES OVERRIDE EARLIER ONES; add fixes at the END in a new `/* UI vNN: ... */` section rather than editing old lines. Section map (line numbers approx):
  - 49 liquid-glass composer · 306 sidebar glass card (vars --sidebar-edge-*, aside rules ~369) · 507 map chrome · 585 settings dialogs
  - 1182 solid accent · 1236 type hierarchy · 1315 pills · 1379 v8 · 1479 v9 · 1512 v10 · 1573 v11 full-bleed shell · 1588 v12 document-flow shell
- `public/rei-background.css` — ASCII background (`.rei-background`, `.rei-art` sized by svh, `.rei-shade`). One minified line.
- `public/layout.js` — keyboard handling (v11): composer gets one translateY = max(0, innerHeight - vv.height - vv.offsetTop); reset + scrollTo(0,0) on blur. No JS height pinning. Keep it.
- `public/app.js` — main app logic (large; avoid unless needed).
- `public/rei-background.js` — accent tokens --accent / --accent-on.
- Tests: `node --test tests/` (viewport-keyboard, composer-ui, keyboard-lift, boot-guards, conversation-delete...). Keep all passing.

## Hard rules
- Never touch: `web-dist/`, `api/`, `worker/`, `netlify/`, Supabase schema/RLS, env vars, secrets, `.agents/`.
- No new dependencies. Don't push. Commit locally with a clear message.
- Desktop (>760px) look must not change unless asked.

## Target device
iPhone, iOS 26 Safari with the floating (transparent) bottom toolbar. Anything that should look "full screen" must paint down to 100lvh (the large viewport), and interactive content must stay above the toolbar using 100dvh / env(safe-area-inset-bottom).

## Progress log (newest last)
- v11 (6754247): 100lvh shell, CSS-only heights, single translateY keyboard lift.
- v12 (90f8d04): made body/main document-flow, rei-background absolute. RESULT ON PHONE: bad — whole page became draggable, sidebar card stops above toolbar, bottom still black (the .rei-art is only 100svh tall so the bottom band is plain #070907).
- v13: locked html/body to 100lvh with overflow hidden (no document rubber band), rei art to 100lvh, mobile drawer card to the 100lvh bottom behind the toolbar with the footer clearing it; composer stack gap and layout.js unchanged.
- v14: mobile chat runs edge to edge under a floating transparent header and composer, with masked frosted-glass bands at the top and bottom; the map list gets the same edge treatment and graph/immersive views skip it.
- v15: map list sticky controls sit directly under the floating header with frosted full-width glass; the focused composer pins to the visual viewport with an 8px keyboard gap; the top chat fade now matches the bottom and the mobile header keeps no gradient.
