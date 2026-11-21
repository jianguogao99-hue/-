import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const layout = fs.readFileSync(new URL('../public/layout.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../public/chat-layout.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const part = layout.slice(layout.indexOf("(()=>{\n'use strict';\n// Keyboard handling, v15"));
assert.ok(part.length > 100, 'v15 keyboard block present');

// No JS height pinning anywhere: the shell is CSS-only.
assert.doesNotMatch(part, /--chat-viewport-height|--chat-viewport-top|keyboard-open|style\.height\s*=\s*[^'"]*viewport/, 'no viewport-height pinning');
assert.doesNotMatch(html, /interactive-widget/, 'no interactive-widget (Chrome resizes + our lift would double)');
assert.match(html, /viewport-fit=cover/);
assert.match(html, /<meta name="theme-color" content="#101010">/);
const v12 = css.slice(css.indexOf('/* UI v12'));
assert.match(v12, /height:100lvh!important/, 'document shell paints full-bleed to the bottom edge');
assert.match(v12, /bottom:calc\(var\(--viewport-stack-gap\) \+ var\(--composer-inset\)\)/, 'composer rests above the dynamic viewport bottom');
const v15 = css.slice(css.indexOf('/* UI v15'));
assert.match(v15, /html\.kb-fixed #workspace #form\.composer,[\s\S]*?position:fixed!important;[\s\S]*?top:0!important;[\s\S]*?bottom:auto!important;/, 'focused composer is fixed from the visual viewport top');
assert.match(v15, /transform:translate3d\(0,var\(--kb-top,0px\),0\)!important/, 'visual-viewport top is applied as one transform');
assert.match(v15, /transition:none!important/, 'keyboard tracking does not lag behind the visual viewport');
const v16 = css.slice(css.indexOf('/* UI v16'));
assert.match(v16, /padding-bottom:var\(--list-bottom-pad\)!important/, 'mobile list padding comes from the measured composer position');
assert.match(v16, /#messages>\.msg:last-child\{margin-bottom:0!important\}/, 'the final message leaves exactly the measured 16px gap');
assert.match(v16, /padding-bottom:calc\(var\(--list-bottom-pad\) \+ var\(--kb-lift,0px\)\)!important/, 'keyboard reserve stacks on the exact list padding');
assert.doesNotMatch(part, /--map-top-zone|updateMapTopZone|mapTopZone/, 'map chrome never uses a viewport-measured top zone');
for (const [file, token] of [['chat-layout.css', 'ui-fx42'], ['app.js', 'ui-fx42'], ['layout.js', 'ui-fx43']]) assert.ok(html.includes(file + '?v=' + token), file + ' cache token');

function makeEnv() {
  const props = new Map(), classes = new Set(); let frames = [], timers = [];
  const vv = { height: 852, offsetTop: 0, l: {}, addEventListener(n, f) { this.l[n] = f; } };
  const messages = { getBoundingClientRect: () => ({ top: 0, bottom: 852, height: 852 }) };
  const composer = { getBoundingClientRect: () => ({ top: 710, bottom: 818, height: 108 }) };
  const textarea = { tagName: 'TEXTAREA', style: {}, scrollHeight: 40, addEventListener() {} };
  const search = { tagName: 'INPUT' }, body = { tagName: 'BODY' };
  const dl = {};
  const root = { style: { setProperty: (k, v) => props.set(k, v), removeProperty: k => props.delete(k) }, classList: { toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)), contains: c => classes.has(c) }, };
  const document = { activeElement: body, body, documentElement: root, querySelector: s => (s === '#input' ? textarea : s === '#form' ? composer : s === '#messages' ? messages : null), addEventListener: (n, f) => (dl[n] = f) };
  const window = { innerHeight: 852, scrollY: 0, visualViewport: vv, addEventListener() {}, scrolls: 0, scrollTo() { this.scrolls++; this.scrollY = 0; vv.offsetTop = 0; } };
  const ctx = { window, document, requestAnimationFrame: f => (frames.push(f), frames.length), cancelAnimationFrame: () => { frames = []; }, setTimeout: f => (timers.push(f), timers.length), clearTimeout() {} };
  vm.createContext(ctx); vm.runInContext(part, ctx);
  const run = () => { for (let i = 0; i < 10 && (frames.length || timers.length); i++) { const f = frames; frames = []; f.forEach(x => x()); const t = timers; timers = []; t.forEach(x => x()); } };
  return { props, classes, vv, window, document, textarea, search, body, messages, dl, run, api: window.WenjiViewport };
}

// --- Pure math.
{
  const { api } = makeEnv();
  const T = m => api.composerTop(m);
  assert.equal(T({ innerHeight: 852, vvHeight: 852, vvTop: 0, composerHeight: 108 }), 736, 'no keyboard: 8px above the visible bottom');
  assert.equal(T({ innerHeight: 852, vvHeight: 516, vvTop: 0, composerHeight: 108 }), 400, 'keyboard: absolute top from the visual viewport');
  assert.equal(T({ innerHeight: 852, vvHeight: 516, vvTop: 250, composerHeight: 108 }), 650, 'iOS page shift is counted once');
  assert.equal(T({ innerHeight: 516, vvHeight: 516, vvTop: 0, composerHeight: 108 }), 400, 'resized layout uses the same formula');
  assert.equal(T({ innerHeight: 852, vvHeight: null, vvTop: 0, composerHeight: 108 }), 736, 'missing vv height falls back to innerHeight');
  const R = m => api.composerReserve(m);
  assert.equal(R({ innerHeight: 852, vvHeight: 516, vvTop: 0 }), 336, 'message reserve = occluded keyboard height');
  assert.equal(R({ innerHeight: 852, vvHeight: 516, vvTop: 200 }), 136, 'page shift reduces the reserve');
  assert.equal(R({ innerHeight: 852, vvHeight: 852, vvTop: 0 }), 0, 'no keyboard: no extra message reserve');
  assert.equal(api.listBottomPad({ messagesBottom: 852, composerTop: 710 }), 158, 'list padding = messages bottom - resting composer top + 16');
  assert.equal(api.listBottomPad({ messagesBottom: 0, composerTop: 710 }), 0, 'missing layout measurements do not create padding');
}

// --- Event flow: open, iOS page-shift, scroll drag, close, restore.
{
  const e = makeEnv(); e.run();
  assert.equal(e.api.top, 0);
  assert.equal(e.props.get('--list-bottom-pad'), '158px', 'initial layout measures the exact composer offset');
  const c0 = e.api.changes;
  e.document.activeElement = e.textarea; e.dl.focusin({ target: e.textarea });
  e.vv.height = 516; e.vv.l.resize(); e.vv.l.resize(); e.vv.l.resize(); e.run();
  assert.equal(e.props.get('--kb-top'), '400px', 'open: absolute top just above the keyboard');
  assert.equal(e.props.get('--kb-lift'), '336px', 'open: message reserve matches the occluded keyboard');
  assert.equal(e.api.changes - c0, 1, 'a burst of resizes = one change');
  assert.ok(e.classes.has('kb-fixed'), 'composer enters fixed visual-viewport mode');
  assert.ok(e.classes.has('kb-lifted'), 'bottom fade yields to the keyboard');
  assert.equal(e.window.scrolls, 0, 'never scrollTo while typing (that fights iOS)');
  // iOS then scrolls the page 200px: the composer top includes offsetTop exactly once.
  e.vv.offsetTop = 200; e.vv.l.scroll(); e.run();
  assert.equal(e.props.get('--kb-top'), '600px', 'page shift: top = offsetTop + height - composerH - 8');
  assert.equal(e.props.get('--kb-lift'), '136px', 'page shift also shrinks the message reserve');
  // Re-measuring with the placement applied is stable, no drift.
  const c1 = e.api.changes; e.vv.l.scroll(); e.vv.l.resize(); e.run();
  assert.equal(e.api.changes - c1, 0, 'stable: no extra writes');
  // Close: blur; iOS leaves the page scrolled and the viewport stale.
  e.window.scrollY = 200; e.document.activeElement = e.body; e.dl.focusout(); e.run();
  assert.equal(e.props.get('--kb-top'), '0px', 'blur leaves fixed mode');
  assert.equal(e.props.get('--kb-lift'), '0px', 'blur clears the message reserve even if iOS never fires resize');
  assert.equal(e.classes.has('kb-fixed'), false, 'composer returns to the v14 resting position');
  assert.equal(e.classes.has('kb-lifted'), false, 'bottom fade returns');
  assert.ok(e.window.scrolls >= 1, 'leftover iOS page scroll is restored');
  assert.equal(e.window.scrollY, 0);
  e.vv.height = 852; e.vv.l.resize(); e.run();
  assert.equal(e.props.get('--kb-top'), '0px');
}

// --- Map search: no lift at all; blur only restores the scroll.
{
  const e = makeEnv(); e.run();
  e.document.activeElement = e.search; e.dl.focusin({ target: e.search });
  e.vv.height = 516; e.vv.offsetTop = 180; e.window.scrollY = 180; e.vv.l.resize(); e.vv.l.scroll(); e.run();
  assert.equal(e.api.fixed, false, 'search focus never pins the composer');
  assert.equal(e.api.top, 0, 'search focus never moves the composer');
  assert.equal(e.api.lift, 0, 'search focus never adds a message reserve');
  assert.equal(e.window.scrolls, 0, 'and lets iOS scroll it into view');
  e.document.activeElement = e.body; e.dl.focusout(); e.run();
  assert.equal(e.window.scrolls >= 1 && e.window.scrollY === 0, true, 'blur puts the page back (no clipped half screen)');
}
console.log('PASS: visual-viewport composer top, 8px keyboard gap, page-shift reserve, blur reset, no height pinning, search untouched.');
