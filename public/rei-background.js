(()=>{'use strict';
const root=document.documentElement,source=document.querySelector('#reiSource'),canvas=document.querySelector('#reiGlyphCanvas'),choice=document.querySelector('#backgroundChoice'),motion=document.querySelector('#backgroundMotion'),opacity=document.querySelector('#glassOpacity');
const context=canvas?canvas.getContext('2d'):null,reduced=window.matchMedia('(prefers-reduced-motion: reduce)'),reducedTransparency=window.matchMedia('(prefers-reduced-transparency: reduce)');
const GLASS_DEFAULT=1,GLASS_MIN=.2,GLASS_MAX=2.5,GLASS_BG=.14,SIDEBAR_BG=.24,CTL_FILL=.2,CTL_HOVER=.28;
function clampOpacity(value){const n=Number(value);return Number.isFinite(n)?Math.min(GLASS_MAX,Math.max(GLASS_MIN,n)):GLASS_DEFAULT;}
let preferences={style:'rei',motion:true,glassOpacity:GLASS_DEFAULT};
try{const saved=JSON.parse(localStorage.getItem('question-garden-appearance-v1'));if(saved){preferences.style=saved.style==='plain'?'plain':'rei';preferences.motion=saved.motion!==false;if('glassOpacity' in saved)preferences.glassOpacity=clampOpacity(saved.glassOpacity);}}catch{}
let next=0,frames=[],ready=source&&source.complete&&source.naturalWidth>0;
function draw(stage){if(context)window.ReiGlyphs.draw(context,source,stage);}
function stop(){clearTimeout(next);for(const timer of frames)clearTimeout(timer);frames=[];draw(0);}
function enabled(){return preferences.style==='rei'&&preferences.motion&&!reduced.matches&&!document.hidden&&ready&&context;}
function schedule(){stop();if(!enabled())return;next=setTimeout(()=>{if(!enabled())return;draw(1);for(const [delay,stage] of [[65,2],[130,3],[260,2],[335,1],[400,0]])frames.push(setTimeout(()=>{if(enabled())draw(stage);},delay));frames.push(setTimeout(schedule,400));},1620+Math.random()*1800);}
function applyGlass(){
 const style=root&&root.style;
 const gain=reducedTransparency.matches?Math.max(preferences.glassOpacity,GLASS_DEFAULT):preferences.glassOpacity;
 if(style&&typeof style.setProperty==='function'){
  style.setProperty('--glass-bg','rgba(118,118,128,'+Number((GLASS_BG*gain).toFixed(3))+')');
  style.setProperty('--sidebar-bg','rgba(118,118,128,'+Number((SIDEBAR_BG*gain).toFixed(3))+')');
  style.setProperty('--ctl-fill','rgba(118,118,128,'+Number((CTL_FILL*gain).toFixed(3))+')');
  style.setProperty('--ctl-fill-hover','rgba(118,118,128,'+Number((CTL_HOVER*gain).toFixed(3))+')');
  style.setProperty('--glass-opacity',String(gain));
 }
 if(opacity){
  opacity.value=String(preferences.glassOpacity);
  if(opacity.setAttribute)opacity.setAttribute('aria-valuenow',String(preferences.glassOpacity));
 }
}
function apply(){root.classList.toggle('rei-theme',preferences.style==='rei');if(choice)choice.value=preferences.style;if(motion){motion.checked=preferences.motion;motion.disabled=preferences.style!=='rei'||reduced.matches;}const hint=document.querySelector('#motionHint');if(hint)hint.textContent=reduced.matches?'已跟随系统“减少动态效果”暂停动画。':'逐格字符眨眼，离开页面后暂停。';applyGlass();schedule();}
function save(){try{localStorage.setItem('question-garden-appearance-v1',JSON.stringify(preferences));}catch{}apply();}
if(choice)choice.addEventListener('change',()=>{preferences.style=choice.value;save();});
if(motion)motion.addEventListener('change',()=>{preferences.motion=motion.checked;save();});
if(opacity){
 const update=()=>{preferences.glassOpacity=clampOpacity(opacity.value);save();};
 opacity.addEventListener('input',update);
 opacity.addEventListener('change',update);
}
if(source){source.addEventListener('load',()=>{ready=true;schedule();});source.addEventListener('error',()=>{ready=false;stop();});}
document.addEventListener('visibilitychange',schedule);reduced.addEventListener?.('change',apply);if(reducedTransparency&&reducedTransparency!==reduced)reducedTransparency.addEventListener?.('change',applyGlass);window.addEventListener('pagehide',stop);window.addEventListener('pageshow',schedule);apply();
})();
