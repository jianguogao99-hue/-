import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = read('public/index.html');
const app = read('public/app.js');
const css = read('public/chat-layout.css');
const glassJs = read('public/liquid-glass.js');
const rei = read('public/rei-background.css');
const polish = css.slice(css.indexOf('/* UI polish: liquid-glass composer'));
const sidebar = css.slice(css.indexOf('/* UI polish: sidebar glass'));

assert.match(html, /<form[^>]*class="composer liquid-glass"[^>]*id="form"[^>]*>/, 'composer form must remain a liquid-glass surface');
assert.match(html, /<textarea[^>]*id="input"[^>]*maxlength="4000"[^>]*required/, 'composer textarea contract must remain');
const sendTag = html.match(/<button[^>]*class="send"[^>]*type="submit"[^>]*>/)?.[0] || '';
assert.ok(sendTag, 'composer submit button must remain type=submit');
assert.match(html, /<svg class="send-icon"[^>]*stroke-linecap="round"[^>]*stroke-linejoin="round"/, 'send button must use a bold rounded SVG arrow');
assert.doesNotMatch(html, /<button[^>]*class="send"[^>]*>[\s\S]{0,40}↑/, 'send button must not use the ↑ text glyph');
assert.match(html, /stroke-width="2\.75"/, 'send arrow stroke must be bold (2.5–3)');
assert.doesNotMatch(html, /<button[^>]*class="send"[^>]*>[^<]*(发送|思考中)/, 'send button must not contain 发送 or 思考中 typography');
const pillTag = html.match(/<button[^>]*id="modelPill"[^>]*>/)?.[0] || '';
assert.ok(pillTag, 'model pill button must exist');
assert.match(pillTag, /type="button"/, 'model pill must not submit the form');
assert.doesNotMatch(pillTag, /type="submit"/, 'model pill must never steal form submission');
assert.match(html, /id="modelPillLabel"/, 'model pill needs a truncatable label');
assert.match(html, /class="glass-backdrop"/, 'composer must include a backdrop layer');
assert.match(html, /class="glass-specularity"/, 'composer must include a specular highlight layer');
assert.match(html, /class="glass-rim"/, 'composer must include a liquid-glass rim');
assert.match(html, /chat-layout\.css\?v=ui-fx4/, 'edited composer CSS needs a new cache token');
assert.match(html, /app\.js\?v=ui-fx3/, 'edited composer JS needs a new cache token');
assert.match(html, /liquid-glass\.js\?v=ui-fx4/, 'liquid glass runtime must be included');
assert.match(html, /rei-background\.css\?v=ui-fx3/, 'rei theme override needs a new cache token');

