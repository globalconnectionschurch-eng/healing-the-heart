export type EmailTemplate = {
  id: string;
  name: string;
  trigger: string;
  subject: string;
  body: string;
  editable: boolean;
};

export const emailTemplates: EmailTemplate[] = [
  {
    id: 'eight-week-class-details',
    name: '8-Week Class — Upcoming Details',
    trigger: 'Send when a student is registered for an 8-week in-person class',
    subject: 'Thank you for registering for Healing the Heart',
    editable: true,
    body: `Thank you for registering for the Healing the Heart 8-Week Class! We’re so glad you’ve taken this step toward healing, growth, and deeper freedom.\n\nWe look forward to having you join us at our {{locationName}} facility, located at {{locationAddress}}.\n\nThis course is designed to help uncover the root causes behind emotional patterns and equip you with tools for lasting transformation and healing. Our team is committed to creating a safe, supportive space for you to process, reflect, and heal at your own pace.\n\nWe’re honored to walk alongside you, and we truly believe this class can mark a powerful shift in your life.\n\nCLASS INFORMATION\n\nMaterials\nYour student guidebook and workbook will be provided at the first class.\n\nClass Time\n{{schedule}}\n{{dateRange}}\nPlease arrive 10–15 minutes early to get settled so we can start promptly and honor everyone’s time.\n\nIMPORTANT INFO\n\n• No food in the class (water or drinks with lids are fine).\n• We try to keep the room free from smells and noise or food so it doesn’t distract others during the teaching and sharing times.\n\nDress Comfortably\nThis isn’t about looking good—it’s about getting real. Wear whatever helps you feel relaxed and at ease.\n\nParking\n{{parking}}\n\nWhere to Go\n{{whereToGo}}\n\nWhat to Bring\nIf you enjoy taking notes, feel free to bring a pen and highlighter—whatever helps you engage and reflect.\n\nIf you have any questions about the class or anticipate being late, please contact your facilitator in advance at {{contactEmail}}.\n\nWe’re so excited to begin this journey with you.\n\nWith care,\nThe Healing the Heart Team\n{{siteUrl}}`
  },
  {
    id: 'manual-add-registration-required',
    name: 'Manually Added Student — Registration Required',
    trigger: 'Send when an admin manually adds a student who still needs to complete the online registration form',
    subject: 'Please complete your Healing the Heart registration',
    editable: true,
    body: `We’re so excited to have you joining us for the Healing the Heart class—it’s going to be a powerful and transformative journey.\n\nTo help us prepare for your class, we kindly ask that you complete your registration through our website. This step is essential to ensure we have all the details needed to:\n\n- Order and prepare your course materials\n- Contact you with any class updates or important information\n- Match you with the right facilitators for your journey\n- Support you in the most personal and helpful way possible\n\nPlease complete your registration here:\n{{registrationLink}}\n\nThere will be a spot for a Verification Code to indicate your class has been paid for in person. Your Code is: {{verificationCode}}\n\nYour answers are confidential and will only be used to help us serve you better.\n\nThank you again for saying “yes” to this journey. We can’t wait to walk alongside you in this season of growth and healing.\n\nWith care,\nThe Healing the Heart Team\n{{contactEmail}}\n{{siteUrl}}`
  },
  {
    id: 'eight-week-day-before-reminder',
    name: '8-Week Class — Day Before Reminder',
    trigger: 'Send automatically the day before each 8-week class session',
    subject: 'Reminder: Your Healing the Heart Class is Tomorrow at {{classTime}}',
    editable: true,
    body: `Reminder: Your Healing the Heart Class is Tomorrow at {{classTime}}.\n\nEvery step matters—tomorrow’s another one.\n\nJust a quick reminder that your Healing the Heart 8-Week Class continues tomorrow ({{weekday}}) at {{classTime}}.\n\nWe’re excited to walk with you on this life-changing journey.\n\nThis class is more than just healing — it's about unlocking the version of you that God intended. As you continue showing up each week, expect real transformation in areas like:\n\n• Becoming an untriggered, emotionally present parent\n• Preparing for your next stage of life\n• Leading with confidence and peace\n• Restoring healthy boundaries in relationships\n• Breaking cycles of fear, shame, and rejection\n• Learning how to receive love and comfort\n• Growing in emotional resilience and maturity\n• Moving from reaction to intentional living\n• Building a heart that stays soft, safe, and strong\n• Hearing God's voice more clearly\n\nWe’re looking forward to seeing you there!\n\nIf you’re unable to attend, please reply to let us know.\n\nWith care,\nThe Healing the Heart Team\n{{siteUrl}}`
  }
];
