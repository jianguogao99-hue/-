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
function open(){
 clearTimeout(closing);
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
const viewport=window.visualViewport;
const input=document.querySelector('#input');
let frame=0;
function syncViewport(){
 cancelAnimationFrame(frame);
 frame=requestAnimationFrame(()=>{
  // visualViewport shrinks with the iOS keyboard; 100dvh alone often does not.
  const height=viewport?viewport.height:window.innerHeight;
  const top=viewport?viewport.offsetTop:0;
  if(height>0){document.documentElement.style.setProperty('--chat-viewport-height',height+'px');document.documentElement.style.setProperty('--chat-viewport-top',top+'px');}
 });
}
function growInput(){input.style.height='auto';input.style.height=Math.min(input.scrollHeight,120)+'px';syncViewport();}
viewport?.addEventListener('resize',syncViewport);viewport?.addEventListener('scroll',syncViewport);
window.addEventListener('resize',syncViewport);window.addEventListener('orientationchange',syncViewport);
input.addEventListener('input',growInput);input.addEventListener('focus',()=>{syncViewport();setTimeout(syncViewport,320);setTimeout(syncViewport,650);});input.addEventListener('blur',()=>{setTimeout(syncViewport,320);});
const search=document.querySelector('#search');const panel=document.querySelector('#mapPanel');
search?.addEventListener('focus',()=>{panel.classList.add('search-editing');syncViewport();setTimeout(syncViewport,320);});
search?.addEventListener('blur',()=>{setTimeout(()=>{panel.classList.toggle('search-editing',document.activeElement===search||Boolean(search.value.trim()));syncViewport();},220);});
syncViewport();
})();
