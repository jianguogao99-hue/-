(()=>{'use strict';
// Only remove injected Netlify branding/tooling, not application navigation,
// Identity frames, user messages mentioning Netlify, or normal external links.
const labels=new Set(['powered by netlify']);
const selectors='netlify-badge,netlify-toolbar,#netlify-badge,#netlify-toolbar,[data-netlify-badge],iframe[src*="netlify"][src*="badge"],iframe[src*="netlify"][src*="toolbar"]';
const observed=new WeakSet();let scheduled=false;
function sweep(root){
 root.querySelectorAll(selectors).forEach(node=>node.remove());
 for(const node of root.querySelectorAll('a,button,span,div')){
  if(node.closest('#messages,dialog,.composer')&&!node.matches('a,button,span'))continue;
  const label=node.textContent?.trim().replace(/\s+/g,' ').toLowerCase();if(!labels.has(label))continue;
  let floating=null,walk=node;
  for(let n=0;walk&&n<7;n++,walk=walk.parentElement){if(walk.matches('body,html,main,#form,#messages,dialog'))break;const style=getComputedStyle(walk),rect=walk.getBoundingClientRect();if(style.position==='fixed'&&rect.width<=420&&rect.height<=150){floating=walk;break;}}
  if(floating)floating.remove();
 }
 // Some platform widgets use an open shadow root.
 for(const host of root.querySelectorAll('*'))if(host.shadowRoot&&!observed.has(host.shadowRoot)){watch(host.shadowRoot);sweep(host.shadowRoot);}
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;sweep(document);});}
function watch(root){if(observed.has(root))return;observed.add(root);new MutationObserver(schedule).observe(root,{childList:true,subtree:true});}
watch(document);schedule();
})();
