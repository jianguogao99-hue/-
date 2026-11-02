import {createClient} from '@supabase/supabase-js';import {createVercelHandler} from '../server/vercel-handler.mjs';
const handle=createVercelHandler({createClient,readEnv:name=>process.env[name]});
export default async function(req,res){
 try{
 const headers=new Headers();for(const [name,value] of Object.entries(req.headers))if(value!==undefined)headers.set(name,Array.isArray(value)?value.join(','):String(value));
 const url=new URL(req.url,'https://'+req.headers.host),method=req.method||'GET';let body;
 if(!['GET','HEAD'].includes(method)){if(req.body!==undefined)body=typeof req.body==='string'?req.body:JSON.stringify(req.body);else{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>5*1024*1024){res.statusCode=413;res.end('Payload too large');return;}chunks.push(chunk);}body=Buffer.concat(chunks);}}
 const result=await handle(new Request(url,{method,headers,...(body!==undefined?{body}:{} )}));res.statusCode=result.status;result.headers.forEach((value,name)=>res.setHeader(name,value));res.end(Buffer.from(await result.arrayBuffer()));
 }catch{res.statusCode=500;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','private, no-store');res.end(JSON.stringify({error:'server_error'}));}
}
