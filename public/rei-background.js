(()=>{'use strict';
const root=document.documentElement,source=document.querySelector('#reiSource'),canvas=document.querySelector('#reiGlyphCanvas'),choice=document.querySelector('#backgroundChoice'),motion=document.querySelector('#backgroundMotion'),opacity=document.querySelector('#sidebarGlass')||document.querySelector('#glassOpacity');
const context=canvas?canvas.getContext('2d'):null,reduced=window.matchMedia('(prefers-reduced-motion: reduce)'),reducedTransparency=window.matchMedia('(prefers-reduced-transparency: reduce)');
const GLASS_DEFAULT=1,GLASS_MIN=.2,GLASS_MAX=2.5,SIDEBAR_BG=.24;
const ACCENT_DEFAULT='amber';
const ACCENTS={
 amber:{name:'琥珀',accent:'#b88246',soft:'rgba(184,130,70,.22)',strong:'#d4a05c',text:'#e8c48a',on:'#1a1208'},
 blue:{name:'蓝',accent:'#4d8dff',soft:'rgba(77,141,255,.22)',strong:'#7aabff',text:'#9cc2ff',on:'#fff'},
 purple:{name:'紫',accent:'#9b7ef0',soft:'rgba(155,126,240,.22)',strong:'#b59aff',text:'#cbbfff',on:'#fff'},
 pink:{name:'粉',accent:'#e36aa8',soft:'rgba(227,106,168,.22)',strong:'#f08ac0',text:'#f3b0d4',on:'#fff'},
 orange:{name:'橙',accent:'#e8923a',soft:'rgba(232,146,58,.22)',strong:'#f0a954',text:'#f3c07a',on:'#1a1208'},
 teal:{name:'青',accent:'#2db8b2',soft:'rgba(45,184,178,.22)',strong:'#4ad0ca',text:'#7ee0db',on:'#062221'},
 green:{name:'绿',accent:'#2fbf71',soft:'rgba(47,191,113,.22)',strong:'#4fd68b',text:'#86e0b0',on:'#062015'}
};
function clampOpacity(value){const n=Number(value);return Number.isFinite(n)?Math.min(GLASS_MAX,Math.max(GLASS_MIN,n)):GLASS_DEFAULT;}
function clampAccent(value){return ACCENTS[value]?value:ACCENT_DEFAULT;}
let preferences={style:'rei',motion:true,sidebarGlass:GLASS_DEFAULT,accent:ACCENT_DEFAULT};
try{
 const saved=JSON.parse(localStorage.getItem('question-garden-appearance-v1'));
 if(saved){
  preferences.style=saved.style==='plain'?'plain':'rei';
  preferences.motion=saved.motion!==false;
  if('sidebarGlass' in saved)preferences.sidebarGlass=clampOpacity(saved.sidebarGlass);
  else if('glassOpacity' in saved)preferences.sidebarGlass=clampOpacity(saved.glassOpacity);
  if('accent' in saved)preferences.accent=clampAccent(saved.accent);
 }
}catch{}
let next=0,frames=[],ready=source&&source.complete&&source.naturalWidth>0;
function draw(stage){if(context)window.ReiGlyphs.draw(context,source,stage);}
function stop(){clearTimeout(next);for(const timer of frames)clearTimeout(timer);frames=[];draw(0);}
function enabled(){return preferences.style==='rei'&&preferences.motion&&!reduced.matches&&!document.hidden&&ready&&context;}
function schedule(){stop();if(!enabled())return;next=setTimeout(()=>{if(!enabled())return;draw(1);for(const [delay,stage] of [[65,2],[130,3],[260,2],[335,1],[400,0]])frames.push(setTimeout(()=>{if(enabled())draw(stage);},delay));frames.push(setTimeout(schedule,400));},1620+Math.random()*1800);}
function setVar(style,name,value){if(style&&typeof style.setProperty==='function')style.setProperty(name,value);}
function clearVar(style,name){if(style&&typeof style.removeProperty==='function')style.removeProperty(name);}
function applyGlass(){
 const style=root&&root.style;
 const sidebar=document.querySelector('#sidebar');
 const gain=reducedTransparency.matches?Math.max(preferences.sidebarGlass,GLASS_DEFAULT):preferences.sidebarGlass;
 const fill='rgba(118,118,128,'+Number((SIDEBAR_BG*gain).toFixed(3))+')';
 setVar(style,'--sidebar-bg',fill);
 if(sidebar)setVar(sidebar.style,'--sidebar-bg',fill);
 // Composer must stay at its v3 defaults even if an older build wrote these inline.
 clearVar(style,'--glass-bg');
 clearVar(style,'--ctl-fill');
 clearVar(style,'--ctl-fill-hover');
 clearVar(style,'--glass-opacity');
 if(opacity){
  opacity.value=String(preferences.sidebarGlass);
  if(opacity.setAttribute)opacity.setAttribute('aria-valuenow',String(preferences.sidebarGlass));
 }
}
function applyAccent(){
 const theme=ACCENTS[preferences.accent]||ACCENTS[ACCENT_DEFAULT];
 const style=root&&root.style;
 setVar(style,'--accent',theme.accent);
 setVar(style,'--accent-soft',theme.soft);
 setVar(style,'--accent-strong',theme.strong);
 setVar(style,'--accent-text',theme.text);
 setVar(style,'--accent-on',theme.on);
 setVar(style,'--nut-amber',theme.accent);
 setVar(style,'--send-amber-tint',theme.soft);
 if(typeof document.querySelectorAll==='function'){
  document.querySelectorAll('.accent-swatch').forEach(btn=>{
   const on=btn.dataset.accent===preferences.accent;
   if(btn.setAttribute)btn.setAttribute('aria-checked',String(on));
   if(btn.classList)btn.classList.toggle('active',on);
  });
 }
 const name=document.querySelector('#accentName');
 if(name)name.textContent=theme.name;
}
function apply(){root.classList.toggle('rei-theme',preferences.style==='rei');if(choice)choice.value=preferences.style;if(motion){motion.checked=preferences.motion;motion.disabled=preferences.style!=='rei'||reduced.matches;}const hint=document.querySelector('#motionHint');if(hint)hint.textContent=reduced.matches?'已跟随系统“减少动态效果”暂停动画。':'逐格字符眨眼，离开页面后暂停。';applyAccent();applyGlass();schedule();}
function save(){try{localStorage.setItem('question-garden-appearance-v1',JSON.stringify({style:preferences.style,motion:preferences.motion,sidebarGlass:preferences.sidebarGlass,accent:preferences.accent}));}catch{}apply();}
if(choice)choice.addEventListener('change',()=>{preferences.style=choice.value;save();});
if(motion)motion.addEventListener('change',()=>{preferences.motion=motion.checked;save();});
if(opacity){
 const update=()=>{preferences.sidebarGlass=clampOpacity(opacity.value);save();};
 opacity.addEventListener('input',update);
 opacity.addEventListener('change',update);
}
if(typeof document.querySelectorAll==='function'){
 document.querySelectorAll('.accent-swatch').forEach(btn=>{
  btn.addEventListener('click',()=>{preferences.accent=clampAccent(btn.dataset.accent);save();});
 });
}
if(source){source.addEventListener('load',()=>{ready=true;schedule();});source.addEventListener('error',()=>{ready=false;stop();});}
document.addEventListener('visibilitychange',schedule);reduced.addEventListener?.('change',apply);if(reducedTransparency&&reducedTransparency!==reduced)reducedTransparency.addEventListener?.('change',applyGlass);window.addEventListener('pagehide',stop);window.addEventListener('pageshow',schedule);apply();
})();
