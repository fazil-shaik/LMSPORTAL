import { Router, Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { db, schema, isDatabaseConnected, rawSql, schemaSyncPromise, ensureDatabaseSchema } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { generateSignedDeliveryUrl } from '../services/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getPersistentDataDir = () => {
  const candidates = [
    path.resolve(process.cwd(), 'backend/src/data'),
    path.resolve(process.cwd(), 'src/data'),
    path.resolve(__dirname, '../data'),
    path.resolve(__dirname, '../../src/data'),
  ];
  for (const cand of candidates) {
    if (fs.existsSync(cand)) return cand;
  }
  const fallback = path.resolve(__dirname, '../data');
  if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
  return fallback;
};

const DATA_DIR = getPersistentDataDir();
const COURSES_FILE = path.join(DATA_DIR, 'courses.json');
const PROGRESS_FILE = path.join(DATA_DIR, 'progress.json');
const ENROLLMENTS_FILE = path.join(DATA_DIR, 'enrollments.json');

const router = Router();

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isValidUUID(id: any): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id.trim());
}

// -------------------------------------------------------------
// Type Definitions matching PDF Section 2, 3, 4, 5, 6, 11
// -------------------------------------------------------------

export interface QuizOptionData {
  id: string;
  optionText: string;
  isCorrect: boolean;
  position: number;
}

export interface QuizQuestionData {
  id: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'short_text';
  questionText: string;
  imageUrl?: string;
  explanation: string;
  points: number;
  position: number;
  options: QuizOptionData[];
  acceptedShortAnswers?: string[];
}

export interface QuizData {
  id: string;
  moduleId: string;
  title: string;
  instructions: string;
  isRequired: boolean;
  passingPercent: number;
  timeLimitMinutes: number; // 0 = unlimited
  attemptsAllowed: number; // 0 = unlimited
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultsMode: 'score_only' | 'score_and_correct' | 'score_and_explanations';
  unlockNext: boolean;
  poolSize: number;
  status: 'draft' | 'published';
  questions: QuizQuestionData[];
}

export interface LessonData {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  type: 'video' | 'audio' | 'article' | 'resource';
  articleBody?: string;
  mediaAssetId?: string;
  mediaUrl?: string;
  videoUrl?: string;
  duration: string;
  durationSeconds: number;
  position: number;
  isFreePreview: boolean;
  isRequired: boolean; // Optional lessons do not count toward completion %
  status: 'draft' | 'published';
  archived: boolean;
  resources?: Array<{ name: string; url: string; size?: string; type?: string }>;
}

export interface ModuleTimelineData {
  id: string;
  moduleId: string;
  label: string; // e.g. "Week 1", "Phase 1"
  suggestedDuration: string; // e.g. "3 days", "1 week"
  startOffsetDays: number; // e.g. 1, 8, 15
  releaseMode: 'self_paced' | 'scheduled';
  releaseAfterDays: number;
  bufferMinutes: number;
  estimatedStudyTimeMinutes: number; // Calculated automatically
}

export interface ModuleData {
  id: string;
  courseId: string;
  title: string;
  description: string;
  objectives: string[];
  position: number;
  completionRule: 'all_lessons' | 'all_lessons_plus_quiz';
  unlockRule: 'open' | 'previous_completed' | 'scheduled';
  status: 'draft' | 'published';
  archived: boolean;
  timeline: ModuleTimelineData;
  lessons: LessonData[];
  quiz?: QuizData;
}

export interface CourseData {
  id: string;
  slug: string;
  title: string;
  subtitle: string; // One line promise
  description: string; // Rich text
  thumbnail: string; // Cloudinary
  banner?: string; // Cloudinary
  previewVideo?: string; // Cloudinary
  priceCents: number;
  currency: string;
  category: string;
  tags: string[];
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  language: string;
  status: 'draft' | 'published' | 'archived';
  contentVersion: number;
  publishedTime?: string;
  series: string;
  tagline: string;
  instructor: string;
  instructorTitle: string;
  instructorBio: string;
  instructorAvatar: string;
  lastUpdatedDate: string;
  badge?: string;
  rating: number;
  reviewCount: number;
  outcomes: string[];
  requirements: string[];
  whoIsItFor: string[];
  totalDuration: string; // Derived from modules & lessons
  durationHours: number;
  lessonCount: number; // Derived
  moduleCount: number; // Derived
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
  modules: ModuleData[];
  // Legacy compatibility fields
  lessons?: any[];
  sections?: any[];
  reviews?: Array<{
    id: string;
    studentName: string;
    studentRole?: string;
    rating: number;
    reviewText: string;
    date: string;
  }>;
}

// -------------------------------------------------------------
// Seed Courses with multi-module, lesson & quiz hierarchy
// -------------------------------------------------------------

function calculateCourseTotals(course: CourseData): void {
  let totalSeconds = 0;
  let totalLessons = 0;
  let activeModules = 0;

  for (const mod of course.modules) {
    if (mod.archived) continue;
    activeModules++;
    let modSeconds = 0;
    for (const les of mod.lessons) {
      if (les.archived) continue;
      totalLessons++;
      modSeconds += les.durationSeconds || 900;
    }
    // Module timeline estimated study time: lessons duration + buffer
    const quizSeconds = mod.quiz ? (mod.quiz.timeLimitMinutes > 0 ? mod.quiz.timeLimitMinutes * 60 : 600) : 0;
    const bufferSec = (mod.timeline?.bufferMinutes || 0) * 60;
    if (mod.timeline) {
      mod.timeline.estimatedStudyTimeMinutes = Math.max(15, Math.round((modSeconds + quizSeconds + bufferSec) / 60));
    }
    totalSeconds += modSeconds + quizSeconds;
  }

  course.moduleCount = activeModules;
  course.lessonCount = totalLessons;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  course.durationHours = Math.max(1, Math.round(totalSeconds / 3600));
  course.totalDuration = hours > 0 ? `${hours} hr ${minutes > 0 ? minutes + ' min' : ''} · ${totalLessons} lessons` : `${minutes} min · ${totalLessons} lessons`;
}

