export function supabaseStore(client,ownerId,prefix){
 function key(path){if(path==='__health_probe')return path;if(!path.startsWith(prefix))throw Error('Account path rejected');return path.slice(prefix.length);}
 return {
 async get(path){const {data,error}=await client.from('account_objects').select('payload,etag').eq('owner_id',ownerId).eq('object_key',key(path)).maybeSingle();if(error)throw error;if(!data)return null;return {etag:data.etag,httpEtag:'"'+data.etag+'"',json:async()=>JSON.parse(data.payload),text:async()=>data.payload};},
 async put(path,payload,{onlyIf}={}){const {data,error}=await client.rpc('write_account_object',{p_key:key(path),p_payload:String(payload),p_expected:onlyIf?.get('If-Match')?.replace(/^"|"$/g,'')||null,p_create_only:onlyIf?.get('If-None-Match')==='*'});if(error)throw error;return data?.[0]?{etag:data[0].etag}:null;}
 };
}
