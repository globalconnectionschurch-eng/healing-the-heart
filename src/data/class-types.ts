export type ClassTypePreset = {
  id: string;
  name: string;
  description: string;
  defaultDurationLabel: string;
  defaultPriceCents: number | null;
  requiresVerificationCode: boolean;
  notes: string;
  prerequisite?: string;
  assessment?: string[];
};

const commonAssessment = [
  'Do I tend to be guarded in relationships? Or hold people at a distance?',
  'Do I wear a mask or fear being the real me?',
  'Do I feel lonely even around people?',
  'Do I experience an inability to fully receive love from others or God?',
  'Do I have a hard time feeling the pain of others?',
  'Do I have a hard time feeling compassion?',
  'Do I bottle up my feelings or explode them all over people?',
  'Have I been accused of having a tone in my voice?',
  'Being easily offended?',
  'Being Sensitive?',
  'Overreacting?',
  'Jumping to conclusions?',
  'Assuming the worst?'
];

export const classTypePresets: ClassTypePreset[] = [
  {
    id: 'eight-week-in-person',
    name: 'In-person 8-week class',
    description: 'Break free from the negative patterns and emotional triggers that have been weighing you down. This retreat is designed specifically for women—to help you uncover the root causes of life’s challenges and equip you with tools to heal and grow. In a safe and supportive space, trained female facilitators will walk with you through practical steps to overcome the cycles causing frustration and pain. With full course materials and hands-on learning, you’ll leave empowered, renewed, and free to move forward.',
    defaultDurationLabel: '8 weeks',
    defaultPriceCents: 19900,
    requiresVerificationCode: true,
    notes: 'Use the standard 8-week registration and class-detail email templates.',
    assessment: commonAssessment
  },
  {
    id: 'three-day-retreat',
    name: '3-day HTH Retreat',
    description: 'Break free from the negative patterns and triggers that have been holding you back. Designed to help you uncover the root causes of life’s challenges and equip you with the tools to address and heal them. In a safe and supportive environment, trained facilitators will guide you through practical steps to understand and overcome the cycles causing frustration in your life. With full course materials and hands-on learning, you’ll leave empowered to move forward.',
    defaultDurationLabel: '3 days',
    defaultPriceCents: 77500,
    requiresVerificationCode: true,
    notes: 'Retreat-specific dates, location, schedule, and pricing are entered when the class is created.',
    assessment: commonAssessment
  },
  {
    id: 'pastors-only-retreat',
    name: 'Pastor Only Retreat',
    description: 'When pastors’ hearts are healed, the flow of wisdom, compassion, and understanding from the Holy Spirit is no longer blocked. This free retreat is a resource and a seed sown into ministries, helping leaders heal from the top down—so that restoration, grace, and strength can flow through them to those in their care. In a safe and supportive setting, pastors will be equipped to process past wounds, remove the stones that hinder their ability to minister freely, and embrace a new depth of compassion and wisdom from God. When healing begins at the top, the entire body is transformed.',
    defaultDurationLabel: 'Retreat',
    defaultPriceCents: 77500,
    requiresVerificationCode: true,
    notes: 'Keep registration restricted to pastors and ministry leaders as appropriate.',
    assessment: commonAssessment
  },
  {
    id: 'adoptive-parents',
    name: 'Adoptive Parents Only Retreat',
    description: 'Parenting adopted children often comes with hidden layers of trauma, emotional dysregulation, and behavioral challenges like RADS, ADHD, and deep-rooted attachment wounds. This retreat is a safe place for adoptive parents to find healing for their own hearts—offering tools, insight, and understanding to walk in compassion and wisdom. As you heal, your ability to parent from a place of peace and connection deepens, creating space for true transformation in your family. This retreat is for you—to breathe again, process the unseen weight you carry, and receive healing that will ripple into your home.',
    defaultDurationLabel: 'Retreat',
    defaultPriceCents: 77500,
    requiresVerificationCode: true,
    notes: 'Class-specific schedule, location, pricing, and capacity are entered by the admin.',
    assessment: commonAssessment
  },
  {
    id: 'one-on-one-intensive-weekend',
    name: 'Healing the Heart Intensive Weekend',
    description: 'For those seeking a highly personalized healing experience, our Healing the Heart Intensive Weekend provides dedicated one-on-one support with certified facilitators in a private, confidential setting. Whether you’re facing a personal crisis, fighting for your marriage, navigating the pressures of leadership, or simply need focused time away from the demands of everyday life, this intensive creates space to slow down, dig deep, and pursue lasting healing. Through the complete Healing the Heart journey, you’ll receive individualized guidance, practical tools, and uninterrupted time to address the root causes of life’s deepest struggles. Lodging, meals, and all course materials are provided, allowing you to focus entirely on restoration without distraction. This intensive is designed for those who value privacy, confidentiality, and a personalized approach to healing—including professionals, ministry leaders, executives, public figures, and anyone seeking focused care in a safe and supportive environment.',
    defaultDurationLabel: 'Weekend',
    defaultPriceCents: null,
    requiresVerificationCode: true,
    notes: 'Contact us for details and availability. Do not publish an online price for this class type.',
    assessment: commonAssessment
  },
  {
    id: 'marriage-retreat',
    name: 'Healing the Heart Marriage Retreat',
    description: 'Every marriage is shaped by the hearts of the two people within it. Hurt, unmet expectations, past wounds, and unhealthy patterns can quietly create distance between even the strongest couples. The Healing the Heart Marriage Retreat is designed to help you identify the root causes of conflict, improve communication, restore trust, and strengthen your relationship through healing. In a safe and supportive environment, trained facilitators will guide you and your spouse through practical teaching, meaningful discussions, and proven Healing the Heart principles. Together, you’ll gain tools to better understand one another, extend grace, and build a healthier, stronger marriage. Whether your marriage simply needs refreshing or you’re walking through a difficult season, this retreat offers hope, healing, and a renewed foundation for the journey ahead.',
    defaultDurationLabel: '3 days',
    defaultPriceCents: 77500,
    requiresVerificationCode: true,
    notes: 'Pricing and registration should support couples attending together.',
    prerequisite: 'Attend 1 of the following: 3-day HTH Retreat or Online Zoom class (8-week).',
    assessment: [
      'Do we struggle to communicate without conflict?',
      'Have we grown emotionally distant?',
      'Do past hurts keep resurfacing?',
      'Do we feel misunderstood or unheard?',
      'Have trust, intimacy, or connection been affected?',
      'Do the same arguments happen over and over?',
      'Are we surviving instead of thriving?'
    ]
  },
  {
    id: 'womens-only',
    name: 'HTH Women’s Only Class',
    description: 'Break free from the negative patterns and emotional triggers that have been weighing you down. This retreat is designed specifically for women—to help you uncover the root causes of life’s challenges and equip you with tools to heal and grow. In a safe and supportive space, trained female facilitators will walk with you through practical steps to overcome the cycles causing frustration and pain. With full course materials and hands-on learning, you’ll leave empowered, renewed, and free to move forward.',
    defaultDurationLabel: 'Class',
    defaultPriceCents: 77500,
    requiresVerificationCode: true,
    notes: 'Enter the specific format, dates, location, price, and capacity when creating the class.',
    assessment: commonAssessment
  },
  {
    id: 'mens-retreat',
    name: 'HTH Men’s Retreat',
    description: 'A Healing the Heart retreat for men.',
    defaultDurationLabel: 'Retreat',
    defaultPriceCents: 77500,
    requiresVerificationCode: true,
    notes: 'Enter the specific format, dates, location, price, and capacity when creating the class.',
    assessment: commonAssessment
  }
];