const initialCoursesSeed: CourseData[] = [
  {
    id: 'c1111111-1111-1111-1111-111111111111',
    slug: 'product-design-insight-to-impact',
    title: 'Product Design, from insight to impact',
    subtitle: 'From user discovery to production-ready design tokens and interactive systems',
    description: 'A comprehensive, hands-on masterclass following the modern product development workflow used at Stripe, Figma, and Airbnb. Master qualitative user interviews, opportunity solution trees, component architecture, WCAG 2.1 AA accessibility, and enterprise design tokens.',
    instructor: 'Maya Chen',
    instructorTitle: 'Design Partner & Lead Researcher',
    instructorBio: 'Former design systems lead at Stripe, helping over 5,000+ designers and engineers bridge research insights to world-class software.',
    instructorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=700&q=80',
    banner: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=1200&q=80',
    previewVideo: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    priceCents: 20000,
    currency: 'USD',
    category: 'Product design',
    tags: ['Design Systems', 'Figma', 'UX Research', 'Tokens'],
    level: 'Beginner',
    language: 'English',
    status: 'published',
    contentVersion: 1,
    publishedTime: new Date().toISOString(),
    series: 'THE PRODUCT SERIES',
    tagline: 'Design with intent.',
    badge: 'Bestseller',
    rating: 4.9,
    reviewCount: 128,
    outcomes: [
      'Master the double diamond UX discovery process and conduct user interviews',
      'Synthesize customer interviews into actionable Opportunity Solution Trees',
      'Build scalable multi-brand design systems in Figma with tokens and variables',
      'Conduct usability tests and cognitive walkthroughs with real test users',
      'Deliver production-ready handoff specs to engineering teams with zero friction'
    ],
    requirements: [
      'A computer with modern web browser and free Figma account',
      'Curiosity for user research and intuitive product problem-solving',
      'No prior graphic design or coding experience required'
    ],
    whoIsItFor: [
      'Aspiring product designers wanting a verified, job-ready portfolio project',
      'Engineers and product managers looking to level up their design intuition',
      'Designers wanting to transition from freelance graphics to scalable tech systems'
    ],
    totalDuration: '6 hours · 12 lessons',
    durationHours: 6,
    lessonCount: 12,
    moduleCount: 3,
    gradientFrom: '#312e81',
    gradientTo: '#6d28d9',
    accentColor: '#4f46e5',
    lastUpdatedDate: 'November 2026',
    modules: [
      {
        id: 'm1-c1',
        courseId: 'c1111111-1111-1111-1111-111111111111',
        title: 'Module 1: Foundations & Discovery Research',
        description: 'Understand the foundational mental models of user research, interviewing strategies, and synthesis methods.',
        objectives: [
          'Master qualitative interviewing techniques',
          'Avoid leading questions and extract honest feedback',
          'Frame clear problem statements'
        ],
        position: 1,
        completionRule: 'all_lessons_plus_quiz',
        unlockRule: 'open',
        status: 'published',
        archived: false,
        timeline: {
          id: 't1-c1',
          moduleId: 'm1-c1',
          label: 'Week 1',
          suggestedDuration: '4 days',
          startOffsetDays: 1,
          releaseMode: 'self_paced',
          releaseAfterDays: 0,
          bufferMinutes: 30,
          estimatedStudyTimeMinutes: 140,
        },
        lessons: [
          {
            id: 'l1-1',
            moduleId: 'm1-c1',
            title: 'Research foundations & active listening',
            description: 'Core listening principles and setting up high-signal user interviews.',
            type: 'video',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            duration: '28 min',
            durationSeconds: 1680,
            position: 1,
            isFreePreview: true,
            isRequired: true,
            status: 'published',
            archived: false,
            resources: [
              { name: 'User Interview Script Template.pdf', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', size: '240 KB', type: 'pdf' }
            ],
          },
          {
            id: 'l1-2',
            moduleId: 'm1-c1',
            title: 'Synthesizing qualitative customer interviews',
            description: 'Affinity mapping and transforming raw video notes into atomic user insights.',
            type: 'article',
            articleBody: `# Synthesizing Qualitative Interviews\n\nWhen reviewing recorded customer conversations, avoid summarizing what the user *said* verbatim. Instead, look for underlying emotional drivers and workarounds.\n\n### The 3-Bucket Technique\n1. **Pains**: Unmet expectations, friction points, delays.\n2. **Gains**: Delighters and high-efficiency shortcuts.\n3. **Hacks**: Things the customer does outside software to get the job done (spreadsheets, sticky notes, Slack bots).\n\nKeep note cards atomic: one insight per card.`,
            duration: '20 min',
            durationSeconds: 1200,
            position: 2,
            isFreePreview: false,
            isRequired: true,
            status: 'published',
            archived: false,
          },
          {
            id: 'l1-3',
            moduleId: 'm1-c1',
            title: 'Framing opportunity problem statements',
            description: 'Writing "How Might We" statements that empower creative team solutions.',
            type: 'video',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            duration: '25 min',
            durationSeconds: 1500,
            position: 3,
            isFreePreview: false,
            isRequired: true,
            status: 'published',
            archived: false,
          },
          {
            id: 'l1-4',
            moduleId: 'm1-c1',
            title: 'Foundations Reference Checklist & Resources',
            description: 'Downloadable templates, Figma UI starter kits, and interview rubrics.',
            type: 'resource',
            duration: '15 min',
            durationSeconds: 900,
            position: 4,
            isFreePreview: false,
            isRequired: false, // Optional resource
            status: 'published',
            archived: false,
            resources: [
              { name: 'Double Diamond UX Discovery Guide.pdf', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', size: '1.2 MB', type: 'pdf' }
            ],
          },
        ],
        quiz: {
          id: 'q1-c1',
          moduleId: 'm1-c1',
          title: 'Module 1 Assessment: UX Foundations & Discovery',
          instructions: 'Verify your understanding of interview methodologies, affinity mapping, and problem framing. You must score at least 70% to complete this module.',
          isRequired: true,
          passingPercent: 70,
          timeLimitMinutes: 15,
          attemptsAllowed: 3,
          shuffleQuestions: false,
          shuffleOptions: false,
          showResultsMode: 'score_and_correct',
          unlockNext: true,
          poolSize: 0,
          status: 'published',
          questions: [
            {
              id: 'q1-c1-1',
              type: 'single_choice',
              questionText: 'What is the primary danger of asking "Would you pay for a feature that does X?" during user interviews?',
              explanation: 'Hypothetical questions invite polite, speculative agreement rather than factual past behavior.',
              points: 2,
              position: 1,
              options: [
                { id: 'opt-1-1', optionText: 'It asks for speculative future prediction rather than validated past behavior', isCorrect: true, position: 1 },
                { id: 'opt-1-2', optionText: 'It takes too long to explain pricing structures', isCorrect: false, position: 2 },
                { id: 'opt-1-3', optionText: 'Customers never understand product features', isCorrect: false, position: 3 },
                { id: 'opt-1-4', optionText: 'It violates the double diamond framework', isCorrect: false, position: 4 },
              ],
            },
            {
              id: 'q1-c1-2',
              type: 'multiple_choice',
              questionText: 'Which of the following are valid components of an atomic user insight? (Select all that apply)',
              explanation: 'Atomic insights require observable context, customer rationale, and friction intensity.',
              points: 2,
              position: 2,
              options: [
                { id: 'opt-2-1', optionText: 'The user context and scenario in which friction occurred', isCorrect: true, position: 1 },
                { id: 'opt-2-2', optionText: 'The current workaround the customer uses', isCorrect: true, position: 2 },
                { id: 'opt-2-3', optionText: 'A direct UI redesign sketch from the engineer', isCorrect: false, position: 3 },
                { id: 'opt-2-4', optionText: 'The underlying motivation or emotional driver', isCorrect: true, position: 4 },
              ],
            },
            {
              id: 'q1-c1-3',
              type: 'true_false',
              questionText: 'In qualitative discovery, an affinity map should strictly group notes by pre-existing product categories rather than emergent user behaviors.',
              explanation: 'False: Grouping by pre-existing product tabs blinds you to emergent workflows and novel cross-cutting problems.',
              points: 1,
              position: 3,
              options: [
                { id: 'opt-3-1', optionText: 'True', isCorrect: false, position: 1 },
                { id: 'opt-3-2', optionText: 'False', isCorrect: true, position: 2 },
              ],
            },
          ],
        },
      },
      {
        id: 'm2-c1',
        courseId: 'c1111111-1111-1111-1111-111111111111',
        title: 'Module 2: Architecture, Wireframing & Design Tokens',
        description: 'Transition from wireframes into scalable design tokens, Figma auto-layout, and reusable UI components.',
        objectives: [
          'Design scalable wireframes with autolayout',
          'Implement color, spacing, and typography tokens',
          'Structure WCAG 2.1 AA accessible component states'
        ],
        position: 2,
        completionRule: 'all_lessons_plus_quiz',
        unlockRule: 'previous_completed',
        status: 'published',
        archived: false,
        timeline: {
          id: 't2-c1',
          moduleId: 'm2-c1',
          label: 'Week 2',
          suggestedDuration: '5 days',
          startOffsetDays: 5,
          releaseMode: 'self_paced',
          releaseAfterDays: 0,
          bufferMinutes: 45,
          estimatedStudyTimeMinutes: 180,
        },
        lessons: [
          {
            id: 'l2-1',
            moduleId: 'm2-c1',
            title: 'Information architecture & wireframing',
            description: 'Building low-fidelity structural maps and tree testing your navigation hierarchy.',
            type: 'video',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            duration: '35 min',
            durationSeconds: 2100,
            position: 1,
            isFreePreview: false,
            isRequired: true,
            status: 'published',
            archived: false,
          },
          {
            id: 'l2-2',
            moduleId: 'm2-c1',
            title: 'Figma components & scalable design tokens',
            description: 'Naming conventions, aliasing tokens, semantic themes, and variant properties.',
            type: 'video',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
            duration: '40 min',
            durationSeconds: 2400,
            position: 2,
            isFreePreview: false,
            isRequired: true,
            status: 'published',
            archived: false,
          },
          {
            id: 'l2-3',
            moduleId: 'm2-c1',
            title: 'Design token architecture in code and Figma',
            description: 'Deep dive into JSON token formats and synchronizing tokens with Style Dictionary.',
            type: 'article',
            articleBody: `# Design Tokens: From Figma Variables to Code\n\nTokens are the single source of truth for all visual primitives across iOS, Android, and Web.\n\n### The Three Token Tiers\n- **Global Primitive Tokens**: \`color.blue.500 = #3b82f6\`\n- **Semantic / Alias Tokens**: \`color.brand.primary = {color.blue.500}\`\n- **Component Scoped Tokens**: \`button.primary.background = {color.brand.primary}\`\n\nAlways bind UI components to semantic or component tokens, never raw global hex codes!`,
            duration: '25 min',
            durationSeconds: 1500,
            position: 3,
            isFreePreview: false,
            isRequired: true,
            status: 'published',
            archived: false,
          },
          {
            id: 'l2-4',
            moduleId: 'm2-c1',
            title: 'Accessibility (WCAG 2.1 AA) in practice',
            description: 'Contrast calculations, keyboard focus indicators, screen reader labeling, and touch targets.',
            type: 'video',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
            duration: '29 min',
            durationSeconds: 1740,
            position: 4,
            isFreePreview: false,
            isRequired: true,
            status: 'published',
            archived: false,
          },
        ],
        quiz: {
          id: 'q2-c1',
          moduleId: 'm2-c1',
          title: 'Module 2 Quiz: Design Systems & Tokens',
          instructions: 'Test your understanding of semantic token hierarchies and accessibility standards.',
          isRequired: true,
          passingPercent: 70,
          timeLimitMinutes: 10,
          attemptsAllowed: 3,
          shuffleQuestions: false,
          shuffleOptions: false,
          showResultsMode: 'score_and_correct',
          unlockNext: true,
          poolSize: 0,
          status: 'published',
          questions: [
            {
              id: 'q2-c1-1',
              type: 'single_choice',
              questionText: 'Which token tier should UI buttons bind to in a scalable design system?',
              explanation: 'Binding to semantic or component tokens ensures themes (dark mode, high contrast) switch cleanly without hardcoding hex values.',
              points: 1,
              position: 1,
              options: [
                { id: 'opt-2-1-1', optionText: 'Component-scoped or Semantic tokens', isCorrect: true, position: 1 },
                { id: 'opt-2-1-2', optionText: 'Direct Global Primitive Hex Values', isCorrect: false, position: 2 },
                { id: 'opt-2-1-3', optionText: 'Raw CSS inline strings', isCorrect: false, position: 3 },
              ],
            },
            {
              id: 'q2-c1-2',
              type: 'single_choice',
              questionText: 'What is the minimum WCAG 2.1 AA contrast ratio required for standard body text?',
              explanation: 'WCAG 2.1 AA requires 4.5:1 for normal body text and 3:1 for large text (18pt or 14pt bold).',
              points: 1,
              position: 2,
              options: [
                { id: 'opt-2-2-1', optionText: '4.5:1', isCorrect: true, position: 1 },
                { id: 'opt-2-2-2', optionText: '3.0:1', isCorrect: false, position: 2 },
                { id: 'opt-2-2-3', optionText: '7.0:1', isCorrect: false, position: 3 },
                { id: 'opt-2-2-4', optionText: '2.0:1', isCorrect: false, position: 4 },
              ],
            },
          ],
        },
      },
      {
        id: 'm3-c1',
        courseId: 'c1111111-1111-1111-1111-111111111111',
        title: 'Module 3: Usability Testing, Handoff & Capstone Portfolio',
        description: 'Run live usability walkthroughs, manage design system governance, and build your verified portfolio case study.',
        objectives: [
          'Run cognitive walkthroughs with unmoderated test recordings',
          'Configure handoff documentation and Code Connect tokens',
          'Package an executive-ready portfolio case study'
        ],
        position: 3,
        completionRule: 'all_lessons_plus_quiz',
        unlockRule: 'previous_completed',
        status: 'published',
        archived: false,
        timeline: {
          id: 't3-c1',
          moduleId: 'm3-c1',
          label: 'Week 3',
          suggestedDuration: '5 days',
          startOffsetDays: 10,
          releaseMode: 'self_paced',
          releaseAfterDays: 0,
          bufferMinutes: 60,
          estimatedStudyTimeMinutes: 200,
        },
        lessons: [
          {
            id: 'l3-1',
            moduleId: 'm3-c1',
            title: 'Interactive prototyping & micro-interactions',
            description: 'Smart animate, interactive component variants, and realistic user flows.',
            type: 'video',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
            duration: '30 min',
            durationSeconds: 1800,
            position: 1,
            isFreePreview: false,
            isRequired: true,
            status: 'published',
            archived: false,
          },
          {
            id: 'l3-2',
            moduleId: 'm3-c1',
            title: 'Usability testing & cognitive walkthroughs',
            description: 'Structuring task rubrics, observing drop-off, and quantifying System Usability Scale (SUS) scores.',
            type: 'video',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
            duration: '26 min',
            durationSeconds: 1560,
            position: 2,
            isFreePreview: false,
            isRequired: true,
            status: 'published',
            archived: false,
          },
          {
            id: 'l3-3',
            moduleId: 'm3-c1',
            title: 'Design system governance & developer handoff',
            description: 'Redlining specs, Figma Dev Mode, zero-loss component documentation.',
            type: 'video',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
            duration: '36 min',
            durationSeconds: 2160,
            position: 3,
            isFreePreview: false,
            isRequired: true,
            status: 'published',
            archived: false,
          },
          {
            id: 'l3-4',
            moduleId: 'm3-c1',
            title: 'Building your portfolio case study & capstone review',
            description: 'Telling compelling outcome stories and preparing for engineering defense.',
            type: 'article',
            articleBody: `# Portfolio Case Study Structure\n\nRecruiters and hiring managers spend an average of 45 seconds scanning a case study. Structure yours using the Executive Summary format:\n\n1. **The Core Metric Moved**: e.g., "Reduced checkout churn by 22% by simplifying card verification".\n2. **The Problem & Constraints**: Timeline, team size, legacy technical limitations.\n3. **Validation & Iteration**: Show at least two discarded approaches and why user testing eliminated them.\n4. **Final Production Artifact**: Live demo links, token repositories, and measurable outcomes.`,
            duration: '35 min',
            durationSeconds: 2100,
            position: 4,
            isFreePreview: false,
            isRequired: true,
            status: 'published',
            archived: false,
          },
        ],
        quiz: {
          id: 'q3-c1',
          moduleId: 'm3-c1',
          title: 'Module 3 Capstone Assessment',
          instructions: 'Complete this final assessment to earn your course graduation certificate.',
          isRequired: true,
          passingPercent: 75,
          timeLimitMinutes: 15,
          attemptsAllowed: 3,
          shuffleQuestions: false,
          shuffleOptions: false,
          showResultsMode: 'score_and_correct',
          unlockNext: false,
          poolSize: 0,
          status: 'published',
          questions: [
            {
              id: 'q3-c1-1',
              type: 'single_choice',
              questionText: 'What is the primary objective of calculating a System Usability Scale (SUS) score?',
              explanation: 'The SUS score provides a reliable, standardized metric (0 to 100) benchmark across iterations.',
              points: 2,
              position: 1,
              options: [
                { id: 'opt-3-1-1', optionText: 'To quantify perceived ease of use with a reliable benchmark score', isCorrect: true, position: 1 },
                { id: 'opt-3-1-2', optionText: 'To measure code compilation time in CI/CD', isCorrect: false, position: 2 },
                { id: 'opt-3-1-3', optionText: 'To calculate marketing ad spend efficiency', isCorrect: false, position: 3 },
              ],
            },
          ],
        },
      },
    ],
  },
  {
    id: 'c4444444-4444-4444-4444-444444444444',
    slug: 'full-stack-web-development-bootcamp',
    title: 'Full-Stack Web Development Bootcamp',
    subtitle: 'From TypeScript fundamentals to PostgreSQL, Drizzle ORM, and cloud scale',
    description: 'Master modern full-stack web engineering: React 19 architecture, REST API design with Express, PostgreSQL relational modeling, Drizzle ORM migrations, secure authentication, and Cloudinary media processing.',
    instructor: 'Aman Sharma',
    instructorTitle: 'Principal Full-Stack Engineer',
    instructorBio: 'Principal engineer building high-load distributed platforms with over a decade of production architecture experience.',
    instructorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=700&q=80',
    banner: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    previewVideo: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    priceCents: 20000,
    currency: 'USD',
    category: 'Web development',
    tags: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Drizzle'],
    level: 'Advanced',
    language: 'English',
    status: 'published',
    contentVersion: 1,
    publishedTime: new Date().toISOString(),
    series: 'THE ENGINEERING SERIES',
    tagline: 'Code with precision.',
    badge: 'Popular',
    rating: 5.0,
    reviewCount: 210,
    outcomes: [
      'Architect robust React 19 frontends with state management and Tailwind CSS',
      'Design RESTful microservices with Node.js, Express, and JWT security',
      'Model relational databases with PostgreSQL, Drizzle ORM, and Neon Serverless',
      'Implement media processing with Cloudinary signed uploads and streaming',
      'Deploy full-stack web applications with zero downtime'
    ],
    requirements: [
      'Basic familiarity with JavaScript and web concepts',
      'A computer capable of running Node.js 18+ and VS Code',
      'Dedication to building real-world software from scratch'
    ],
    whoIsItFor: [
      'Aspiring software engineers looking for end-to-end production mastery',
      'Frontend developers wanting to master full-stack and database design',
      'Self-taught developers wanting to fill fundamental architectural gaps'
    ],
    totalDuration: '14 hours · 8 lessons',
    durationHours: 14,
    lessonCount: 8,
    moduleCount: 2,
    gradientFrom: '#1e1b4b',
    gradientTo: '#4338ca',
    accentColor: '#4f46e5',
    lastUpdatedDate: 'November 2026',
    modules: [
      {
        id: 'm1-c4',
        courseId: 'c4444444-4444-4444-4444-444444444444',
        title: 'Module 1: Modern TypeScript, React 19 & State',
        description: 'TypeScript core patterns, custom hooks, context management, and production UI component architecture.',
        objectives: [
          'Master TypeScript generics, unions, and type safety',
          'Build scalable React 19 components with custom hooks',
          'Implement secure client-side routing and cache synchronization'
        ],
        position: 1,
        completionRule: 'all_lessons_plus_quiz',
        unlockRule: 'open',
        status: 'published',
        archived: false,
        timeline: {
          id: 't1-c4',
          moduleId: 'm1-c4',
          label: 'Week 1',
          suggestedDuration: '4 days',
          startOffsetDays: 1,
          releaseMode: 'self_paced',
          releaseAfterDays: 0,
          bufferMinutes: 30,
          estimatedStudyTimeMinutes: 190,
        },
        lessons: [
          {
            id: 'l4-1',
            moduleId: 'm1-c4',
            title: 'Modern JavaScript (ESNext) & TypeScript essentials',
            description: 'Strict mode, generics, branded types, and compile-time verification.',
            type: 'video',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            duration: '45 min',
            durationSeconds: 2700,
            position: 1,
            isFreePreview: true,
            isRequired: true,
            status: 'published',
            archived: false,
          },
          {
            id: 'l4-2',
            moduleId: 'm1-c4',
            title: 'React 19 architecture: Hooks, context, and state',
            description: 'Custom hooks, lifecycle optimization, and zero-prop-drilling state trees.',
            type: 'video',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            duration: '50 min',
            durationSeconds: 3000,
            position: 2,
            isFreePreview: false,
            isRequired: true,
            status: 'published',
            archived: false,
          },
          {
            id: 'l4-3',
            moduleId: 'm1-c4',
            title: 'TypeScript Design Patterns for Clean Code',
            description: 'Exhaustive type checking, discriminating unions, and immutability.',
            type: 'article',
            articleBody: `# TypeScript Discriminated Unions\n\nDiscriminated unions allow you to model complex state machines cleanly without ambiguous optional properties.\n\n\`\`\`typescript\ntype RequestState<T> =\n  | { status: 'idle' }\n  | { status: 'loading' }\n  | { status: 'success'; data: T }\n  | { status: 'error'; error: string };\n\`\`\`\n\nBy matching on \`status\`, TypeScript automatically narrows the type so you never access \`data\` before it is loaded!`,
            duration: '25 min',
            durationSeconds: 1500,
            position: 3,
            isFreePreview: false,
            isRequired: true,
            status: 'published',
            archived: false,
          },
          {
            id: 'l4-4',
            moduleId: 'm1-c4',
            title: 'Production Starter Template & Code Sandbox',
            description: 'Downloadable starter repository with Tailwind CSS, Vite, and strict TypeScript configs.',
            type: 'resource',
            duration: '15 min',
            durationSeconds: 900,
            position: 4,
            isFreePreview: false,
            isRequired: false,
            status: 'published',
            archived: false,
            resources: [
              { name: 'fullstack-starter-vite-react.zip', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', size: '3.4 MB', type: 'zip' }
            ],
          },
        ],
        quiz: {
          id: 'q1-c4',
          moduleId: 'm1-c4',
          title: 'Module 1 Quiz: TypeScript & React',
          instructions: 'Verify your understanding of TypeScript discriminated unions and React 19 state principles.',
          isRequired: true,
          passingPercent: 70,
          timeLimitMinutes: 12,
          attemptsAllowed: 3,
          shuffleQuestions: false,
          shuffleOptions: false,
          showResultsMode: 'score_and_correct',
          unlockNext: true,
          poolSize: 0,
          status: 'published',
          questions: [
            {
              id: 'q1-c4-1',
              type: 'single_choice',
              questionText: 'Why are discriminated unions preferred over multiple boolean flags for async state?',
              explanation: 'Discriminated unions make impossible states (such as isLoading=true AND isError=true) unrepresentable at compile time.',
              points: 2,
              position: 1,
              options: [
                { id: 'opt-c4-1', optionText: 'They make impossible states unrepresentable at compile time', isCorrect: true, position: 1 },
                { id: 'opt-c4-2', optionText: 'They make the JavaScript bundle smaller', isCorrect: false, position: 2 },
                { id: 'opt-c4-3', optionText: 'They run faster in the browser DOM', isCorrect: false, position: 3 },
              ],
            },
          ],
        },
      },
      {
        id: 'm2-c4',
        courseId: 'c4444444-4444-4444-4444-444444444444',
        title: 'Module 2: Node.js, Express, PostgreSQL & Drizzle ORM',
        description: 'Design RESTful APIs, manage schema migrations, relational constraints, and Cloudinary media processing.',
        objectives: [
          'Build secure REST endpoints with Express and rate limiting',
          'Author relational schemas and migrations with Drizzle ORM',
          'Integrate Cloudinary signed media uploads and secure delivery'
        ],
        position: 2,
        completionRule: 'all_lessons_plus_quiz',
        unlockRule: 'previous_completed',
        status: 'published',
        archived: false,
        timeline: {
          id: 't2-c4',
          moduleId: 'm2-c4',
          label: 'Week 2',
          suggestedDuration: '5 days',
          startOffsetDays: 6,
          releaseMode: 'self_paced',
          releaseAfterDays: 0,
          bufferMinutes: 45,
          estimatedStudyTimeMinutes: 220,
        },
        lessons: [
          {
            id: 'l4-5',
            moduleId: 'm2-c4',
            title: 'Node.js runtime, EventLoop, and Express REST APIs',
            description: 'Non-blocking I/O, middleware chaining, and robust error handling.',
            type: 'video',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            duration: '48 min',
            durationSeconds: 2880,
            position: 1,
            isFreePreview: false,
            isRequired: true,
            status: 'published',
            archived: false,
          },
          {
            id: 'l4-6',
            moduleId: 'm2-c4',
            title: 'Relational data modeling with PostgreSQL & Drizzle',
            description: 'Foreign keys, indexes, joins, and declarative schema migrations.',
            type: 'video',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
            duration: '55 min',
            durationSeconds: 3300,
            position: 2,
            isFreePreview: false,
            isRequired: true,
            status: 'published',
            archived: false,
          },
          {
            id: 'l4-7',
            moduleId: 'm2-c4',
            title: 'JWT Authentication, secure cookies & rate limiting',
            description: 'HttpOnly cookie tokens, CSRF protection, and Redis-style rate limiters.',
            type: 'video',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
            duration: '40 min',
            durationSeconds: 2400,
            position: 3,
            isFreePreview: false,
            isRequired: true,
            status: 'published',
            archived: false,
          },
          {
            id: 'l4-8',
            moduleId: 'm2-c4',
            title: 'Cloudinary Signed Uploads & Video Streaming',
            description: 'Direct browser-to-Cloudinary uploads with signature tokens and signed student URLs.',
            type: 'article',
            articleBody: `# Cloudinary Signed Direct Uploads\n\nTo prevent overloading the Express server with large video files, clients should upload directly to Cloudinary using temporary signed tokens.\n\n### Security Flow\n1. Admin browser requests signature from \`POST /api/admin/media/signature\`.\n2. Server signs the parameters with \`CLOUDINARY_API_SECRET\` and returns the signature.\n3. Admin browser sends file directly to Cloudinary API.\n4. When complete, Cloudinary returns the \`public_id\` and duration, which the server saves in the database.\n\nThis architecture easily scales to gigabytes of video without crashing the application container!`,
            duration: '30 min',
            durationSeconds: 1800,
            position: 4,
            isFreePreview: false,
            isRequired: true,
            status: 'published',
            archived: false,
          },
        ],
        quiz: {
          id: 'q2-c4',
          moduleId: 'm2-c4',
          title: 'Module 2 Quiz: Backend & Database Architecture',
          instructions: 'Complete this assessment covering PostgreSQL relations and secure media delivery.',
          isRequired: true,
          passingPercent: 75,
          timeLimitMinutes: 15,
          attemptsAllowed: 3,
          shuffleQuestions: false,
          shuffleOptions: false,
          showResultsMode: 'score_and_correct',
          unlockNext: false,
          poolSize: 0,
          status: 'published',
          questions: [
            {
              id: 'q2-c4-1',
              type: 'single_choice',
              questionText: 'What is the main benefit of browser direct uploads to Cloudinary with server signatures?',
              explanation: 'Direct uploads keep heavy multipart video streams completely off the application server.',
              points: 2,
              position: 1,
              options: [
                { id: 'opt-c4-2-1', optionText: 'Large video streams bypass application servers, preventing memory exhaustion', isCorrect: true, position: 1 },
                { id: 'opt-c4-2-2', optionText: 'It eliminates the need for any database records', isCorrect: false, position: 2 },
                { id: 'opt-c4-2-3', optionText: 'It automatically translates videos into 40 languages', isCorrect: false, position: 3 },
              ],
            },
          ],
        },
      },
    ],
  },
];

// Calculate derived totals on initial seed
for (const c of initialCoursesSeed) {
  calculateCourseTotals(c);
}

// -------------------------------------------------------------
// Persistence & Cache System
// -------------------------------------------------------------

export function loadCoursesFromFile(): CourseData[] {
  try {
    if (fs.existsSync(COURSES_FILE)) {
      const data = fs.readFileSync(COURSES_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Upgrade legacy flat courses to modern multi-module hierarchy if needed
        let modified = false;
        for (const c of parsed) {
          if (!isValidUUID(c.id)) {
            c.id = crypto.randomUUID();
            modified = true;
          }
          if (!c.modules || !Array.isArray(c.modules) || c.modules.length === 0) {
            console.log(`[Migration] Upgrading course "${c.title}" to multi-module hierarchy...`);
            const lessons = c.lessons || [];
            const mid = Math.ceil(lessons.length / 2);
            c.modules = [
              {
                id: crypto.randomUUID(),
                courseId: c.id,
                title: 'Module 1: Foundations & Architecture',
                description: 'Core concepts and architectural foundations.',
                objectives: ['Master fundamentals', 'Understand core workflows'],
                position: 1,
                completionRule: 'all_lessons',
                unlockRule: 'open',
                status: 'published',
                archived: false,
                timeline: {
                  id: crypto.randomUUID(),
                  moduleId: '',
                  label: 'Week 1',
                  suggestedDuration: '4 days',
                  startOffsetDays: 1,
                  releaseMode: 'self_paced',
                  releaseAfterDays: 0,
                  bufferMinutes: 20,
                  estimatedStudyTimeMinutes: 120,
                },
                lessons: lessons.slice(0, Math.max(1, mid)).map((l: any, i: number) => ({
                  id: l.id || crypto.randomUUID(),
                  moduleId: '',
                  title: l.title || `Lesson ${i + 1}`,
                  description: '',
                  type: 'video',
                  videoUrl: l.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                  duration: l.duration || '20 min',
                  durationSeconds: 1200,
                  position: i + 1,
                  isFreePreview: i === 0,
                  isRequired: true,
                  status: 'published',
                  archived: false,
                })),
              },
              {
                id: crypto.randomUUID(),
                courseId: c.id,
                title: 'Module 2: Practical Implementation & Capstone',
                description: 'Hands-on project development and production mastery.',
                objectives: ['Build end-to-end projects', 'Complete verified portfolio review'],
                position: 2,
                completionRule: 'all_lessons',
                unlockRule: 'previous_completed',
                status: 'published',
                archived: false,
                timeline: {
                  id: crypto.randomUUID(),
                  moduleId: '',
                  label: 'Week 2',
                  suggestedDuration: '5 days',
                  startOffsetDays: 5,
                  releaseMode: 'self_paced',
                  releaseAfterDays: 0,
                  bufferMinutes: 30,
                  estimatedStudyTimeMinutes: 160,
                },
                lessons: lessons.slice(Math.max(1, mid)).map((l: any, i: number) => ({
                  id: l.id || crypto.randomUUID(),
                  moduleId: '',
                  title: l.title || `Lesson ${mid + i + 1}`,
                  description: '',
                  type: 'video',
                  videoUrl: l.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                  duration: l.duration || '25 min',
                  durationSeconds: 1500,
                  position: i + 1,
                  isFreePreview: false,
                  isRequired: true,
                  status: 'published',
                  archived: false,
                })),
              },
            ];
            modified = true;
          }

          // Ensure all IDs are connected
          for (const m of c.modules) {
            m.courseId = c.id;
            if (m.timeline) m.timeline.moduleId = m.id;
            for (const l of m.lessons) {
              l.moduleId = m.id;
            }
            if (m.quiz) m.quiz.moduleId = m.id;
          }

          calculateCourseTotals(c);
        }

        if (modified) {
          try {
            fs.writeFileSync(COURSES_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
          } catch (writeErr) {
            console.warn('Failed to rewrite migrated courses:', writeErr);
          }
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load courses from file, falling back to initial seed:', err);
  }
  return initialCoursesSeed;
}

export const initialCourses: CourseData[] = loadCoursesFromFile();

export function persistCourses(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(COURSES_FILE, JSON.stringify(initialCourses, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist courses to file:', err);
  }
}

// Initial write if not exists
if (!fs.existsSync(COURSES_FILE)) {
  persistCourses();
}

/**
 * Synchronizes Course hierarchy to Neon PostgreSQL database
 */
export async function syncCourseToDb(course: CourseData) {
  if (!isDatabaseConnected || !db || !isValidUUID(course.id)) return;
  try {
    if (schemaSyncPromise) {
      await schemaSyncPromise;
    }

    const existing = await db
      .select({ id: schema.courses.id })
      .from(schema.courses)
      .where(eq(schema.courses.id, course.id));

    const courseValues = {
      id: course.id,
      slug: course.slug,
      title: course.title,
      subtitle: course.subtitle || '',
      description: course.description || '',
      thumbnail: course.thumbnail || '',
      banner: course.banner || '',
      previewVideo: course.previewVideo || '',
      priceCents: course.priceCents || 20000,
      currency: course.currency || 'USD',
      level: course.level || 'Beginner',
      language: course.language || 'English',
      category: course.category || 'Engineering',
      tags: course.tags || [],
      status: (course.status as any) || 'published',
      contentVersion: course.contentVersion || 1,
      publishedTime: course.publishedTime ? new Date(course.publishedTime) : new Date(),
      series: course.series || 'THE CAREER SERIES',
      tagline: course.tagline || '',
      instructor: course.instructor || 'Lead Instructor',
      instructorTitle: course.instructorTitle || 'Industry Practitioner',
      instructorBio: course.instructorBio || '',
      instructorAvatar: course.instructorAvatar || '',
      lastUpdatedDate: course.lastUpdatedDate || 'November 2026',
      badge: course.badge || '',
      rating: course.rating ? course.rating.toString() : '4.9',
      reviewCount: course.reviewCount || 128,
      outcomes: course.outcomes || [],
      requirements: course.requirements || [],
      whoIsItFor: course.whoIsItFor || [],
      totalDuration: course.totalDuration || '6 hours',
      gradientFrom: course.gradientFrom || '#312e81',
      gradientTo: course.gradientTo || '#6d28d9',
      updatedAt: new Date(),
    };

    if (existing.length > 0) {
      await db.update(schema.courses).set(courseValues).where(eq(schema.courses.id, course.id));
    } else {
      await db.insert(schema.courses).values({
        ...courseValues,
        createdAt: new Date(),
      });
    }

    // Sync Modules
    if (Array.isArray(course.modules)) {
      for (const m of course.modules) {
        if (!isValidUUID(m.id)) continue;
        const existingMod = await db.select({ id: schema.modules.id }).from(schema.modules).where(eq(schema.modules.id, m.id));
        const modValues = {
          id: m.id,
          courseId: course.id,
          title: m.title,
          description: m.description || '',
          objectives: m.objectives || [],
          position: m.position || 1,
          completionRule: m.completionRule || 'all_lessons',
          unlockRule: m.unlockRule || 'open',
          status: m.status || 'published',
          archived: m.archived || false,
          updatedAt: new Date(),
        };
        if (existingMod.length > 0) {
          await db.update(schema.modules).set(modValues).where(eq(schema.modules.id, m.id));
        } else {
          await db.insert(schema.modules).values({ ...modValues, createdAt: new Date() });
        }

        // Sync module timeline
        if (m.timeline && isValidUUID(m.timeline.id)) {
          const existingTl = await db.select({ id: schema.moduleTimelines.id }).from(schema.moduleTimelines).where(eq(schema.moduleTimelines.moduleId, m.id));
          const tlValues = {
            id: m.timeline.id,
            moduleId: m.id,
            label: m.timeline.label || 'Week 1',
            suggestedDuration: m.timeline.suggestedDuration || '3 days',
            startOffsetDays: m.timeline.startOffsetDays || 1,
            releaseMode: m.timeline.releaseMode || 'self_paced',
            releaseAfterDays: m.timeline.releaseAfterDays || 0,
            bufferMinutes: m.timeline.bufferMinutes || 0,
            estimatedStudyTimeMinutes: m.timeline.estimatedStudyTimeMinutes || 60,
            updatedAt: new Date(),
          };
          if (existingTl.length > 0) {
            await db.update(schema.moduleTimelines).set(tlValues).where(eq(schema.moduleTimelines.moduleId, m.id));
          } else {
            await db.insert(schema.moduleTimelines).values({ ...tlValues, createdAt: new Date() });
          }
        }

        // Sync Lessons
        if (Array.isArray(m.lessons)) {
          for (const l of m.lessons) {
            if (!isValidUUID(l.id)) continue;
            const existingLes = await db.select({ id: schema.lessons.id }).from(schema.lessons).where(eq(schema.lessons.id, l.id));
            const lesValues = {
              id: l.id,
              moduleId: m.id,
              title: l.title,
              description: l.description || '',
              type: (l.type as any) || 'video',
              articleBody: l.articleBody || '',
              mediaAssetId: l.mediaAssetId || null,
              mediaUrl: l.mediaUrl || l.videoUrl || null,
              videoUrl: l.videoUrl || null,
              durationFormatted: l.duration || '15 min',
              durationSeconds: l.durationSeconds || 900,
              position: l.position || 1,
              isFreePreview: l.isFreePreview || false,
              isRequired: l.isRequired !== false,
              status: l.status || 'published',
              archived: l.archived || false,
              resources: l.resources || [],
              updatedAt: new Date(),
            };
            if (existingLes.length > 0) {
              await db.update(schema.lessons).set(lesValues).where(eq(schema.lessons.id, l.id));
            } else {
              await db.insert(schema.lessons).values({ ...lesValues, createdAt: new Date() });
            }
          }
        }

        // Sync Quiz
        if (m.quiz && isValidUUID(m.quiz.id)) {
          const existingQuiz = await db.select({ id: schema.quizzes.id }).from(schema.quizzes).where(eq(schema.quizzes.id, m.quiz.id));
          const quizValues = {
            id: m.quiz.id,
            moduleId: m.id,
            title: m.quiz.title,
            instructions: m.quiz.instructions || '',
            isRequired: m.quiz.isRequired || false,
            passingPercent: m.quiz.passingPercent || 70,
            timeLimitMinutes: m.quiz.timeLimitMinutes || 0,
            attemptsAllowed: m.quiz.attemptsAllowed || 0,
            shuffleQuestions: m.quiz.shuffleQuestions || false,
            shuffleOptions: m.quiz.shuffleOptions || false,
            showResultsMode: m.quiz.showResultsMode || 'score_and_correct',
            unlockNext: m.quiz.unlockNext || false,
            poolSize: m.quiz.poolSize || 0,
            status: m.quiz.status || 'published',
            updatedAt: new Date(),
          };
          if (existingQuiz.length > 0) {
            await db.update(schema.quizzes).set(quizValues).where(eq(schema.quizzes.id, m.quiz.id));
          } else {
            await db.insert(schema.quizzes).values({ ...quizValues, createdAt: new Date() });
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('[Neon PostgreSQL] Course sync notice:', err?.message || err);
  }
}

// -------------------------------------------------------------
// Enrollments & Progress Store
// -------------------------------------------------------------

export interface MockEnrollment {
  id: string;
  userId: string;
  courseId: string;
  status: 'active' | 'revoked';
  enrolledDate: string;
  completedDate?: string;
}

export function loadEnrollmentsFromFile(): MockEnrollment[] {
  try {
    if (fs.existsSync(ENROLLMENTS_FILE)) {
      const data = fs.readFileSync(ENROLLMENTS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  return [
    {
      id: 'enr-1',
      userId: '11111111-1111-1111-1111-111111111111',
      courseId: 'c1111111-1111-1111-1111-111111111111',
      status: 'active',
      enrolledDate: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: 'enr-2',
      userId: '11111111-1111-1111-1111-111111111111',
      courseId: 'c4444444-4444-4444-4444-444444444444',
      status: 'active',
      enrolledDate: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    },
  ];
}

export const mockEnrollments: MockEnrollment[] = loadEnrollmentsFromFile();

export function persistEnrollments(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(ENROLLMENTS_FILE, JSON.stringify(mockEnrollments, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist enrollments:', err);
  }
}

export interface StudentProgressState {
  completedLessonIds: string[];
  lessonProgress: Record<string, { secondsWatched: number; lastPosition: number; completed: boolean; completedDate?: string }>;
  passedQuizIds: string[];
  quizAttempts: Record<string, Array<{ attemptNumber: number; scorePercent: number; passed: boolean; submittedDate: string }>>;
  savedQuizAnswers: Record<string, Record<string, any>>;
  lastOpenedLessonId?: string;
  totalTimeMinutes: number;
  isCompleted: boolean;
  completedDate?: string;
  updatedAt: string;
}

export function loadProgressFromFile(): Map<string, StudentProgressState> {
  const map = new Map<string, StudentProgressState>();
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      for (const [key, val] of Object.entries(parsed)) {
        map.set(key, val as StudentProgressState);
      }
    }
  } catch {
    // fallback
  }
  return map;
}

export const mockProgressMap = loadProgressFromFile();

export function persistProgress(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const obj: Record<string, any> = {};
    mockProgressMap.forEach((val, key) => {
      obj[key] = val;
    });
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist progress:', err);
  }
}

export function getStudentProgress(userId: string, courseId: string): StudentProgressState {
  const key = `${userId}:${courseId}`;
  if (!mockProgressMap.has(key)) {
    mockProgressMap.set(key, {
      completedLessonIds: [],
      lessonProgress: {},
      passedQuizIds: [],
      quizAttempts: {},
      savedQuizAnswers: {},
      totalTimeMinutes: 0,
      isCompleted: false,
      updatedAt: new Date().toISOString(),
    });
  }
  return mockProgressMap.get(key)!;
}

export function calculateCourseProgress(course: CourseData, progress: StudentProgressState, enrolledDate?: string) {
  let totalRequiredItems = 0;
  let completedRequiredItems = 0;
  let totalLessonsCount = 0;
  let completedLessonsCount = 0;
  let timeWatchedSec = 0;
  let timeRemainingSec = 0;

  const enrollmentTime = enrolledDate ? new Date(enrolledDate).getTime() : Date.now();
  const daysSinceEnrollment = Math.max(0, Math.floor((Date.now() - enrollmentTime) / (1000 * 60 * 60 * 24)));

  let previousModuleCompleted = true;
  let currentActiveLesson: LessonData | null = null;
  let currentActiveModule: ModuleData | null = null;

  const moduleStatuses: Array<{
    moduleId: string;
    title: string;
    percent: number;
    status: 'not_started' | 'in_progress' | 'completed' | 'locked';
    lockReason?: string;
    lessonsDone: number;
    totalLessons: number;
    quizStatus?: { passed: boolean; score?: number; attemptsLeft?: number; isRequired: boolean };
    estimatedStudyTimeMinutes: number;
    timeline: ModuleTimelineData;
  }> = [];

  for (let mIdx = 0; mIdx < course.modules.length; mIdx++) {
    const mod = course.modules[mIdx];
    if (mod.archived) continue;

    let modRequiredItems = 0;
    let modCompletedItems = 0;
    let modLessonsDone = 0;
    let modTotalLessons = 0;

    // Determine lock state
    let isLocked = false;
    let lockReason = '';

    if (mod.unlockRule === 'previous_completed' && !previousModuleCompleted) {
      isLocked = true;
      lockReason = 'Complete previous module to unlock';
    } else if (mod.timeline?.releaseMode === 'scheduled' && mod.timeline.releaseAfterDays > daysSinceEnrollment) {
      isLocked = true;
      const daysLeft = mod.timeline.releaseAfterDays - daysSinceEnrollment;
      lockReason = `Unlocks in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`;
    }

    for (const les of mod.lessons) {
      if (les.archived) continue;
      modTotalLessons++;
      totalLessonsCount++;

      const isCompleted = progress.completedLessonIds.includes(les.id);
      if (isCompleted) {
        modLessonsDone++;
        completedLessonsCount++;
        timeWatchedSec += les.durationSeconds || 900;
      } else {
        timeRemainingSec += les.durationSeconds || 900;
        if (!currentActiveLesson && !isLocked) {
          currentActiveLesson = les;
          currentActiveModule = mod;
        }
      }

      if (les.isRequired) {
        modRequiredItems++;
        totalRequiredItems++;
        if (isCompleted) {
          modCompletedItems++;
          completedRequiredItems++;
        }
      }
    }

    // Module Quiz check
    let quizStatus = undefined;
    if (mod.quiz && mod.quiz.status !== 'draft') {
      const isPassed = progress.passedQuizIds.includes(mod.quiz.id);
      const attempts = progress.quizAttempts[mod.quiz.id] || [];
      const bestScore = attempts.length > 0 ? Math.max(...attempts.map((a) => a.scorePercent)) : undefined;
      const attemptsLeft = mod.quiz.attemptsAllowed > 0 ? Math.max(0, mod.quiz.attemptsAllowed - attempts.length) : undefined;

      quizStatus = {
        passed: isPassed,
        score: bestScore,
        attemptsLeft,
        isRequired: mod.quiz.isRequired,
      };

      if (mod.completionRule === 'all_lessons_plus_quiz' || mod.quiz.isRequired) {
        modRequiredItems++;
        totalRequiredItems++;
        if (isPassed) {
          modCompletedItems++;
          completedRequiredItems++;
        }
      }
    }

    const modPercent = modRequiredItems > 0 ? Math.round((modCompletedItems / modRequiredItems) * 100) : 100;
    let modStatus: 'not_started' | 'in_progress' | 'completed' | 'locked' = 'not_started';

    if (isLocked) {
      modStatus = 'locked';
    } else if (modPercent >= 100) {
      modStatus = 'completed';
    } else if (modPercent > 0 || modLessonsDone > 0) {
      modStatus = 'in_progress';
    }

    // For unlocking subsequent modules
    previousModuleCompleted = modStatus === 'completed';

    moduleStatuses.push({
      moduleId: mod.id,
      title: mod.title,
      percent: modPercent,
      status: modStatus,
      lockReason: isLocked ? lockReason : undefined,
      lessonsDone: modLessonsDone,
      totalLessons: modTotalLessons,
      quizStatus,
      estimatedStudyTimeMinutes: mod.timeline?.estimatedStudyTimeMinutes || 60,
      timeline: mod.timeline,
    });
  }

  // Course Progress Percent (Section 7.3 & 9.2: Completed students keep 100% bonus status)
  let overallPercent = totalRequiredItems > 0 ? Math.round((completedRequiredItems / totalRequiredItems) * 100) : 0;
  if (progress.isCompleted) {
    overallPercent = 100;
  } else if (overallPercent >= 100) {
    progress.isCompleted = true;
    progress.completedDate = new Date().toISOString();
  }

  // Pace indicator based on suggested start offset (Section 5.3)
  let paceIndicator: 'on_track' | 'behind_pace' = 'on_track';
  for (const m of moduleStatuses) {
    if (m.timeline?.startOffsetDays && daysSinceEnrollment > m.timeline.startOffsetDays + 3 && m.status !== 'completed') {
      paceIndicator = 'behind_pace';
      break;
    }
  }

  return {
    percent: overallPercent,
    isCompleted: progress.isCompleted,
    completedLessons: completedLessonsCount,
    totalLessons: totalLessonsCount,
    timeWatchedFormatted: `${Math.round(timeWatchedSec / 60)} min`,
    timeRemainingFormatted: `${Math.round(timeRemainingSec / 60)} min`,
    paceIndicator,
    currentLesson: currentActiveLesson,
    currentModule: currentActiveModule,
    modules: moduleStatuses,
  };
}

export interface MockPurchase {
  id: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  amountCents: number;
  currency: string;
  provider: 'cashfree' | 'stripe' | 'paypal';
  orderId?: string;
  status: 'paid' | 'refunded' | 'pending';
  createdAt: string;
}

export const mockPurchases: MockPurchase[] = [
  {
    id: 'pur-1',
    userId: '11111111-1111-1111-1111-111111111111',
    studentName: 'Priya Sharma',
    studentEmail: 'priya.s@example.com',
    courseId: 'c1111111-1111-1111-1111-111111111111',
    courseTitle: 'Product Design, from insight to impact',
    amountCents: 20000,
    currency: 'USD',
    provider: 'cashfree',
    status: 'paid',
    createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'pur-2',
    userId: '11111111-1111-1111-1111-111111111111',
    studentName: 'Priya Sharma',
    studentEmail: 'priya.s@example.com',
    courseId: 'c4444444-4444-4444-4444-444444444444',
    courseTitle: 'Full-Stack Web Development Bootcamp',
    amountCents: 20000,
    currency: 'USD',
    provider: 'cashfree',
    status: 'paid',
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
];

export function getUserCourseProgress(userId: string, course: CourseData, _isEnrolled?: boolean) {
  const prog = getStudentProgress(userId, course.id);
  const summary = calculateCourseProgress(course, prog);
  return {
    completedLessons: summary.completedLessons,
    totalLessons: summary.totalLessons,
    percent: summary.percent,
    isCompleted: summary.isCompleted,
    lastOpenedLessonNumber: 1,
    lastOpenedLessonTitle: summary.currentLesson?.title || 'Start Learning',
    totalTimeMinutes: Math.round((summary.completedLessons * 25)),
  };
}

export async function enrollUserInCourse(userId: string, courseId: string, purchaseId?: string) {
  const existing = mockEnrollments.find((e) => e.userId === userId && e.courseId === courseId);
  if (!existing) {
    mockEnrollments.push({
      id: 'enr-' + Date.now().toString(36),
      userId,
      courseId,
      status: 'active',
      enrolledDate: new Date().toISOString(),
    });
    persistEnrollments();
  }

  if (isDatabaseConnected && db && isValidUUID(userId) && isValidUUID(courseId)) {
    try {
      const records = await db
        .select()
        .from(schema.enrollments)
        .where(and(eq(schema.enrollments.userId, userId), eq(schema.enrollments.courseId, courseId)));
      if (records.length === 0) {
        await db.insert(schema.enrollments).values({
          userId,
          courseId,
          purchaseId: purchaseId && isValidUUID(purchaseId) ? purchaseId : undefined,
          status: 'active',
          enrolledDate: new Date(),
        });
      }
    } catch (err: any) {
      console.warn('DB enrollment sync warning:', err?.message || err);
    }
  }
}

// -------------------------------------------------------------
// STUDENT ENDPOINTS (PDF Section 12.1)
// -------------------------------------------------------------

// 1. GET /api/courses/public (Open Course Catalog for Landing Page)
router.get('/public', async (_req: Request, res: Response) => {
  try {
    const published = initialCourses.filter((c) => c.status === 'published');
    return res.status(200).json({
      success: true,
      courses: published,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch public course catalog.' });
  }
});

// 2. GET /api/courses/detail/:slug (Course Overview Page - PDF Section 3 & 12.1)
// Public overview with modules, lesson titles, and timelines. No authenticated media links.
router.get('/detail/:slug', async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    const course = initialCourses.find((c) => c.slug === slug || c.id === slug);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // Check optional authenticated enrollment
    let isEnrolled = false;
    let userId: string | null = null;

    try {
      const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        const decoded: any = (await import('jsonwebtoken')).default.verify(
          token,
          process.env.JWT_SECRET || 'super_secret_jwt_internwala_production_ready_key_2026'
        );
        userId = decoded?.id;
        if (userId) {
          isEnrolled = mockEnrollments.some((e) => e.userId === userId && e.courseId === course.id && e.status === 'active');
        }
      }
    } catch {
      // Unauthenticated visitor
    }

    // Return overview representation without internal protected media URLs
    const sanitizedModules = course.modules
      .filter((m) => !m.archived && m.status === 'published')
      .map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        objectives: m.objectives,
        position: m.position,
        completionRule: m.completionRule,
        timeline: m.timeline,
        lessonCount: m.lessons.filter((l) => !l.archived && l.status === 'published').length,
        lessons: m.lessons
          .filter((l) => !l.archived && l.status === 'published')
          .map((l) => ({
            id: l.id,
            title: l.title,
            description: l.description,
            type: l.type,
            duration: l.duration,
            durationSeconds: l.durationSeconds,
            position: l.position,
            isFreePreview: l.isFreePreview,
            isRequired: l.isRequired,
            // Include videoUrl ONLY if it is marked free preview
            videoUrl: l.isFreePreview ? l.videoUrl || l.mediaUrl : undefined,
          })),
        quiz: m.quiz && m.quiz.status === 'published' ? {
          id: m.quiz.id,
          title: m.quiz.title,
          instructions: m.quiz.instructions,
          isRequired: m.quiz.isRequired,
          questionCount: m.quiz.questions.length,
          passingPercent: m.quiz.passingPercent,
          timeLimitMinutes: m.quiz.timeLimitMinutes,
        } : undefined,
      }));

    return res.status(200).json({
      success: true,
      course: {
        ...course,
        modules: sanitizedModules,
        isEnrolled,
      },
    });
  } catch (error: any) {
    console.error('Course detail fetch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load course details.' });
  }
});

// 3. GET /api/courses/:id/learn (Enrolled Classroom View - PDF Section 12.1)
// Requires active enrollment. Returns modules, lessons, quiz status, timeline, and student progress.
router.get('/:id/learn', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const courseId = req.params.id;

    const course = initialCourses.find((c) => c.id === courseId || c.slug === courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // Verify enrollment
    const enrollment = mockEnrollments.find((e) => e.userId === userId && e.courseId === course.id && e.status === 'active');
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        code: 'ENROLLMENT_REQUIRED',
        message: 'You must be enrolled in this course to access the classroom.',
      });
    }

    const progress = getStudentProgress(userId, course.id);
    const progressSummary = calculateCourseProgress(course, progress, enrollment.enrolledDate);

    // Filter published, non-archived content
    const modulesWithProgress = course.modules
      .filter((m) => !m.archived && m.status === 'published')
      .map((m) => {
        const modStatus = progressSummary.modules.find((ms) => ms.moduleId === m.id);
        const isLocked = modStatus?.status === 'locked';

        return {
          id: m.id,
          title: m.title,
          description: m.description,
          objectives: m.objectives,
          position: m.position,
          completionRule: m.completionRule,
          unlockRule: m.unlockRule,
          status: modStatus?.status || 'not_started',
          lockReason: modStatus?.lockReason,
          percent: modStatus?.percent || 0,
          timeline: m.timeline,
          quizStatus: modStatus?.quizStatus,
          lessons: m.lessons
            .filter((l) => !l.archived && l.status === 'published')
            .map((l) => {
              const isCompleted = progress.completedLessonIds.includes(l.id);
              const lessonProg = progress.lessonProgress[l.id];

              return {
                id: l.id,
                title: l.title,
                description: l.description,
                type: l.type,
                duration: l.duration,
                durationSeconds: l.durationSeconds,
                position: l.position,
                isFreePreview: l.isFreePreview,
                isRequired: l.isRequired,
                completed: isCompleted,
                lastPosition: lessonProg?.lastPosition || 0,
                secondsWatched: lessonProg?.secondsWatched || 0,
                locked: isLocked,
              };
            }),
          quiz: m.quiz && m.quiz.status === 'published' ? {
            id: m.quiz.id,
            title: m.quiz.title,
            instructions: m.quiz.instructions,
            isRequired: m.quiz.isRequired,
            passingPercent: m.quiz.passingPercent,
            timeLimitMinutes: m.quiz.timeLimitMinutes,
            attemptsAllowed: m.quiz.attemptsAllowed,
            questionCount: m.quiz.questions.length,
            passed: progress.passedQuizIds.includes(m.quiz.id),
            locked: isLocked,
          } : undefined,
        };
      });

    return res.status(200).json({
      success: true,
      course: {
        id: course.id,
        slug: course.slug,
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        thumbnail: course.thumbnail,
        instructor: course.instructor,
        instructorTitle: course.instructorTitle,
        contentVersion: course.contentVersion,
        totalDuration: course.totalDuration,
        lessonCount: course.lessonCount,
        moduleCount: course.moduleCount,
      },
      progress: progressSummary,
      modules: modulesWithProgress,
    });
  } catch (error: any) {
    console.error('Course learn error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load course learning context.' });
  }
});

// 4. GET /api/courses/:courseId/lessons/:lessonId (Lesson Content & Signed Cloudinary URL - PDF Section 10.2 & 12.1)
router.get('/:courseId/lessons/:lessonId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { courseId, lessonId } = req.params;

    const course = initialCourses.find((c) => c.id === courseId || c.slug === courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    let targetModule: ModuleData | null = null;
    let targetLesson: LessonData | null = null;

    for (const m of course.modules) {
      const found = m.lessons.find((l) => l.id === lessonId);
      if (found) {
        targetModule = m;
        targetLesson = found;
        break;
      }
    }

    if (!targetLesson || !targetModule) {
      return res.status(404).json({ success: false, message: 'Lesson not found.' });
    }

    // Verify enrollment or free preview
    const isEnrolled = mockEnrollments.some((e) => e.userId === userId && e.courseId === course.id && e.status === 'active');
    if (!isEnrolled && !targetLesson.isFreePreview) {
      return res.status(403).json({ success: false, message: 'Enrollment required for this lesson.' });
    }

    // Generate signed, short-lived Cloudinary URL if media asset is attached (Section 10.2)
    let streamingUrl = targetLesson.videoUrl || targetLesson.mediaUrl;
    if (targetLesson.mediaAssetId) {
      streamingUrl = generateSignedDeliveryUrl(targetLesson.mediaAssetId, {
        resourceType: targetLesson.type === 'video' ? 'video' : targetLesson.type === 'audio' ? 'video' : 'raw',
        expiresInSeconds: 3600,
      });
    }

    const progress = getStudentProgress(userId, course.id);
    const lessonProg = progress.lessonProgress[targetLesson.id];

    return res.status(200).json({
      success: true,
      lesson: {
        id: targetLesson.id,
        moduleId: targetModule.id,
        moduleTitle: targetModule.title,
        title: targetLesson.title,
        description: targetLesson.description,
        type: targetLesson.type,
        articleBody: targetLesson.articleBody,
        mediaUrl: streamingUrl,
        videoUrl: streamingUrl,
        duration: targetLesson.duration,
        durationSeconds: targetLesson.durationSeconds,
        position: targetLesson.position,
        isFreePreview: targetLesson.isFreePreview,
        isRequired: targetLesson.isRequired,
        resources: targetLesson.resources || [],
        completed: progress.completedLessonIds.includes(targetLesson.id),
        lastPosition: lessonProg?.lastPosition || 0,
        secondsWatched: lessonProg?.secondsWatched || 0,
      },
    });
  } catch (error: any) {
    console.error('Fetch lesson error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load lesson content.' });
  }
});

// 5. POST /api/courses/:courseId/lessons/:lessonId/progress (Save Position & Auto-Complete - PDF Section 7.1 & 12.1)
router.post('/:courseId/lessons/:lessonId/progress', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { courseId, lessonId } = req.params;
    const { secondsWatched, lastPosition, markCompleted } = req.body;

    const course = initialCourses.find((c) => c.id === courseId || c.slug === courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    let targetLesson: LessonData | null = null;
    for (const m of course.modules) {
      const found = m.lessons.find((l) => l.id === lessonId);
      if (found) {
        targetLesson = found;
        break;
      }
    }

    if (!targetLesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found.' });
    }

    const progress = getStudentProgress(userId, course.id);
    const existing = progress.lessonProgress[targetLesson.id] || {
      secondsWatched: 0,
      lastPosition: 0,
      completed: false,
    };

    if (typeof secondsWatched === 'number') {
      existing.secondsWatched = Math.max(existing.secondsWatched, secondsWatched);
    }
    if (typeof lastPosition === 'number') {
      existing.lastPosition = lastPosition;
    }

    // Auto-complete rule (Section 7.1): Video/audio >= 90% watched, or manual mark
    const ninetyPercent = (targetLesson.durationSeconds || 900) * 0.9;
    const shouldComplete = markCompleted || (existing.secondsWatched >= ninetyPercent && targetLesson.durationSeconds > 0);

    if (shouldComplete && !existing.completed) {
      existing.completed = true;
      existing.completedDate = new Date().toISOString();
      if (!progress.completedLessonIds.includes(targetLesson.id)) {
        progress.completedLessonIds.push(targetLesson.id);
      }
    }

    progress.lessonProgress[targetLesson.id] = existing;
    progress.lastOpenedLessonId = targetLesson.id;
    progress.updatedAt = new Date().toISOString();

    persistProgress();

    // Recalculate full course & module progress
    const enrollment = mockEnrollments.find((e) => e.userId === userId && e.courseId === course.id);
    const summary = calculateCourseProgress(course, progress, enrollment?.enrolledDate);

    return res.status(200).json({
      success: true,
      message: 'Lesson progress saved.',
      lessonProgress: existing,
      courseProgress: summary,
    });
  } catch (error: any) {
    console.error('Save lesson progress error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record progress.' });
  }
});

