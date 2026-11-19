(()=>{'use strict';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let viewport=null,bounds=null,identity='',activeSvg=null,moved=false,points=new Map(),gesture=null;
let positions=new Map();
const palette=['#b6a0de','#90bfaa','#c2a2bd','#b9bc85','#8cafd0','#d0a788'];
/* UI v25b: phone sphere uses a softer branch palette than the flat radial map. */
const spherePalette=['#9edbe0','#9fd9bf','#b9a9e6','#e7cf9e','#d9a8b8','#a9c7e8'];
const MOBILE_QUERY='(max-width:760px)';
const SPHERE_SCALE=400,SPHERE_CAMERA=3.4,GOLDEN=2.399963229728653;
const INITIAL_YAW=-0.24,INITIAL_PITCH=0.31;
let sphereScene=null,sphereYaw=INITIAL_YAW,spherePitch=INITIAL_PITCH,sphereFrame=0;
let sphereMQ=null;
function sphereMode(){
 // Guard matchMedia: graph-hold.test.mjs runs this file in a bare VM context.
 try{
  if(typeof window==='undefined')return false;
  if(!sphereMQ&&typeof window.matchMedia==='function')sphereMQ=window.matchMedia(MOBILE_QUERY);
  return Boolean(sphereMQ&&sphereMQ.matches);
 }catch(e){return false;}
}
function size(n){return Math.max(1,n.questions.length+Array.from(n.children.values()).reduce((a,c)=>a+size(c),0));}
function label(text,r){const width=r>60?8:r>45?6:6;const chars=Array.from(text);const lines=[];while(chars.length&&lines.length<3)lines.push(chars.splice(0,width).join(''));if(chars.length)lines[2]=lines[2].slice(0,-1)+'…';return lines;}

/* ---- UI v25b: hierarchical 3D sphere coordinates (phone only) ---- */
function norm(v){const m=Math.hypot(v.x,v.y,v.z)||1;return{x:v.x/m,y:v.y/m,z:v.z/m};}
function rotateDir(dir,angle,az){
 if(angle<1e-4)return{x:dir.x,y:dir.y,z:dir.z};
 const up=Math.abs(dir.y)>.92?{x:1,y:0,z:0}:{x:0,y:1,z:0};
 const t1=norm({x:up.y*dir.z-up.z*dir.y,y:up.z*dir.x-up.x*dir.z,z:up.x*dir.y-up.y*dir.x});
 const t2={x:dir.y*t1.z-dir.z*t1.y,y:dir.z*t1.x-dir.x*t1.z,z:dir.x*t1.y-dir.y*t1.x};
 const ca=Math.cos(angle),sa=Math.sin(angle),cz=Math.cos(az),sz=Math.sin(az);
 return norm({x:dir.x*ca+(t1.x*cz+t2.x*sz)*sa,y:dir.y*ca+(t1.y*cz+t2.y*sz)*sa,z:dir.z*ca+(t1.z*cz+t2.z*sz)*sa});
}
function hashPath(text){let h=0;for(const c of String(text||''))h=(h*31+c.codePointAt(0))%10007;return h/10007*Math.PI*2;}
function shellFor(depth,maxDepth){if(depth<=0)return 0;const t=maxDepth>1?Math.min(1,depth/maxDepth):1;return .52+.56*t;}
function nodeRadius(n){if(n.root)return .045;if(n.q)return .018;if(n.depth<=1)return .032;if(n.depth===2)return .027;return .024;}
function buildSphere(nodes,edges,maxDepth){
 const root=nodes[0];
 for(const n of nodes){n.childNodes=[];n.sphereIdx=0;n.sphereColor=spherePalette[0];}
 for(const e of edges)e.a.childNodes.push(e.b);
 // Each subtree occupies a sector in the horizontal X/Z plane.
 // Descendants fan out within that sector as they move down the tree.
 function place(n, start, end, branch){
  const angle=(start+end)/2;
  const radius=n.depth===0?0:Math.min(1.45,.58+(n.depth-1)*.31);
  n.sphereIdx=branch%spherePalette.length;
  n.sphereColor=n.root?'#e6f0ef':spherePalette[n.sphereIdx];
  n.dir={x:Math.cos(angle)*radius,y:-.92+n.depth*.58,z:Math.sin(angle)*radius};
  const total=n.childNodes.reduce((sum,child)=>sum+Math.sqrt(child.weight||1),0);
  let cursor=start;
  n.childNodes.forEach((child,i)=>{
   const span=(end-start)*Math.sqrt(child.weight||1)/total;
   place(child,cursor+span*.08,cursor+span*.92,n.root?i:branch);
   cursor+=span;
  });
 }
 place(root,-.9,Math.PI*2-.9,0);
 return {nodes,edges,root,maxDepth,yaw:sphereYaw,pitch:spherePitch,key:identity};
}
function projectSphere(scene){
 const cy=Math.cos(scene.yaw),sy=Math.sin(scene.yaw),cp=Math.cos(scene.pitch),sp=Math.sin(scene.pitch);
 scene.projected=scene.nodes.map(n=>{
  const d=n.dir||{x:0,y:0,z:0};
  const x1=d.x*cy-d.z*sy,z1=d.x*sy+d.z*cy;
  const y1=d.y*cp-z1*sp,z2=d.y*sp+z1*cp;
  const factor=SPHERE_CAMERA/(SPHERE_CAMERA-z2);
  const p={x:x1*factor*SPHERE_SCALE,y:y1*factor*SPHERE_SCALE,z:z2,factor,front:Math.max(0,Math.min(1,(z2+1.08)/2.16))};
  p.r=nodeRadius(n)*factor*SPHERE_SCALE;
  n.proj=p;
  return {n,p};
 });
 positions=new Map(scene.projected.filter(item=>item.n.q).map(item=>[item.n.q.id,{x:item.p.x,y:item.p.y}]));
 return scene.projected;
}
function sphereBounds(scene){
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const {p} of scene.projected){
  minX=Math.min(minX,p.x-p.r);maxX=Math.max(maxX,p.x+p.r);
  minY=Math.min(minY,p.y-p.r);maxY=Math.max(maxY,p.y+p.r);
 }
 const pad=SPHERE_SCALE*.18;
 const side=Math.max(SPHERE_SCALE*1.7,(maxX-minX)+pad*2,(maxY-minY)+pad*2);
 const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
 return {x:cx-side/2,y:cy-side/2,w:side,h:side};
}
function sphereDefs(){
 return '<defs>'+
  '<radialGradient id="mgSphereHalo" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#bcd7e4" stop-opacity=".13"/><stop offset=".55" stop-color="#708fa3" stop-opacity=".06"/><stop offset="1" stop-color="#0b1015" stop-opacity="0"/></radialGradient>'+
  '<radialGradient id="mgSphereRoot" cx="36%" cy="30%" r="76%"><stop offset="0" stop-color="#fbffff" stop-opacity=".96"/><stop offset=".34" stop-color="#dfecec" stop-opacity=".9"/><stop offset=".72" stop-color="#b7c9cc" stop-opacity=".5"/><stop offset="1" stop-color="#a8bcc0" stop-opacity=".08"/></radialGradient>'+
  spherePalette.map((c,i)=>'<radialGradient id="mgSphere'+i+'" cx="34%" cy="28%" r="78%"><stop offset="0" stop-color="#f7ffff" stop-opacity=".94"/><stop offset=".33" stop-color="'+c+'" stop-opacity=".92"/><stop offset=".74" stop-color="'+c+'" stop-opacity=".46"/><stop offset="1" stop-color="'+c+'" stop-opacity=".06"/></radialGradient>').join('')+
  '</defs>';
}
function sphereNode(n,p){
 const r=Math.max(1.2,p.r),front=p.front;
 const q=n.q,root=n.root,topic=!q&&!root;
 const color=q?n.sphereColor:root?'#e6f0ef':n.sphereColor;
 const fill=root?'url(#mgSphereRoot)':q?color:'url(#mgSphere'+n.sphereIdx+')';
 const fillOpacity=root?.94:q?.48+.38*front:.56+.4*front;
 const strokeOpacity=.22+.4*front;
 const showLabel=!n.hideLabel;
 const fontSize=(root?.048:topic?.035:.028)*SPHERE_SCALE*(.92+.08*p.factor);
 const lineH=fontSize*(root?1.1:1.14);
 const lines=showLabel?[Array.from(n.label).slice(0,root?14:10).join('')+(Array.from(n.label).length>(root?14:10)?'…':'')]:[];
 let text='';
 if(lines.length){
  const baseY=r+fontSize*1.3;
  const cls=root?'mind-label mind-label--root':'mind-label mind-label--topic';
  text='<text class="'+cls+'" text-anchor="middle" fill="'+(root?'#f6fbfa':'#eaf2f1')+'" fill-opacity="'+(root?.96:Math.max(.56,.5+.5*front))+'" font-size="'+fontSize.toFixed(1)+'" font-weight="'+(root?650:560)+'">'+lines.map((line,i)=>'<tspan x="0" y="'+(baseY+i*lineH).toFixed(1)+'">'+esc(line)+'</tspan>').join('')+'</text>';
 }
 const collapse=topic&&n.path?'<g class="mind-collapse" transform="translate('+(r*.74).toFixed(1)+' '+(-r*.74).toFixed(1)+')"><circle r="'+Math.max(6,r*.42).toFixed(1)+'" fill="#070b0e" fill-opacity=".9" stroke="'+color+'" stroke-opacity=".7"/><text text-anchor="middle" y="'+Math.max(4,r*.16).toFixed(1)+'" fill="#dce8e8" font-size="'+Math.max(10,r*.34).toFixed(1)+'">'+(n.collapsed?'+':'−')+'</text></g>':'';
 const fav=q&&n.q.favorite?'<path class="mind-fav" transform="translate('+(r*.9).toFixed(1)+' '+(-r*1.35).toFixed(1)+') scale('+Math.max(.24,r/24).toFixed(3)+')" d="M12 3.6 14.5 8.7 20.1 9.5 16.1 13.4 17 19 12 16.3 7 19 7.9 13.4 3.9 9.5 9.5 8.7Z"/>':'';
 const attrs=q?'data-id="'+esc(q.id)+'"':n.path?'data-graph-topic="'+esc(n.path)+'"':'data-graph-root="true"';
 return '<g class="mind-node '+(q?'question-node':root?'root-node':'topic-node')+'" transform="translate('+p.x.toFixed(1)+' '+p.y.toFixed(1)+')" '+attrs+' role="button" tabindex="0" aria-label="'+esc(n.label)+(n.path?(n.collapsed?'，展开':'，收起'):'')+'"><title>'+esc(n.label)+(q?(q.favorite?' · 已收藏':''):' · '+n.count+' 个问题')+'</title><circle r="'+r.toFixed(1)+'" fill="'+fill+'" fill-opacity="'+fillOpacity.toFixed(2)+'" stroke="'+color+'" stroke-opacity="'+strokeOpacity.toFixed(2)+'" stroke-width="'+Math.max(.8,r*.045).toFixed(2)+'"/>'+text+collapse+fav+'</g>';
}
function sphereBody(scene){
 projectSphere(scene);
 // Reserve label rectangles in priority order; dense leaves remain accessible by tap/title.
 const occupied=[];
 for(const {n,p} of scene.projected.slice().sort((a,b)=>a.n.depth-b.n.depth)){
  const font=(n.root?.048:n.q?.028:.035)*SPHERE_SCALE;
  const w=Math.min(Array.from(n.label).length,n.root?14:10)*font;
  const box={x:p.x-w/2,y:p.y+p.r+font*.3,w,h:font*1.5};
  n.hideLabel=occupied.some(b=>box.x<b.x+b.w&&box.x+box.w>b.x&&box.y<b.y+b.h&&box.y+box.h>b.y);
  if(!n.hideLabel)occupied.push(box);
 }
 const edges='<g class="mind-edges">'+scene.edges.map(e=>{
  const a=e.a.proj,b=e.b.proj,front=(a.front+b.front)/2,color=e.b.sphereColor||e.color;
  return '<line x1="'+a.x.toFixed(1)+'" y1="'+a.y.toFixed(1)+'" x2="'+b.x.toFixed(1)+'" y2="'+b.y.toFixed(1)+'" stroke="'+color+'" stroke-opacity="'+(.26+.34*front).toFixed(3)+'"/>';
 }).join('')+'</g>';
 const ordered=scene.projected.slice().sort((A,B)=>A.n.root?1:B.n.root?-1:A.p.z-B.p.z);
 const nodes=ordered.map(item=>sphereNode(item.n,item.p)).join('');
 return sphereDefs()+'<circle class="mind-sphere-halo" cx="0" cy="0" r="'+(SPHERE_SCALE*1.04).toFixed(1)+'" fill="url(#mgSphereHalo)"/>'+edges+nodes;
}
function sphereSvg(scene){
 return '<svg class="mind-svg mind-svg--sphere" role="group" aria-label="可拖动旋转缩放的问题关系图" viewBox="'+[viewport.x,viewport.y,viewport.w,viewport.h].join(' ')+'">'+sphereBody(scene)+'</svg>';
}
function paintSphere(){
 if(!sphereScene||!activeSvg)return;
 sphereScene.yaw=sphereYaw;sphereScene.pitch=spherePitch;
 activeSvg.innerHTML=sphereBody(sphereScene);
}
function scheduleSphere(){
 if(sphereFrame)return;
 if(typeof requestAnimationFrame==='function')sphereFrame=requestAnimationFrame(()=>{sphereFrame=0;paintSphere();});
 else paintSphere();
}
function clampPitch(v){return Math.max(-1.32,Math.min(1.32,v));}
function resetSphereRotation(){sphereYaw=INITIAL_YAW;spherePitch=INITIAL_PITCH;if(sphereScene){sphereScene.yaw=sphereYaw;sphereScene.pitch=spherePitch;}}

function render(root,title,collapsed,force,key){if(!root.children.size){sphereScene=null;return '';}if(identity!==key){identity=key;viewport=null;sphereScene=null;resetSphereRotation();}const nodes=[{x:0,y:0,r:70,label:title,root:true,color:'#777f75',count:size(root),depth:0,weight:1}],edges=[];
function walk(parent,items,start,end,depth,color){const total=items.reduce((a,i)=>a+i.weight,0);let offset=start;for(const item of items){const span=(end-start)*item.weight/total;const angle=offset+span/2;offset+=span;const radius=depth*195;const n={x:Math.cos(angle)*radius,y:Math.sin(angle)*radius,r:item.q?39:54,label:item.name,color,q:item.q,path:item.path,count:item.node?size(item.node):0,collapsed:collapsed.has(item.path),depth,weight:item.weight};nodes.push(n);edges.push({a:parent,b:n,color,weight:item.weight});if(item.node&&(!collapsed.has(item.path)||force))walk(n,children(item.node,item.path),angle-span*.46,angle+span*.46,depth+1,color);}}
function children(n,path){return [...Array.from(n.children,([name,node])=>({name,node,path:path+'/'+name,weight:size(node)})),...n.questions.map(q=>({name:q.title,q,weight:1}))];}
const top=children(root,'');const total=top.reduce((a,i)=>a+i.weight,0);let angle=-Math.PI/2;top.forEach((item,i)=>{const span=2*Math.PI*item.weight/total;walk(nodes[0],[item],angle,angle+span,1,palette[i%palette.length]);angle+=span;});
if(sphereMode()){
 const maxDepth=Math.max(...nodes.map(n=>n.depth||0));
 const scene=buildSphere(nodes,edges,maxDepth);
 scene.yaw=sphereYaw;scene.pitch=spherePitch;scene.key=key;
 sphereScene=scene;
 projectSphere(scene);
 bounds=sphereBounds(scene);if(!viewport)viewport={...bounds};
 return sphereShell(title);
}
sphereScene=null;
positions=new Map(nodes.filter(n=>n.q).map(n=>[n.q.id,{x:n.x,y:n.y}]));
const minX=Math.min(...nodes.map(n=>n.x-n.r))-45,minY=Math.min(...nodes.map(n=>n.y-n.r))-45,maxX=Math.max(...nodes.map(n=>n.x+n.r))+45,maxY=Math.max(...nodes.map(n=>n.y+n.r))+45;bounds={x:minX,y:minY,w:Math.max(400,maxX-minX),h:Math.max(400,maxY-minY)};if(!viewport)viewport={...bounds};
const svg='<svg class="mind-svg" role="group" aria-label="可拖动缩放的问题关系图" viewBox="'+[viewport.x,viewport.y,viewport.w,viewport.h].join(' ')+'"><g class="mind-edges">'+edges.map(e=>'<line x1="'+e.a.x+'" y1="'+e.a.y+'" x2="'+e.b.x+'" y2="'+e.b.y+'" stroke="'+e.color+'"/>').join('')+'</g>'+nodes.map(n=>{const lines=label(n.label,n.r);return '<g class="mind-node '+(n.q?'question-node':n.root?'root-node':'topic-node')+'" transform="translate('+n.x+' '+n.y+')" '+(n.q?'data-id="'+esc(n.q.id)+'"':n.path?'data-graph-topic="'+esc(n.path)+'"':'data-graph-root="true"')+' role="button" tabindex="0" aria-label="'+esc(n.label)+(n.path?(n.collapsed?'，展开':'，收起'):'')+'"><title>'+esc(n.label)+(n.q?(n.q.favorite?' · 已收藏':''):' · '+n.count+' 个问题')+'</title><circle r="'+n.r+'" fill="'+n.color+'" fill-opacity="'+(n.root?'.85':n.q?'.2':'.65')+'" stroke="'+n.color+'"/><text text-anchor="middle" fill="'+(n.q?'#e9e8ef':'#fff')+'" font-size="'+(n.root?17:n.q?11:14)+'">'+lines.map((line,i)=>'<tspan x="0" y="'+((i-(lines.length-1)/2)*(n.q?16:19)+4)+'">'+esc(line)+'</tspan>').join('')+'</text>'+(n.q&&n.q.favorite?'<path class="mind-fav" transform="translate(18 -30) scale(0.55)" d="M12 3.6 14.5 8.7 20.1 9.5 16.1 13.4 17 19 12 16.3 7 19 7.9 13.4 3.9 9.5 9.5 8.7Z"/>':'')+(n.path?'<g transform="translate(32 39)"><circle r="12" fill="#222822" stroke="'+n.color+'"/><text text-anchor="middle" y="4" fill="#e7eee1" font-size="12">'+(n.collapsed?'+':'−')+'</text></g>':'')+'</g>';}).join('')+'</svg>';
return '<div class="mind-shell">'+svg+'<div class="mind-controls"><button type="button" data-zoom="in" aria-label="放大关系图">+</button><button type="button" data-zoom="out" aria-label="缩小关系图">−</button><button type="button" data-zoom="fit">总览</button><button type="button" data-zoom="full">全屏</button></div></div>';}
function sphereShell(title){
 return '<div class="mind-shell mind-shell--sphere">'+sphereSvg(sphereScene)+'<div class="mind-controls"><button type="button" data-zoom="in" aria-label="放大关系图">+</button><button type="button" data-zoom="out" aria-label="缩小关系图">−</button><button type="button" data-zoom="fit">总览</button><button type="button" data-zoom="full">全屏</button></div></div>';
}
function apply(){activeSvg?.setAttribute('viewBox',[viewport.x,viewport.y,viewport.w,viewport.h].join(' '));}
function zoom(factor){if(!viewport)return;const w=Math.max(140,Math.min(4500,viewport.w*factor));const f=w/viewport.w;viewport={x:viewport.x+(viewport.w-w)/2,y:viewport.y+(viewport.h-viewport.h*f)/2,w,h:viewport.h*f};apply();}
function attach(el,onTopic,onRename){let touchActive=false;
let holdTimer=0,holdStart=null,suppressUntil=0;
function cancelHold(){clearTimeout(holdTimer);holdTimer=0;holdStart=null;}
function startHold(target,x,y){cancelHold();const node=target.closest?.('[data-graph-topic],[data-graph-root]');if(!node||!onRename)return;holdStart={x,y};holdTimer=setTimeout(()=>{holdTimer=0;holdStart=null;if(node.isConnected===false)return;suppressUntil=Date.now()+1200;moved=false;gesture=null;points.clear();touchActive=false;onRename(node.dataset.graphTopic||null);},550);}
function moveHold(x,y){if(holdStart&&Math.hypot(x-holdStart.x,y-holdStart.y)>8)cancelHold();}
el.addEventListener('contextmenu',e=>{if(e.target.closest?.('[data-graph-topic],[data-graph-root]'))e.preventDefault();});
const useTouch='ontouchstart' in window;el.addEventListener('click',e=>{if(Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();return;}const ctl=e.target.closest('[data-zoom]');if(ctl){activeSvg=el.querySelector('svg');if(ctl.dataset.zoom==='full'){const panel=document.querySelector('#mapPanel');panel.classList.toggle('graph-immersive');ctl.textContent=panel.classList.contains('graph-immersive')?'退出':'全屏';return;}if(ctl.dataset.zoom==='fit'){resetSphereRotation();if(viewport&&sphereScene){projectSphere(sphereScene);paintSphere();}viewport={...bounds};apply();}else zoom(ctl.dataset.zoom==='in'?.75:1.333);return;}if(moved){e.preventDefault();e.stopImmediatePropagation();moved=false;return;}const topic=e.target.closest('[data-graph-topic]');if(topic){e.stopPropagation();onTopic(topic.dataset.graphTopic);}if(e.target.closest('[data-graph-root]')){viewport={...bounds};activeSvg=el.querySelector('svg');apply();}},true);
el.addEventListener('keydown',e=>{if(e.key==='F2'){const node=e.target.closest('[data-graph-topic],[data-graph-root]');if(node&&onRename){e.preventDefault();onRename(node.dataset.graphTopic||null);}return;}if(e.key!=='Enter'&&e.key!==' ')return;const node=e.target.closest('.mind-node');if(node){e.preventDefault();node.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
el.addEventListener('pointerdown',e=>{if(useTouch&&e.pointerType==='touch')return;const svg=e.target.closest('svg');if(!svg||!viewport)return;activeSvg=svg;moved=false;if(points.size===0)startHold(e.target,e.clientX,e.clientY);else cancelHold();points.set(e.pointerId,{x:e.clientX,y:e.clientY});gesture={points:Array.from(points.values()),viewport:{...viewport}};if(sphereScene){gesture.yaw=sphereYaw;gesture.pitch=spherePitch;}});
el.addEventListener('pointermove',e=>{if(useTouch&&e.pointerType==='touch')return;moveHold(e.clientX,e.clientY);if(!points.has(e.pointerId)||!gesture)return;if(e.cancelable)e.preventDefault();e.stopPropagation();points.set(e.pointerId,{x:e.clientX,y:e.clientY});const current=Array.from(points.values()),before=gesture.points;const rect=activeSvg.getBoundingClientRect();if(!rect.width)return;
 if(sphereScene){
  if(current.length===1&&before.length===1){const dx=current[0].x-before[0].x,dy=current[0].y-before[0].y;if(Math.abs(dx)+Math.abs(dy)>4)moved=true;if(moved){sphereYaw=(gesture.yaw??sphereYaw)+dx*.0075;spherePitch=clampPitch((gesture.pitch??spherePitch)+dy*.0075);sphereScene.yaw=sphereYaw;sphereScene.pitch=spherePitch;scheduleSphere();}}
  else if(current.length>=2&&before.length>=2){const distance=p=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);const f=distance(before)/Math.max(1,distance(current));const w=Math.max(140,Math.min(4500,gesture.viewport.w*f));const ratio=w/gesture.viewport.w;viewport={x:gesture.viewport.x+(gesture.viewport.w-w)/2,y:gesture.viewport.y+(gesture.viewport.h-gesture.viewport.h*ratio)/2,w,h:gesture.viewport.h*ratio};moved=true;apply();}
  return;
 }
 if(current.length===1&&before.length===1){const dx=current[0].x-before[0].x,dy=current[0].y-before[0].y;if(Math.abs(dx)+Math.abs(dy)>5){moved=true;activeSvg.setPointerCapture?.(e.pointerId);}const scale=Math.max(gesture.viewport.w/rect.width,gesture.viewport.h/rect.height);viewport={...gesture.viewport,x:gesture.viewport.x-dx*scale,y:gesture.viewport.y-dy*scale};}else if(current.length>=2&&before.length>=2){const distance=p=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);const f=distance(before)/Math.max(1,distance(current));const w=Math.max(140,Math.min(4500,gesture.viewport.w*f));const ratio=w/gesture.viewport.w;viewport={x:gesture.viewport.x+(gesture.viewport.w-w)/2,y:gesture.viewport.y+(gesture.viewport.h-gesture.viewport.h*ratio)/2,w,h:gesture.viewport.h*ratio};moved=true;}apply();});
function end(e){if(useTouch&&e.pointerType==='touch')return;cancelHold();points.delete(e.pointerId);gesture=points.size?{points:Array.from(points.values()),viewport:{...viewport},yaw:sphereYaw,pitch:spherePitch}:null;}el.addEventListener('pointerup',end);el.addEventListener('pointercancel',e=>{end(e);moved=false;});
// iOS Safari may hand SVG touches to page scrolling unless explicitly cancelled.
function touchPoints(touches){return Array.from(touches).map(t=>({x:t.clientX,y:t.clientY}));}
function beginTouch(e){if(e.touches.length!==1)cancelHold();else startHold(e.target,e.touches[0].clientX,e.touches[0].clientY);const svg=e.target.closest?.('.mind-svg');if(!svg&&!touchActive)return;if(!viewport)return;if(!touchActive){activeSvg=svg;moved=false;touchActive=true;}gesture={points:touchPoints(e.touches),viewport:{...viewport},yaw:sphereYaw,pitch:spherePitch};if(e.touches.length>1&&e.cancelable)e.preventDefault();e.stopPropagation();}
function moveTouch(e){if(e.touches.length!==1)cancelHold();else moveHold(e.touches[0].clientX,e.touches[0].clientY);if(activeSvg?.isConnected===false){touchActive=false;gesture=null;return;}if(!touchActive||!gesture||!activeSvg)return;if(e.cancelable)e.preventDefault();e.stopPropagation();const current=touchPoints(e.touches),before=gesture.points;const rect=activeSvg.getBoundingClientRect();if(!rect.width||!rect.height)return;
 if(sphereScene){
  if(current.length===1&&before.length===1){const dx=current[0].x-before[0].x,dy=current[0].y-before[0].y;if(Math.abs(dx)+Math.abs(dy)>4)moved=true;if(moved){sphereYaw=(gesture.yaw??sphereYaw)+dx*.0075;spherePitch=clampPitch((gesture.pitch??spherePitch)+dy*.0075);sphereScene.yaw=sphereYaw;sphereScene.pitch=spherePitch;scheduleSphere();}}
  else if(current.length>=2&&before.length>=2){const distance=p=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);const mid=p=>({x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2});const f=Math.max(140,Math.min(4500,gesture.viewport.w*distance(before)/Math.max(1,distance(current))))/gesture.viewport.w;const a=mid(before),b=mid(current);const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;const scale=Math.max(gesture.viewport.w/rect.width,gesture.viewport.h/rect.height);const anchorX=gesture.viewport.x+gesture.viewport.w/2+(a.x-cx)*scale,anchorY=gesture.viewport.y+gesture.viewport.h/2+(a.y-cy)*scale;viewport={x:anchorX-(b.x-cx)*scale*f-gesture.viewport.w*f/2,y:anchorY-(b.y-cy)*scale*f-gesture.viewport.h*f/2,w:gesture.viewport.w*f,h:gesture.viewport.h*f};moved=true;apply();}
  return;
 }
 const base=gesture.viewport,scale=Math.max(base.w/rect.width,base.h/rect.height);if(current.length===1&&before.length===1){const dx=current[0].x-before[0].x,dy=current[0].y-before[0].y;if(Math.abs(dx)+Math.abs(dy)>4)moved=true;viewport={...base,x:base.x-dx*scale,y:base.y-dy*scale};}else if(current.length>=2&&before.length>=2){const distance=p=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);const mid=p=>({x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2});const f=Math.max(140,Math.min(4500,base.w*distance(before)/Math.max(1,distance(current))))/base.w;const a=mid(before),b=mid(current);const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;const anchorX=base.x+base.w/2+(a.x-cx)*scale,anchorY=base.y+base.h/2+(a.y-cy)*scale;viewport={x:anchorX-(b.x-cx)*scale*f-base.w*f/2,y:anchorY-(b.y-cy)*scale*f-base.h*f/2,w:base.w*f,h:base.h*f};moved=true;}apply();}
function endTouch(e){cancelHold();if(!touchActive)return;e.stopPropagation();if(e.touches.length){gesture={points:touchPoints(e.touches),viewport:{...viewport},yaw:sphereYaw,pitch:spherePitch};}else{touchActive=false;gesture=null;} }
el.addEventListener('touchstart',beginTouch,{passive:false});document.addEventListener('touchmove',moveTouch,{passive:false,capture:true});document.addEventListener('touchend',endTouch,{passive:false,capture:true});document.addEventListener('touchcancel',e=>{cancelHold();if(!touchActive)return;touchActive=false;gesture=null;moved=false;},{passive:false,capture:true});
for(const name of ['gesturestart','gesturechange','gestureend'])el.addEventListener(name,e=>{if(e.target.closest?.('.mind-shell')){if(e.cancelable)e.preventDefault();e.stopPropagation();}},{passive:false});
el.addEventListener('wheel',e=>{if(!e.target.closest('svg'))return;e.preventDefault();activeSvg=el.querySelector('svg');zoom(e.deltaY>0?1.12:.89);},{passive:false});}
window.QuestionGraph={render,attach,focus(id){const point=positions.get(id);activeSvg=document.querySelector('.mind-svg');if(!point||!activeSvg)return false;const side=sphereScene?420:340;viewport={x:point.x-side/2,y:point.y-side/2,w:side,h:side};apply();for(const node of activeSvg.querySelectorAll('[data-id]'))node.classList.toggle('graph-located',node.dataset.id===id);return true;},reset(){viewport=null;points.clear();gesture=null;sphereScene=null;positions=new Map();resetSphereRotation();}};
})();
