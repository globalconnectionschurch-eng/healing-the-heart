export type ClassTypePreset = {
  id: string;
  name: string;
  description: string;
  defaultDurationLabel: string;
  defaultPriceCents: number | null;
  requiresVerificationCode: boolean;
  notes: string;
};

export const classTypePresets: ClassTypePreset[] = [
  { id: 'eight-week-in-person', name: '8-Week In Person', description: 'Healing the Heart 8-week in-person class.', defaultDurationLabel: '8 weeks', defaultPriceCents: 19900, requiresVerificationCode: true, notes: 'Use the standard 8-week registration and class-detail email templates.' },
  { id: 'three-day-retreat', name: '3-Day Retreat', description: 'A focused Healing the Heart retreat over three days.', defaultDurationLabel: '3 days', defaultPriceCents: 77500, requiresVerificationCode: true, notes: 'Retreat-specific dates, location, schedule, and pricing are entered when the class is created.' },
  { id: 'pastors-only-retreat', name: 'Pastors Only Retreat', description: 'A Healing the Heart retreat specifically for pastors.', defaultDurationLabel: 'Retreat', defaultPriceCents: 77500, requiresVerificationCode: true, notes: 'Keep registration restricted to pastors and ministry leaders as appropriate.' },
  { id: 'adoptive-parents', name: 'Adoptive Parents', description: 'Healing the Heart support and teaching for adoptive parents.', defaultDurationLabel: 'Class', defaultPriceCents: 77500, requiresVerificationCode: true, notes: 'Class-specific schedule, location, pricing, and capacity are entered by the admin.' },
  { id: 'one-on-one-intensive-weekend', name: '1x1 Intensive Weekend', description: 'An intensive one-on-one Healing the Heart weekend.', defaultDurationLabel: 'Weekend', defaultPriceCents: null, requiresVerificationCode: true, notes: 'Contact us for details and availability. Do not publish an online price for this class type.' },
  { id: 'marriage-retreat', name: 'Marriage Retreat', description: 'A Healing the Heart retreat focused on marriage and relationship restoration.', defaultDurationLabel: 'Retreat', defaultPriceCents: 77500, requiresVerificationCode: true, notes: 'Pricing and registration should support couples attending together.' },
  { id: 'womens-only', name: 'Womens Only', description: 'A Healing the Heart class or retreat for women.', defaultDurationLabel: 'Class', defaultPriceCents: 77500, requiresVerificationCode: true, notes: 'Enter the specific format, dates, location, price, and capacity when creating the class.' },
  { id: 'mens-retreat', name: 'Mens Retreat', description: 'A Healing the Heart retreat for men.', defaultDurationLabel: 'Retreat', defaultPriceCents: 77500, requiresVerificationCode: true, notes: 'Enter the specific format, dates, location, price, and capacity when creating the class.' }
];