// 6. GET /api/courses/:courseId/modules/:moduleId/quiz (Quiz Questions WITHOUT Correct Answers - PDF Section 6.3 & 12.1)
router.get('/:courseId/modules/:moduleId/quiz', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { courseId, moduleId } = req.params;

    const course = initialCourses.find((c) => c.id === courseId || c.slug === courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

    const targetModule = course.modules.find((m) => m.id === moduleId);
    if (!targetModule || !targetModule.quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found for this module.' });
    }

    const quiz = targetModule.quiz;
    const progress = getStudentProgress(userId, course.id);

    // Check attempts limit
    const attempts = progress.quizAttempts[quiz.id] || [];
    if (quiz.attemptsAllowed > 0 && attempts.length >= quiz.attemptsAllowed && !progress.passedQuizIds.includes(quiz.id)) {
      return res.status(403).json({
        success: false,
        code: 'ATTEMPTS_EXHAUSTED',
        message: `Maximum attempts (${quiz.attemptsAllowed}) reached for this quiz.`,
      });
    }

    // SANITIZATION: Never send correct answers or explanations before submission! (Section 6.3)
    let questionsToSend = quiz.questions.map((q) => ({
      id: q.id,
      type: q.type,
      questionText: q.questionText,
      imageUrl: q.imageUrl,
      points: q.points,
      position: q.position,
      options: q.options.map((opt) => ({
        id: opt.id,
        optionText: opt.optionText,
        position: opt.position,
      })),
    }));

    if (quiz.shuffleQuestions) {
      questionsToSend = questionsToSend.sort(() => Math.random() - 0.5);
    }
    if (quiz.shuffleOptions) {
      for (const q of questionsToSend) {
        q.options = q.options.sort(() => Math.random() - 0.5);
      }
    }

    const savedAnswers = progress.savedQuizAnswers[quiz.id] || {};

    return res.status(200).json({
      success: true,
      quiz: {
        id: quiz.id,
        moduleId: targetModule.id,
        title: quiz.title,
        instructions: quiz.instructions,
        isRequired: quiz.isRequired,
        passingPercent: quiz.passingPercent,
        timeLimitMinutes: quiz.timeLimitMinutes,
        attemptsAllowed: quiz.attemptsAllowed,
        attemptNumber: attempts.length + 1,
        questions: questionsToSend,
        savedAnswers,
        alreadyPassed: progress.passedQuizIds.includes(quiz.id),
      },
    });
  } catch (error: any) {
    console.error('Fetch quiz error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load quiz.' });
  }
});

