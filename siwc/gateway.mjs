import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
const folder=path.join(os.homedir(),'AppData','Local','BotPress','siwc');
fs.mkdirSync(folder,{recursive:true});
const hostPath=path.join(folder,'host-id');
const host=fs.existsSync(hostPath)?fs.readFileSync(hostPath,'utf8'):'urn:uuid:'+crypto.randomUUID();
if(!fs.existsSync(hostPath))fs.writeFileSync(hostPath,host);
const auth='https://auth.openai.com/api/accounts',resource='https://api.openai.com/v1';
const callbackUrl='http://127.0.0.1:17455/auth/callback';
const scopes='openid profile email offline_access resource.invoke chatgpt.tokens.use.direct';
let session=null,pending=null;
const rand=()=>crypto.randomBytes(32).toString('base64url');
const reply=(res,code,value)=>{res.writeHead(code,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(value));};
async function exchange(params){
 const r=await fetch(auth+'/oauth/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(params)});
 const j=await r.json();if(!r.ok)throw Error('OAuth '+(j.error||r.status));return j;
}
async function checkId(id,client,nonce){
 const [a,b,c]=id.split('.'),h=JSON.parse(Buffer.from(a,'base64url')),p=JSON.parse(Buffer.from(b,'base64url'));
 const cfg=await (await fetch('https://auth.openai.com/.well-known/openid-configuration')).json();
 const jwks=await (await fetch(cfg.jwks_uri)).json();
 const jwk=jwks.keys.find(x=>x.kid===h.kid&&x.kty==='RSA');
 if(h.alg!=='RS256'||!jwk||!crypto.verify('RSA-SHA256',Buffer.from(a+'.'+b),crypto.createPublicKey({key:jwk,format:'jwk'}),Buffer.from(c,'base64url')))throw Error('Invalid ID token signature');
 if(p.iss!=='https://auth.openai.com')throw Error('ID token issuer mismatch');
 if(!(p.aud===client||(Array.isArray(p.aud)&&p.aud.includes(client))))throw Error('ID token audience mismatch');
 if(p.nonce!==nonce)throw Error('ID token nonce mismatch');
 if(typeof p.exp!=='number'||p.exp*1000<Date.now())throw Error('ID token expired');
 if(!p.sub)throw Error('ID token subject missing');
 return p;
}
function beginLogin(){
 if(pending)throw Error('Sign-in already in progress');
 const state=rand(),nonce=rand(),verifier=rand();pending={state,nonce,verifier};
 const q=new URLSearchParams({client_id:'dynamic_agent_client',agent_name_hint:'BotPress',ext_agent_host_id:host,response_type:'code',redirect_uri:callbackUrl,scope:scopes,resource,state,nonce,code_challenge:crypto.createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'});
 execFile('rundll32.exe',['url.dll,FileProtocolHandler','https://auth.openai.com/api/accounts/authorize?'+q.toString()]);
}
async function complete(url){
 const p=pending;pending=null;const q=url.searchParams;
 if(!p||q.get('state')!==p.state)throw Error('OAuth state mismatch');
 if(q.has('error'))throw Error('OAuth denied: '+q.get('error'));
 const client=q.get('client_id');if(!client||client==='dynamic_agent_client'||!q.get('code'))throw Error('Missing OAuth issued client/code');
 const t=await exchange({grant_type:'authorization_code',client_id:client,code:q.get('code'),code_verifier:p.verifier,redirect_uri:callbackUrl,resource});
 const identity=await checkId(t.id_token,client,p.nonce);
 if(!t.scope?.split(' ').includes('chatgpt.tokens.use.direct'))throw Error('ChatGPT plan not authorized');
 session={client,identity:identity.sub,email:identity.email||null,token:t.access_token,refresh:t.refresh_token,scope:t.scope,expires:Date.now()+t.expires_in*1000};
 return {connected:true,email:session.email};
}
async function access(){
 if(!session)throw Error('Sign-in required');
 if(session.expires<Date.now()+120000){
 const t=await exchange({grant_type:'refresh_token',client_id:session.client,refresh_token:session.refresh,resource});
 session={...session,token:t.access_token,refresh:t.refresh_token,scope:t.scope||session.scope,expires:Date.now()+t.expires_in*1000};
 }return session.token;
}
async function models(){
 const r=await fetch(resource+'/models',{headers:{Authorization:'Bearer '+await access()}});
 if(!r.ok)throw Error('Models HTTP '+r.status);
 return (await r.json()).models?.filter(x=>x.visibility==='list').map(x=>({model:x.slug,label:x.display_name}))||[];
}
async function respondAi(prompt,model){
 const r=await fetch(resource+'/responses',{method:'POST',headers:{Authorization:'Bearer '+await access(),'content-type':'application/json'},body:JSON.stringify({model,input:Array.isArray(prompt)?prompt:[{role:'user',content:String(prompt)}],store:false,stream:true})});
 if(!r.ok)throw Error('Inference HTTP '+r.status+': '+(await r.text()).slice(0,200));
 let buffer='',text='',done=false;
 for await(const chunk of r.body){buffer+=Buffer.from(chunk).toString('utf8').replaceAll('\r\n','\n');let sep;while((sep=buffer.indexOf('\n\n'))!==-1){const event=buffer.slice(0,sep);buffer=buffer.slice(sep+2);for(const line of event.split('\n')){if(!line.startsWith('data: '))continue;let e;try{e=JSON.parse(line.slice(6))}catch{continue};if(e.type==='response.output_text.delta')text+=e.delta||'';if(e.type==='response.completed')done=true;if(e.type==='response.failed')throw Error('Inference failed');}}}
 if(!done)throw Error('Incomplete response stream');return text;
}
const server=http.createServer(async(req,res)=>{try{
 const origin=req.headers.origin;
 if(origin && origin!=='http://127.0.0.1:17455')return reply(res,403,{error:'Cross-origin request rejected'});
 if(req.method==='POST' && req.headers['content-type'] && !req.headers['content-type'].startsWith('application/json'))return reply(res,415,{error:'JSON content type required'});
 if(req.url?.startsWith('/auth/callback')&&req.method==='GET')return reply(res,200,await complete(new URL(req.url,'http://127.0.0.1:17455')));
 if(req.method==='GET'&&req.url==='/status')return reply(res,200,{connected:!!session,email:session?.email||null,planAuthorized:!!session?.scope.includes('chatgpt.tokens.use.direct')});
 if(req.method==='POST'&&req.url==='/login'){beginLogin();return reply(res,200,{started:true});}
 if(req.method==='GET'&&req.url==='/models')return reply(res,200,{models:await models()});
 if(req.method==='POST'&&req.url==='/responses'){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1000000)throw Error('Request too large')};const d=JSON.parse(raw);return reply(res,200,{output:await respondAi(d.input,d.model)});}
 return reply(res,404,{error:'Unknown endpoint'});
 }catch(e){reply(res,400,{error:e.message})}});
server.listen(17455,'127.0.0.1',()=>console.log('BotPress SIWC provider listening on 127.0.0.1:17455'));