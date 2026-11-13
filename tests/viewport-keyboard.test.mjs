import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const layout = fs.readFileSync(new URL('../public/layout.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../public/chat-layout.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

// --- Viewport: simulate the iOS keyboard opening and closing against the real layout.js code.
const viewportPart = layout.slice(layout.indexOf("(()=>{\n'use strict';\nconst viewport=window.visualViewport;"));
function makeEnv() {
  const listeners = {}, vvListeners = {}, docListeners = {}, timers = [];
  const props = new Map(), classes = new Set();
  const textarea = { tagName: 'TEXTAREA', style: {}, scrollHeight: 40, addEventListener() {} };
  const body = { tagName: 'BODY' };
  const env = { scrolledTo: null };
  const visualViewport = { height: 852, offsetTop: 0, addEventListener: (n, f) => (vvListeners[n] = f) };
  const document = {
    activeElement: body, body, hidden: false,
    documentElement: { style: { setProperty: (k, v) => props.set(k, v), removeProperty: k => props.delete(k) }, classList: { add: c => classes.add(c), remove: c => classes.delete(c) } },
    querySelector: s => (s === '#input' ? textarea : null),
    addEventListener: (n, f) => (docListeners[n] = f)
  };
  const window = {
    innerHeight: 852, scrollY: 0, visualViewport,
    addEventListener: (n, f) => (listeners[n] = f),
    scrollTo: (x, y) => { env.scrolledTo = [x, y]; window.scrollY = 0; }
  };
  const ctx = { window, document, requestAnimationFrame: f => (f(), 1), cancelAnimationFrame() {}, setTimeout: f => (timers.push(f), timers.length), clearTimeout() {} };
  vm.createContext(ctx);
  vm.runInContext(viewportPart, ctx);
  Object.assign(env, { ctx, window, document, visualViewport, textarea, body, props, classes, timers, docListeners, vvListeners, flush() { while (timers.length) timers.shift()(); } });
  return env;
}
{
  const e = makeEnv();
  assert.equal(e.props.has('--chat-viewport-height'), false, 'no keyboard: no height lock, CSS 100dvh applies');
  // Keyboard opens: composer focused, visual viewport shrinks.
  e.document.activeElement = e.textarea; e.docListeners.focusin(); e.visualViewport.height = 480; e.visualViewport.offsetTop = 0; e.vvListeners.resize(); e.flush();
  assert.equal(e.props.get('--chat-viewport-height'), '480px', 'keyboard open: shell follows the visual viewport so the composer stays above it');
  assert.ok(e.classes.has('keyboard-open'));
  // Keyboard closes but iOS reports no resize at all and leaves the page scrolled: blur alone must restore.
  e.window.scrollY = 372; e.document.activeElement = e.body; e.docListeners.focusout(); e.flush();
  assert.equal(e.props.has('--chat-viewport-height'), false, 'focus left editing: the height lock is cleared even if the viewport still reads short');
  assert.equal(e.classes.has('keyboard-open'), false);
  assert.deepEqual(e.scrolledTo, [0, 0], 'leftover keyboard scroll offset is reset');
  // Viewport grows back later: still unlocked.
  e.visualViewport.height = 852; e.vvListeners.resize(); e.flush();
  assert.equal(e.props.has('--chat-viewport-height'), false);
  // Focused input but no keyboard (hardware keyboard / desktop): never lock.
  e.document.activeElement = e.textarea; e.docListeners.focusin(); e.flush();
  assert.equal(e.props.has('--chat-viewport-height'), false, 'focus without a keyboard-sized shrink does not lock the height');
}

// --- Drawer: opening the sidebar dismisses the keyboard first, so it gets the full screen and its gestures.
{
  const drawerPart = layout.slice(0, layout.indexOf('})();') + 5);
  const events = {}; let blurred = false;
  const summary = { setAttribute() {}, addEventListener: (n, f) => (events['summary:' + n] = f) };
  const drawer = { open: false, classList: { add() {}, remove() {} }, querySelector: () => summary, addEventListener() {} };
  const input = { tagName: 'TEXTAREA', blur() { blurred = true; document.activeElement = null; } };
  const document = { activeElement: input, body: {}, querySelector: s => (s === '#sidebar' ? drawer : null), addEventListener: (n, f) => (events[n] = f) };
  const ctx = { window: {}, document, setTimeout: () => 1, clearTimeout() {} };
  vm.createContext(ctx); vm.runInContext(drawerPart, ctx);
  ctx.window.Drawer.open();
  assert.equal(drawer.open, true); assert.equal(blurred, true, 'opening the drawer blurs the composer (keyboard closes)');
}

// --- New conversation must not pop the keyboard on touch devices.
assert.match(app, /openConversation\(conversation\.id,'chat'\);focusComposerUnlessTouch\(\);/, 'new conversation uses the touch-aware focus');
assert.match(app, /function focusComposerUnlessTouch\(\)\{const coarse=window\.matchMedia&&window\.matchMedia\('\(pointer: coarse\)'\)\.matches;if\(coarse\)return;/);
{
  const fn = app.slice(app.indexOf('function focusComposerUnlessTouch'), app.indexOf('\n', app.indexOf('function focusComposerUnlessTouch')));
  for (const coarse of [true, false]) {
    let focused = false;
    const ctx = { window: { matchMedia: () => ({ matches: coarse }) }, document: { getElementById: () => ({ focus() { focused = true; } }) } };
    vm.createContext(ctx); vm.runInContext(fn + ';focusComposerUnlessTouch();', ctx);
    assert.equal(focused, !coarse, coarse ? 'phone: no auto focus' : 'desktop: still focuses');
  }
}

// --- Sub-dialogs return to Settings.
assert.match(app, /\$\('#connect'\)\.onclick=\(\)=>\{[^}]*openSubDialog\(\$\('#connection'\),'settingsDialog'\);\};/, '模型与 API opens as a sub-dialog of 设置');
assert.match(app, /openSubDialog\(\$\('#importDialog'\),'settingsDialog'\)/, 'import opens as a sub-dialog of 设置');
{
  const start = app.indexOf('function openSubDialog');
  const code = app.slice(start, app.indexOf('\n', app.indexOf('document.querySelectorAll(\'dialog\').forEach', start)));
  const mk = id => { const l = {}; const d = { id, open: false, dataset: {}, showModal() { d.open = true; }, close() { d.open = false; (l.close || (() => {}))(); }, addEventListener: (n, f) => (l[n] = f) }; return d; };
  const settings = mk('settingsDialog'), connection = mk('connection');
  const all = [settings, connection];
  const document = { getElementById: id => all.find(d => d.id === id) || null, querySelectorAll: () => all, querySelector: () => all.find(d => d.open) || null };
  const ctx = { document }; vm.createContext(ctx); vm.runInContext(code, ctx);
  settings.showModal();
  ctx.openSubDialog(connection, 'settingsDialog');
  assert.equal(settings.open, false); assert.equal(connection.open, true);
  connection.close();
  assert.equal(settings.open, true, 'closing 模型与 API returns to 设置');
  settings.close();
  ctx.openSubDialog(connection, 'settingsDialog'); connection.close();
  assert.equal(settings.open, false, 'opened directly (model pill): closing does not resurrect 设置');
}

// --- Close buttons: one solid accent disc everywhere, focus lands on titles.
const v9 = css.slice(css.indexOf('/* UI polish v9'));
assert.match(v9, /dialog button\.close,\ndialog button\[aria-label="关闭"\],[\s\S]*?border-radius:50%;\n background:var\(--accent\);\n color:var\(--accent-on\)/, 'all dialog close buttons are solid accent discs');
assert.match(v9, /dialog button\.close:focus,\ndialog button\[aria-label="关闭"\]:focus\{outline:none;box-shadow:none\}/, 'no square focus ring on open');
assert.match(html, /<dialog id="connection"><button class="close" id="closeConnection" aria-label="关闭">✕<\/button><h2 tabindex="-1" autofocus>模型与 API<\/h2>/, '模型与 API focuses its title');
for (const m of html.matchAll(/<dialog id="(\w+)">([\s\S]*?)<\/dialog>/g)) {
  if (/aria-label="关闭"/.test(m[2])) assert.match(m[2], /<h2[^>]*tabindex="-1" autofocus/, m[1] + ': opening focuses the title, not ✕');
}
for (const [file, token] of [['chat-layout.css', 'ui-fx16'], ['app.js', 'ui-fx16'], ['layout.js', 'ui-fx16']]) assert.ok(html.includes(file + '?v=' + token), file + ' cache token');
console.log('PASS: keyboard height lock only while editing and restored on blur without resize, drawer dismisses keyboard, no phone auto-focus, sub-dialogs return to settings, uniform accent close.');
