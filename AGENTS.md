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

## User requirements
- Glass surfaces must reuse the sidebar liquid-glass material; the `#sidebarGlass` slider controls the sidebar, map view switch and map search live.
- Test mobile changes in iPhone Home Screen standalone as well as Safari.
- No black bands at the bottom; full-screen surfaces paint to 100lvh while controls stay clear of the toolbar.
- The mobile map order is floating header → visible large `.map-heading` → sticky glass switch/search; do not hide the heading.

## Known pitfalls
- `100svh` caused a bottom black band on the floating-toolbar iPhone; use `100lvh` for full-screen paint and `100dvh` for interactive edges.
- Do not measure `.map-sticky` into a top-zone CSS variable. View switches replace `#tree`, changing the measured bottom; v17's banner/padding then produced a large empty black block on Safari. Map geometry is CSS-only, with `overflow-anchor:none` on the scroll panel/tree.
- Long resumed Codex sessions are slow; start a fresh session and locate rules with `rg -n` instead of reading whole files.

## Progress log (newest last)
- v11 (6754247): 100lvh shell, CSS-only heights, single translateY keyboard lift.
- v12 (90f8d04): made body/main document-flow, rei-background absolute. RESULT ON PHONE: bad — whole page became draggable, sidebar card stops above toolbar, bottom still black (the .rei-art is only 100svh tall so the bottom band is plain #070907).
- v13: locked html/body to 100lvh with overflow hidden (no document rubber band), rei art to 100lvh, mobile drawer card to the 100lvh bottom behind the toolbar with the footer clearing it; composer stack gap and layout.js unchanged.
- v14: mobile chat runs edge to edge under a floating transparent header and composer, with masked frosted-glass bands at the top and bottom; the map list gets the same edge treatment and graph/immersive views skip it.
- v15: map list sticky controls sit directly under the floating header with frosted full-width glass; the focused composer pins to the visual viewport with an 8px keyboard gap; the top chat fade now matches the bottom and the mobile header keeps no gradient.
- v16: conversation opens measure the resting composer position into `--list-bottom-pad` instead of stacking reserve + toolbar gap + safe area, and re-pin `#messages` to the bottom over two animation frames; the last mobile message leaves exactly a 16px gap above the composer.
- v17: mobile map controls are pinned in one fixed header-adjacent glass zone for every view, that zone is measured into `--map-top-zone`, the graph fills between it and the safe bottom, and the drawer card keeps a rounded bottom inset that accounts for the Safari toolbar and home indicator in both tab and standalone modes.
- v18: restored the large mobile map heading below the floating header, replaced the opaque map banner with sticky sidebar-glass switch/search pills driven by `#sidebarGlass`, kept the active tab solid accent, and renamed the slider to 玻璃透明度.
- v19: removed the v17 map-zone measurement entirely — `layout.js` no longer writes `--map-top-zone` or observes the sticky/panel — and pinned the mobile map panel, sticky rail and top fade to CSS-only safe-area/header values, so every view switch keeps identical geometry in Safari and standalone.
- v20: merged the time-order select into the 按提问顺序 pill; tapping the active pill toggles 最早在前/最新在前.
- v21 (Codax direct): hid scrollbars in #workspace/#sidebar, removed timeline kind label (首次提问/继续追问) from event-top; css ui-fx27, app.js ui-fx20.
- v22 (Codax direct): iPad-only map heading/toolbar clearance (phone max-width:760 unchanged); locate jumps to the original question without a green frame and without scrolling to the latest message; calmer thinking animation keeps the nut logo. css ui-fx28, app.js ui-fx21. v22b: iPad fullscreen graph hides the switch/search bar; merge/collect/split dialog cards neutral gray (css ui-fx29).
- v23 reverted (Codax direct): visualViewport shell sizing lifted the iPad composer and overflow:hidden blocked map list scrolling; restored v22b layout (css ui-fx31, layout.js ui-fx21). iPad map bottom clip deferred.
- v24: mobile immersive graph lifts `.mind-controls` / `.mind-legend` by `env(safe-area-inset-bottom)` + `(100lvh - 100dvh)` so they clear Safari's floating toolbar and the home indicator; desktop and iPad rules untouched; css ui-fx32.
- v25a/v25b: mobile top/bottom surface continuity (css ui-fx34); phone sphere knowledge-map visual in mindmap.js (desktop flat unchanged).
