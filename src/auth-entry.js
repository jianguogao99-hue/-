import {getUser,getSettings,handleAuthCallback,login,signup,logout,oauthLogin,requestPasswordRecovery,updateUser,onAuthChange} from '@netlify/identity';
const $=s=>document.querySelector(s),loginPage=Boolean($('#authForm'));
async function main(){
 if(new URLSearchParams(location.search).has('logout')){await logout();location.replace('/login.html');return;}
 const callback=await handleAuthCallback();
 if(callback?.type==='recovery'){if(!loginPage){location.replace('/login.html#recovery');return;}$('#authPassword').autocomplete='new-password';$('#submitLogin').textContent='设置新密码';$('#signup').hidden=true;$('#authForm').onsubmit=async e=>{e.preventDefault();try{await updateUser({password:$('#authPassword').value});location.replace('/');}catch(error){$('#authStatus').textContent=error.message;}};return;}
 if(loginPage&&location.hash==='#recovery'){if(!await getUser())throw new Error('重置链接已过期，请重新申请。');$('#submitLogin').textContent='设置新密码';$('#signup').hidden=true;$('#authForm').onsubmit=async e=>{e.preventDefault();try{await updateUser({password:$('#authPassword').value});location.replace('/');}catch(error){$('#authStatus').textContent=error.message;}};return;}
 const user=await getUser();
 if(user){if(loginPage){location.replace('/');return;}onAuthChange(event=>{if(event==='logout')location.replace('/login.html');});const script=document.createElement('script');script.src='/app.js';document.body.append(script);return;}
 if(!loginPage){location.replace('/login.html');return;}
 const settings=await getSettings();$('#signup').hidden=settings.disableSignup;
 for(const [name,enabled] of Object.entries(settings.providers)){if(!enabled||name==='email')continue;const button=document.createElement('button');button.type='button';button.textContent='使用 '+({google:'Google',github:'GitHub',gitlab:'GitLab',bitbucket:'Bitbucket',facebook:'Facebook'}[name]||name)+' 登录';button.onclick=()=>oauthLogin(name);$('#oauthButtons').append(button);}
 async function run(action){$('#authStatus').textContent='正在处理…';$('#submitLogin').disabled=true;try{await action();if(await getUser())location.replace('/');else $('#authStatus').textContent='请查收确认邮件，确认后即可登录。';}catch(error){$('#authStatus').textContent=error.message||'登录失败，请重试。';}finally{$('#submitLogin').disabled=false;}}
 $('#authForm').onsubmit=e=>{e.preventDefault();run(()=>login($('#authEmail').value.trim(),$('#authPassword').value));};
 $('#signup').onclick=()=>{if($('#authForm').reportValidity())run(()=>signup($('#authEmail').value.trim(),$('#authPassword').value));};
 $('#forgotPassword').onclick=()=>{const email=$('#authEmail').value.trim();if(!email){$('#authStatus').textContent='请先填写邮箱，再申请重置密码。';return;}run(()=>requestPasswordRecovery(email));};
}
main().catch(error=>{const status=$('#authStatus')||$('#syncLoadingText');if(status)status.textContent='登录服务暂不可用：'+error.message;});
