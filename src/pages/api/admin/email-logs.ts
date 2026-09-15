import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminRequest, json } from '../../../lib/server';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
  const classId = url.searchParams.get('classId');
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 100), 1), 250);
  const query = classId
    ? `SELECT e.*, c.title AS class_title, s.name AS student_name FROM email_logs e LEFT JOIN classes c ON c.id=e.class_id LEFT JOIN students s ON s.id=e.student_id WHERE e.class_id=? ORDER BY e.sent_at DESC LIMIT ${limit}`
    : `SELECT e.*, c.title AS class_title, s.name AS student_name FROM email_logs e LEFT JOIN classes c ON c.id=e.class_id LEFT JOIN students s ON s.id=e.student_id ORDER BY e.sent_at DESC LIMIT ${limit}`;
  const result = classId ? await env.DB.prepare(query).bind(classId).all() : await env.DB.prepare(query).all();
  return json({ logs: result.results });
};
