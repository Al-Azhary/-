
export type Language = 'ar' | 'en';

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  value: number;
}

export type GameState = 'START' | 'SETUP' | 'CATEGORY_SELECTION' | 'PLAYING' | 'SUMMARY';

export type ToolId = 'skip' | 'double_try' | 'pit' | 'call_friend' | 'double_points';

export interface Tool {
  id: ToolId;
  name: { ar: string; en: string };
  description: { ar: string; en: string };
  icon: string;
  usageTime: 'before' | 'after';
}

export const AVAILABLE_TOOLS: Tool[] = [
  { id: 'skip', name: { ar: 'استريح', en: 'Skip' }, description: { ar: 'تخطي السؤال الحالي', en: 'Skip current question' }, icon: '✋', usageTime: 'after' },
  { id: 'double_try', name: { ar: 'جوابين', en: 'Two Answers' }, description: { ar: 'محاولتان للإجابة', en: 'Two attempts' }, icon: '✌️', usageTime: 'before' },
  { id: 'pit', name: { ar: 'الحفرة', en: 'The Pit' }, description: { ar: 'اخصم من فريق آخر', en: 'Deduct from another' }, icon: '🕳️', usageTime: 'before' },
  { id: 'call_friend', name: { ar: 'صديق', en: 'Friend' }, description: { ar: 'اتصال بصديق', en: 'Call a friend' }, icon: '📞', usageTime: 'before' },
  { id: 'double_points', name: { ar: 'مضاعفة', en: 'Double' }, description: { ar: 'مضاعفة النقاط', en: 'Double points' }, icon: '✨', usageTime: 'before' }
];

export interface Team {
  id: number;
  name: string;
  score: number;
  tools: ToolId[];
  usedTools: ToolId[];
  completedCells: Record<string, number[]>;
}

export interface Category {
  id: string;
  name: { ar: string; en: string };
  icon: string;
  group: { ar: string; en: string };
}

// Extensive and unique category pool
const generateCategories = (): Category[] => {
  const pool: Category[] = [
    // Quran Core
    { id: 'q_v', group: { ar: 'القرآن الكريم', en: 'Holy Quran' }, name: { ar: 'أكمل الآية', en: 'Complete the Verse' }, icon: '📖' },
    { id: 'q_r', group: { ar: 'القرآن الكريم', en: 'Holy Quran' }, name: { ar: 'أسباب النزول', en: 'Reasons for Revelation' }, icon: '🕊️' },
  ];

  // All 30 Juz
  for (let i = 1; i <= 30; i++) {
    pool.push({
      id: `juz_${i}`,
      group: { ar: 'أجزاء القرآن', en: 'Quran Juz' },
      name: { ar: `الجزء ${i}`, en: `Juz ${i}` },
      icon: '📜'
    });
  }

  // Vehicles
  const vehicles = [
    { n: 'سيارات مرسيدس', e: 'Mercedes Cars', i: '🚗' },
    { n: 'سيارات بي إم دبليو', e: 'BMW Cars', i: '🏎️' },
    { n: 'طائرات بوينج', e: 'Boeing Planes', i: '✈️' },
    { n: 'طائرات إيرباص', e: 'Airbus Planes', i: '🛫' },
    { n: 'دبابة أبرامز', e: 'Abrams Tank', i: '🚜' },
    { n: 'دبابة تي-90', e: 'T-90 Tank', i: '🛡️' },
    { n: 'سفن حربية', e: 'Battleships', i: '🚢' }
  ];
  vehicles.forEach((v, idx) => {
    pool.push({
      id: `v_${idx}`,
      group: { ar: 'مركبات وآلات', en: 'Vehicles' },
      name: { ar: v.n, en: v.e },
      icon: v.i
    });
  });

  // General Info Varieties
  const infoTypes = [
    { n: 'دول', e: 'Countries', i: '🌍', group: 'معلومات عامة' },
    { n: 'أعلام', e: 'Flags', i: '🚩', group: 'معلومات عامة' },
    { n: 'لهجات', e: 'Dialects', i: '🗣️', group: 'معلومات عامة' },
    { n: 'لغات', e: 'Languages', i: '🌐', group: 'معلومات عامة' },
    { n: 'تاريخ', e: 'History', i: '🕰️', group: 'معلومات عامة' },
    { n: 'جغرافيا', e: 'Geography', i: '🗺️', group: 'معلومات عامة' },
    { n: 'أمثال شعبية', e: 'Proverbs', i: '📜', group: 'معلومات عامة' },
    { n: 'أدب عربي', e: 'Arabic Literature', i: '🖋️', group: 'معلومات عامة' }
  ];

  infoTypes.forEach((info, idx) => {
    for (let level = 1; level <= 50; level++) {
      pool.push({
        id: `info_${idx}_${level}`,
        group: { ar: info.group, en: 'General Knowledge' },
        name: { ar: `${info.n} - مستوى ${level}`, en: `${info.e} - Lv ${level}` },
        icon: info.i
      });
    }
  });

  // Fill up to 1000 with more diverse topics
  const remaining = 1000 - pool.length;
  for (let i = 0; i < remaining; i++) {
    const topics = [
      { a: 'كيمياء', e: 'Chemistry', i: '🧪' },
      { a: 'فيزياء', e: 'Physics', i: '⚛️' },
      { a: 'فلك', e: 'Astronomy', i: '🔭' },
      { a: 'طب', e: 'Medicine', i: '🩺' },
      { a: 'رياضة', e: 'Sports', i: '⚽' },
      { a: 'فنون', e: 'Arts', i: '🎨' },
      { a: 'تقنية', e: 'Tech', i: '💻' },
      { a: 'حيوانات', e: 'Animals', i: '🦁' },
      { a: 'نباتات', e: 'Plants', i: '🌿' }
    ];
    const t = topics[i % topics.length];
    pool.push({
      id: `misc_${i}`,
      group: { ar: 'مجالات متنوعة', en: 'Miscellaneous' },
      name: { ar: `${t.a} - قسم ${Math.floor(i / topics.length) + 1}`, en: `${t.e} - Part ${Math.floor(i / topics.length) + 1}` },
      icon: t.i
    });
  }

  return pool;
};

export const CATEGORY_POOL: Category[] = generateCategories();
export const VALUES = [200, 400, 600];
