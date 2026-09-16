import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminRequest, json, nowIso } from '../../../lib/server';
export const prerender=false;

async function ensureProfileColumns(){
  const {results}=await env.DB.prepare(`PRAGMA table_info(students)`).all<any>();
  const existing=new Set((results||[]).map((r:any)=>r.name));
  const columns=[
    ['diagnosis','TEXT'],['learning_restrictions','TEXT'],['adopted','TEXT'],['major_trauma','TEXT'],
    ['grief','TEXT'],['in_ministry','TEXT'],['dietary_restrictions','TEXT'],['current_crisis','TEXT'],
    ['self_harm_history','TEXT'],['profile_link_token_hash','TEXT'],['profile_link_created_at','TEXT']
  ];
  for(const [name,type] of columns) if(!existing.has(name)) await env.DB.prepare(`ALTER TABLE students ADD COLUMN ${name} ${type}`).run();
}

export const GET: APIRoute=async({request,url})=>{
  if(!(await isAdminRequest(request)))return json({error:'Unauthorized'},401);
  await ensureProfileColumns();
  const q=`%${(url.searchParams.get('q')||'').trim()}%`;
  const {results}=await env.DB.prepare(`SELECT s.*,COUNT(r.id) registration_count,MAX(r.registered_at) last_registered_at FROM students s LEFT JOIN registrations r ON r.student_id=s.id WHERE s.name LIKE ? OR s.email LIKE ? OR COALESCE(s.phone,'') LIKE ? GROUP BY s.id ORDER BY s.name COLLATE NOCASE LIMIT 500`).bind(q,q,q).all<any>();
  return json({students:results});
};

export const PUT: APIRoute=async({request})=>{
  if(!(await isAdminRequest(request)))return json({error:'Unauthorized'},401);
  await ensureProfileColumns();
  const d=await request.json() as Record<string,any>;
  if(!d.id)return json({error:'Student ID is required.'},400);
  await env.DB.prepare(`UPDATE students SET name=?,email=?,phone=?,address=?,date_of_birth=?,marital_status=?,church=?,sr_pastor=?,how_heard=?,goals=?,smoking_drinking=?,anything_else=?,diagnosis=?,learning_restrictions=?,adopted=?,major_trauma=?,grief=?,in_ministry=?,dietary_restrictions=?,current_crisis=?,self_harm_history=?,mass_email_opt_out=?,updated_at=? WHERE id=?`).bind(
    d.name||'',d.email||'',d.phone||'',d.address||'',d.date_of_birth||'',d.marital_status||'',d.church||'',d.sr_pastor||'',d.how_heard||'',d.goals||'',d.smoking_drinking||'',d.anything_else||'',d.diagnosis||'',d.learning_restrictions||'',d.adopted||'',d.major_trauma||'',d.grief||'',d.in_ministry||'',d.dietary_restrictions||'',d.current_crisis||'',d.self_harm_history||'',d.mass_email_opt_out?1:0,nowIso(),d.id
  ).run();
  return json({ok:true});
};
