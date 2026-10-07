import type { APIRoute } from 'astro';
import { json } from '../../../lib/server';

export const prerender = false;

const LEGACY_TOOL_URL = 'https://script.google.com/macros/s/AKfycbyDqwcA1-YQFZiftwxpe0afWKtSCVBO928iva7vOTrwr64CPcgoiQRUpSUt7-wP9paE/exec';
const MAX_INPUT_LENGTH = 250;

export const POST: APIRoute = async ({ request }) => {
  let data: { text?: string };
  try {
    data = await request.json();
  } catch {
    return json({ error: 'Please enter a lie, thought, or brief situation.' }, 400);
  }

  const text = String(data.text ?? '').trim();
  if (!text) return json({ error: 'Please enter a lie, thought, or brief situation.' }, 400);
  if (text.length > MAX_INPUT_LENGTH) {
    return json({ error: `Please keep your response under ${MAX_INPUT_LENGTH} characters.` }, 400);
  }

  try {
    const response = await fetch(LEGACY_TOOL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
      redirect: 'follow'
    });

    const raw = await response.text();
    if (!response.ok) {
      console.error('Lie tool upstream error', response.status, raw.slice(0, 500));
      return json({ error: 'The reflection tool is temporarily unavailable. Please try again.' }, 502);
    }

    let result: unknown;
    try {
      result = JSON.parse(raw);
    } catch {
      console.error('Lie tool returned non-JSON content', raw.slice(0, 500));
      return json({ error: 'The reflection tool returned an unexpected response. Please try again.' }, 502);
    }

    return json(result, 200, { 'cache-control': 'no-store' });
  } catch (error) {
    console.error('Lie tool request failed', error);
    return json({ error: 'The reflection tool is temporarily unavailable. Please try again.' }, 502);
  }
};
