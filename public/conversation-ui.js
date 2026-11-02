(()=>{'use strict';
function ordered(conversations){return conversations.map((c,index)=>({c,index})).sort((a,b)=>Number(Boolean(b.c.pinned))-Number(Boolean(a.c.pinned))||(b.c.pinned?(Number(b.c.pinnedAt)||0):0)-(a.c.pinned?(Number(a.c.pinnedAt)||0):0)||b.index-a.index).map(x=>x.c);}
function renameBranch(questions,prefix,name,pathFor){name=name.trim();if(!name||name.includes('/')||name.length>40)throw new Error('分类名称需为 1–40 个字，不能包含 /');const affected=questions.filter(q=>prefix.every((p,i)=>pathFor(q)[i]===p));if(!affected.length)throw new Error('该分类已不存在，请重新选择');if(questions.some(q=>{const p=pathFor(q);return prefix.slice(0,-1).every((v,i)=>p[i]===v)&&p[prefix.length-1]===name&&p[prefix.length-1]!==prefix.at(-1);} ))throw new Error('同一层已有这个分类，请使用其他名称');for(const q of affected){const path=pathFor(q).slice();path[prefix.length-1]=name;q.path=path;}return affected.length;}
window.ConversationUI={ordered,renameBranch};
})();
