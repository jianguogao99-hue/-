import {randomUUID} from 'node:crypto';
// A per-request adapter. The authenticated identity supplies accountId and prefix;
// neither can be selected by a request parameter or body field.
export function accountStore(pool,accountId,prefix){
 function key(path){if(path==='__health_probe')return path;if(!path.startsWith(prefix))throw new Error('Account path rejected');return path.slice(prefix.length);}
 return {
 async get(path){const objectKey=key(path);const {rows}=await pool.query('SELECT payload, etag FROM account_objects WHERE account_id=$1 AND object_key=$2',[accountId,objectKey]);const item=rows[0];if(!item)return null;return {etag:item.etag,httpEtag:'"'+item.etag+'"',json:async()=>JSON.parse(item.payload),text:async()=>item.payload};},
 async put(path,payload,{onlyIf}={}){const objectKey=key(path),etag=randomUUID(),match=onlyIf?.get('If-Match'),none=onlyIf?.get('If-None-Match');let result;if(match){result=await pool.query('UPDATE account_objects SET payload=$3, etag=$4, updated_at=NOW() WHERE account_id=$1 AND object_key=$2 AND etag=$5 RETURNING etag',[accountId,objectKey,String(payload),etag,match.replace(/^"|"$/g,'')]);}else if(none==='*'){result=await pool.query('INSERT INTO account_objects (account_id,object_key,payload,etag) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING etag',[accountId,objectKey,String(payload),etag]);}else{result=await pool.query('INSERT INTO account_objects (account_id,object_key,payload,etag) VALUES ($1,$2,$3,$4) ON CONFLICT (account_id,object_key) DO UPDATE SET payload=EXCLUDED.payload, etag=EXCLUDED.etag, updated_at=NOW() RETURNING etag',[accountId,objectKey,String(payload),etag]);}return result.rows[0]?{etag:result.rows[0].etag}:null;}
 };
}
