import type { APIRoute } from 'astro';
import { json, sendEmail } from '../../../lib/server';

export const prerender = false;

type Resource = {
  need?: string;
  description?: string;
  scriptures?: string[];
  recommended_practices?: string[];
};

type LieResult = {
  input?: string;
  needs?: string[];
  possible_lies?: string[];
  what_got_touched?: string;
  possible_feelings?: string[];
  suggested_steps?: string[];
  resources?: Resource[];
};

const cleanList = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => String(item ?? '').trim()).filter(Boolean) : [];

export const POST: APIRoute = async ({ request }) => {
  let data: { email?: string; result?: LieResult };
  try {
    data = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  const email = String(data.email ?? '').trim();
  const result = data.result ?? {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Please enter a valid email address.' }, 400);
  }

  const needs = cleanList(result.needs);
  const feelings = cleanList(result.possible_feelings);
  const lies = cleanList(result.possible_lies);
  const steps = cleanList(result.suggested_steps);
  const resources = Array.isArray(result.resources) ? result.resources : [];

  const sections: string[] = [
    'Healing the Heart - Lie to Need Reflection',
    '',
    result.input ? `Your entry:\n${String(result.input).trim()}` : '',
    result.what_got_touched ? `What may have been touched:\n${String(result.what_got_touched).trim()}` : '',
    needs.length ? `Likely emotional need(s):\n${needs.join(', ')}` : '',
    feelings.length ? `Possible feelings:\n${feelings.join(', ')}` : '',
    lies.length ? `Possible lies:\n- ${lies.join('\n- ')}` : '',
    steps.length ? `Suggested next steps:\n${steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}` : ''
  ].filter(Boolean);

  for (const resource of resources) {
    const scriptures = cleanList(resource.scriptures);
    const practices = cleanList(resource.recommended_practices);
    sections.push(
      [
        resource.need ? `Truth for ${String(resource.need).trim()}` : 'Truth for this area',
        resource.description ? String(resource.description).trim() : '',
        scriptures.length ? `Suggested Scriptures:\n- ${scriptures.join('\n- ')}` : '',
        practices.length ? `Recommended Practice:\n- ${practices.join('\n- ')}` : ''
      ].filter(Boolean).join('\n\n')
    );
  }

  sections.push(
    'Use this reflection as a starting point for prayer, journaling, and conversation with a safe facilitator. It is not a diagnosis.'
  );

  const sent = await sendEmail(email, 'Your Healing the Heart reflection', sections.join('\n\n'));
  if (!sent.sent) return json({ error: sent.error ?? 'Your email could not be sent.' }, 502);
  return json({ ok: true });
};
