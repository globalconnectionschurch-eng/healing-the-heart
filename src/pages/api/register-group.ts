import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json, nowIso } from '../../lib/server';
export const prerender = false;
type Person = Record<string, any>;
const field = (p: Person, name: string) => String(p[name] ?? '').trim();
const fields: [string, string][] = [
  ['phone','phone'], ['address','address'], ['dateOfBirth','date_of_birth'],
  ['maritalStatus','marital_status'], ['church','church'], ['srPastor','sr_pastor'],
  ['howHeard','how_heard'], ['goals','goals'], ['smokingDrinking','smoking_drinking'],
  ['anythingElse','anything_else'], ['diagnosis','diagnosis'], ['learningRestrictions','learning_restrictions'],
  ['adopted','adopted'], ['majorTrauma','major_trauma'], ['grief','grief'],
  ['inMinistry','in_ministry'], ['dietaryRestrictions','dietary_restrictions'],
  ['currentCrisis','current_crisis'], ['selfHarmHistory','self_harm_history']
];

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({})) as { classId?: string; code?: string; people?: Person[]; website?: string };
  if (body.website) return json({ error: 'Invalid request.' }, 400);
  const classId = String(body.classId ?? '').trim();
  const people = body.people;
  if (!classId || !Array.isArray(people) || people.length !== 2) return json({error:'Select a class and complete both attendee forms.'},400);
  const names = people.map(p => field(p,'name'));
  const emails = people.map(p => field(p,'email').toLowerCase());
  if (names.some(n=>!n) || emails.some(e=>!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))) || emails[0] === emails[1]) {
    return json({error:'Enter a different valid name and email address for each attendee.'},400);
  }
  try {
    const classRow = await env.DB.prepare("SELECT id,title,price_cents,capacity FROM classes WHERE id=? AND end_date>=date('now')").bind(classId).first<any>();
    if (!classRow) return json({error:'This class is no longer open for registration.'},400);
    const ids: string[] = [];
    const existingRegs: (Record<string, any> | null)[] = [];
    for (let i=0;i<2;i++) {
      const existing = await env.DB.prepare('SELECT id FROM students WHERE lower(email)=?').bind(emails[i]).first<any>();
      const studentId = existing?.id || 'student_' + crypto.randomUUID();
      ids.push(studentId);
      const reg = await env.DB.prepare('SELECT id,payment_status,status,group_id FROM registrations WHERE class_id=? AND student_id=?').bind(classId,studentId).first<any>();
      if (reg?.payment_status === 'paid' || reg?.group_id || reg?.status === 'registered') {
        return json({error:names[i]+' already has a registration for this class. Contact us to make changes.'},409);
      }
      existingRegs.push(reg||null);
    }
    if (classRow.capacity) {
      const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM registrations WHERE class_id=? AND status IN ('registered','pending_payment')").bind(classId).first<{n:number}>();
      const additions = existingRegs.filter(r=>!r).length;
      if (Number(count?.n||0)+additions>Number(classRow.capacity)) return json({error:'Not enough seats remain for two attendees.'},409);
    }
    const code = String(body.code ?? '').trim().toUpperCase();
    let discountId: string|null=null, firstPercent=0, secondPercent=0, groupCoupon=false;
    if (code) {
      const now=nowIso();
      const d = await env.DB.prepare(
        'SELECT d.id,d.student_id,d.percent_off,d.max_uses,d.used_count,g.second_percent_off FROM discounts d LEFT JOIN group_discount_rules g ON g.discount_id=d.id WHERE upper(d.code)=? AND d.active=1 AND (d.starts_at IS NULL OR d.starts_at<=?) AND (d.expires_at IS NULL OR d.expires_at>=?) AND (d.class_id IS NULL OR d.class_id=?)'
      ).bind(code,now,now,classId).first<any>();
      if (!d || d.student_id || (d.max_uses!=null && Number(d.used_count)+((d.second_percent_off!=null)?1:2)>Number(d.max_uses))) {
        return json({error:'That discount is not valid for these two attendees.'},400);
      }
      discountId=String(d.id);
      groupCoupon=d.second_percent_off!=null;
      firstPercent=Number(d.percent_off);
      secondPercent=d.second_percent_off!=null?Number(d.second_percent_off):firstPercent;
    }
    const price = Number(classRow.price_cents||0);
    const itemCents = [firstPercent,secondPercent].map(p=>Math.max(0,price-Math.round(price*p/100)));
    const totalCents=itemCents[0]+itemCents[1];
    const groupId='group_'+crypto.randomUUID();
    const now=nowIso();
    const status=totalCents===0?'paid':'pending';
    const statements=[
      env.DB.prepare('INSERT INTO registration_groups (id,class_id,discount_id,discount_code,original_amount_cents,total_amount_cents,status,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(groupId,classId,discountId,code||null,price*2,totalCents,status,now)
    ];
    for(let i=0;i<2;i++){
      const p=people[i];const values=fields.map(([name])=>name==='currentCrisis'&&Array.isArray(p[name])?p[name].map(String).join(', '):field(p,name));
      const previous=await env.DB.prepare('SELECT id FROM students WHERE id=?').bind(ids[i]).first<any>();
      if(previous){
        const updateFields=fields.map(([,dbName])=>dbName+'=?').join(',');
        statements.push(env.DB.prepare('UPDATE students SET name=?,'+updateFields+',updated_at=? WHERE id=?').bind(names[i],...values,now,ids[i]));
      } else {
        const columns=fields.map(([,dbName])=>dbName);
        const sql='INSERT INTO students (id,name,email,'+columns.join(',')+',created_at,updated_at) VALUES ('+Array(3+columns.length+2).fill('?').join(',')+')';
        statements.push(env.DB.prepare(sql).bind(ids[i],names[i],emails[i],...values,now,now));
      }
      const regId=existingRegs[i]?.id||'registration_'+crypto.randomUUID();
      if(existingRegs[i]){
        statements.push(env.DB.prepare("UPDATE registrations SET group_id=?,source='online',verification_code=?,payment_status=?,status=?,registered_at=?,discount_id=?,discount_percent=?,original_amount_cents=?,discount_amount_cents=?,final_amount_cents=? WHERE id=?")
          .bind(groupId,code||null,totalCents===0?'paid':'pending',totalCents===0?'registered':'pending_payment',now,discountId,i===0?firstPercent:secondPercent,price,price-itemCents[i],itemCents[i],regId));
      }else{
        statements.push(env.DB.prepare('INSERT INTO registrations (id,class_id,student_id,source,verification_code,payment_status,status,registered_at,group_id,discount_id,discount_percent,original_amount_cents,discount_amount_cents,final_amount_cents) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
          .bind(regId,classId,ids[i],'online',code||null,totalCents===0?'paid':'pending',totalCents===0?'registered':'pending_payment',now,groupId,discountId,i===0?firstPercent:secondPercent,price,price-itemCents[i],itemCents[i]));
      }
    }
    if(totalCents===0 && discountId){
      const increment=groupCoupon?1:2;
      statements.push(env.DB.prepare('UPDATE discounts SET used_count=used_count+?,updated_at=? WHERE id=? AND (max_uses IS NULL OR used_count+?<=max_uses)').bind(increment,now,discountId,increment));
    }
    await env.DB.batch(statements);
    return json({ok:true,groupId,paymentRequired:totalCents>0,totalCents},201);
  } catch(err){
    console.error('Group registration failed',err);
    return json({error:'Unable to save both attendees. Please try again.'},500);
  }
};