const waitingStart = app.indexOf('function startWaiting');
const waitingEnd = app.indexOf('function readableApiError');
assert.ok(waitingStart >= 0 && waitingEnd > waitingStart, 'startWaiting must remain');
const waiting = app.slice(waitingStart, waitingEnd);
assert.match(waiting, /tall-nut\.png/, 'the 高坚果 logo must still be injected');
assert.match(waiting, /class="waiting-icon"/, 'the existing waiting icon wrapper must remain');
assert.match(waiting, /class="waiting-orb"/, 'the orb may only decorate the logo');
assert.match(waiting, /role="status"/, 'thinking status must remain accessible');
assert.match(waiting, /waiting-time/, 'elapsed time must remain for elapsedMs');
assert.match(waiting, /document\.hidden/, 'waiting text must pause while hidden');
assert.match(waiting, /visibilitychange/, 'visibility changes must be honored');
assert.match(waiting, /prefers-reduced-motion: reduce/, 'waiting text must honor reduced motion');
assert.match(waiting, /clearInterval\(timer\)/, 'waiting must clear its single interval');
assert.match(waiting, /node\.remove\(\)/, 'waiting stopper must still remove the node');
assert.doesNotMatch(app, /sendButton\.textContent\s*=\s*['"]思考中…['"]/, 'busy send button must stay compact');
assert.doesNotMatch(app, /sendButton\.textContent\s*=\s*['"]思考中\.\.['"]/, 'busy send button must not wrap 思考中 typography');
assert.doesNotMatch(app, /sendButton\.textContent\s*=\s*['"]发送 ↑['"]/, 'restored send button must stay compact');
assert.match(app, /function paintSendButton/, 'busy typography must be painted through a compact helper');
assert.match(app, /paintSendButton\(true\)/, 'busy state must use the compact helper');
assert.match(app, /paintSendButton\(false\)/, 'idle state must restore the compact helper');
assert.match(app, /sendButton\.setAttribute\('aria-busy','true'\)/, 'busy state must expose aria-busy');
assert.match(app, /syncModelPill\(\)/, 'model pill must sync from connectionLabel');
assert.match(app, /\$\('#modelPill'\)\.onclick/, 'model pill must open settings');
assert.match(app, /syncComposerTextState/, 'composer has-text state must be wired');
assert.match(app, /classList\.toggle\('has-text'/, 'composer has-text class must be toggled');

assert.match(polish, /--glass-blur:8px/, 'frost must stay light enough that content reads through on iPhone');
assert.doesNotMatch(polish, /--glass-blur:(?:[2-9]\d|1[3-9])px/, 'heavy blur flattens the transcript into a gray slab');
assert.match(polish, /--glass-bg:rgba\(255,255,255,\.035\)/, 'glass fill must be a light white tint, not a dark slab');
assert.match(polish, /-webkit-backdrop-filter:blur\(var\(--glass-blur\)\)/, 'iOS Safari needs the prefixed backdrop-filter');
assert.doesNotMatch(polish, /#chatPanel::after/, 'no dark scrim may sit around the composer');
assert.match(polish, /--glass-fallback:rgba\(22,24,22,\.9\)/, 'unsupported blur must fall back to dark ink');
assert.match(polish, /backdrop-filter:blur\(var\(--glass-blur\)\) saturate\(var\(--glass-sat\)\)/, 'composer backdrop must frost and saturate');
assert.match(polish, /#form\.composer \.glass-backdrop/, 'frost lives on the backdrop layer so content stays sharp');
assert.match(polish, /#form\.composer \.glass-specularity/, 'a specular sheen must decorate the glass');
assert.match(polish, /#form\.composer \.glass-rim/, 'a liquid-glass rim must decorate the edge');
assert.match(polish, /#workspace #form\.composer[\s\S]*position:absolute/, 'composer must overlay the transcript so messages and art can frost through');
assert.match(polish, /--composer-reserve/, 'messages must reserve space under the overlaid composer');
assert.match(polish, /#form \.send \.send-icon/, 'send typography must be an icon, not a wrapped label');
assert.match(polish, /--send-amber:#8e6235/, 'send button must be warm amber matching the nut logo');
assert.match(polish, /#form:not\(\.has-text\) \.send:not\(\.is-busy\)\{filter:/, 'empty state must dim the same button');
assert.match(polish, /#form \.send\.is-busy::after/, 'busy send state must use a compact spinner, not 思考中 text');
assert.match(polish, /#form \.send\{[\s\S]*width:44px/, 'send control must be a 44px touch target');
const composerBlock = polish.slice(0, polish.indexOf('/* UI polish: sidebar glass'));
assert.doesNotMatch(composerBlock, /#form[^{]*\.glass-[^{]*\{[^}]*mix-blend-mode/, 'blend modes on glass layers can isolate the backdrop');
assert.match(glassJs, /reserveTranscript/, 'transcript reserve must be measured from the real composer height');
assert.doesNotMatch(polish, /@property\s+--beam-angle/, 'the travelling beam angle must be removed');
assert.doesNotMatch(polish, /composer-beam-turn/, 'the travelling border beam must be removed');
assert.doesNotMatch(polish, /--beam-accent|#1ed760|#84a86c|#b7d69e|#46523b|#7fd89c/, 'composer identity must not use the rejected green treatment');
assert.match(css, /\.waiting-orb::before/, 'thinking halo must decorate the logo');
assert.match(css, /\.waiting-orb \.waiting-icon img/, 'the nut image must remain visible inside the orb wrapper');
assert.match(polish, /\.waiting-capsule\{/, 'the status capsule must be styled as glass');

assert.match(glassJs, /roundedRectSDF/, 'displacement map must use the liquid-glass rounded-rect SDF');
assert.match(glassJs, /feDisplacementMap/, 'progressive enhancement may use an SVG displacement filter');
assert.match(glassJs, /canDisplace/, 'displacement must be feature-detected');
assert.match(glassJs, /iPhone\|iPad\|iPod/, 'iPad Safari must not depend on displacement');
assert.match(glassJs, /prefers-reduced-motion: reduce/, 'displacement must honor reduced motion');
assert.doesNotMatch(glassJs, /from ['"]react['"]|require\(['"]react['"]\)/, 'liquid glass must be vanilla JS, not React');
assert.match(rei, /\.rei-theme #form\{background:transparent/, 'rei theme must not paint an opaque composer fill over the glass');

assert.match(css, /#sidebar \.sidebar-tabs \.nav\.active/, 'selected sidebar tab must be restyled');
assert.match(css, /#sidebar #newConversation/, 'new-conversation control must be restyled');
assert.match(sidebar, /#sidebar \.sidebar-tabs \.nav\.active/, 'selected tab rule lives in the glass sidebar block');
assert.doesNotMatch(sidebar, /#1ed760|#3c4a34|#83a567|#1b2517|#303e27|#222620|#84a86c|#b7d69e|#b9df9e|#9ac386/, 'sidebar glass must not reintroduce moss-green fills');
assert.match(sidebar, /backdrop-filter:blur\(28px\)/, 'open sidebar panel uses frosted glass');
assert.match(sidebar, /border-left:2px solid rgba\(255,255,255,\.32\)/, 'pinned rows use a pale glass edge, not a green bar');

const reducedIndex = css.lastIndexOf('@media(prefers-reduced-motion:reduce)');
assert.ok(reducedIndex >= 0, 'reduced-motion media query must exist');
const reduced = css.slice(reducedIndex);
assert.match(reduced, /#form\.composer::before\{animation:none/, 'any rim effect must stay still under reduced motion');
assert.match(reduced, /\.waiting-orb::before\{animation:none/, 'halo must stop under reduced motion');
assert.match(reduced, /\.waiting-orb \.waiting-icon\{animation:none/, 'nut breathe must stop under reduced motion');
assert.match(reduced, /\.waiting-particle\{display:none\}/, 'particles must not orbit under reduced motion');
assert.match(reduced, /#form \.send\.is-busy::after\{animation:none/, 'busy spinner must stop under reduced motion');

for (const rejected of ['#a855f7', '#ec4899', '#8b5cf6', '#6366f1', '#38bdf8']) {
  assert.ok(!css.toLowerCase().includes(rejected), `rejected rainbow hue ${rejected} must not appear`);
}

console.log('PASS: liquid-glass composer, compact send typography, overlay frost, Safari-first backdrop, displacement as PE, reduced motion and palette guard.');
