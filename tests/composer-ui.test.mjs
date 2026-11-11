import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = read('public/index.html');
const app = read('public/app.js');
const css = read('public/chat-layout.css');
const polish = css.slice(css.indexOf('/* UI polish: frosted-glass composer'));
const sidebar = css.slice(css.indexOf('/* UI polish: sidebar glass'));

assert.match(html, /<form[^>]*class="composer"[^>]*id="form"[^>]*>/, 'composer form must remain');
assert.match(html, /<textarea[^>]*id="input"[^>]*maxlength="4000"[^>]*required/, 'composer textarea contract must remain');
const sendTag = html.match(/<button[^>]*class="send"[^>]*type="submit"[^>]*>/)?.[0] || '';
assert.ok(sendTag, 'composer submit button must remain type=submit');
const pillTag = html.match(/<button[^>]*id="modelPill"[^>]*>/)?.[0] || '';
assert.ok(pillTag, 'model pill button must exist');
assert.match(pillTag, /type="button"/, 'model pill must not submit the form');
assert.doesNotMatch(pillTag, /type="submit"/, 'model pill must never steal form submission');
assert.match(html, /id="modelPillLabel"/, 'model pill needs a truncatable label');
assert.match(html, /chat-layout\.css\?v=ui-fx2/, 'edited composer CSS needs a new cache token');
assert.match(html, /app\.js\?v=ui-fx1/, 'unchanged composer JS keeps its cache token');

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
assert.doesNotMatch(app, /sendButton\.textContent\s*=\s*['"]发送 ↑['"]/, 'restored send button must stay compact');
assert.match(app, /sendButton\.classList\.add\('is-busy'\)/, 'busy state must use a class');
assert.match(app, /sendButton\.setAttribute\('aria-busy','true'\)/, 'busy state must expose aria-busy');
assert.match(app, /syncModelPill\(\)/, 'model pill must sync from connectionLabel');
assert.match(app, /\$\('#modelPill'\)\.onclick/, 'model pill must open settings');
assert.match(app, /syncComposerTextState/, 'composer has-text state must be wired');
assert.match(app, /classList\.toggle\('has-text'/, 'composer has-text class must be toggled');

assert.match(polish, /--glass-blur:32px/, 'glass blur must be 32px');
assert.match(polish, /--glass-bg:rgba\(8,8,8,\.42\)/, 'glass fill must be translucent ink');
assert.match(polish, /--glass-fallback:#101510/, 'unsupported blur must fall back to login ink');
assert.match(polish, /--glass-rim:rgba\(255,255,255,\.16\)/, 'glass rim must be a pale mist, not green');
assert.match(polish, /backdrop-filter:blur\(var\(--glass-blur\)\)/, 'composer must use the stronger backdrop blur');
assert.match(polish, /#form\.composer::before/, 'a static glass sheen may decorate the rim');
assert.doesNotMatch(polish, /@property\s+--beam-angle/, 'the travelling beam angle must be removed');
assert.doesNotMatch(polish, /composer-beam-turn/, 'the travelling border beam must be removed');
assert.doesNotMatch(polish, /--beam-accent|#1ed760|#84a86c|#b7d69e|#46523b|#7fd89c/, 'composer identity must not use the rejected green treatment');
assert.match(css, /\.waiting-orb::before/, 'thinking halo must decorate the logo');
assert.match(css, /\.waiting-orb \.waiting-icon img/, 'the nut image must remain visible inside the orb wrapper');
assert.match(polish, /\.waiting-capsule\{/, 'the status capsule must be styled as glass');


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

for (const rejected of ['#a855f7', '#ec4899', '#8b5cf6', '#6366f1', '#38bdf8']) {
  assert.ok(!css.toLowerCase().includes(rejected), `rejected rainbow hue ${rejected} must not appear`);
}

console.log('PASS: frosted-glass composer and sidebar, neutral rim, logo-preserving thinking glow, reduced motion and palette guard.');
