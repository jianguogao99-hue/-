import assert from 'node:assert/strict';import {createHandler} from '../netlify/lib/handler.mjs';
const headers={'oai-authenticated-user-id':'spoofed-owner','oai-authenticated-user-email':'spoof@example.org'};
const req=new Request('https://site.test/api/account',{headers});let called=false;
const guest=createHandler({getUser:async()=>null,getPool:()=>{called=true;throw Error()},readEnv:()=>''});assert.equal((await guest(req)).status,401);assert.equal(called,false);
const member=createHandler({getUser:async()=>({id:'real-user',email:'friend@example.org'}),getPool:()=>({}),readEnv:()=>''});const account=await member(req);assert.equal(account.status,200);assert.deepEqual(await account.json(),{user:'netlify:real-user',email:'friend@example.org'});
const routed=await member(new Request('https://site.test/.netlify/functions/api/account',{headers}));assert.equal(routed.status,200);
const post=await member(new Request('https://site.test/api/settings',{method:'POST',headers:{...headers,origin:'https://evil.test','content-type':'application/json'},body:JSON.stringify({provider:'deepseek',model:'deepseek-flash',key:'fake-key'})}));assert.equal(post.status,403);
console.log('PASS: verified Netlify identity replaces spoofed browser headers; anonymous calls never access storage; wrong origin rejected');
