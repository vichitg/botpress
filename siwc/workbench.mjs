import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const root=path.join(os.homedir(),'AppData','Local','BotPress','siwc');
fs.mkdirSync(root,{recursive:true});
const dataFile=path.join(root,'workbench.json');
const agents=['บก.บห.','หัวหน้าข่าว','นักข่าว AI','นักข่าว Gadget','นักข่าวซอฟต์แวร์','นักข่าวสตาร์ทอัพ','นักข่าวไซเบอร์','นักข่าวเกม','นักข่าวคลาวด์','นักข่าวนโยบายเทค','ผู้ตรวจข่าว 1','ผู้ตรวจข่าว 2','บก.ต้นฉบับ','ฝ่ายโซเชียล','ฝ่ายภาพ'];
const roles=['บรรณาธิการบริหาร คุมทิศทาง กำกับความถูกต้อง และขออนุมัติก่อนเผยแพร่','หัวหน้าข่าว จัดลำดับงานและประสานทีม','นักข่าว AI วิเคราะห์เทคโนโลยี AI','นักข่าวอุปกรณ์เทคโนโลยี','นักข่าวซอฟต์แวร์','นักข่าวธุรกิจสตาร์ทอัพ','นักข่าวความปลอดภัยไซเบอร์','นักข่าวเกม','นักข่าวคลาวด์','นักข่าวนโยบายเทคโนโลยี','ผู้ตรวจสอบข้อเท็จจริงและแหล่งอ้างอิง','ผู้ตรวจสอบข้อเท็จจริงและแหล่งอ้างอิง','บรรณาธิการต้นฉบับปรับภาษา','ผู้ดูแลโพสต์โซเชียล','นักวางคอนเซ็ปต์ภาพประกอบ'];
const rooms=[{name:'ห้องข่าว 1',members:[0,1,2,3,4,5]},{name:'ห้องข่าว 2',members:[0,1,6,7,8,9]},{name:'ห้องตรวจ-ผลิต',members:[1,10,11,12,13,14]}];
const base={agents:agents.map((name,i)=>({id:i,name,role:roles[i]})),rooms,threads:{},model:'',tasks:[],approvals:[]};
let data;try{data={...base,...JSON.parse(fs.readFileSync(dataFile,'utf8'))}}catch{data=base}
const save=()=>{const tmp=dataFile+'.tmp';fs.writeFileSync(tmp,JSON.stringify(data,null,2));fs.renameSync(tmp,dataFile)};
const send=(res,code,obj)=>{res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(obj))};
const html=fs.readFileSync(new URL('./workbench.html',import.meta.url));
const css=fs.readFileSync(new URL('./style.css',import.meta.url));
const clientJs=fs.readFileSync(new URL('./client.js',import.meta.url));
const showcaseHtml=fs.readFileSync(new URL('./showcase.html',import.meta.url));
const showcaseCss=fs.readFileSync(new URL('./showcase.css',import.meta.url));
const showcaseJs=fs.readFileSync(new URL('./showcase.js',import.meta.url));
const safe=async(req)=>{let s='';for await(const c of req){s+=c;if(s.length>160000)throw Error('Request too large')}return JSON.parse(s||'{}')};
const gateway='http://127.0.0.1:17455';
async function proxy(route,method='GET',body){const r=await fetch(gateway+route,{method,headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok)throw Error(j.error||'Gateway unavailable');return j}
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1:17456');
 if(req.method==='GET'&&url.pathname==='/'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'self'; style-src 'unsafe-inline' 'self'; script-src 'self'; connect-src 'self'"});res.end(html);return}
 if(req.method==='GET'&&url.pathname==='/style.css'){res.writeHead(200,{'content-type':'text/css; charset=utf-8','cache-control':'no-store'});res.end(css);return}
 if(req.method==='GET'&&url.pathname==='/client.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'});res.end(clientJs);return}
 if(req.method==='GET'&&url.pathname==='/showcase'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'"});res.end(showcaseHtml);return}
 if(req.method==='GET'&&url.pathname==='/showcase.css'){res.writeHead(200,{'content-type':'text/css; charset=utf-8','cache-control':'no-store'});res.end(showcaseCss);return}
 if(req.method==='GET'&&url.pathname==='/showcase.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'});res.end(showcaseJs);return}
 if(req.method==='GET'&&url.pathname==='/api/state')return send(res,200,data);
 if(req.method==='GET'&&url.pathname==='/api/status')return send(res,200,await proxy('/status'));
 if(req.method==='GET'&&url.pathname==='/api/models')return send(res,200,await proxy('/models'));
 if(req.method==='POST'&&req.headers.origin && req.headers.origin!=='http://127.0.0.1:17456')return send(res,403,{error:'Origin blocked'});
 if(req.method==='POST'&&url.pathname==='/api/login')return send(res,200,await proxy('/login','POST',{}));
 if(req.method==='POST'&&url.pathname==='/api/model'){const b=await safe(req);if(typeof b.model!=='string'||b.model.length>100)throw Error('Invalid model');data.model=b.model;save();return send(res,200,{ok:true})}
 if(req.method==='POST'&&url.pathname==='/api/chat'){
   const b=await safe(req);if(!Number.isInteger(b.agent)||b.agent<0||b.agent>=agents.length||typeof b.text!=='string'||!b.text.trim()||b.text.length>12000)throw Error('Invalid chat request');
   if(!data.model)throw Error('Select an authorized model first');
   const id=String(b.agent),history=Array.isArray(data.threads[id])?data.threads[id]:[];
   const prompt=[{role:'developer',content:'คุณเป็นสมาชิกทีมงาน BotPress ตอบเป็นภาษาไทยตามความเหมาะสม บทบาท: '+roles[b.agent]+' ห้ามอ้างว่าค้นเว็บหรือใช้เครื่องมือ หากไม่ได้รับผลจากเครื่องมือจริง ห้ามเผยแพร่ ส่งอีเมล หรือเปลี่ยนแปลงข้อมูลจริง'},...history.slice(-16).map(x=>({role:x.role,content:x.text})),{role:'user',content:b.text}];
   const out=await proxy('/responses','POST',{model:data.model,input:prompt});
   if(typeof out.output!=='string')throw Error('Invalid model output');
   history.push({role:'user',text:b.text,at:new Date().toISOString()},{role:'assistant',text:out.output,at:new Date().toISOString()});
   data.threads[id]=history.slice(-100);save();return send(res,200,{answer:out.output,history:data.threads[id]});
 }
 if(req.method==='POST'&&url.pathname==='/api/clear'){const b=await safe(req);if(!Number.isInteger(b.agent)||b.agent<0||b.agent>=agents.length)throw Error('Invalid agent');delete data.threads[String(b.agent)];save();return send(res,200,{ok:true})}
 send(res,404,{error:'Not found'});
 }catch(e){send(res,400,{error:e.message})}});
server.listen(17456,'127.0.0.1',()=>console.log('BotPress ChatGPT Workbench http://127.0.0.1:17456'));