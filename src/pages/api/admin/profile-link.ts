import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminRequest, json } from '../../../lib/server';
export const prerender=false;

async function hashToken(token:string){
  const bytes=new TextEncoder().encode(token);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function ensureColumns(){
  const {results}=await env.DB.prepare(`PRAGMA table_info(students)`).all<any>();
  const names=new Set((results||[]).map((r:any)=>r.name));
  if(!names.has('profile_link_token_hash')) await env.DB.prepare(`ALTER TABLE students ADD COLUMN profile_link_token_hash TEXT`).run();
  if(!names.has('profile_link_created_at')) await env.DB.prepare(`ALTER TABLE students ADD COLUMN profile_link_created_at TEXT`).run();
}

export const POST: APIRoute=async({request,url})=>{
  if(!(await isAdminRequest(request)))return json({error:'Unauthorized'},401);
  await ensureColumns();
  const body=await request.json() as {studentId?:string};
  if(!body.studentId)return json({error:'Student ID is required.'},400);
  const student=await env.DB.prepare(`SELECT id,name,email FROM students WHERE id=?`).bind(body.studentId).first<any>();
  if(!student)return json({error:'Student not found.'},404);
  const token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
  const hash=await hashToken(token);
  const created=new Date().toISOString();
  await env.DB.prepare(`UPDATE students SET profile_link_token_hash=?,profile_link_created_at=?,updated_at=? WHERE id=?`).bind(hash,created,created,student.id).run();
  const origin=url.origin;
  return json({ok:true,url:`${origin}/profile-complete?token=${encodeURIComponent(token)}`,email:student.email||'',name:student.name||''});
};
