import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {randomBytes} from 'node:crypto';import {api} from '../worker/api.mjs';
class Bucket{map=new Map();counter=0;async get(key){const row=this.map.get(key);if(!row)return null;return {etag:row.etag,httpEtag:'"'+row.etag+'"',async json(){return JSON.parse(row.value)},async text(){return row.value}};}async put(key,value,options={}){const current=this.map.get(key),match=options.onlyIf?.get('If-Match'),none=options.onlyIf?.get('If-None-Match');if(match&&match!=='"'+current?.etag+'"'||none==='*'&&current)return null;const row={etag:String(++this.counter),value:String(value)};this.map.set(key,row);return {etag:row.etag};}}
const env={BUCKET:new Bucket(),SYNC_KEY_ENCRYPTION:randomBytes(32).toString('base64')};
const doc={active:'first',conversations:[{id:'first',title:'AI Agent 学习',messages:[{id:'m1',role:'user',text:'问题'}],questions:[{id:'q1',title:'问题',links:[]}]}]};
async function call(path,method='GET',data,user='u1',origin='https://site.test'){return api(new Request('https://site.test'+path,{method,headers:{...(user?{'oai-authenticated-user-id':user}:{}),...(method!=='GET'?{origin,'content-type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})}),env);}
assert.equal((await call('/api/state','GET',null,null)).status,401);assert.equal((await call('/api/state','POST',{document:doc},'u1','https://evil.test')).status,403);
let r=await call('/api/state','POST',{document:doc,etag:null});assert.equal(r.status,200);let record=await (await call('/api/state')).json();assert.equal(record.document.conversations.length,1);assert.equal((await (await call('/api/state','GET',null,'u2')).json()).document,null);assert.equal((await call('/api/state','POST',{document:doc,etag:null})).status,409);
assert.equal((await call('/api/settings','POST',{provider:'deepseek',model:'deepseek-flash',key:'unit-test-key'})).status,200);const settings=await (await call('/api/settings')).json();assert.deepEqual(settings.configured,['deepseek']);assert(!JSON.stringify(settings).includes('unit-test-key'));assert(!Array.from(env.BUCKET.map.values()).some(row=>row.value.includes('unit-test-key')));assert.equal((await (await call('/api/settings','GET',null,'u2')).json()).configured.length,0);
const realFetch=globalThis.fetch;globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.deepseek.com/chat/completions');assert.equal(options.headers.Authorization,'Bearer unit-test-key');return Response.json({choices:[{message:{content:'hello'}}]});};assert.equal((await call('/api/provider','POST',{provider:'deepseek',operation:'chat',payload:{model:'deepseek-flash',messages:[]}})).status,200);assert.equal((await call('/api/provider','POST',{provider:'unknown',operation:'chat',payload:{}})).status,400);
let toolCalls=[];globalThis.fetch=async(url,options={})=>{toolCalls.push(url);if(url.includes('/v1/tools/search'))return Response.json({results:[{title:'当天新闻',url:'https://example.org/news',snippet:'测试摘要',summary:'测试内容',date:'2026-11-01T01:00:00Z'}]});if(url.includes('api.open-meteo.com'))return Response.json({current:{time:1793505600,temperature_2m:12,weather_code:0},current_units:{temperature_2m:'°C'},timezone:'Asia/Shanghai'});if(url.endsWith('/chat/completions')){const sent=JSON.parse(options.body);assert(!('app_tools' in sent));assert(sent.messages.some(m=>m.content.includes('QUESTION_GARDEN_TOOL_RESULTS')));assert.equal(sent.messages.at(-1).role,'user');return Response.json({model:'deepseek-flash',choices:[{message:{content:'根据工具结果作答。'}}]});}throw new Error('Unexpected tool URL');};
for(const [question,tool] of [['现在几点','time'],['北京今天多少度','weather'],['今天有什么新闻','search']]){const response=await call('/api/provider','POST',{provider:'deepseek',operation:'chat',app_tools:{mode:'auto',timezone:'Asia/Shanghai'},payload:{model:'deepseek-flash',messages:[{role:'user',content:question}]}});assert.equal(response.status,200);const data=await response.json();assert.equal(data.app_tools[0].tool,tool);assert.equal(data.app_tools[0].status,'success');assert(!JSON.stringify(data).includes('unit-test-key'));}assert(toolCalls.some(u=>u.includes('/v1/tools/search')));assert(toolCalls.some(u=>u.includes('api.open-meteo.com')));
globalThis.fetch=realFetch;
const mergeCode=fs.readFileSync(new URL('../public/sync-merge.js',import.meta.url),'utf8');const mergeCtx={window:{}};vm.createContext(mergeCtx);vm.runInContext(mergeCode,mergeCtx);const merge=mergeCtx.window.SyncMerge.merge,copy=x=>JSON.parse(JSON.stringify(x));
const seed=copy(doc),phone=copy(seed),ipad=copy(seed);phone.conversations[0].messages.push({id:'m2',role:'user',text:'手机新问题'});phone.conversations[0].questions[0].favorite=true;assert.equal(merge(seed,ipad,phone).conversations[0].messages.length,2);ipad.conversations.push({id:'second',title:'iPad 新对话',messages:[],questions:[]});let combined=merge(seed,phone,ipad);assert.equal(combined.conversations.length,2);assert(combined.conversations[0].questions[0].favorite);const deletion=copy(seed);deletion.conversations[0].questions=[];deletion.conversations[0].deletedQuestions=[{question:{id:'q1',title:'问题'},index:0}];assert.equal(merge(seed,deletion,phone).conversations[0].questions.length,0);
// Two independent browser realms with one simulated authenticated cloud.
let sharedDoc=null,version=0,sharedSettings={provider:null,model:null,configured:[]};
async function siteFetch(path,options={}){const input=options.body?JSON.parse(options.body):null;if(path==='/api/state'){if(options.method==='POST'){if(input.etag!==(version?String(version):null))return Response.json({error:'conflict'},{status:409});sharedDoc=copy(input.document);version++;return Response.json({etag:String(version)});}return Response.json({user:'account',etag:version?String(version):null,document:copy(sharedDoc)});}if(path==='/api/settings'){if(options.method==='POST'){sharedSettings={provider:input.provider,model:input.model,configured:[input.provider]};}return Response.json(sharedSettings);}throw new Error('Unexpected '+path);}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function waitFor(check,label){for(let i=0;i<100;i++){if(check())return;await tick();}throw new Error('Timed out waiting for '+label);}
function browser(initial,key,owner='account',options={}){const storage=new Map();if(owner!==null&&owner!==undefined)storage.set('question-garden-cloud-user',owner);const els=new Map(),loads=[];let workspace=copy(initial),configured;const window={fetch:options.fetch||siteFetch,SyncMerge:mergeCtx.window.SyncMerge,addEventListener(){}};const context={window,document:{hidden:false,querySelector(s){if(!els.has(s))els.set(s,{});return els.get(s)},addEventListener(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},Headers,Blob,URL,setInterval:()=>0,setTimeout:()=>0,clearTimeout(){}};vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../public/cloud-account.js',import.meta.url),'utf8'),context);const callbacks={get:()=>workspace,seed:()=>copy(seed),apply:v=>{workspace=copy(v)},blocked:()=>false,localSettings:()=>({provider:'deepseek',model:'deepseek-flash',key}),applySettings:v=>{configured=v},setLoading(loading){loads.push({loading,ready:window.CloudAccount.ready,status:els.get('#syncStatus')?.textContent||''});}};return {cloud:window.CloudAccount,get:()=>workspace,storage,loads,status:()=>els.get('#syncStatus')?.textContent||'',start:()=>window.CloudAccount.start(callbacks),config:()=>configured};}
const a=browser(phone,'unit-test-key');await a.start();assert.equal(sharedDoc.conversations[0].messages.length,2);const b=browser(seed,'');await b.start();assert.equal(b.get().conversations[0].messages.length,2);assert.equal(b.config().provider,'deepseek');a.get().conversations[0].questions[0].favorite=false;b.get().conversations.push({id:'from-ipad',title:'另一个方向',messages:[],questions:[]});await a.cloud.sync();await b.cloud.sync();await a.cloud.sync();assert.equal(a.get().conversations.length,2);assert.equal(b.get().conversations[0].questions[0].favorite,false);assert(a.storage.has('question-garden-before-cloud-v1'));assert(!JSON.stringify(sharedDoc).includes('unit-test-key'));
sharedDoc=null;version=0;sharedSettings={provider:null,model:null,configured:[]};const switched=browser(phone,'another-person-key','different-account');await switched.start();assert.equal(sharedSettings.provider,null,'Do not import the previous account key');assert.equal(switched.get().conversations[0].messages.length,seed.conversations[0].messages.length,'Do not import previous account chat');assert.equal(switched.config().provider,null);
// A. A return visit paints the local workspace immediately, before settings or the second state fetch finish.
{
 let stateGets=0,statePosts=0,settingsGets=0;
 const firstState=deferred(),secondState=deferred(),settingsGate=deferred();
 const remoteDoc={active:'cloud',conversations:[{id:'cloud',title:'云端对话',messages:[{id:'c1',role:'user',text:'云端消息'}],questions:[]}]};
 const localDoc={active:'local',conversations:[{id:'local',title:'本机对话',messages:[{id:'l1',role:'user',text:'本机消息'}],questions:[]}]};
 const gatedFetch=async(path,options={})=>{if(path==='/api/state'&&options.method!=='POST'){stateGets++;const gate=stateGets===1?firstState:secondState;await gate.promise;return Response.json({user:'account',etag:'1',document:copy(remoteDoc)});}if(path==='/api/state'){statePosts++;return Response.json({etag:'2'});}if(path==='/api/settings'){settingsGets++;await settingsGate.promise;return Response.json({provider:'deepseek',model:'deepseek-flash',configured:['deepseek']});}throw new Error('Unexpected '+path);};
 const v=browser(localDoc,'unit-test-key','account',{fetch:gatedFetch});
 const started=v.start();await tick();
 const hidden=v.loads.find(x=>!x.loading&&x.ready);
 assert(hidden,'Return visit clears the overlay immediately');
 assert.equal(v.cloud.ready,true);assert.equal(v.status(),'正在同步…');
 assert.equal(stateGets,1,'First state request started');assert.equal(settingsGets,1,'Settings request starts in parallel');
 assert.equal(v.loads.filter(x=>!x.loading).length,1,'Only the early hide has happened');
 firstState.resolve();await waitFor(()=>v.get().conversations.length===2,'cloud merge');
 assert.equal(v.config(),undefined,'Settings are still pending after chats merge');
 assert.equal(stateGets,1,'Second state fetch waits for settings');
 settingsGate.resolve();await waitFor(()=>stateGets===2,'second state request');
 secondState.resolve();await started;
 assert.equal(v.config().provider,'deepseek');assert(statePosts>=1,'Follow-up sync pushes the merged workspace');
 assert.equal(v.loads.at(-1).loading,false,'Overlay never comes back after the early hide');
}
// B. A failed first state request must not replace local chats or re-show the overlay on a return visit.
{
 const localDoc=copy(phone);
 const v=browser(localDoc,'unit-test-key','account',{fetch:async path=>{if(path==='/api/state')throw new Error('offline');if(path==='/api/settings')return Response.json({provider:null,model:null,configured:[]});throw new Error('Unexpected '+path);}});
 await v.start();
 assert.deepEqual(v.get(),localDoc,'Local chats survive a failed first state request');
 assert(v.loads.some(x=>!x.loading&&x.ready),'Overlay stays hidden on a return visit');
 assert.equal(v.cloud.ready,true);assert(v.status().includes('云端未连接'),'Sync status reports the offline state');
}
// C. A first visit waits only for the first state response, not settings or the follow-up state fetch.
{
 let stateGets=0,settingsGets=0;
 const firstState=deferred(),settingsGate=deferred();
 const remoteDoc={active:'cloud',conversations:[{id:'cloud',title:'云端对话',messages:[{id:'c1',role:'user',text:'云端消息'}],questions:[]}]};
 const gatedFetch=async(path,options={})=>{if(path==='/api/state'&&options.method!=='POST'){stateGets++;if(stateGets===1)await firstState.promise;return Response.json({user:'account',etag:'1',document:copy(remoteDoc)});}if(path==='/api/state')return Response.json({etag:'2'});if(path==='/api/settings'){settingsGets++;await settingsGate.promise;return Response.json({provider:'deepseek',model:'deepseek-flash',configured:['deepseek']});}throw new Error('Unexpected '+path);};
 const v=browser(copy(seed),'',null,{fetch:gatedFetch});
 v.storage.set('question-garden-conversations-v1',JSON.stringify(seed));
 assert.equal(v.storage.has('question-garden-cloud-user'),false,'First visit has no known local account');
 const started=v.start();await tick();
 assert.equal(stateGets,1,'First state request started');assert.equal(settingsGets,1,'Settings request starts in parallel');
 assert.equal(v.loads.filter(x=>!x.loading).length,0,'Overlay remains until the first state response');
 assert.equal(v.cloud.ready,false);
 firstState.resolve();await waitFor(()=>v.cloud.ready===true,'first state hides overlay');
 assert(v.loads.some(x=>!x.loading&&x.ready),'Overlay hides with ready true');
 assert.equal(stateGets,1,'Second state fetch does not block the first paint');
 assert.equal(v.config().provider,null,'Settings are still pending after the first paint');
 assert(v.get().conversations.some(c=>c.id==='cloud'),'Cloud document is applied on the first visit');
 settingsGate.resolve();await started;
 assert.equal(v.config().provider,'deepseek');assert(stateGets>=2,'Follow-up sync runs after the first paint');
 assert.equal(v.storage.get('question-garden-cloud-user'),'account');
}
console.log('PASS: account isolation, origin checks, ETag conflict rejection, encrypted keys, constrained provider proxy, rich phone/default iPad migration, two-device concurrent edits, deletion/favorite sync, local backup, no keys in workspace, immediate return-visit paint, offline preservation and first-visit overlay timing.');
