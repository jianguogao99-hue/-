import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

// Boot regression (v8): renderMap() runs during boot before the whole file has evaluated.
// State it touches must not be a let/const declared later in the file (temporal dead zone froze the loading screen).
assert.match(app, /^'use strict';\n(?:\/\/[^\n]*\n)?var deleteUndoFresh=null,deleteUndoTimer=0;/, 'undo state is hoisted to the top of app.js with var');
assert.doesNotMatch(app, /\blet deleteUndoFresh|\bconst deleteUndoFresh|\blet deleteUndoTimer|\bconst deleteUndoTimer/, 'undo state must not be re-declared with let/const later in the file');

// Every name renderMap's helpers read at boot must be declared before the first top-level renderMap() call.
const firstRender = app.search(/(^|[;\n}])\s*(renderMap|render|renderAll|boot)\(\);/m);
for (const name of ['deleteUndoFresh', 'deleteUndoTimer']) {
  const decl = app.search(new RegExp('\\b(var|let|const)\\s+' + name + '\\b|,\\s*' + name + '\\s*='));
  assert.ok(decl >= 0 && (firstRender < 0 || decl < firstRender), name + ' declared before the first boot render');
}

// Run the real undo helpers with the undo elements missing and with odd stored data: they must not throw.
const start = app.indexOf('function hideDeleteUndo(){');
const endMarker = 'deleteUndoTimer=setTimeout(hideDeleteUndo,5000);}';
const end = app.indexOf(endMarker, start) + endMarker.length;
const helpers = app.slice(start, end);
assert.ok(helpers.includes('function renderDeleteUndo(){'), 'undo helpers found');
const run = (state, elements = {}) => {
  const ctx = { state, document: { getElementById: id => elements[id] || null }, setTimeout: () => 1, clearTimeout: () => {} };
  vm.createContext(ctx);
  vm.runInContext('var deleteUndoFresh=null,deleteUndoTimer=0;' + helpers + ';renderDeleteUndo();hideDeleteUndo();', ctx);
  return ctx;
};
run({ deletedQuestions: [{ question: { title: 'mac' } }] });
run({});
run({ deletedQuestions: null });
run({ deletedQuestions: [{}] }, { deleteUndo: { hidden: true }, deleteUndoText: { textContent: '' } });
// A stored (old-session) delete never pops the toast; only a fresh one does.
const bar = { hidden: true }, text = { textContent: '' };
const stored = { question: { title: '旧的' } };
const ctx = { state: { deletedQuestions: [stored] }, document: { getElementById: id => ({ deleteUndo: bar, deleteUndoText: text })[id] || null }, setTimeout: () => 7, clearTimeout: () => {} };
vm.createContext(ctx);
vm.runInContext('var deleteUndoFresh=null,deleteUndoTimer=0;' + helpers + ';renderDeleteUndo();', ctx);
assert.equal(bar.hidden, true, 'stored deletes stay quiet on boot');
vm.runInContext('deleteUndoFresh=state.deletedQuestions[0];renderDeleteUndo();', ctx);
assert.equal(bar.hidden, false, 'a fresh delete shows the undo toast');
assert.equal(text.textContent, '已删除「旧的」');

// Elements app.js still looks up for the map must exist in index.html.
for (const id of ['deleteUndo', 'deleteUndoText', 'undoDelete', 'tree', 'search', 'timeOrder', 'syncLoading', 'mapPanel', 'historyList']) {
  assert.match(html, new RegExp('id="' + id + '"'), 'index.html keeps #' + id);
}
assert.match(html, /app\.js\?v=ui-fx14/, 'fixed app.js needs a new cache token');
console.log('PASS: boot order (no TDZ on undo state), undo helpers survive missing elements and odd stored data, required map elements present.');
