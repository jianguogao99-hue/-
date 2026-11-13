import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const layout = fs.readFileSync(new URL('../public/layout.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../public/chat-layout.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const part = layout.slice(layout.indexOf("(()=>{\n'use strict';\n// Keyboard handling, v11"));
assert.ok(part.length > 100, 'v11 keyboard block present');

// No JS height pinning anywhere: the shell is CSS-only.
assert.doesNotMatch(part, /--chat-viewport-height|--chat-viewport-top|keyboard-open|style\.height\s*=\s*[^'"]*viewport/, 'no viewport-height pinning');
assert.doesNotMatch(html, /interactive-widget/, 'no interactive-widget (Chrome resizes + our lift would double)');
assert.match(html, /viewport-fit=cover/);
assert.match(html, /<meta name="theme-color" content="#070907">/);
const v11 = css.slice(css.indexOf('/* UI v11'));
assert.match(v11, /height:100lvh!important/, 'shell paints full-bleed to the bottom edge');
assert.match(v11, /padding-bottom:var\(--toolbar-gap\)!important/, 'content stops above the browser toolbar');
assert.match(v11, /translate3d\(0,calc\(-1 \* var\(--kb-lift,0px\)\),0\)/, 'composer lift is one transform');
assert.match(v11, /html\.kb-glide #workspace #form\.composer\{transition:transform 240ms cubic-bezier\(\.2,\.8,\.2,1\)\}/);
for (const [file, token] of [['chat-layout.css', 'ui-fx17'], ['app.js', 'ui-fx17'], ['layout.js', 'ui-fx17']]) assert.ok(html.includes(file + '?v=' + token), file + ' cache token');

function makeEnv() {
  const props = new Map(), classes = new Set(); let frames = [], timers = [];
  const vv = { height: 852, offsetTop: 0, l: {}, addEventListener(n, f) { this.l[n] = f; } };
  // Composer rests 34px (safe area) above the bottom; its rect moves with the applied lift.
  const composer = { getBoundingClientRect: () => ({ bottom: 852 - 34 - parseInt(props.get('--kb-lift') || '0') }) };
  const textarea = { tagName: 'TEXTAREA', style: {}, scrollHeight: 40, addEventListener() {} };
  const search = { tagName: 'INPUT' }, body = { tagName: 'BODY' };
  const dl = {};
  const root = { style: { setProperty: (k, v) => props.set(k, v), removeProperty: k => props.delete(k) }, classList: { toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)), contains: c => classes.has(c) }, };
  const document = { activeElement: body, body, documentElement: root, querySelector: s => (s === '#input' ? textarea : s === '#form' ? composer : null), addEventListener: (n, f) => (dl[n] = f) };
  const window = { innerHeight: 852, scrollY: 0, visualViewport: vv, addEventListener() {}, scrolls: 0, scrollTo() { this.scrolls++; this.scrollY = 0; vv.offsetTop = 0; } };
  const ctx = { window, document, requestAnimationFrame: f => (frames.push(f), frames.length), cancelAnimationFrame: () => { frames = []; }, setTimeout: f => (timers.push(f), timers.length), clearTimeout() {} };
  vm.createContext(ctx); vm.runInContext(part, ctx);
  const run = () => { for (let i = 0; i < 10 && (frames.length || timers.length); i++) { const f = frames; frames = []; f.forEach(x => x()); const t = timers; timers = []; t.forEach(x => x()); } };
  return { props, classes, vv, window, document, textarea, search, body, dl, run, api: window.WenjiViewport };
}

// --- Pure math.
{
  const { api } = makeEnv();
  const L = m => api.composerLift(m);
  assert.equal(L({ focused: false, innerHeight: 852, vvHeight: 500, vvTop: 0, restingBottom: 818 }), 0, 'not editing the composer: never lifted');
  assert.equal(L({ focused: true, innerHeight: 852, vvHeight: 852, vvTop: 0, restingBottom: 818 }), 0, 'no keyboard: 0');
  // Keyboard 336px tall, iOS did not scroll the page: lift to just above it.
  assert.equal(L({ focused: true, innerHeight: 852, vvHeight: 516, vvTop: 0, restingBottom: 818 }), 818 + 8 - 516);
  // iOS ALSO scrolled the page up by 250px itself: that scroll already moved the composer; we only add the rest.
  assert.equal(L({ focused: true, innerHeight: 852, vvHeight: 516, vvTop: 250, restingBottom: 818 }), 818 + 8 - 766, 'iOS page shift is not added twice');
  // iOS scrolled far enough on its own: 0, never negative.
  assert.equal(L({ focused: true, innerHeight: 852, vvHeight: 516, vvTop: 336, restingBottom: 818 }), 0);
  // Chrome Android resizing the layout (innerHeight shrinks with vv): CSS already moved it -> 0, no double.
  assert.equal(L({ focused: true, innerHeight: 516, vvHeight: 516, vvTop: 0, restingBottom: 482 }), 0, 'resized layout: no extra lift');
  // Spec shape: lift == innerHeight - vv.height - vv.offsetTop minus the composer's own resting gap (+8px margin).
  for (const [vh, top] of [[516, 0], [480, 120], [600, 40]]) {
    const gap = 34;
    assert.equal(L({ focused: true, innerHeight: 852, vvHeight: vh, vvTop: top, restingBottom: 852 - gap }), Math.max(0, 852 - vh - top - gap + 8));
  }
}

// --- Event flow: open, iOS page-shift, scroll drag, close, restore.
{
  const e = makeEnv(); e.run();
  assert.equal(e.api.lift, 0);
  const c0 = e.api.changes;
  e.document.activeElement = e.textarea; e.dl.focusin({ target: e.textarea });
  e.vv.height = 516; e.vv.l.resize(); e.vv.l.resize(); e.vv.l.resize(); e.run();
  assert.equal(e.props.get('--kb-lift'), '310px', 'open: one lift to just above the keyboard');
  assert.equal(e.api.changes - c0, 1, 'a burst of resizes = one change');
  assert.ok(e.classes.has('kb-glide'), 'keyboard opening animates');
  assert.equal(e.window.scrolls, 0, 'never scrollTo while typing (that fights iOS)');
  // iOS then scrolls the page 200px: lift shrinks by exactly that, without animation (follows the scroll).
  e.vv.offsetTop = 200; e.vv.l.scroll(); e.run();
  assert.equal(e.props.get('--kb-lift'), '110px', 'page shift: total movement stays exactly at the keyboard top');
  assert.equal(e.classes.has('kb-glide'), false, 'scroll-driven updates do not animate');
  // Re-measuring with the lift applied is stable (resting bottom = rect + lift), no drift.
  const c1 = e.api.changes; e.vv.l.scroll(); e.vv.l.resize(); e.run();
  assert.equal(e.api.changes - c1, 0, 'stable: no extra writes');
  // Close: blur; iOS leaves the page scrolled and the viewport stale.
  e.window.scrollY = 200; e.document.activeElement = e.body; e.dl.focusout(); e.run();
  assert.equal(e.props.get('--kb-lift'), '0px', 'blur resets the lift to 0 even if iOS never fires resize');
  assert.ok(e.classes.has('kb-glide'), 'closing animates');
  assert.ok(e.window.scrolls >= 1, 'leftover iOS page scroll is restored');
  assert.equal(e.window.scrollY, 0);
  e.vv.height = 852; e.vv.l.resize(); e.run();
  assert.equal(e.props.get('--kb-lift'), '0px');
}

// --- Map search: no lift at all; blur only restores the scroll.
{
  const e = makeEnv(); e.run();
  e.document.activeElement = e.search; e.dl.focusin({ target: e.search });
  e.vv.height = 516; e.vv.offsetTop = 180; e.window.scrollY = 180; e.vv.l.resize(); e.vv.l.scroll(); e.run();
  assert.equal(e.api.lift, 0, 'search focus never moves the composer or any container');
  assert.equal(e.window.scrolls, 0, 'and lets iOS scroll it into view');
  e.document.activeElement = e.body; e.dl.focusout(); e.run();
  assert.equal(e.window.scrolls >= 1 && e.window.scrollY === 0, true, 'blur puts the page back (no clipped half screen)');
}
console.log('PASS: keyboard lift math (no double offset with iOS page shift or Chrome resize, restore to 0), no height pinning, full-bleed CSS, search untouched.');
