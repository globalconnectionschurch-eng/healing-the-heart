import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json } from '../../lib/server';

export const prerender = false;

export const GET: APIRoute = async () => {
  if (!env.DB) return json({ classes: [] });
  const { results } = await env.DB.prepare(`
    SELECT id, type_id, title, description, start_date, end_date, price_cents, capacity, schedule,
           location_name, location_address
    FROM classes
    WHERE end_date >= date('now')
    ORDER BY start_date ASC
  `).all();
  return json({ classes: results });
};