// 7. POST /api/courses/:courseId/modules/:moduleId/quiz/save-answer (Auto-Save Answers - PDF Section 6.3)
router.post('/:courseId/modules/:moduleId/quiz/save-answer', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { courseId, moduleId } = req.params;
    const { questionId, answer } = req.body;

    const course = initialCourses.find((c) => c.id === courseId || c.slug === courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

    const targetModule = course.modules.find((m) => m.id === moduleId);
    if (!targetModule || !targetModule.quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    const progress = getStudentProgress(userId, course.id);
    if (!progress.savedQuizAnswers[targetModule.quiz.id]) {
      progress.savedQuizAnswers[targetModule.quiz.id] = {};
    }
    progress.savedQuizAnswers[targetModule.quiz.id][questionId] = answer;
    persistProgress();

    return res.status(200).json({ success: true, message: 'Answer saved.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to auto-save answer.' });
  }
});

// 8. POST /api/courses/:courseId/modules/:moduleId/quiz/submit (Server-Side Grading - PDF Section 6.3 & 12.1)
router.post('/:courseId/modules/:moduleId/quiz/submit', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { courseId, moduleId } = req.params;
    const { answers, timeTakenSeconds } = req.body; // answers is a map: { [questionId]: optionId | string | string[] }

    const course = initialCourses.find((c) => c.id === courseId || c.slug === courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

    const targetModule = course.modules.find((m) => m.id === moduleId);
    if (!targetModule || !targetModule.quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    const quiz = targetModule.quiz;
    const progress = getStudentProgress(userId, course.id);

    // Grade on server
    let totalPoints = 0;
    let earnedPoints = 0;
    const reviewDetails: any[] = [];

    for (const q of quiz.questions) {
      totalPoints += q.points || 1;
      const studentAnswer = answers ? answers[q.id] : undefined;
      let isCorrect = false;

      if (q.type === 'single_choice' || q.type === 'true_false') {
        const correctOpt = q.options.find((o) => o.isCorrect);
        isCorrect = correctOpt ? correctOpt.id === studentAnswer : false;
      } else if (q.type === 'multiple_choice') {
        const correctOptIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);
        const selectedIds = Array.isArray(studentAnswer) ? studentAnswer : studentAnswer ? [studentAnswer] : [];
        const isMatch = correctOptIds.length === selectedIds.length && correctOptIds.every((id) => selectedIds.includes(id));
        isCorrect = isMatch;
      } else if (q.type === 'short_text') {
        const accepted = q.acceptedShortAnswers || [];
        const userText = typeof studentAnswer === 'string' ? studentAnswer.trim().toLowerCase() : '';
        isCorrect = accepted.some((a) => a.trim().toLowerCase() === userText);
      }

      if (isCorrect) {
        earnedPoints += q.points || 1;
      }

      // Review details based on showResultsMode
      reviewDetails.push({
        questionId: q.id,
        questionText: q.questionText,
        type: q.type,
        isCorrect,
        pointsEarned: isCorrect ? q.points : 0,
        explanation: quiz.showResultsMode === 'score_and_explanations' ? q.explanation : undefined,
        correctAnswer: quiz.showResultsMode !== 'score_only' ? q.options.filter((o) => o.isCorrect).map((o) => o.optionText) : undefined,
      });
    }

    const scorePercent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 100;
    const passed = scorePercent >= quiz.passingPercent;

    if (!progress.quizAttempts[quiz.id]) {
      progress.quizAttempts[quiz.id] = [];
    }
    const attemptNumber = progress.quizAttempts[quiz.id].length + 1;
    progress.quizAttempts[quiz.id].push({
      attemptNumber,
      scorePercent,
      passed,
      submittedDate: new Date().toISOString(),
    });

    if (passed && !progress.passedQuizIds.includes(quiz.id)) {
      progress.passedQuizIds.push(quiz.id);
    }

    // Clear saved answers
    delete progress.savedQuizAnswers[quiz.id];
    progress.updatedAt = new Date().toISOString();
    persistProgress();

    // Recalculate progress
    const enrollment = mockEnrollments.find((e) => e.userId === userId && e.courseId === course.id);
    const summary = calculateCourseProgress(course, progress, enrollment?.enrolledDate);

    return res.status(200).json({
      success: true,
      result: {
        scorePercent,
        passed,
        passingPercent: quiz.passingPercent,
        earnedPoints,
        totalPoints,
        attemptNumber,
        showResultsMode: quiz.showResultsMode,
        review: quiz.showResultsMode !== 'score_only' ? reviewDetails : undefined,
      },
      courseProgress: summary,
    });
  } catch (error: any) {
    console.error('Submit quiz error:', error);
    return res.status(500).json({ success: false, message: 'Failed to grade quiz.' });
  }
});

