import {createHash} from 'node:crypto';import {api} from '../../worker/api.mjs';import {accountStore} from './account-store.mjs';
export function createHandler({getUser,getPool,readEnv}){return async request=>{
 const privateJSON=(body,status)=>Response.json(body,{status,headers:{'cache-control':'private, no-store'}});
 try{
  const user=await getUser();if(!user)return privateJSON({error:'sign_in_required',signIn:'/login.html'},401);
  const url=new URL(request.url);if(url.pathname.startsWith('/.netlify/functions/api/'))url.pathname='/api/'+url.pathname.slice('/.netlify/functions/api/'.length);
  const identity='netlify:'+user.id,headers=new Headers(request.headers);headers.set('oai-authenticated-user-id',identity);headers.set('oai-authenticated-user-email',user.email||'');
  const verified=new Request(url,new Request(request,{headers}));
  const hash=createHash('sha256').update(identity).digest('hex'),env={BUCKET:accountStore(getPool(),identity,'accounts/'+hash+'/')};
  for(const name of ['SYNC_KEY_ENCRYPTION','SEARCH_PROVIDER','WEATHER_PROVIDER','WEATHER_API_KEY'])env[name]=readEnv(name);
  return await api(verified,env)||new Response('Not found',{status:404});
 }catch{return privateJSON({error:'service_unavailable'},503);}
};}
