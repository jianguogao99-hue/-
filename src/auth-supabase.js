import {createClient} from '@supabase/supabase-js';
const client=createClient(__SUPABASE_URL__,__SUPABASE_KEY__,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=s=>document.querySelector(s),loginPage=Boolean($('#authForm'));let session;
async function authHeaders(){const {data,error}=await client.auth.getSession();if(error)throw error;return data.session?{Authorization:'Bearer '+data.session.access_token}:{};}
window.WenjiAuth={headers:authHeaders};
// cloud-account captures fetch before this entry point; its private requests use
// WenjiAuth directly, while direct /api/account calls use this wrapper.
const previousFetch=window.fetch.bind(window);window.fetch=async(input,options={})=>{if(typeof input==='string'&&input.startsWith('/api/'))options={...options,headers:{...Object.fromEntries(new Headers(options.headers||{})),...await authHeaders()}};return previousFetch(input,options);};
async function signOut(){
 document.body.style.visibility='hidden';
 try{
  const {error}=await client.auth.signOut({scope:'local'});
  if(error)throw error;
  location.replace('/login.html');
 }catch(error){
  document.body.style.visibility='';
  throw error;
 }
}
if(loginPage){
 let edge=null;
 document.addEventListener('touchstart',event=>{
  edge=null;
  if(event.touches.length!==1||event.target.closest('input'))return;
  const {clientX:x,clientY:y}=event.touches[0];
  const direction=x<=22?1:x>=document.documentElement.clientWidth-22?-1:0;
  if(direction)edge={x,y,direction};
 },{passive:true});
 document.addEventListener('touchmove',event=>{
  if(!edge||event.touches.length!==1){edge=null;return;}
  const {clientX:x,clientY:y}=event.touches[0];
  const dx=x-edge.x,dy=y-edge.y;
  if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>4){edge=null;return;}
  if(dx*edge.direction>3&&Math.abs(dx)>Math.abs(dy)&&event.cancelable)event.preventDefault();
 },{passive:false});
}else{
 document.addEventListener('click',event=>{
  if(!event.target.closest('a[href="/login.html?logout=1"]'))return;
  event.preventDefault();
  signOut().catch(error=>alert(error.message||'暂时无法退出，请重试'));
 });
 window.addEventListener('pageshow',async event=>{
  if(!event.persisted)return;
  const {data}=await client.auth.getSession();
  if(!data.session){document.body.style.visibility='hidden';location.replace('/login.html');}
 });
}
async function main(){
 if(new URLSearchParams(location.search).has('logout')){await signOut();return;}
 const {data,error}=await client.auth.getSession();if(error)throw error;session=data.session;
 if(!loginPage){if(!session){location.replace('/login.html');return;}client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')location.replace('/login.html');});const script=document.createElement('script');script.src='/app.js?v=ui-fx60';document.body.append(script);return;}
 const params=new URLSearchParams(location.search);
 const recovery=params.has('recovery');
 let mode='login';
 function renderScreen(){
  const requested=new URLSearchParams(location.search).get('mode');
  const open=recovery||requested==='login'||requested==='signup';
  $('#authWelcome').hidden=open;
  $('#authPanel').hidden=!open;
  if(!open)return;
  mode=requested==='signup'?'signup':'login';
  show();
 }
 let leaving=false;
 async function navigate(event){
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||recovery)return;
  event.preventDefault();
  if(leaving)return;
  const link=event.currentTarget;
  const panel=$('#authPanel');
  const returning=link.classList.contains('back');
  const animate=returning&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&typeof panel.animate==='function';
  if(animate){
   leaving=true;
   panel.inert=true;
   const exit=panel.animate([
    {transform:'translateY(0)',opacity:1},
    {transform:'translateY(44px)',opacity:0}
   ],{duration:150,easing:'ease-in',fill:'forwards'});
   try{await exit.finished;}catch{}
   panel.hidden=true;
   exit.cancel();
   panel.inert=false;
   leaving=false;
  }
  history.replaceState(null,'',link.href);
  $('#authStatus').textContent='';
  renderScreen();
  if(animate)$('#authWelcome').animate([
   {opacity:0,transform:'translateY(7px)'},
   {opacity:1,transform:'translateY(0)'}
  ],{duration:240,easing:'ease-out'});
  document.querySelector($('#authPanel').hidden?'#authWelcome h1':'#authHeading')?.focus({preventScroll:true});
 }
 for(const link of document.querySelectorAll('#authWelcome nav a, #authPanel .back'))link.addEventListener('click',navigate);
 window.addEventListener('popstate',renderScreen);
 $('#forgotPassword').hidden=recovery;
 function show(){const registering=mode==='signup';$('#confirmPasswordField').hidden=!registering;$('#authConfirm').required=registering;$('#authPassword').autocomplete=registering||recovery?'new-password':'current-password';$('#authHeading').textContent=recovery?'设置新密码':registering?'创建你的问迹账号':'登录问迹';$('#submitLogin').textContent=recovery?'保存新密码':registering?'注册账号':'登录';$('#signup').textContent=registering?'已有账号？返回登录':'没有账号？注册';$('#signup').hidden=recovery;$('#authEmail').required=!recovery;if(recovery){$('#authEmail').value=session?.user?.email||'';$('#authEmail').readOnly=true;}}
 $('#signup').onclick=()=>{mode=mode==='signup'?'login':'signup';$('#authStatus').textContent='';show();};renderScreen();
 $('#authForm').onsubmit=async e=>{e.preventDefault();if(mode==='signup'&&$('#authPassword').value!==$('#authConfirm').value){$('#authStatus').textContent='两次输入的密码不一致。';return;}$('#submitLogin').disabled=true;$('#signup').disabled=true;$('#authStatus').textContent='正在处理…';try{
 const email=$('#authEmail').value.trim(),password=$('#authPassword').value;let result;
 if(recovery){result=await client.auth.updateUser({password});if(result.error)throw result.error;location.replace('/');return;}
 if(mode==='signup'){await client.auth.signOut();result=await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/login.html'}});}else result=await client.auth.signInWithPassword({email,password});
 if(result.error)throw result.error;if(result.data.session)location.replace('/');else $('#authStatus').textContent='注册请求已提交；若项目启用了邮箱确认，请查收确认邮件后登录。';
 }catch(error){$('#authStatus').textContent=error.message||'暂时无法登录，请稍后重试。';}finally{$('#submitLogin').disabled=false;$('#signup').disabled=false;}};
 $('#forgotPassword').onclick=async()=>{const email=$('#authEmail').value.trim();if(!email){$('#authStatus').textContent='请先填写邮箱';return;}const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/login.html?recovery=1'});$('#authStatus').textContent=error?error.message:'重置邮件已发送，请查看邮箱。';};
}
main().catch(error=>{const status=$('#authStatus')||$('#syncLoadingText');if(status)status.textContent='登录服务暂不可用：'+error.message;});
