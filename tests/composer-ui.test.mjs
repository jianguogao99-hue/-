import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = read('public/index.html');
const app = read('public/app.js');
const css = read('public/chat-layout.css');

assert.match(html, /<form[^>]*class="composer"[^>]*id="form"[^>]*>/, 'composer form must remain');
assert.match(html, /<textarea[^>]*id="input"[^>]*maxlength="4000"[^>]*required/, 'composer textarea contract must remain');
const sendTag = html.match(/<button[^>]*class="send"[^>]*type="submit"[^>]*>/)?.[0] || '';
assert.ok(sendTag, 'composer submit button must remain type=submit');
const pillTag = html.match(/<button[^>]*id="modelPill"[^>]*>/)?.[0] || '';
assert.ok(pillTag, 'model pill button must exist');
assert.match(pillTag, /type="button"/, 'model pill must not submit the form');
assert.doesNotMatch(pillTag, /type="submit"/, 'model pill must never steal form submission');
assert.match(html, /id="modelPillLabel"/, 'model pill needs a truncatable label');
assert.match(html, /chat-layout\.css\?v=ui-fx1/, 'edited composer CSS needs a new cache token');
assert.match(html, /app\.js\?v=ui-fx1/, 'edited composer JS needs a new cache token');

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

const colors = {
  '--beam-dim': '#46523b',
  '--beam-mid': '#84a86c',
  '--beam-soft': '#b7d69e',
  '--beam-accent': '#1ed760',
  '--orb-core': '#7fd89c',
  '--orb-halo': '#91a183',
  '--glass-bg': '#1d251dea',
  '--glass-fallback': '#1d251d',
};
for (const [name, value] of Object.entries(colors)) {
  assert.ok(css.includes(`${name}:${value}`), `missing theme token ${name}`);
}
assert.match(css, /@property\s+--beam-angle\s*\{/, 'beam must register an animatable angle');
assert.match(css, /conic-gradient\(from var\(--beam-angle\)/, 'beam must travel around the composer edge');
assert.match(css, /mask-composite:exclude/, 'beam must use a masked border ring');
assert.match(css, /@supports\s*\(background:conic-gradient/, 'beam needs a feature-query fallback');
assert.equal((css.match(/animation:composer-beam-turn/g) || []).length, 1, 'only one beam pseudo may animate');
assert.match(css, /\.waiting-orb::before/, 'thinking halo must decorate the logo');
assert.match(css, /\.waiting-orb \.waiting-icon img/, 'the nut image must remain visible inside the orb wrapper');

const reducedIndex = css.lastIndexOf('@media(prefers-reduced-motion:reduce)');
assert.ok(reducedIndex >= 0, 'reduced-motion media query must exist');
const reduced = css.slice(reducedIndex);
assert.match(reduced, /#form\.composer::before\{animation:none/, 'beam must stop under reduced motion');
assert.match(reduced, /\.waiting-orb::before\{animation:none/, 'halo must stop under reduced motion');
assert.match(reduced, /\.waiting-orb \.waiting-icon\{animation:none/, 'nut breathe must stop under reduced motion');
assert.match(reduced, /\.waiting-particle\{display:none\}/, 'particles must not orbit under reduced motion');

for (const rejected of ['#a855f7', '#ec4899', '#8b5cf6', '#6366f1', '#38bdf8']) {
  assert.ok(!css.toLowerCase().includes(rejected), `rejected rainbow hue ${rejected} must not appear`);
}

console.log('PASS: composer pill/submit contract, animated green beam, logo-preserving thinking orb, reduced motion and palette guard.');
