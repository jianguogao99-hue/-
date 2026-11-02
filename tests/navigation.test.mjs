import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('public/conversation-ui.js','utf8'),ctx);
const {ordered,renameBranch}=ctx.window.ConversationUI;
const conversations=[{id:'old',title:'旧记录',pinned:true,pinnedAt:1},{id:'new'},{id:'latestPin',pinned:true,pinnedAt:2},{id:'newest'}];
assert.equal(ordered(conversations).map(c=>c.id).join(','),'latestPin,old,newest,new');
conversations[0].pinned=false;assert.equal(ordered(conversations).at(-1).id,'old');
const questions=[{id:'a',path:['英语考试','六级备考','阅读'],source:'原始提问',messageId:'m1',links:['b']},{id:'b',path:['英语考试','雅思备考']},{id:'c',path:['其他','六级备考']}];
assert.equal(renameBranch(questions,['英语考试','六级备考'],'六级提分',q=>q.path),1);
assert.equal(questions[0].path.join('/'),'英语考试/六级提分/阅读');assert.equal(questions[2].path.join('/'),'其他/六级备考');
assert.equal(questions[0].source,'原始提问');assert.equal(questions[0].messageId,'m1');assert.equal(questions[0].links[0],'b');
assert.throws(()=>renameBranch(questions,['英语考试','六级提分'],'雅思备考',q=>q.path),/已有/);
assert.throws(()=>renameBranch(questions,['英语考试'],'a/b',q=>q.path),/不能包含/);
assert.equal(renameBranch(questions,['英语考试'],'英语学习',q=>q.path),2);
// Exercise real drawer event handlers without a browser engine.
const events={},drawerEvents={},classes=new Set(),summaryEvents={};let modal=false;
const summary={setAttribute(){},addEventListener:(n,f)=>summaryEvents[n]=f};
const drawer={open:false,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)},querySelector:()=>summary,addEventListener:(n,f)=>drawerEvents[n]=f};
const closeButton={};const timers=[];
const document={querySelector:s=>s==='#sidebar'?drawer:s==='#closeSidebar'?closeButton:modal?{}:null,addEventListener:(n,f)=>events[n]=f};
const gestureCtx={window:{},document,setTimeout:f=>(timers.push(f),timers.length),clearTimeout(){}};vm.createContext(gestureCtx);
const layout=fs.readFileSync('public/layout.js','utf8');vm.runInContext(layout.slice(0,layout.indexOf('})();')+5),gestureCtx);
function touch(x,y,ignored=false){return {touches:[{clientX:x,clientY:y}],changedTouches:[{clientX:x,clientY:y}],target:{closest:()=>ignored?{}:null},cancelable:true,preventDefault(){this.prevented=true;}};}
function swipe(x,y,endX,endY,ignored=false){events.touchstart(touch(x,y,ignored));const move=touch(endX,endY,ignored);events.touchmove(move);events.touchend(move);return move;}
assert(swipe(30,100,130,105).prevented);assert(drawer.open);
assert(swipe(200,100,90,105).prevented);assert(classes.has('drawer-closing'));timers.forEach(f=>f());assert.equal(drawer.open,false);
swipe(30,100,35,210);assert.equal(drawer.open,false); // ordinary vertical scroll
swipe(30,100,130,105,true);assert.equal(drawer.open,false); // graph/input remains independent
swipe(180,100,290,105);assert.equal(drawer.open,false); // non-edge horizontal content
modal=true;swipe(30,100,130,105);assert.equal(drawer.open,false);modal=false;
summaryEvents.click({preventDefault(){}});assert(drawer.open);drawerEvents.click({target:drawer});timers.forEach(f=>f());assert.equal(drawer.open,false);
// New fields survive cloud merge alongside changes from a second device.
vm.runInContext(fs.readFileSync('public/sync-merge.js','utf8'),ctx);
const base={active:'c',conversations:[{id:'c',title:'自动标题',messages:[],questions:[{id:'a',path:['旧分类'],links:[]}]}]};
const local=structuredClone(base),remote=structuredClone(base);local.conversations[0].title='我改的标题';local.conversations[0].titleGenerated=true;local.conversations[0].pinned=true;local.conversations[0].pinnedAt=123;local.conversations[0].questions[0].path=['新分类'];remote.conversations[0].messages.push({id:'m2',role:'user',text:'来自 iPad'});
const merged=ctx.window.SyncMerge.merge(base,local,remote).conversations[0];assert.equal(merged.title,'我改的标题');assert(merged.titleGenerated&&merged.pinned);assert.equal(merged.questions[0].path[0],'新分类');assert.equal(merged.messages.length,1);
console.log('Navigation, branch rename, gesture isolation and cloud merge checks passed');
