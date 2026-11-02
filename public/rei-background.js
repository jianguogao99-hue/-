(()=>{'use strict';
const root=document.documentElement,source=document.querySelector('#reiSource'),canvas=document.querySelector('#reiGlyphCanvas'),choice=document.querySelector('#backgroundChoice'),motion=document.querySelector('#backgroundMotion');
const context=canvas.getContext('2d'),reduced=window.matchMedia('(prefers-reduced-motion: reduce)');let preferences={style:'rei',motion:true};
try{const saved=JSON.parse(localStorage.getItem('question-garden-appearance-v1'));if(saved){preferences.style=saved.style==='plain'?'plain':'rei';preferences.motion=saved.motion!==false;}}catch{}
let next=0,frames=[],ready=source.complete&&source.naturalWidth>0;
function draw(stage){if(context)window.ReiGlyphs.draw(context,source,stage);}
function stop(){clearTimeout(next);for(const timer of frames)clearTimeout(timer);frames=[];draw(0);}
function enabled(){return preferences.style==='rei'&&preferences.motion&&!reduced.matches&&!document.hidden&&ready&&context;}
function schedule(){stop();if(!enabled())return;next=setTimeout(()=>{if(!enabled())return;draw(1);for(const [delay,stage] of [[65,2],[130,3],[260,2],[335,1],[400,0]])frames.push(setTimeout(()=>{if(enabled())draw(stage);},delay));frames.push(setTimeout(schedule,400));},1620+Math.random()*1800);}
function apply(){root.classList.toggle('rei-theme',preferences.style==='rei');choice.value=preferences.style;motion.checked=preferences.motion;motion.disabled=preferences.style!=='rei'||reduced.matches;document.querySelector('#motionHint').textContent=reduced.matches?'已跟随系统“减少动态效果”暂停动画。':'逐格字符眨眼，离开页面后暂停。';schedule();}
function save(){try{localStorage.setItem('question-garden-appearance-v1',JSON.stringify(preferences));}catch{}apply();}
choice.addEventListener('change',()=>{preferences.style=choice.value;save();});motion.addEventListener('change',()=>{preferences.motion=motion.checked;save();});
source.addEventListener('load',()=>{ready=true;schedule();});source.addEventListener('error',()=>{ready=false;stop();});
document.addEventListener('visibilitychange',schedule);reduced.addEventListener?.('change',apply);window.addEventListener('pagehide',stop);window.addEventListener('pageshow',schedule);apply();
})();
