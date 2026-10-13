const $=id=>document.getElementById(id);
const roles=[
 {id:2,name:'นักข่าว AI',phase:'RESEARCH',task:'เขียนแนวคิดต้นฉบับข่าว/บทความที่น่าสนใจ พร้อมแผนดำเนินการที่เป็นไปได้ เน้นกรณีตัวอย่างและแบ่งส่วนที่เป็นข้อเสนอ/ข้อเท็จจริง ตอบไม่เกิน 350 คำ'},
 {id:1,name:'หัวหน้าข่าว',phase:'STRATEGY',task:'อ่านงานจากนักข่าว AI แล้ววางแผน workflow การผลิตข่าว: มอบหมายหน้าที่ ระบุข้อควรระวัง เกณฑ์คุณภาพ และ 3 ขั้นตอนที่ทำได้จริง ตอบไม่เกิน 300 คำ'},
 {id:10,name:'ผู้ตรวจข่าว 1',phase:'FACT CHECK',task:'ตรวจสอบเชิงตรรกะอย่างเข้มงวดจากเนื้อหาที่มีอยู่: ระบุส่วนที่ยังไม่มีแหล่งอ้างอิงหรือยังยืนยันไม่ได้ ห้ามอ้างว่ามีการตรวจสอบเว็บแล้ว เสนอ checklist ก่อนเผยแพร่ ตอบไม่เกิน 250 คำ'},
 {id:0,name:'บก.บห.',phase:'EDITOR',task:'จัดทำ executive summary ฉบับส่งหัวหน้า 1 หน้า เน้นข้อเสนอน่าใช้จริง กำกับข้อเท็จจริงที่ยังไม่ตรวจสอบ และเน้นว่าต้องให้คนอนุมัติก่อนเผยแพร่ อย่าเผยแพร่จริง ตอบไม่เกิน 350 คำ'}
];
let busy=false,log=[],startAt=null,tm=null;
async function api(path,data){const r=await fetch('/api/'+path,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const body=await r.json();if(!r.ok)throw Error(body.error||'API request failed');return body}
function clock(){if(startAt===null)return;const sec=Math.floor((Date.now()-startAt)/1000);$('clock').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}
function stage(i,state,text){const el=$('stage'+i);el.className='stage '+state;$('status'+i).textContent=text}
function renderFeed(){const root=$('results');root.replaceChildren();for(const [i,item] of log.entries()){const section=document.createElement('div');section.className='result-card'+(i===3?' final':'');const head=document.createElement('div');head.className='result-header';const who=document.createElement('span');who.textContent=String(i+1).padStart(2,'0')+' / '+item.name+' — '+item.phase;const tag=document.createElement('span');tag.className='tag';tag.textContent='✓ VERIFIED MODEL OUTPUT';head.append(who,tag);const content=document.createElement('div');content.className='result-body';content.textContent=item.response;section.append(head,content);root.append(section)}root.scrollTop=root.scrollHeight}
function status(text,color){$('progress').textContent=text;if(color)$('progress').style.color=color}
async function setup(){try{const st=await api('status');if(!st.connected||!st.planAuthorized)throw Error('NOT AUTHORIZED');$('auth-label').textContent='● CONNECTED / SIWC';$('auth-label').classList.add('good');const models=(await api('models')).models||[];const current=(await api('state')).model;const menu=$('model');menu.replaceChildren();for(const m of models){const opt=document.createElement('option');opt.value=m.model;opt.textContent=m.label||m.model;menu.append(opt)}menu.value=models.some(x=>x.model===current)?current:(models.some(x=>x.model==='gpt-6-sol')?'gpt-6-sol':models[0]?.model||'');if(!menu.value)throw Error('NO AVAILABLE MODEL');if(new URL(location.href).searchParams.get('autorun')==='1')setTimeout(run,1200)}catch(e){$('auth-label').textContent='● '+e.message;status('SIGN IN REQUIRED','#ff848e')}}
async function run(){if(busy)return;busy=true;log=[];startAt=Date.now();tm=setInterval(clock,1000);$('run').disabled=true;$('run').textContent='MISSION IN PROGRESS';$('requests').textContent='0';$('results').innerHTML='<div class="placeholder"><span class="spin">✦</span><strong>AI PIPELINE ACTIVE</strong><p>Waiting for the first real model response...</p></div>';roles.forEach((_,i)=>stage(i,'','WAITING'));
const topic=$('topic').value.trim();if(!topic){status('MISSION REQUIRED','#fa9');busy=false;$('run').disabled=false;clearInterval(tm);return}
try{
 await api('model',{model:$('model').value});let previous='';
 for(let i=0;i<roles.length;i++){const role=roles[i];stage(i,'running','● THINKING...');status('RUNNING STAGE '+String(i+1).padStart(2,'0')+' / 04');
 const message='หัวข้อภารกิจ: '+topic+'\n\nบทบาทของคุณ: '+role.task+'\n\n'+(previous?'ข้อมูลจากขั้นตอนก่อนหน้า (ใช้ประเมิน ไม่ต้องอ้างว่าได้ตรวจเว็บ):\n'+previous.slice(0,5500):'ยังไม่มีข้อมูลจากขั้นตอนอื่น ห้ามสร้างข่าวจริงและห้ามอ้างว่าตรวจข้อมูลภายนอกแล้ว');
 const answer=await api('chat',{agent:role.id,text:message});
 previous=answer.answer;log.push({name:role.name,phase:role.phase,response:answer.answer});$('requests').textContent=String(log.length);stage(i,'done','✓ COMPLETED');renderFeed();
 }status('● MISSION COMPLETE','#60e0a8');$('output-note').textContent='— 4 live model responses';
}catch(e){const current=log.length;stage(current,'fail','✕ FAILED');status('ERROR: '+e.message,'#ff8585');$('output-note').textContent='— interrupted at stage '+(current+1)}
finally{busy=false;clearInterval(tm);clock();$('run').disabled=false;$('run').textContent='↻ RUN NEW MISSION'}
}
$('run').addEventListener('click',run);
$('copy').addEventListener('click',()=>{const last=log.at(-1);if(last)navigator.clipboard.writeText(last.response).then(()=>{$('copy').textContent='COPIED ✓';setTimeout(()=>$('copy').textContent='COPY FINAL RESULT ↗',2000)}).catch(()=>alert('Copy not permitted'))});
setup();