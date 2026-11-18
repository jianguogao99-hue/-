import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const layout = fs.readFileSync(new URL('../public/layout.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../public/chat-layout.css', import.meta.url), 'utf8');
const rei = fs.readFileSync(new URL('../public/rei-background.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

// Keyboard lift (v11) is covered in tests/keyboard-lift.test.mjs.

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

// --- UI v12: the document is the layout root; no fixed shell touches Safari's toolbar.
const v12 = css.slice(css.indexOf('/* UI v12'), css.indexOf('/* UI v13'));
assert.ok(v12.length > 100, 'UI v12 shell present');
assert.match(v12, /body\{\n position:relative!important;/, 'body stays in normal flow');
assert.match(v12, /html:not\(\.keyboard-open\) main\{\n position:relative!important;/, 'main stays in normal flow');
assert.doesNotMatch(v12, /(?:^|\n)(?:html\s+)?body[^{]*\{[^}]*position:\s*fixed/i, 'body is never fixed');
assert.doesNotMatch(v12, /(?:^|\n)(?:html\s+)?main[^{]*\{[^}]*position:\s*fixed/i, 'main is never fixed');
assert.match(v12, /\.rei-background\{\n position:absolute!important;/, 'ASCII background is absolute, not fixed');
assert.match(v12, /min-height:100lvh!important/, 'body uses the large viewport height');
assert.match(v12, /height:100lvh!important/, 'main and the background cover 100lvh');
assert.match(v12, /--viewport-stack-gap:max\(0px,calc\(100lvh - 100dvh\)\)/, 'composer anchoring uses large/dynamic viewport math');
assert.match(v12, /overscroll-behavior:none/, 'page rubber-banding is suppressed');
assert.match(v12, /bottom:calc\(var\(--viewport-stack-gap\) \+ var\(--composer-inset\)\)/, 'composer sits above the dynamic viewport bottom');
assert.match(v12, /padding-bottom:calc\(var\(--composer-reserve\) \+ var\(--viewport-stack-gap\) \+ var\(--composer-inset\) \+ 16px\)/, 'messages reserve room for the composer, safe area and toolbar');
assert.match(v12, /html\.kb-lifted #workspace #chatPanel #messages,[\s\S]*?var\(--kb-lift,0px\) \+ 16px/, 'keyboard lift keeps the safe-area and toolbar reserve');

// --- UI v13: the document itself cannot scroll; art and the drawer card reach 100lvh.
const v13 = css.slice(css.indexOf('/* UI v13'), css.indexOf('/* UI v14'));
assert.ok(v13.length > 100, 'UI v13 scroll lock present');
assert.match(v13, /html,body\{\n height:100%!important;\n height:100lvh!important;\n overflow:hidden!important;\n overscroll-behavior:none!important;/, 'html and body are locked to the large viewport');
assert.match(v13, /#sidebar\[open\]>aside,[\s\S]*?height:auto!important;[\s\S]*?bottom:var\(--sidebar-inset\)!important/, 'drawer card stretches to the inset above 100lvh');
assert.match(v13, /#sidebar\[open\] \.drawer-footer\{\n  padding-bottom:calc\(100lvh - 100dvh \+ env\(safe-area-inset-bottom,0px\)\)/, 'drawer footer clears Safari\'s toolbar');
assert.match(rei, /\/\* UI v13[\s\S]*?\.rei-art\{height:100lvh;width:100lvh\}/, 'ASCII art uses the large viewport');
assert.match(rei, /@media\(max-width:760px\)\{\.rei-art\{right:-13lvh\}\}/, 'mobile art keeps its right offset in lvh');

// --- UI v14: mobile scroll edges fade under the floating header and composer.
const v14 = css.slice(css.indexOf('/* UI v14'));
assert.ok(v14.length > 100, 'UI v14 edge glass present');
assert.match(v14, /@media\(max-width:760px\)\{/, 'edge glass is mobile-only');
assert.match(v14, /backdrop-filter:blur\(14px\) saturate\(1\.2\)/, 'edge bands use frosted backdrop blur');
assert.match(v14, /-webkit-mask-image:linear-gradient\(to bottom,#000 0%,transparent 100%\)/, 'top band fades into content');
assert.match(v14, /mask-image:linear-gradient\(to top,#000 0%,transparent 100%\)/, 'bottom band fades into content');

// --- Close buttons: one solid accent disc everywhere, focus lands on titles.
const v9 = css.slice(css.indexOf('/* UI polish v9'));
assert.match(v9, /dialog button\.close,\ndialog button\[aria-label="关闭"\],[\s\S]*?border-radius:50%;\n background:var\(--accent\);\n color:var\(--accent-on\)/, 'all dialog close buttons are solid accent discs');
assert.match(v9, /dialog button\.close:focus,\ndialog button\[aria-label="关闭"\]:focus\{outline:none;box-shadow:none\}/, 'no square focus ring on open');
assert.match(html, /<dialog id="connection"><button class="close" id="closeConnection" aria-label="关闭">✕<\/button><h2 tabindex="-1" autofocus>模型与 API<\/h2>/, '模型与 API focuses its title');
for (const m of html.matchAll(/<dialog id="(\w+)">([\s\S]*?)<\/dialog>/g)) {
  if (/aria-label="关闭"/.test(m[2])) assert.match(m[2], /<h2[^>]*tabindex="-1" autofocus/, m[1] + ': opening focuses the title, not ✕');
}
const v17 = css.slice(css.indexOf('/* UI v17'), css.indexOf('/* UI v18'));
assert.match(v17, /#mapPanel:has\(\.mind-shell\):not\(\.graph-immersive\)\{[\s\S]*?padding-bottom:calc\(100lvh - 100dvh \+ env\(safe-area-inset-bottom,0px\) \+ 16px\)!important/, 'graph fits above the bottom safe area');
assert.match(v17, /#sidebar\[open\]>aside,[\s\S]*?bottom:calc\(100lvh - 100dvh \+ var\(--sidebar-inset\) \+ env\(safe-area-inset-bottom,0px\)\)!important;[\s\S]*?border-radius:var\(--sidebar-radius\)!important/, 'drawer card floats above the bottom safe area with rounded corners');
const v18 = css.slice(css.indexOf('/* UI v18'));
assert.match(v18, /#mapPanel:not\(\.graph-immersive\) \.map-heading\{[\s\S]*?display:block!important/, 'mobile map heading is visible above the controls');
assert.match(v18, /#mapPanel \.map-heading h2\{[\s\S]*?font-size:30px!important/, 'mobile map title is a large App Store-style title');
assert.match(v18, /\.map-sticky,[\s\S]*?position:sticky!important;[\s\S]*?top:0!important/, 'map controls stick under the padded floating header in every view');
assert.match(v18, /\.map-sticky,[\s\S]*?background:transparent!important/, 'the sticky rail has no opaque banner');
assert.match(v18, /#mapPanel \.map-view-switch,[\s\S]*?background:var\(--glass-tint\),var\(--sidebar-bg\)!important/, 'the switch reuses the sidebar glass fill');
assert.match(v18, /#mapPanel #search\{[\s\S]*?backdrop-filter:blur\(var\(--sidebar-blur\)\) saturate\(var\(--sidebar-sat\)\)!important/, 'the search field reuses the sidebar glass blur');
const v19 = css.slice(css.indexOf('/* UI v19'));
assert.match(v19, /html\{--map-top-zone:calc\(env\(safe-area-inset-top,0px\) \+ 54px\)\}/, 'any legacy map-zone fallback is the fixed header height');
assert.match(v19, /padding-top:calc\(env\(safe-area-inset-top,0px\) \+ 62px\)!important;[\s\S]*?scroll-padding-top:0!important;[\s\S]*?overflow-anchor:none!important/, 'map panel geometry is CSS-only and ignores view-switch anchoring');
assert.match(v19, /\.map-sticky\{[\s\S]*?position:sticky!important;[\s\S]*?top:0!important/, 'the sticky rail pins inside the padded map scrollport');
assert.doesNotMatch(v19, /var\(--map-top-zone\)/, 'no v19 rule reads a measured map zone');
for (const [file, token] of [['chat-layout.css', 'ui-fx34'], ['rei-background.css', 'ui-fx11'], ['app.js', 'ui-fx21'], ['layout.js', 'ui-fx21']]) assert.ok(html.includes(file + '?v=' + token), file + ' cache token');
console.log('PASS: drawer dismisses keyboard, no phone auto-focus, sub-dialogs return to settings, uniform accent close.');
