import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
const root=path.join(os.homedir(),'AppData','Local','BotPress','siwc','stories');
fs.mkdirSync(root,{recursive:true});
export const storyPrompt='Return only a JSON object with title, subtitle, category, summary, takeaways (array of strings), sections (array of heading and body objects), flow (array of title and detail objects), risks (array), recommendation, and videoScript. Write a beautiful, comprehensive Thai editorial feature with at least five strong sections and four workflow steps. Distinguish proposals from established facts. Do not invent sources or statistics. No markdown fences.';
export function normalize(x,meta={}){if(typeof x==='string')x=JSON.parse(x.replace(/^```json\s*/,'').replace(/```$/,'').trim());if(!x.title||!Array.isArray(x.sections)||x.sections.length<3)throw Error('Incomplete story');return {...x,id:crypto.randomUUID(),provider:meta.provider||'chatgpt',model:meta.model||'',status:'draft-needs-approval',createdAt:new Date().toISOString()};}
export function save(s){const f=path.join(root,s.id+'.json');fs.writeFileSync(f,JSON.stringify(s,null,2),'utf8');return s;}
export function load(id){if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid story ID');return JSON.parse(fs.readFileSync(path.join(root,id+'.json'),'utf8'));}
export function list(){return fs.readdirSync(root).filter(f=>f.endsWith('.json')).map(f=>{try{let s=load(f.slice(0,-5));return{id:s.id,title:s.title,createdAt:s.createdAt,status:s.status}}catch{return null}}).filter(Boolean).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
