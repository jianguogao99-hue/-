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
// Keyboard handling, v11: CSS owns every height (100lvh shell, no JS-pinned heights). The only thing
// JS does is lift the bottom composer by one translateY so it sits just above the keyboard.
// Lift = how far the composer's resting bottom edge is below the visible bottom edge
// (vv.offsetTop + vv.height). That already accounts for iOS scrolling the page itself (offsetTop)
// and for browsers that shrink the layout instead (Chrome with resizes-content: vv.height==innerHeight -> 0),
// so the composer is never lifted twice.
const vv=window.visualViewport;
const root=document.documentElement;
const input=document.querySelector('#input');
const MARGIN=8,KEYBOARD_MIN=120;
let lift=0,changes=0,frame=0,restoreTimer=0;
function composerLift(m){
 const innerHeight=Math.max(0,Number(m.innerHeight)||0);
 const vvHeight=m.vvHeight==null?innerHeight:Math.max(0,Number(m.vvHeight)||0);
 const vvTop=Math.max(0,Number(m.vvTop)||0);
 if(!m.focused)return 0;
 // No keyboard (or the browser already resized the layout for it): nothing to do.
 if(innerHeight-vvHeight<=KEYBOARD_MIN)return 0;
 const restingBottom=m.restingBottom==null?innerHeight:Number(m.restingBottom);
 const visibleBottom=vvTop+vvHeight;
 return Math.max(0,Math.round(restingBottom+MARGIN-visibleBottom));
}
const composer=()=>document.querySelector('#form');
const messages=()=>document.querySelector('#messages');
function composerFocused(){const el=document.activeElement;return Boolean(el&&input&&el===input);}
function editableFocused(){const el=document.activeElement;return Boolean(el&&el!==document.body&&(el.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)));}
function measure(){
 const node=composer();
 const rect=node&&node.getBoundingClientRect?node.getBoundingClientRect():null;
 return {
  innerHeight:window.innerHeight||0,
  vvHeight:vv?vv.height:null,
  vvTop:vv?vv.offsetTop:0,
  // Resting position = where it would be with no lift applied.
  restingBottom:rect?rect.bottom+lift:null,
  focused:composerFocused()
 };
}
function setLift(next,glide){
 if(next===lift)return false;
 const list=messages();const pinned=list&&list.scrollHeight-list.scrollTop-list.clientHeight<24;
 root.classList.toggle('kb-glide',Boolean(glide));
 root.style.setProperty('--kb-lift',next+'px');
 root.classList.toggle('kb-lifted',next>0);
 lift=next;changes++;
 if(pinned&&list)list.scrollTop=list.scrollHeight;
 return true;
}
function update(glide){return setLift(composerLift(measure()),glide);}
function schedule(glide){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>update(glide));}
// iOS leaves the page scrolled by the keyboard after it closes; put it back once nothing is edited.
function restoreScroll(){
 if(editableFocused())return false;
 const y=window.scrollY||window.pageYOffset||0;
 if(y!==0||(vv&&vv.offsetTop>0)){window.scrollTo(0,0);return true;}
 return false;
}
function onFocusOut(){
 requestAnimationFrame(()=>{
  if(!composerFocused())setLift(0,true);
  restoreScroll();
  clearTimeout(restoreTimer);restoreTimer=setTimeout(restoreScroll,360);
 });
}
window.WenjiViewport={composerLift,measure,update,restoreScroll,get lift(){return lift;},get changes(){return changes;}};
function growInput(){input.style.height='auto';input.style.height=Math.min(input.scrollHeight,120)+'px';}
// Keyboard appearing/disappearing = resize (animate); the user dragging the visual viewport = scroll (follow 1:1).
vv?.addEventListener('resize',()=>schedule(true));
vv?.addEventListener('scroll',()=>schedule(false));
window.addEventListener('orientationchange',()=>schedule(false));
document.addEventListener('focusin',e=>{if(e.target===input)schedule(true);});
document.addEventListener('focusout',onFocusOut);
input?.addEventListener('input',growInput);
// Safari / Android toolbar colour follows the page background.
const meta=document.querySelector('meta[name="theme-color"]');
function syncThemeColor(){if(meta)meta.setAttribute('content',root.classList.contains('rei-theme')?'#070907':'#101010');}
if(window.MutationObserver)new MutationObserver(syncThemeColor).observe(root,{attributes:true,attributeFilter:['class']});
syncThemeColor();
})();
