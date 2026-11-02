import {createHash} from 'node:crypto';import {api} from '../worker/api.mjs';import {supabaseStore} from './supabase-store.mjs';
export function createVercelHandler({createClient,readEnv}){return async request=>{
 const json=(body,status)=>Response.json(body,{status,headers:{'cache-control':'private, no-store'}});
 const token=request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];if(!token)return json({error:'sign_in_required',signIn:'/login.html'},401);
 const url=readEnv('SUPABASE_URL'),key=readEnv('SUPABASE_PUBLISHABLE_KEY');if(!url||!key)return json({error:'auth_not_configured'},503);
 try{
 const client=createClient(url,key,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.auth.getUser(token);if(error||!data?.user)return json({error:'sign_in_required',signIn:'/login.html'},401);
 const user=data.user,identity='supabase:'+user.id,headers=new Headers(request.headers);headers.set('oai-authenticated-user-id',identity);headers.set('oai-authenticated-user-email',user.email||'');
 const verified=new Request(request,{headers}),prefix='accounts/'+createHash('sha256').update(identity).digest('hex')+'/';
 const env={BUCKET:supabaseStore(client,user.id,prefix)};for(const name of ['SYNC_KEY_ENCRYPTION','SEARCH_PROVIDER','WEATHER_PROVIDER','WEATHER_API_KEY'])env[name]=readEnv(name);
 return await api(verified,env)||json({error:'not_found'},404);
 }catch{return json({error:'backend_unavailable'},503);}
};}
