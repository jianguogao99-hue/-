import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const between = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));

function animatedElement(props = {}) {
 const animations = [];
 return {animations, ...props, animate(frames, options) {
  let resolve;
  const finished = new Promise(done => { resolve = done; });
  const animation = {frames, options, finished, finish: resolve, cancel() {}};
  animations.push(animation);
  return animation;
 }};
}

const bubble = animatedElement({hidden: true});
const editor = {open: false};
const fields = animatedElement();
let reduced = false;
const context = vm.createContext({
 bubble,
 $: selector => selector === '#editFields' ? editor : fields,
 window: {getComputedStyle: () => ({opacity: '.5'})},
 motionAllowed: () => !reduced
});
vm.runInContext(between('const feedbackMotions=', 'function toast(text)') +
 between('let editorMotion=', "$('#openEdit').onclick"), context);
const run = expression => vm.runInContext(expression, context);

run('setFeedbackVisible(bubble,true)');
bubble.animations.at(-1).finish();
await Promise.resolve();
run('setFeedbackVisible(bubble,false)');
const oldExit = bubble.animations.at(-1);
assert.equal(bubble.hidden, false, 'play the fade before hiding');
assert.equal(bubble.inert, true, 'exiting controls cannot trigger actions');
assert.equal(oldExit.frames.at(-1).translate, '0 8px', 'exit does not slide through the viewport edge');
run('setFeedbackVisible(bubble,true)');
oldExit.finish();
await Promise.resolve();
assert.equal(bubble.hidden, false, 'an older exit cannot hide a newly shown message');
assert.equal(bubble.inert, false);

run('setQuestionEditor(true)');
assert.equal(editor.open, true);
run('setQuestionEditor(false)');
assert.equal(editor.open, true, 'leave the disclosed region open until the exit finishes');
assert.equal(fields.inert, true);
const editorExit = fields.animations.at(-1);
run('setQuestionEditor(true)');
editorExit.finish();
await Promise.resolve();
assert.equal(editor.open, true, 'reopening invalidates the earlier editor close');
assert.equal(fields.inert, false);

reduced = true;
run('setQuestionEditor(false);setFeedbackVisible(bubble,false)');
assert.equal(editor.open, false);
assert.equal(bubble.hidden, true);
console.log('PASS: feedback and editor transitions tolerate rapid reopen and reduced motion.');
