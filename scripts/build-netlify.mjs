import fs from 'node:fs/promises';import {build} from 'esbuild';
await fs.rm('web-dist',{recursive:true,force:true});await fs.cp('public','web-dist',{recursive:true});
for(const file of ['index.html','app.js','cloud-account.js']){let source=await fs.readFile('web-dist/'+file,'utf8');source=source.replaceAll('/signin-with-chatgpt?return_to=%2F','/login.html').replaceAll('/signout-with-chatgpt?return_to=%2F','/login.html?logout=1').replaceAll('ChatGPT 账号','个人账号');if(file==='index.html')source=source.replace(/<script src="app\.js[^>]*><\/script>/,'<script src="/auth-entry.js" defer></script>');await fs.writeFile('web-dist/'+file,source);}
await fs.copyFile('src/login.html','web-dist/login.html');
await build({entryPoints:['src/auth-entry.js'],bundle:true,platform:'browser',format:'iife',target:['safari16','chrome110'],outfile:'web-dist/auth-entry.js',minify:true});
console.log('Netlify frontend built. API functions and database migrations are bundled separately by Netlify.');
