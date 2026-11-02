import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const code=fs.readFileSync('src/auth-entry.js','utf8').replace(/^import .*?;\n/,'');
const els=new Map();function element(){return {hidden:false,value:'',textContent:'',disabled:false,append(){},reportValidity:()=>true};}
const query=selector=>{if(!els.has(selector))els.set(selector,element());return els.get(selector);};
const redirects=[];const context={document:{querySelector:query},location:{search:'',hash:'',replace:path=>redirects.push(path)},URLSearchParams,getUser:async()=>({id:'already-signed-in'}),getSettings:async()=>({disableSignup:false,providers:{email:true}}),handleAuthCallback:async()=>null,onAuthChange(){},logout:async()=>{},login:async()=>{},signup:async()=>{},requestPasswordRecovery:async()=>{},updateUser:async()=>{}};
vm.runInNewContext(code,context);await new Promise(resolve=>setTimeout(resolve,0));assert.deepEqual(redirects,[],'Existing session must not bounce login page to failing app');query('#signup').onclick();assert.equal(query('#authHeading').textContent,'创建你的问迹账号');assert.equal(query('#confirmPasswordField').hidden,false);
console.log('PASS: signed-in visitor can still open login and registration without being redirected to the app');
