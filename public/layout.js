(()=>{
'use strict';
const drawer=document.querySelector('#sidebar');let closing=0,start=null,suppressClick=false;
const reduceMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)');
const CLOSE_MS=160;
function duration(){return reduceMotion&&reduceMotion.matches?0:CLOSE_MS;}
function summary(){return drawer.querySelector('summary');}
function cardMenu(){const node=drawer.querySelector('#closeSidebar');return node&&node!==summary()?node:null;}
function setExpanded(open){
 const value=String(open);
 const head=summary();
 if(head&&head.setAttribute)head.setAttribute('aria-expanded',value);
 const card=cardMenu();
 if(card&&card.setAttribute)card.setAttribute('aria-expanded',value);
}
function focusedOn(node){return node&&document.activeElement===node;}
function blurEditable(){const el=document.activeElement;if(el&&el!==document.body&&(el.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))&&typeof el.blur==='function')el.blur();}
function open(){
 clearTimeout(closing);
 blurEditable();
 drawer.classList.remove('drawer-closing');
 const head=summary(),card=cardMenu();
 const keep=focusedOn(head);
 drawer.open=true;
 setExpanded(true);
 if(keep&&card&&typeof card.focus==='function')card.focus();
}
function close(){
 clearTimeout(closing);
 if(!drawer.open)return;
 drawer.classList.add('drawer-closing');
 const head=summary(),card=cardMenu();
 const keep=focusedOn(card)||(card&&card.contains&&document.activeElement&&card.contains(document.activeElement));
 closing=setTimeout(()=>{
  drawer.open=false;
  drawer.classList.remove('drawer-closing');
  setExpanded(false);
  if(keep&&head&&typeof head.focus==='function')head.focus();
 },duration());
}
window.Drawer={open,close};
if(drawer.classList&&drawer.classList.add)drawer.classList.add('drawer-js');
setExpanded(false);
summary().addEventListener('click',e=>{e.preventDefault();drawer.open?close():open();});
drawer.addEventListener('toggle',()=>setExpanded(drawer.open));
const closeButton=document.querySelector('#closeSidebar');
if(closeButton)closeButton.onclick=close;
drawer.addEventListener('click',e=>{if(e.target===drawer)close();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
// Only the left-edge opening gesture owns page touches. Graph pan, text editing,
// vertical scrolling and all multi-finger gestures keep their own behavior.
document.addEventListener('touchstart',e=>{start=null;if(e.touches.length!==1||document.querySelector('dialog[open]'))return;const t=e.touches[0];if(e.target.closest('input,textarea,select,.mind-shell,.map-view-switch'))return;if(!drawer.open&&t.clientX>64)return;start={x:t.clientX,y:t.clientY,opened:drawer.open,locked:false};},{passive:true,capture:true});
document.addEventListener('touchmove',e=>{if(!start)return;if(e.touches.length!==1){start=null;return;}const dx=e.touches[0].clientX-start.x,dy=e.touches[0].clientY-start.y;if(!start.locked&&Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){start=null;return;}if(Math.abs(dx)>14&&Math.abs(dx)>Math.abs(dy)*1.4&&(start.opened?dx<0:dx>0))start.locked=true;if(start.locked&&e.cancelable)e.preventDefault();},{passive:false,capture:true});
document.addEventListener('touchend',e=>{if(!start)return;const t=e.changedTouches[0],dx=t.clientX-start.x,dy=t.clientY-start.y;const act=start.locked&&Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4;if(act){start.opened?close():open();suppressClick=true;setTimeout(()=>suppressClick=false,400);}start=null;},{passive:true,capture:true});
document.addEventListener('touchcancel',()=>start=null,{passive:true});
document.addEventListener('click',e=>{if(suppressClick){suppressClick=false;e.preventDefault();e.stopImmediatePropagation();}},true);
})();
(()=>{
'use strict';
// Keyboard handling, v15: while focused, pin the composer to the visual viewport by absolute top.
// top = vv.offsetTop + vv.height - composerHeight - 8. This is not a delta lift: iOS Safari's own
// page shift and the keyboard are each counted exactly once, and every vv resize/scroll updates it.
const vv=window.visualViewport;
const root=document.documentElement;
const input=document.querySelector('#input');
const MARGIN=8,KEYBOARD_MIN=120;
let top=0,reserve=0,changes=0,frame=0,restoreTimer=0,fixed=false,lifted=false;
function composerTop(m){
 const vvTop=Math.max(0,Number(m.vvTop)||0);
 const vvHeight=m.vvHeight==null?Math.max(0,Number(m.innerHeight)||0):Math.max(0,Number(m.vvHeight)||0);
 const composerHeight=Math.max(0,Number(m.composerHeight)||0);
 return Math.max(0,Math.round(vvTop+vvHeight-composerHeight-MARGIN));
}
function composerReserve(m){
 const innerHeight=Math.max(0,Number(m.innerHeight)||0);
 const vvTop=Math.max(0,Number(m.vvTop)||0);
 const vvHeight=m.vvHeight==null?innerHeight:Math.max(0,Number(m.vvHeight)||0);
 const occluded=Math.max(0,Math.round(innerHeight-vvTop-vvHeight));
 return occluded>KEYBOARD_MIN?occluded:0;
}
function listBottomPad(m){
 const messagesBottom=Math.max(0,Number(m.messagesBottom)||0);
 const composerTop=Math.max(0,Number(m.composerTop)||0);
 if(!messagesBottom||!composerTop)return 0;
 return Math.max(16,Math.round(messagesBottom-composerTop+16));
}
function mapTopZone(m){
 const stickyBottom=Math.max(0,Number(m.stickyBottom)||0);
 return Math.round(stickyBottom);
}
const composer=()=>document.querySelector('#form');
const messages=()=>document.querySelector('#messages');
const mapPanel=()=>document.querySelector('#mapPanel');
const mapSticky=()=>document.querySelector('#mapPanel .map-sticky');
function composerFocused(){const el=document.activeElement;return Boolean(el&&input&&el===input);}
function editableFocused(){const el=document.activeElement;return Boolean(el&&el!==document.body&&(el.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)));}
function measure(){
 const node=composer();
 const rect=node&&node.getBoundingClientRect?node.getBoundingClientRect():null;
 return {
  innerHeight:window.innerHeight||0,
  vvHeight:vv?vv.height:null,
  vvTop:vv?vv.offsetTop:0,
  composerHeight:rect?rect.height:0,
  focused:composerFocused()
 };
}
function setPlacement(nextTop,nextReserve){
 const nextFixed=composerFocused();
 const nextLifted=nextReserve>0;
 let changed=false;
 if(nextFixed!==fixed){fixed=nextFixed;root.classList.toggle('kb-fixed',fixed);changed=true;}
 if(nextFixed){
  if(nextTop!==top){root.style.setProperty('--kb-top',nextTop+'px');top=nextTop;changed=true;}
 }else if(top!==0){
  root.style.setProperty('--kb-top','0px');top=0;changed=true;
 }
 if(nextReserve!==reserve){root.style.setProperty('--kb-lift',nextReserve+'px');reserve=nextReserve;changed=true;}
 if(nextLifted!==lifted){lifted=nextLifted;root.classList.toggle('kb-lifted',lifted);changed=true;}
 if(!changed)return false;
 changes++;
 const list=messages();
 if(list&&nextFixed&&list.scrollHeight-list.scrollTop-list.clientHeight<24)list.scrollTop=list.scrollHeight;
 return true;
}
let listPad=0;
function updateListBottomPad(){
 if(composerFocused())return false;
 const list=messages(),form=composer();
 if(!list||!form||typeof list.getBoundingClientRect!=='function'||typeof form.getBoundingClientRect!=='function')return false;
 const listRect=list.getBoundingClientRect(),formRect=form.getBoundingClientRect();
 if(!(listRect.height>0)||!(formRect.height>0))return false;
 const next=listBottomPad({messagesBottom:listRect.bottom,composerTop:formRect.top});
 if(next===listPad)return false;
 root.style.setProperty('--list-bottom-pad',next+'px');listPad=next;changes++;
 return true;
}
let mapZone=0;
function updateMapTopZone(){
 const panel=mapPanel(),sticky=mapSticky();
 if(!panel||!sticky||panel.hidden)return false;
 if(typeof panel.getBoundingClientRect!=='function'||typeof sticky.getBoundingClientRect!=='function')return false;
 const panelRect=panel.getBoundingClientRect(),stickyRect=sticky.getBoundingClientRect();
 if(!(panelRect.width>0)||!(stickyRect.height>0))return false;
 const next=mapTopZone({stickyBottom:stickyRect.bottom});
 if(next===mapZone)return false;
 root.style.setProperty('--map-top-zone',next+'px');mapZone=next;changes++;
 return true;
}
function update(){
 const m=measure();
 if(!m.focused){setPlacement(0,0);updateListBottomPad();}
 else setPlacement(composerTop(m),composerReserve(m));
 updateMapTopZone();
}
function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(update);}
// iOS leaves the page scrolled by the keyboard after it closes; put it back once nothing is edited.
function restoreScroll(){
 if(editableFocused())return false;
 const y=window.scrollY||window.pageYOffset||0;
 if(y!==0||(vv&&vv.offsetTop>0)){window.scrollTo(0,0);return true;}
 return false;
}
function onFocusOut(){
 requestAnimationFrame(()=>{
  if(!composerFocused()){setPlacement(0,0);updateListBottomPad();}
  restoreScroll();
  clearTimeout(restoreTimer);restoreTimer=setTimeout(restoreScroll,360);
 });
}
window.WenjiViewport={composerTop,composerReserve,listBottomPad,mapTopZone,measure,update,updateListBottomPad,updateMapTopZone,restoreScroll,get top(){return top;},get lift(){return reserve;},get fixed(){return fixed;},get listPad(){return listPad;},get mapZone(){return mapZone;},get changes(){return changes;}};
function growInput(){input.style.height='auto';input.style.height=Math.min(input.scrollHeight,120)+'px';if(composerFocused())schedule();}
// Keyboard appearing/disappearing and page shifts both move the visual viewport; follow it directly.
vv?.addEventListener('resize',schedule);
vv?.addEventListener('scroll',schedule);
window.addEventListener('resize',schedule);
window.addEventListener('orientationchange',schedule);
document.addEventListener('focusin',e=>{if(e.target===input)schedule();});
document.addEventListener('focusout',onFocusOut);
input?.addEventListener('input',growInput);
if(window.ResizeObserver){
 const form=composer(),sticky=mapSticky();
 if(form)new window.ResizeObserver(schedule).observe(form);
 if(sticky)new window.ResizeObserver(schedule).observe(sticky);
}
if(window.MutationObserver){
 const panel=mapPanel(),workspace=document.querySelector('#workspace');
 if(panel)new MutationObserver(schedule).observe(panel,{attributes:true,attributeFilter:['class','hidden']});
 if(workspace)new MutationObserver(schedule).observe(workspace,{attributes:true,attributeFilter:['data-mode']});
}
schedule();
// Safari / Android toolbar colour follows the page background.
const meta=document.querySelector('meta[name="theme-color"]');
function syncThemeColor(){if(meta)meta.setAttribute('content',root.classList.contains('rei-theme')?'#070907':'#101010');}
if(window.MutationObserver)new MutationObserver(syncThemeColor).observe(root,{attributes:true,attributeFilter:['class']});
syncThemeColor();
})();
