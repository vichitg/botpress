// 9Router connection; only the local gateway is trusted.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const base = 'http://127.0.0.1:20128';
const timeout = 90000;
const keyFile=path.join(os.homedir(),'AppData','Local','BotPress','siwc','9router-api-key.txt');
function apiKey(){return (process.env.BOTPRESS_9ROUTER_API_KEY||(fs.existsSync(keyFile)?fs.readFileSync(keyFile,'utf8').trim():''));}
export function nineConfigured(){return !!apiKey();}
export async function nineModels(){
 const r=await fetch(base+'/v1/models',{signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw Error('9Router models HTTP '+r.status);
 const j=await r.json();
 return (j.data||[]).filter(x=>typeof x.id==='string').map(x=>({model:x.id,label:x.id}));
}
export async function nineReply(input,model){
 const key=apiKey();if(!key)throw Error('9Router API key missing. Save dashboard API key to %LOCALAPPDATA%\\BotPress\\siwc\\9router-api-key.txt');
 const messages=input.map(x=>({role:x.role==='developer'?'system':x.role,content:x.content}));
 const r=await fetch(base+'/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({model,messages,stream:false}),signal:AbortSignal.timeout(timeout)});
 if(!r.ok){const body=(await r.text()).slice(0,300);throw Error('9Router HTTP '+r.status+': '+body)}
 const out=await r.json();
 const content=out.choices?.[0]?.message?.content;
 if(typeof content!=='string')throw Error('9Router returned no text response');
 return content;
}