// 9. GET /api/courses/dashboard (Student Dashboard - PDF Section 7.4)
router.get('/dashboard', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const search = (req.query.search as string)?.toLowerCase().trim() || '';

    const enrolledList = mockEnrollments.filter((e) => e.userId === userId && e.status === 'active');
    const enrolledIds = enrolledList.map((e) => e.courseId);

    const enrolledCourses = initialCourses
      .filter((c) => enrolledIds.includes(c.id))
      .filter((c) => !search || c.title.toLowerCase().includes(search) || c.category.toLowerCase().includes(search));

    const processed = enrolledCourses.map((c) => {
      const enr = enrolledList.find((e) => e.courseId === c.id);
      const prog = getStudentProgress(userId, c.id);
      const summary = calculateCourseProgress(c, prog, enr?.enrolledDate);

      return {
        ...c,
        isEnrolled: true,
        progress: {
          completedLessons: summary.completedLessons,
          totalLessons: summary.totalLessons,
          percent: summary.percent,
          isCompleted: summary.isCompleted,
          timeWatchedFormatted: summary.timeWatchedFormatted,
          timeRemainingFormatted: summary.timeRemainingFormatted,
          paceIndicator: summary.paceIndicator,
          lastOpenedLessonTitle: summary.currentLesson?.title || (c.modules[0]?.lessons[0]?.title ?? 'Start Lesson 1'),
          lastOpenedLessonId: summary.currentLesson?.id || (c.modules[0]?.lessons[0]?.id ?? ''),
        },
      };
    });

    const completed = processed.filter((c) => c.progress.isCompleted || c.progress.percent >= 100);
    const inProgress = processed.filter((c) => !c.progress.isCompleted && c.progress.percent < 100);

    const stats = {
      enrolledCount: processed.length,
      completedLessonsCount: processed.reduce((acc, cur) => acc + cur.progress.completedLessons, 0),
      learningTimeFormatted: `${Math.round(processed.reduce((acc, cur) => acc + (cur.progress.completedLessons * 25), 0) / 60)}h`,
      certificatesCount: completed.length,
    };

    return res.status(200).json({
      success: true,
      stats,
      courses: processed,
      enrolledCourses: processed,
      myLearnings: inProgress,
      completedCourses: completed,
      continueLearning: inProgress[0] || processed[0] || null,
      user: {
        id: req.user!.id,
        name: req.user!.name,
        email: req.user!.email,
        emailVerified: req.user!.emailVerified,
        avatarUrl: req.user!.avatarUrl,
      },
    });
  } catch (error: any) {
    console.error('Dashboard fetch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load dashboard data.' });
  }
});

// 10. POST /api/courses/:id/enroll (Protected - Enroll in course)
router.post('/:id/enroll', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const courseId = req.params.id;

    if (!req.user!.emailVerified) {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email before enrolling in courses.',
      });
    }

    await enrollUserInCourse(userId, courseId);

    return res.status(200).json({
      success: true,
      message: 'Successfully enrolled!',
      courseId,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to enroll.' });
  }
});

// 11. Legacy compatibility endpoint GET /api/courses
router.get('/', async (_req: Request, res: Response) => {
  return res.status(200).json({ success: true, courses: initialCourses });
});

export default router;
