import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
export const prerender=false;

async function hashToken(token:string){
  const bytes=new TextEncoder().encode(token);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function ensureColumns(){
  const {results}=await env.DB.prepare(`PRAGMA table_info(students)`).all<any>();
  const names=new Set((results||[]).map((r:any)=>r.name));
  const columns=[
    ['diagnosis','TEXT'],['learning_restrictions','TEXT'],['adopted','TEXT'],['major_trauma','TEXT'],
    ['grief','TEXT'],['in_ministry','TEXT'],['dietary_restrictions','TEXT'],['current_crisis','TEXT'],
    ['self_harm_history','TEXT'],['profile_link_token_hash','TEXT'],['profile_link_created_at','TEXT']
  ];
  for(const [name,type] of columns) if(!names.has(name)) await env.DB.prepare(`ALTER TABLE students ADD COLUMN ${name} ${type}`).run();
}
async function getStudent(token:string){
  if(!token)return null;
  const hash=await hashToken(token);
  return env.DB.prepare(`SELECT id,name,email,diagnosis,learning_restrictions,adopted,major_trauma,grief,in_ministry,dietary_restrictions,current_crisis,self_harm_history FROM students WHERE profile_link_token_hash=?`).bind(hash).first<any>();
}

export const GET: APIRoute=async({url})=>{
  await ensureColumns();
  const student=await getStudent(url.searchParams.get('token')||'');
  if(!student)return new Response(JSON.stringify({error:'This profile link is invalid or has expired.'}),{status:404,headers:{'content-type':'application/json'}});
  return new Response(JSON.stringify({student}),{headers:{'content-type':'application/json'}});
};

export const POST: APIRoute=async({request,url})=>{
  await ensureColumns();
  const token=url.searchParams.get('token')||'';
  const student=await getStudent(token);
  if(!student)return new Response(JSON.stringify({error:'This profile link is invalid or has expired.'}),{status:404,headers:{'content-type':'application/json'}});
  const d=await request.json() as Record<string,any>;
  const values={
    diagnosis:String(d.diagnosis??'').trim(),
    learning_restrictions:String(d.learning_restrictions??'').trim(),
    adopted:String(d.adopted??'').trim(),
    major_trauma:String(d.major_trauma??'').trim(),
    grief:String(d.grief??'').trim(),
    in_ministry:String(d.in_ministry??'').trim(),
    dietary_restrictions:String(d.dietary_restrictions??'').trim(),
    current_crisis:Array.isArray(d.current_crisis)?d.current_crisis.map((v:any)=>String(v).trim()).filter(Boolean).join(', '):String(d.current_crisis??'').trim(),
    self_harm_history:String(d.self_harm_history??'').trim()
  };
  await env.DB.prepare(`UPDATE students SET diagnosis=?,learning_restrictions=?,adopted=?,major_trauma=?,grief=?,in_ministry=?,dietary_restrictions=?,current_crisis=?,self_harm_history=?,updated_at=? WHERE id=?`).bind(values.diagnosis,values.learning_restrictions,values.adopted,values.major_trauma,values.grief,values.in_ministry,values.dietary_restrictions,values.current_crisis,values.self_harm_history,new Date().toISOString(),student.id).run();
  return new Response(JSON.stringify({ok:true}),{headers:{'content-type':'application/json'}});
};
