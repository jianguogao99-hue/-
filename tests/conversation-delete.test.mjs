import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const app = read('public/app.js'), html = read('public/index.html'), css = read('public/chat-layout.css'), layout = read('public/layout.js');
const load = (file, name) => { const ctx = { window: {}, crypto: { randomUUID: () => 'uuid' }, TextEncoder }; vm.createContext(ctx); vm.runInContext(read(file), ctx); return ctx.window[name]; };
const merge = load('public/sync-merge.js', 'SyncMerge');
const conv = (id, extra = {}) => ({ id, title: id, messages: [{ id: id + 'm', role: 'user', text: 'hi' }], questions: [], ...extra });

// --- Sync: a deleted conversation never comes back from another device.
{
  const base = { active: 'a', conversations: [conv('a'), conv('b')] };
  const local = { active: 'b', conversations: [conv('b')], deletedConversations: [{ id: 'a', title: 'a', deletedAt: 'x' }] };
  const remoteEdited = { active: 'a', conversations: [conv('a', { title: 'edited on phone' }), conv('b')] };
  const out = merge.merge(base, local, remoteEdited);
  assert.deepEqual(out.conversations.map(c => c.id).join(",").split(","), ['b'], 'deletion wins even if another device edited it');
  assert.equal(out.active, 'b');
  // Second device syncing later with a stale full copy still loses the deleted one.
  const later = merge.merge(base, base, out);
  assert.deepEqual(later.conversations.map(c => c.id).join(",").split(","), ['b']);
  // Undo (tombstone removed, conversation back) survives the merge.
  const undone = merge.merge(out, { active: 'a', conversations: [conv('a'), conv('b')], deletedConversations: [] }, out);
  assert.deepEqual(undone.conversations.map(c => c.id).sort().join(",").split(","), ['a', 'b'], 'undo restores');
  // Never empties the library.
  const all = merge.merge(base, { active: 'a', conversations: [conv('a')], deletedConversations: [{ id: 'a' }] }, base);
  assert.ok(all.conversations.length >= 1);
}
// --- Import: a backup cannot silently resurrect a tombstoned id; it imports under a fresh id instead.
{
  const BackupImport = load('public/backup-import.js', 'BackupImport');
  const current = { active: 'b', conversations: [conv('b')], deletedConversations: [{ id: 'a' }] };
  const plan = BackupImport.prepare({ conversations: [conv('a', { title: 'from backup' })] }, current);
  assert.ok(plan.document.conversations.some(c => c.id.startsWith('a-import-')), 'imported copy gets a new id');
  assert.equal(merge.merge(current, plan.document, current).conversations.some(c => c.title === 'from backup'), true);
}
// --- App wiring.
assert.match(html, /<button id="deleteConversation" type="button" class="danger-action">删除对话<\/button>/, '⋯ menu has 删除对话');
assert.match(html, /<dialog id="deleteConversationDialog"><div class="review-header"><h2 tabindex="-1" autofocus>删除这个对话？<\/h2>/, 'in-app confirm dialog');
assert.doesNotMatch(app, /window\.confirm|[^.\w]confirm\(/, 'no native confirm');
assert.match(app, /openSubDialog\(\$\('#deleteConversationDialog'\),'conversationActions'\)/, 'cancel returns to the ⋯ menu');
assert.match(app, /library\.deletedConversations=\(Array\.isArray\(library\.deletedConversations\)/, 'delete writes a tombstone');
assert.match(app, /if\(wasActive\)\{const next=ConversationUI\.ordered\(library\.conversations\)\[0\];/, 'deleting the active conversation switches to another');
assert.match(app, /if\(!library\.conversations\.length\)\{placeholder=/, 'deleting the last one leaves a fresh 新对话');
assert.match(app, /conversationUndoTimer=setTimeout\(hideConversationUndo,5000\)/, 'undo pill auto-dismisses');
assert.match(app, /function undoConversationDelete\(\)\{[^]*?library\.deletedConversations=\(library\.deletedConversations\|\|\[\]\)\.filter/, 'undo removes the tombstone');
assert.match(html, /<div id="conversationUndo" class="delete-undo conversation-undo" role="status" hidden>/);
// Long-press.
assert.match(app, /timer:setTimeout\(\(\)=>\{const menu=row\.querySelector\('\[data-conversation-menu\]'\)/, 'long-press opens the row menu');
assert.match(app, /\},450\)\};\},\{passive:true\}\);/, '450ms long-press');
assert.match(app, />8\)cancelHistoryPress\(\)/, 'moving more than 8px cancels');
assert.match(app, /if\(historySuppressClick&&e\.isTrusted\)\{historySuppressClick=false;e\.preventDefault\(\);e\.stopImmediatePropagation\(\);\}/, 'release tap after long-press is swallowed');
// Map cards: no 收录于 line.
assert.doesNotMatch(app, /'收录于 '/, 'map cards no longer render 收录于');
assert.match(app, /<div class="find-meta"><button class="favorite-inline"/, 'star + 定位 row stays');
assert.match(app, /\$\('#mapPanel'\)\.classList\.remove\('search-editing'\)/, 'search focus does not collapse the map header');
// No iOS selection on controls; message bodies still selectable.
const v10 = css.slice(css.indexOf('/* UI polish v10'));
assert.match(v10, /#sidebar \.history-row,[\s\S]*?\{\n -webkit-user-select:none;\n user-select:none;\n -webkit-touch-callout:none;/, 'controls are not text-selectable');
assert.match(v10, /#workspace \.msg \.bubble,\ninput,\ntextarea,[\s\S]*?\{-webkit-user-select:text;user-select:text/, 'chat text and inputs remain selectable');
assert.match(v10, /#deleteConversation\{color:#ff6b5e/, 'delete is red');

// v11 delete motion: row folds (220ms), chat cross-fades (240ms, 8px), reduced motion skips both.
assert.match(app, /collapseHistoryRow\(conversation\.id,\(\)=>deleteConversation\(conversation\.id\)\)/, 'confirm folds the row before deleting');
assert.match(app, /function collapseHistoryRow[^\n]*duration:220/, 'row collapse is 220ms');
assert.match(app, /function crossfadeConversation[^\n]*translateY\(8px\)[^\n]*duration:240/, 'chat cross-fades in from 8px over 240ms');
assert.match(app, /crossfadeConversation\(\(\)=>openConversation\(next\.id,'chat'\)\)/, 'switching after deleting the active conversation cross-fades');
assert.match(app, /function motionAllowed\(\)\{return !\(window\.matchMedia&&window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches\);\}/, 'respects reduced motion');
{
  const start = app.indexOf('function motionAllowed');
  const code = app.slice(start, app.indexOf('\n', app.indexOf('function crossfadeConversation')));
  for (const reduce of [true, false]) {
    const calls = []; let swapped = 0;
    const node = { animate: (k, o) => { calls.push(o.duration); return { finished: Promise.resolve(), cancel() {} }; } };
    const ctx = { window: { matchMedia: () => ({ matches: reduce }) }, $: () => node, document: { querySelectorAll: () => [] }, setTimeout: f => f(), Promise };
    vm.createContext(ctx); vm.runInContext(code + ';crossfadeConversation(()=>{globalThis.s=(globalThis.s||0)+1});', ctx);
    await new Promise(r => setTimeout(r, 5));
    swapped = ctx.s;
    assert.equal(swapped, 1, 'swap runs exactly once');
    assert.equal(calls.length ? 1 : 0, reduce ? 0 : 1, reduce ? 'reduced motion: no animation' : 'animates');
  }
}
console.log('PASS: delete conversation (tombstone sync, import safety, active switch, undo), long-press menu, no control text selection, 收录于 removed, row collapse + chat cross-fade.');
