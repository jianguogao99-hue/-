import {createClient} from '@supabase/supabase-js';
const client=createClient(__SUPABASE_URL__,__SUPABASE_KEY__,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=s=>document.querySelector(s),loginPage=Boolean($('#authForm'));let session;
async function authHeaders(){const {data,error}=await client.auth.getSession();if(error)throw error;return data.session?{Authorization:'Bearer '+data.session.access_token}:{};}
window.WenjiAuth={headers:authHeaders};
// cloud-account captures fetch before this entry point; its private requests use
// WenjiAuth directly, while direct /api/account calls use this wrapper.
const previousFetch=window.fetch.bind(window);window.fetch=async(input,options={})=>{if(typeof input==='string'&&input.startsWith('/api/'))options={...options,headers:{...Object.fromEntries(new Headers(options.headers||{})),...await authHeaders()}};return previousFetch(input,options);};
async function main(){
 if(new URLSearchParams(location.search).has('logout')){await client.auth.signOut();location.replace('/login.html');return;}
 const {data,error}=await client.auth.getSession();if(error)throw error;session=data.session;
 if(!loginPage){if(!session){location.replace('/login.html');return;}client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')location.replace('/login.html');});const script=document.createElement('script');script.src='/app.js';document.body.append(script);return;}
 let mode=new URLSearchParams(location.search).get('mode')==='signup'?'signup':'login';const recovery=new URLSearchParams(location.search).has('recovery');
 function show(){const registering=mode==='signup';$('#confirmPasswordField').hidden=!registering;$('#authConfirm').required=registering;$('#authPassword').autocomplete=registering||recovery?'new-password':'current-password';$('#authHeading').textContent=recovery?'设置新密码':registering?'创建你的问迹账号':'登录问迹';$('#submitLogin').textContent=recovery?'保存新密码':registering?'注册账号':'登录';$('#signup').textContent=registering?'已有账号？返回登录':'没有账号？注册';$('#signup').hidden=recovery;$('#authEmail').required=!recovery;if(recovery){$('#authEmail').value=session?.user?.email||'';$('#authEmail').readOnly=true;}}
 $('#signup').onclick=()=>{mode=mode==='signup'?'login':'signup';$('#authStatus').textContent='';show();};show();
 $('#authForm').onsubmit=async e=>{e.preventDefault();if(mode==='signup'&&$('#authPassword').value!==$('#authConfirm').value){$('#authStatus').textContent='两次输入的密码不一致。';return;}$('#submitLogin').disabled=true;$('#signup').disabled=true;$('#authStatus').textContent='正在处理…';try{
 const email=$('#authEmail').value.trim(),password=$('#authPassword').value;let result;
 if(recovery){result=await client.auth.updateUser({password});if(result.error)throw result.error;location.replace('/');return;}
 if(mode==='signup'){await client.auth.signOut();result=await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/login.html'}});}else result=await client.auth.signInWithPassword({email,password});
 if(result.error)throw result.error;if(result.data.session)location.replace('/');else $('#authStatus').textContent='注册请求已提交；若项目启用了邮箱确认，请查收确认邮件后登录。';
 }catch(error){$('#authStatus').textContent=error.message||'暂时无法登录，请稍后重试。';}finally{$('#submitLogin').disabled=false;$('#signup').disabled=false;}};
 $('#forgotPassword').onclick=async()=>{const email=$('#authEmail').value.trim();if(!email){$('#authStatus').textContent='请先填写邮箱。';return;}const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/login.html?recovery=1'});$('#authStatus').textContent=error?error.message:'重置邮件已发送，请查看邮箱。';};
}
main().catch(error=>{const status=$('#authStatus')||$('#syncLoadingText');if(status)status.textContent='登录服务暂不可用：'+error.message;});
