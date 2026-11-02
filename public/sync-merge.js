(()=>{'use strict';
const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
function merge(base,local,remote){if(equal(local,base))return clone(remote);if(equal(remote,base)||equal(local,remote))return clone(local);if(local===undefined)return base===undefined?clone(remote):undefined;if(remote===undefined)return base===undefined?clone(local):undefined;
 if(Array.isArray(local)&&Array.isArray(remote)){const all=[...(Array.isArray(base)?base:[]),...local,...remote];const key=x=>object(x)?x.id||x.messageId||x.question?.id||x.batch:null;if(all.every(x=>typeof key(x)==='string')){const b=new Map((base||[]).map(x=>[key(x),x])),l=new Map(local.map(x=>[key(x),x])),r=new Map(remote.map(x=>[key(x),x]));const ids=[...new Set([...remote.map(key),...local.map(key)])];return ids.map(id=>merge(b.get(id),l.get(id),r.get(id))).filter(x=>x!==undefined);}return clone(local);}
 if(object(local)&&object(remote)){const out={};for(const k of new Set([...Object.keys(base||{}),...Object.keys(local),...Object.keys(remote)])){if(['__proto__','constructor','prototype'].includes(k))continue;const v=merge(base?.[k],local[k],remote[k]);if(v!==undefined)out[k]=v;}return out;}return clone(local);}
function documentMerge(base,local,remote){const result=merge(base,local,remote);if(!result?.conversations?.length)return clone(local?.conversations?.length?local:remote);for(const c of result.conversations){const deleted=new Set((c.deletedQuestions||[]).map(x=>x.question?.id));c.questions=(c.questions||[]).filter(q=>!deleted.has(q.id));const valid=new Set(c.questions.map(q=>q.id));for(const q of c.questions)q.links=(q.links||[]).filter(id=>valid.has(id));}if(!result.conversations.some(c=>c.id===result.active))result.active=result.conversations[0].id;return result;}
window.SyncMerge={merge:documentMerge,equal,clone};
})();
