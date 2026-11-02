import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {webcrypto} from 'node:crypto';
const window={};vm.runInNewContext(fs.readFileSync('public/backup-import.js','utf8'),{window,crypto:webcrypto,TextEncoder});const prepare=window.BackupImport.prepare;
const target={active:'first',conversations:[{id:'first',title:'新对话',messages:[],questions:[]}]};const old={document:{active:'first',conversations:[{id:'first',title:'AI学习',messages:[{id:'m1',role:'user',text:'旧内容'}],questions:[{id:'q1',title:'旧问题',links:[]}]}]}};
let result=prepare(old,target);assert.equal(result.added,1);assert.equal(result.document.conversations.length,1);assert.equal(result.document.conversations[0].messages[0].text,'旧内容');assert.equal(target.conversations[0].messages.length,0);
const second=prepare(old,result.document);assert.equal(second.added,0);assert.equal(second.skipped,1);
assert.throws(()=>prepare({document:{conversations:[{id:'bad'}]}},target));
console.log('PASS: backup schema validated, import preserves current data and adds old conversations');
