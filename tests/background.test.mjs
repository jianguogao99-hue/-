import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const classes=new Set(),timers=new Map(),events={},els=new Map(),stages=[];let serial=0,now=0;
function el(){return {complete:true,naturalWidth:1200,getContext:()=>({}),classList:{add:s=>classes.add(s),remove:s=>classes.delete(s),toggle:(s,on)=>on?classes.add(s):classes.delete(s)},addEventListener(n,f){this[n]=f}};}
for(const id of ['reiSource','reiGlyphCanvas','backgroundChoice','backgroundMotion','motionHint'])els.set('#'+id,el());
const reduced={matches:false,addEventListener(n,f){this.change=f}},document={hidden:false,documentElement:el(),querySelector:s=>els.get(s),addEventListener:(n,f)=>events[n]=f};
const storage=new Map();const context={document,window:{ReiGlyphs:{draw:(ctx,source,stage)=>stages.push(stage)},matchMedia:()=>reduced,addEventListener(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:(f,delay)=>(timers.set(++serial,{f,time:now+delay}),serial),clearTimeout:id=>timers.delete(id)};
vm.createContext(context);vm.runInContext(fs.readFileSync('public/rei-background.js','utf8'),context);
function next(){const [id,timer]=[...timers].sort((a,b)=>a[1].time-b[1].time||a[0]-b[0])[0];timers.delete(id);now=timer.time;timer.f();}
assert(classes.has('rei-theme'));assert.equal(timers.size,1);const start=stages.length;next();const blinkStart=now;for(let i=0;i<5;i++)next();assert.equal(stages.slice(start).join(','),'1,2,3,2,1,0');assert.equal(now-blinkStart,400);
document.hidden=true;events.visibilitychange();assert.equal(timers.size,0);assert.equal(stages.at(-1),0);document.hidden=false;events.visibilitychange();assert.equal(timers.size,1);
reduced.matches=true;reduced.change();assert.equal(timers.size,0);assert(els.get('#backgroundMotion').disabled);
reduced.matches=false;reduced.change();const choice=els.get('#backgroundChoice');choice.value='plain';choice.change();assert(!classes.has('rei-theme'));assert.equal(timers.size,0);assert(storage.get('question-garden-appearance-v1').includes('plain'));
choice.value='rei';choice.change();assert(classes.has('rei-theme'));const motion=els.get('#backgroundMotion');motion.checked=false;motion.change();assert.equal(timers.size,0);
console.log('PASS: discrete open/half/closed frames over 400ms, timer lifecycle, background switching, reduced motion, hidden-page pause');
