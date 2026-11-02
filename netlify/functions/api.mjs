import {createRequire} from 'node:module';
// Dependencies may contain CommonJS. Establish Node's require before lazy loading
// so an ESM deployment can load native built-ins (events, crypto, stream).
globalThis.require??=createRequire(import.meta.url);
let handler;
export default async function(request){
 try{
  if(!handler){const [{getUser},{getDatabase},{createHandler}]=await Promise.all([import('@netlify/identity'),import('@netlify/database'),import('../lib/handler.mjs')]);handler=createHandler({getUser,getPool:()=>getDatabase().pool,readEnv:name=>Netlify.env.get(name)});}
  return await handler(request);
 }catch(error){
  const dynamic=String(error?.message||'').match(/Dynamic require of ["']([a-z_:-]+)["']/i);
  const code=dynamic?'module_load_'+dynamic[1].replace(/[^a-z_]/g,''):error?.code==='ERR_MODULE_NOT_FOUND'?'module_missing':'initialization_failed';
  console.error('wenji_backend_boot',code,error?.name||'Error');
  return Response.json({error:code,message:'后台初始化失败，请稍后重试。',build:'startup14'},{status:503,headers:{'cache-control':'private, no-store'}});
 }
}
