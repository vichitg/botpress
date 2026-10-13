const $=id=>document.getElementById(id);
let state=null,selected=2,connected=false,busy=false;
const api=async(path,data)=>{
 const r=await fetch('/api/'+path,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 const text=await r.text();let json;try{json=JSON.parse(text)}catch{throw Error(text.slice(0,200))}
 if(!r.ok)throw Error(json.error||'Request failed');return json;
};
function bubble(role,content){
 const box=document.createElement('div');box.className='message '+(role==='user'?'user':'assistant');
 const header=document.createElement('div');header.className='sender';header.textContent=role==='user'?'คุณ':state.agents[selected].name;
 const text=document.createElement('div');text.textContent=content;box.append(header,text);$('chat-history').append(box);
}
function renderChat(){
 const agent=state.agents[selected];$('agent-name').textContent=agent.name;$('agent-role').textContent=agent.role;$('avatar').textContent=agent.name.slice(0,2);
 $('agent-list').replaceChildren();state.agents.forEach((a,i)=>{
  const b=document.createElement('button');b.className='agent'+(selected===i?' active':'');b.type='button';
  const icon=document.createElement('div');icon.className='aicon';icon.textContent=String(i+1);
  const label=document.createElement('span');label.textContent=a.name;b.append(icon,label);
  b.onclick=()=>{selected=i;renderChat()};$('agent-list').append(b);
 });
 $('chat-history').replaceChildren();
 const records=state.threads[String(selected)]||[];
 if(!records.length){
  const intro=document.createElement('div');intro.className='empty';intro.innerHTML='<div class="empty-glyph">✧</div><h2>เริ่มสนทนากับ AI Agent</h2><p>พิมพ์ข้อความด้านล่างเพื่อสาธิต Responses API ผ่าน SIWC จริง</p>';
  $('chat-history').append(intro);
 }else records.forEach(x=>bubble(x.role,x.text));
 $('chat-history').scrollTop=$('chat-history').scrollHeight;
 updateButtons();
}
function updateButtons(){
 $('send').disabled=busy||!connected||!state?.model;
 $('send').textContent=busy?'กำลังตอบ…':'ส่งข้อความ ↗';
 $('prompt').disabled=busy;
}
async function check(){
 try{
  const s=await api('status');connected=s.connected&&s.planAuthorized;
  $('connection').textContent=connected?'● ChatGPT authorized':'● Not connected';$('connection').className='state '+(connected?'connected':'error');
  $('signin').hidden=connected;
  if(connected){
   const m=await api('models');const select=$('model');select.replaceChildren();
   for(const a of m.models){const option=document.createElement('option');option.value=a.model;option.textContent=a.label||a.model;select.append(option)}
   if(!state.model&&!m.models.length)throw Error('No eligible models');
   if(!m.models.some(m=>m.model===state.model))state.model=m.models.find(m=>m.model==='gpt-6-sol')?.model||m.models[0].model;
   select.value=state.model;await api('model',{model:state.model});
  }
 }catch(e){connected=false;$('connection').textContent='● '+e.message;$('connection').className='state error'}
 updateButtons();
}
$('signin').onclick=async()=>{try{await api('login',{});$('connection').textContent='Complete sign-in in browser';setTimeout(check,10000)}catch(e){alert(e.message)}};
$('model').onchange=async()=>{try{state.model=$('model').value;await api('model',{model:state.model});updateButtons()}catch(e){alert(e.message)}};
$('clear').onclick=async()=>{if(!confirm('ล้างประวัติสนทนาของบอทนี้?'))return;try{await api('clear',{agent:selected});delete state.threads[String(selected)];renderChat()}catch(e){alert(e.message)}};
$('prompt').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('chat-form').requestSubmit()}};
$('chat-form').onsubmit=async(e)=>{
 e.preventDefault();const input=$('prompt').value.trim();if(!input||busy||!connected||!state.model)return;
 busy=true;$('prompt').value='';const agent=selected;renderChat();bubble('user',input);updateButtons();
 try{const result=await api('chat',{agent,text:input});state.threads[String(agent)]=result.history;if(selected===agent)renderChat()}
 catch(err){if(selected===agent)bubble('assistant','⚠ '+err.message);$('prompt').value=input}
 finally{busy=false;updateButtons()}
};
(async()=>{try{state=await api('state');renderChat();await check()}catch(e){$('connection').textContent=e.message;$('connection').className='state error'}})();
setInterval(()=>{if(!connected)check().catch(()=>{})},12000);
