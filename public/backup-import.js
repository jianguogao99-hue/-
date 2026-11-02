(()=>{'use strict';
function prepare(input,current){const document=input?.document||input;if(!Array.isArray(document?.conversations)||!document.conversations.length)throw Error('请选择问迹导出的备份 JSON 文件。');const copy=x=>JSON.parse(JSON.stringify(x)),next=copy(current);let added=0,skipped=0,messages=0,questions=0;
for(const original of document.conversations){if(!original||typeof original.id!=='string'||typeof original.title!=='string'||!Array.isArray(original.messages)||!Array.isArray(original.questions)||!original.messages.every(m=>m&&typeof m.id==='string'&&typeof m.text==='string'&&['user','assistant'].includes(m.role))||!original.questions.every(q=>q&&typeof q.id==='string'&&typeof q.title==='string'&&Array.isArray(q.links)))throw Error('备份中的对话格式不完整，尚未导入任何内容。');
const identical=next.conversations.some(c=>JSON.stringify(c.messages)===JSON.stringify(original.messages)&&JSON.stringify(c.questions)===JSON.stringify(original.questions)&&c.title===original.title);if(identical){skipped++;continue;}const existing=next.conversations.find(c=>c.id===original.id);
const conversation=copy(original);if(existing)conversation.id=original.id+'-import-'+crypto.randomUUID();next.conversations.push(conversation);added++;messages+=conversation.messages.length;questions+=conversation.questions.length;
}
if(next.conversations.length>=1000)throw Error('对话数量过多，无法一次导入。');if(added){next.conversations=next.conversations.filter(c=>c.messages.length||c.questions.length||c.title!=='新对话');if(!next.conversations.some(c=>c.id===next.active))next.active=next.conversations.at(-added)?.id||next.conversations[0].id;}
if(new TextEncoder().encode(JSON.stringify(next)).length>4*1024*1024)throw Error('合并后的数据超过当前单次保存大小，请分批迁移。');return {document:next,added,skipped,messages,questions};}
window.BackupImport={prepare};
})();
