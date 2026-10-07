import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json } from '../../../lib/server';
import {
  NEED_DESCRIPTIONS,
  VALID_NEEDS,
  buildSuggestedSteps,
  getNeedResource,
  toValidNeed,
  uniqueClean,
  type EmotionalNeed
} from '../../../data/lie-tool';

export const prerender = false;

const MAX_INPUT_LENGTH = 250;
const DEFAULT_MODEL = 'gpt-4o-mini';

type AiAnalysis = {
  needs?: unknown[];
  possible_lies?: unknown[];
  what_got_touched?: unknown;
  possible_feelings?: unknown[];
  grief_needed?: unknown;
};

function extractAssistantText(payload: any) {
  return payload?.choices?.[0]?.message?.content ?? '';
}

function safeJsonParse(text: string) {
  const clean = String(text ?? '').trim();
  try {
    return JSON.parse(clean);
  } catch {}

  const match = clean.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {}
  }
  throw new Error('Could not parse the analysis response.');
}

function buildPrompt(userText: string) {
  return `
A person will describe an emotional trigger, event, or lie.

This tool follows the Healing the Heart ministry flow:
- identify what got touched
- identify likely unmet need(s)
- identify possible lies believed
- encourage forgiveness
- encourage renouncing lies
- encourage repenting of sinful responses like judgments and inner vows
- encourage grieving losses when appropriate
- keep language simple, brief, pastoral, and easy to follow
- do NOT overstate things with certainty

Use these exact emotional need definitions when deciding the best fit:

Acceptance:
${NEED_DESCRIPTIONS.Acceptance}

Affection:
${NEED_DESCRIPTIONS.Affection}

Attention:
${NEED_DESCRIPTIONS.Attention}

Affirmation:
${NEED_DESCRIPTIONS.Affirmation}

Security:
${NEED_DESCRIPTIONS.Security}

Comfort:
${NEED_DESCRIPTIONS.Comfort}

Encouragement:
${NEED_DESCRIPTIONS.Encouragement}

Support:
${NEED_DESCRIPTIONS.Support}

Appreciation:
${NEED_DESCRIPTIONS.Appreciation}

Respect:
${NEED_DESCRIPTIONS.Respect}

Return ONLY valid JSON in this exact structure:
{
  "needs": ["Appreciation", "Affirmation"],
  "possible_lies": [
    "My efforts go unnoticed.",
    "I am not valued.",
    "No one sees what I do.",
    "What I do does not matter.",
    "I am only noticed when I fail."
  ],
  "what_got_touched": "Feeling unseen and unvalued after effort was overlooked.",
  "possible_feelings": ["hurt", "rejected", "discouraged"],
  "grief_needed": true
}

Rules:
- choose only 1 or 2 needs from these exact names:
  ${VALID_NEEDS.join(', ')}
- return exactly 5 possible lies
- "what_got_touched" must be one short sentence
- return 2 to 4 "possible_feelings"
- keep feelings to single words or very short phrases
- "grief_needed" must be true or false
- base the needs on the definitions above, not just the words in the incident
- do not claim certainty
- do not diagnose
- do not include markdown
- do not include explanations outside the JSON

User incident:
${userText}
`.trim();
}

export const POST: APIRoute = async ({ request }) => {
  let data: { text?: string };
  try {
    data = await request.json();
  } catch {
    return json({ error: 'Please enter a lie, thought, or brief situation.' }, 400);
  }

  const userText = String(data.text ?? '').trim();
  if (!userText) return json({ error: 'Please enter a lie, thought, or brief situation.' }, 400);
  if (userText.length > MAX_INPUT_LENGTH) {
    return json({ error: `Please keep your response under ${MAX_INPUT_LENGTH} characters.` }, 400);
  }

  if (!env.OPENAI_API_KEY) {
    return json({ error: 'The reflection tool is not configured yet.' }, 503);
  }

  const model = env.OPENAI_MODEL || DEFAULT_MODEL;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You identify unmet emotional needs and likely lies from personal incidents using a Healing the Heart style ministry flow. Return only valid JSON.'
          },
          {
            role: 'user',
            content: buildPrompt(userText)
          }
        ]
      })
    });

    const raw = await response.text();
    if (!response.ok) {
      console.error('OpenAI Lie to Need error', response.status, raw.slice(0, 800));
      return json({ error: 'The reflection tool is temporarily unavailable. Please try again.' }, 502);
    }

    const payload = JSON.parse(raw);
    const assistantText = extractAssistantText(payload);
    if (!assistantText) throw new Error('OpenAI returned no content.');

    const ai = safeJsonParse(assistantText) as AiAnalysis;

    const needs = uniqueClean(
      (Array.isArray(ai.needs) ? ai.needs : [])
        .map((need) => toValidNeed(need))
        .filter(Boolean) as EmotionalNeed[]
    ).map((need) => toValidNeed(need)).filter(Boolean).slice(0, 2) as EmotionalNeed[];

    const possibleLies = uniqueClean(Array.isArray(ai.possible_lies) ? ai.possible_lies : []).slice(0, 5);
    const possibleFeelings = uniqueClean(Array.isArray(ai.possible_feelings) ? ai.possible_feelings : []).slice(0, 4);
    const whatGotTouched = String(ai.what_got_touched ?? '').trim();
    const griefNeeded = ai.grief_needed === true;

    const result = {
      input: userText,
      needs,
      possible_lies: possibleLies,
      what_got_touched: whatGotTouched,
      possible_feelings: possibleFeelings,
      grief_needed: griefNeeded,
      suggested_steps: buildSuggestedSteps(needs, griefNeeded),
      resources: needs.map(getNeedResource)
    };

    return json(result, 200, { 'cache-control': 'no-store' });
  } catch (error) {
    console.error('Lie to Need analysis failed', error);
    return json({ error: 'The reflection tool is temporarily unavailable. Please try again.' }, 502);
  }
};
