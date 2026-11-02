import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
function setup(touch){let now=0,id=0;const timers=new Map(),events={},docEvents={},renamed=[],toggled=[];
const svg={isConnected:true,setAttribute(){},getBoundingClientRect:()=>({left:0,top:0,width:500,height:500}),setPointerCapture(){}};
const topic={dataset:{graphTopic:'/英语考试/六级备考'},isConnected:true};const root={dataset:{graphRoot:'true'},isConnected:true};
const target=node=>({closest:s=>s.includes('data-graph-topic')||s.includes('data-graph-root')?node:s==='svg'||s==='.mind-svg'?svg:null});
const el={addEventListener:(name,fn)=>(events[name]??=[]).push(fn),querySelector:()=>svg};
const document={addEventListener:(name,fn)=>(docEvents[name]??=[]).push(fn),querySelector:()=>svg};
const window=touch?{ontouchstart:null}:{};
const ctx={window,document,Date:{now:()=>now},setTimeout:fn=>(timers.set(++id,fn),id),clearTimeout:key=>timers.delete(key)};vm.createContext(ctx);vm.runInContext(fs.readFileSync('public/mindmap.js','utf8'),ctx);
window.QuestionGraph.render({children:new Map([['英语考试',{children:new Map(),questions:[{id:'q1',title:'问题'}]}]]),questions:[]},'对话',new Set(),false,'c');
window.QuestionGraph.attach(el,path=>toggled.push(path),path=>renamed.push(path));
function event(node=topic,x=100,y=100,n=1){return {target:target(node),clientX:x,clientY:y,pointerId:1,pointerType:touch?'touch':'mouse',touches:Array.from({length:n},(_,i)=>({clientX:x+i*50,clientY:y})),cancelable:true,preventDefault(){this.prevented=true},stopPropagation(){},stopImmediatePropagation(){this.stopped=true}};}
function emit(group,name,e){for(const fn of group[name]||[])fn(e);return e;}
return {event,down:e=>emit(events,touch?'touchstart':'pointerdown',e),move:e=>emit(touch?docEvents:events,touch?'touchmove':'pointermove',e),up:e=>{if(touch)e.touches=[];return emit(touch?docEvents:events,touch?'touchend':'pointerup',e)},click:e=>emit(events,'click',e),fire(){now+=600;const pending=[...timers.values()];timers.clear();for(const fn of pending)fn()},advance(){now+=1500},topic,root,renamed,toggled};}
for(const touch of [true,false]){
 const g=setup(touch);
 // Short taps retain the existing collapse behavior.
 g.down(g.event());g.up(g.event());g.fire();g.click(g.event());assert.equal(g.renamed.length,0);assert.equal(g.toggled.length,1);
 // A completed hold renames once and does not subsequently collapse the branch.
 g.down(g.event());g.fire();assert.equal(g.renamed[0],'/英语考试/六级备考');g.up(g.event());assert(g.click(g.event()).stopped);assert.equal(g.toggled.length,1);g.advance();
 // Dragging cancels a pending hold.
 g.down(g.event());g.move(g.event(g.topic,130,100));g.fire();g.up(g.event());assert.equal(g.renamed.length,1);g.click(g.event());g.advance();
 // The centre title also supports renaming the conversation.
 g.down(g.event(g.root));g.fire();assert.equal(g.renamed[1],null);g.up(g.event(g.root));g.advance();
 if(touch){g.down(g.event());g.down(g.event(g.topic,100,100,2));g.fire();g.up(g.event());assert.equal(g.renamed.length,2);}
}
console.log('PASS: graph short tap, long press, root title, drag cancellation, pinch cancellation, synthetic click suppression (touch and pointer)');
