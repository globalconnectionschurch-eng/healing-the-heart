export const VALID_NEEDS = [
  'Acceptance',
  'Affection',
  'Attention',
  'Affirmation',
  'Security',
  'Comfort',
  'Encouragement',
  'Support',
  'Appreciation',
  'Respect'
] as const;

export type EmotionalNeed = (typeof VALID_NEEDS)[number];

export const NEED_DESCRIPTIONS: Record<EmotionalNeed, string> = {
  Acceptance: 'The need to know you are loved and completely acceptable regardless of mistakes or failures; loved for who you are, not just what you do.',
  Affection: 'The need for closeness through appropriate physical touch and warm loving affection that helps a person feel safe, secure, and loved.',
  Attention: 'The need to have a significant person show interest, take time, listen, and enter into your world.',
  Affirmation: 'The need for a verbal declaration that you are significant, worthwhile, approved, commended, and confirmed as having value.',
  Security: 'The need to feel safe, stable, protected, and confident that physical and emotional needs will be met.',
  Comfort: 'The need to have someone come alongside with empathy, consolation, and comfort during difficult times instead of only correction or instruction.',
  Encouragement: 'The need to be urged forward positively toward a goal, inspired with hope, motivation, and help to move ahead.',
  Support: 'The need to have someone stand by you, help carry a heavy burden, and provide practical help in difficult situations.',
  Appreciation: 'The need to have accomplishments recognized with gratitude and communicated with thankful words.',
  Respect: 'The need to be treated as a person of worth and value, including respect for privacy, property, individuality, and dignity.'
};

export const NEED_RESOURCES: Record<EmotionalNeed, { scriptures: string[]; recommended_practices: string[] }> = {
  Acceptance: {
    scriptures: ['Ephesians 1:4-5', '1 Corinthians 8:3', '1 John 4:16', '1 John 4:19'],
    recommended_practices: [
      '• Write what you do to “earn love”; surrender it in prayer.\n• 2-minute breath prayer: “Abba, I belong to You.” Read Mt 3:17; Eph 1:6 aloud.'
    ]
  },
  Affection: {
    scriptures: ['Psalms 73:21-24', 'Ps 139:5'],
    recommended_practices: [
      '• Dedicated weighted item for worship only (creates a body-memory of comfort with Jesus. IE: blanket/stuffed animal).\n• Butterfly hug (gentle self-tapping) while praying Psalm 23 slowly.'
    ]
  },
  Attention: {
    scriptures: ['Psalms 17:8', 'Genesis 16:13'],
    recommended_practices: [
      '• 5-minute Examen: “Where did I feel seen? Where did I hide?”\n• Keep an empty chair for Jesus; share one story from your day aloud.'
    ]
  },
  Affirmation: {
    scriptures: ['Romans 8:31', 'John 15:16'],
    recommended_practices: [
      '• Record a 20-sec Scripture blessing; replay and repeat aloud daily.\n• “Well-done journal”: list 3 positive character choices you made each day at the end of each night.'
    ]
  },
  Security: {
    scriptures: ['Psalms 27:1', 'Psalms 91:1', 'Proverbs 1:33', 'Hebrews 13:1'],
    recommended_practices: [
      '• “Garbage can transfer”: write anxieties; place paper in a garbage can and release it; pray Phil 4:6-7.\n• Read Psalm 91 aloud once per day; limit news/social media window each day.'
    ]
  },
  Comfort: {
    scriptures: ['2 Corinthians 1:4', 'Isa 40:1-2'],
    recommended_practices: [
      '• 4-line lament: Address • Complaint • Ask • Trust.\n• Warmth cue (heat pack/tea) while reading 2 Corinthians 1:3-4.'
    ]
  },
  Encouragement: {
    scriptures: ['Psalms 3:3', 'Romans 8:28'],
    recommended_practices: [
      '• One 10-minute step toward a godly goal; thank God for the tiny win.\n• “Prophetic postcard” to yourself about your future in Christ (with Scripture).'
    ]
  },
  Support: {
    scriptures: ['2 Thessalonians 3:3', 'Gal 6:2', 'Eccl 4:9-10', 'Rom 12:5'],
    recommended_practices: [
      '• Ask-one: schedule one practical ask this week (prayer, ride, help).\n• Two-minute team prayer: voice one burden with a friend over Gal 6:2.'
    ]
  },
  Appreciation: {
    scriptures: ['Heb 6:10', 'Mt 6:4', 'Col 3:23-24', 'Psalms 103:1-5'],
    recommended_practices: [
      '• Gratitude mirror: proclaim in a mirror 3 unseen acts you did with God; thank Him aloud.\n• Text one sincere thank-you daily. (Sows what you need to reap.)'
    ]
  },
  Respect: {
    scriptures: ['Mt 5:37', '1 Pet 2:9', 'Prov 4:23', 'Psalms 91:14-16'],
    recommended_practices: [
      '• Practice one clear “Yes” and one clear “No”; journal the peace that follows.\n• Dignity posture: sit/stand tall + pray 1 Pet 2:9 before hard conversations.'
    ]
  }
};

export function toValidNeed(value: unknown): EmotionalNeed | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  return VALID_NEEDS.find((need) => need.toLowerCase() === normalized) ?? null;
}

export function uniqueClean(values: unknown[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const clean = String(value ?? '').trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(clean);
  }
  return output;
}

export function getNeedResource(need: EmotionalNeed) {
  return {
    need,
    description: NEED_DESCRIPTIONS[need],
    scriptures: NEED_RESOURCES[need].scriptures,
    recommended_practices: NEED_RESOURCES[need].recommended_practices
  };
}

export function buildSuggestedSteps(needs: EmotionalNeed[], griefNeeded: boolean) {
  const steps = [
    'Write out and process what got touched instead of burying it.',
    'Forgive the person or event involved and keep releasing it if more pain surfaces.',
    'Renounce the lie you agreed with. Reach out to a facilitator if you need to learn how to pray to release this.',
    'Repent of any sinful response, including judgments or inner vows. Reach out to a facilitator if you need to learn how to pray to release this.',
    griefNeeded
      ? 'Grieve what was lost here. Do not skip the pain—walk it through with God.'
      : 'If this touched a real loss, take it through grieving instead of just stuffing it down.'
  ];
  if (needs.length) steps.push('Ask God to meet the deeper need underneath this trigger.');
  return steps;
}
