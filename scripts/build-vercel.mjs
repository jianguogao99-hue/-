import fs from 'node:fs/promises';import {build} from 'esbuild';import {normalizeSupabaseUrl} from '../server/supabase-url.mjs';
const rawUrl=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
if(!rawUrl||!key)throw Error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in Vercel environment variables.');
const url=normalizeSupabaseUrl(rawUrl);
if(!key.startsWith('sb_publishable_')){let claims;try{claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString());}catch{}if(claims?.role!=='anon')throw Error('Only a Supabase publishable/anon key may enter the browser bundle. Never use a secret/service_role key.');}
await fs.rm('web-dist',{recursive:true,force:true});await fs.cp('public','web-dist',{recursive:true});
for(const file of ['index.html','app.js','cloud-account.js']){let source=await fs.readFile('web-dist/'+file,'utf8');source=source.replaceAll('/signin-with-chatgpt?return_to=%2F','/login.html').replaceAll('/signout-with-chatgpt?return_to=%2F','/login.html?logout=1').replaceAll('ChatGPT 账号','个人账号');if(file==='index.html'){source=source.replace(/<script src="app\.js[^>]*><\/script>/,'<script src="/auth-entry.js" defer></script>').replace(/<script src="clean-overlay\.js[^>]*><\/script>/,'');}await fs.writeFile('web-dist/'+file,source);}
let login=await fs.readFile('src/login.html','utf8');login=login.replace(/<script src="\/clean-overlay\.js[^>]*><\/script>/,'');await fs.writeFile('web-dist/login.html',login);await fs.rm('web-dist/clean-overlay.js',{force:true});
await build({entryPoints:['src/auth-supabase.js'],bundle:true,platform:'browser',format:'iife',target:['safari16','chrome110'],outfile:'web-dist/auth-entry.js',minify:true,define:{__SUPABASE_URL__:JSON.stringify(url),__SUPABASE_KEY__:JSON.stringify(key)}});
console.log('Vercel build complete: Supabase email accounts, no Netlify badge-removal code or Netlify Identity client.');
