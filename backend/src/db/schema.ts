import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  pgEnum,
  jsonb,
} from 'drizzle-orm/pg-core';

// Enums as specified in PRD Section 7 and LMS Course Structure PDF
export const roleEnum = pgEnum('user_role', ['student', 'admin']);
export const courseStatusEnum = pgEnum('course_status', ['draft', 'published', 'archived']);
export const lessonTypeEnum = pgEnum('lesson_type', ['video', 'audio', 'article', 'resource']);
export const paymentProviderEnum = pgEnum('payment_provider', ['cashfree', 'stripe', 'paypal']);
export const purchaseStatusEnum = pgEnum('purchase_status', ['pending', 'paid', 'refunded', 'failed']);
export const enrollmentStatusEnum = pgEnum('enrollment_status', ['active', 'revoked']);
export const certificateStatusEnum = pgEnum('certificate_status', ['valid', 'revoked']);

// 1. Users Table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  verificationToken: varchar('verification_token', { length: 255 }),
  resetToken: varchar('reset_token', { length: 255 }),
  resetTokenExpires: timestamp('reset_token_expires'),
  role: roleEnum('role').default('student').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. Courses Table (PDF Section 3 & 11)
export const courses = pgTable('courses', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  subtitle: text('subtitle'), // Subtitle is a one-line promise
  description: text('description').notNull(), // Rich text long description
  thumbnail: text('thumbnail'), // Cloudinary image reference
  banner: text('banner'), // Cloudinary banner image reference
  previewVideo: text('preview_video'), // Cloudinary video reference
  priceCents: integer('price_cents').default(20000).notNull(), // In smallest currency unit
  currency: varchar('currency', { length: 10 }).default('USD').notNull(),
  level: varchar('level', { length: 50 }).default('Beginner').notNull(), // Beginner, Intermediate, Advanced
  language: varchar('language', { length: 50 }).default('English').notNull(),
  category: varchar('category', { length: 100 }).default('Engineering').notNull(),
  tags: jsonb('tags').$type<string[]>().default([]),
  status: courseStatusEnum('status').default('published').notNull(), // draft, published, archived
  contentVersion: integer('content_version').default(1).notNull(),
  publishedTime: timestamp('published_time'),
  series: varchar('series', { length: 255 }).default('THE CAREER SERIES'),
  tagline: varchar('tagline', { length: 255 }).default('Build practical mastery.'),
  instructor: varchar('instructor', { length: 255 }).default('Lead Instructor').notNull(),
  instructorTitle: varchar('instructor_title', { length: 255 }).default('Industry Practitioner'),
  instructorBio: text('instructor_bio').default('Experienced industry practitioner and tech mentor with extensive real-world experience.'),
  instructorAvatar: text('instructor_avatar'),
  lastUpdatedDate: varchar('last_updated_date', { length: 50 }).default('November 2026'),
  badge: varchar('badge', { length: 50 }),
  rating: varchar('rating', { length: 10 }).default('4.9'),
  reviewCount: integer('review_count').default(128),
  outcomes: jsonb('outcomes').$type<string[]>().default([]), // What you will learn checklist
  requirements: jsonb('requirements').$type<string[]>().default([]), // Prerequisites checklist
  whoIsItFor: jsonb('who_is_it_for').$type<string[]>().default([]), // Target audience checklist
  totalDuration: varchar('total_duration', { length: 50 }).default('6 hours'),
  gradientFrom: varchar('gradient_from', { length: 20 }).default('#312e81'),
  gradientTo: varchar('gradient_to', { length: 20 }).default('#6d28d9'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Modules Table (PDF Section 4 & 11)
export const modules = pgTable('modules', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').default('').notNull(), // Rich text short summary
  objectives: jsonb('objectives').$type<string[]>().default([]), // Learning objectives checklist
  position: integer('position').default(1).notNull(), // Order inside course
  completionRule: varchar('completion_rule', { length: 50 }).default('all_lessons').notNull(), // 'all_lessons' | 'all_lessons_plus_quiz'
  unlockRule: varchar('unlock_rule', { length: 50 }).default('open').notNull(), // 'open' | 'previous_completed' | 'scheduled'
  status: varchar('status', { length: 20 }).default('published').notNull(), // 'draft' | 'published'
  archived: boolean('archived').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 4. Module Timelines Table (PDF Section 5 & 11)
export const moduleTimelines = pgTable('module_timelines', {
  id: uuid('id').defaultRandom().primaryKey(),
  moduleId: uuid('module_id').references(() => modules.id, { onDelete: 'cascade' }).notNull().unique(),
  label: varchar('label', { length: 100 }).default('Week 1'), // Optional display label e.g. Week 1, Phase 2
  suggestedDuration: varchar('suggested_duration', { length: 100 }).default('3 days'), // e.g. 3 days, 1 week
  startOffsetDays: integer('start_offset_days').default(1).notNull(), // Day number from enrollment when module ideally starts
  releaseMode: varchar('release_mode', { length: 20 }).default('self_paced').notNull(), // 'self_paced' | 'scheduled'
  releaseAfterDays: integer('release_after_days').default(0).notNull(), // Days after enrollment when module unlocks
  bufferMinutes: integer('buffer_minutes').default(0).notNull(), // Optional admin buffer for practice work
  estimatedStudyTimeMinutes: integer('estimated_study_time_minutes').default(60).notNull(), // Calculated automatically
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 5. Lessons Table (PDF Section 4.1 & 11)
export const lessons = pgTable('lessons', {
  id: uuid('id').defaultRandom().primaryKey(),
  moduleId: uuid('module_id').references(() => modules.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').default(''),
  type: lessonTypeEnum('type').default('video').notNull(), // 'video', 'audio', 'article', 'resource'
  articleBody: text('article_body').default(''), // Rich text in database
  mediaAssetId: varchar('media_asset_id', { length: 255 }),
  mediaUrl: text('media_url'),
  durationSeconds: integer('duration_seconds').default(900).notNull(),
  durationFormatted: varchar('duration_formatted', { length: 50 }).default('15 min'),
  position: integer('position').default(1).notNull(),
  isFreePreview: boolean('is_free_preview').default(false).notNull(),
  isRequired: boolean('is_required').default(true).notNull(), // Optional lessons do not count toward completion %
  status: varchar('status', { length: 20 }).default('published').notNull(), // 'draft' | 'published'
  archived: boolean('archived').default(false).notNull(),
  resources: jsonb('resources').$type<Array<{ name: string; url: string; size?: string; type?: string }>>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 6. Media Assets Table (PDF Section 10 & 11)
export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  publicId: varchar('public_id', { length: 255 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }).default('image').notNull(), // image, video, raw, audio
  deliveryType: varchar('delivery_type', { length: 50 }).default('public').notNull(), // public or authenticated
  format: varchar('format', { length: 50 }),
  duration: integer('duration'), // seconds
  bytes: integer('bytes'),
  version: varchar('version', { length: 50 }),
  uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. Lesson Resources Table (PDF Section 11)
export const lessonResources = pgTable('lesson_resources', {
  id: uuid('id').defaultRandom().primaryKey(),
  lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'cascade' }),
  moduleId: uuid('module_id').references(() => modules.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  mediaAssetId: varchar('media_asset_id', { length: 255 }),
  url: text('url').notNull(),
  position: integer('position').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 8. Quizzes Table (PDF Section 6 & 11)
export const quizzes = pgTable('quizzes', {
  id: uuid('id').defaultRandom().primaryKey(),
  moduleId: uuid('module_id').references(() => modules.id, { onDelete: 'cascade' }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  instructions: text('instructions').default(''),
  isRequired: boolean('is_required').default(false).notNull(), // Yes means module not complete until quiz is passed
  passingPercent: integer('passing_percent').default(70).notNull(),
  timeLimitMinutes: integer('time_limit_minutes').default(0).notNull(), // 0 means none
  attemptsAllowed: integer('attempts_allowed').default(0).notNull(), // 0 means unlimited
  shuffleQuestions: boolean('shuffle_questions').default(false).notNull(),
  shuffleOptions: boolean('shuffle_options').default(false).notNull(),
  showResultsMode: varchar('show_results_mode', { length: 50 }).default('score_and_correct').notNull(), // score_only, score_and_correct, score_and_explanations
  unlockNext: boolean('unlock_next').default(false).notNull(), // Whether passing this quiz is needed to open next module
  poolSize: integer('pool_size').default(0).notNull(), // Optional random pick count
  status: varchar('status', { length: 20 }).default('published').notNull(), // draft | published
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 9. Quiz Questions Table (PDF Section 6.2 & 11)
export const quizQuestions = pgTable('quiz_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  quizId: uuid('quiz_id').references(() => quizzes.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 50 }).default('single_choice').notNull(), // single_choice, multiple_choice, true_false, short_text
  questionText: text('question_text').notNull(),
  imageUrl: text('image_url'), // Cloudinary image
  explanation: text('explanation').default(''), // Shown after submission
  points: integer('points').default(1).notNull(),
  position: integer('position').default(1).notNull(),
  acceptedShortAnswers: jsonb('accepted_short_answers').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 10. Quiz Options Table (PDF Section 6.2 & 11)
export const quizOptions = pgTable('quiz_options', {
  id: uuid('id').defaultRandom().primaryKey(),
  questionId: uuid('question_id').references(() => quizQuestions.id, { onDelete: 'cascade' }).notNull(),
  optionText: text('option_text').notNull(),
  isCorrect: boolean('is_correct').default(false).notNull(),
  position: integer('position').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 11. Purchases Table
export const purchases = pgTable('purchases', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  amount: integer('amount').notNull(),
  currency: varchar('currency', { length: 10 }).default('USD').notNull(),
  provider: paymentProviderEnum('provider').default('cashfree').notNull(),
  providerPaymentId: varchar('provider_payment_id', { length: 255 }),
  orderId: varchar('order_id', { length: 255 }),
  paymentSessionId: varchar('payment_session_id', { length: 255 }),
  couponCode: varchar('coupon_code', { length: 50 }),
  discountAmount: integer('discount_amount').default(0),
  taxAmount: integer('tax_amount').default(0),
  receiptUrl: text('receipt_url'),
  status: purchaseStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 12. Coupons Table
export const coupons = pgTable('coupons', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  discountPercent: integer('discount_percent').default(0).notNull(),
  discountAmountCents: integer('discount_amount_cents').default(0).notNull(),
  active: boolean('active').default(true).notNull(),
  validUntil: timestamp('valid_until'),
  maxUses: integer('max_uses').default(100).notNull(),
  timesUsed: integer('times_used').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 13. Course Reviews Table
export const courseReviews = pgTable('course_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  studentName: varchar('student_name', { length: 255 }).notNull(),
  studentRole: varchar('student_role', { length: 255 }),
  rating: integer('rating').notNull(),
  reviewText: text('review_text').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 14. Enrollments Table (PDF Section 11)
export const enrollments = pgTable('enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  purchaseId: uuid('purchase_id').references(() => purchases.id, { onDelete: 'set null' }),
  status: enrollmentStatusEnum('status').default('active').notNull(),
  enrolledDate: timestamp('enrolled_date').defaultNow().notNull(),
  completedDate: timestamp('completed_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 15. Lesson Progress Table (PDF Section 7.1 & 11)
export const lessonProgress = pgTable('lesson_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'cascade' }).notNull(),
  secondsWatched: integer('seconds_watched').default(0).notNull(),
  lastPosition: integer('last_position').default(0).notNull(),
  completed: boolean('completed').default(false).notNull(),
  completedDate: timestamp('completed_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 16. Module Progress Table (PDF Section 7.2 & 11)
export const moduleProgress = pgTable('module_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  moduleId: uuid('module_id').references(() => modules.id, { onDelete: 'cascade' }).notNull(),
  percent: integer('percent').default(0).notNull(),
  status: varchar('status', { length: 50 }).default('not_started').notNull(), // not_started, in_progress, completed, locked
  startedTime: timestamp('started_time'),
  completedTime: timestamp('completed_time'),
  unlockedTime: timestamp('unlocked_time'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 17. Course Progress Table (PDF Section 7.3 & 11)
export const courseProgress = pgTable('course_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  percent: integer('percent').default(0).notNull(),
  timeWatched: integer('time_watched').default(0).notNull(), // In seconds
  currentLessonId: uuid('current_lesson_id'),
  status: varchar('status', { length: 50 }).default('not_started').notNull(), // not_started, in_progress, completed
  completedDate: timestamp('completed_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 18. Quiz Attempts Table (PDF Section 6.3 & 11)
export const quizAttempts = pgTable('quiz_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  quizId: uuid('quiz_id').references(() => quizzes.id, { onDelete: 'cascade' }).notNull(),
  attemptNumber: integer('attempt_number').default(1).notNull(),
  scorePercent: integer('score_percent').default(0).notNull(),
  passed: boolean('passed').default(false).notNull(),
  startedTime: timestamp('started_time').defaultNow().notNull(),
  submittedTime: timestamp('submitted_time'),
  timeTakenSeconds: integer('time_taken_seconds').default(0).notNull(),
  savedAnswers: jsonb('saved_answers').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 19. Quiz Attempt Answers Table (PDF Section 11)
export const quizAttemptAnswers = pgTable('quiz_attempt_answers', {
  id: uuid('id').defaultRandom().primaryKey(),
  attemptId: uuid('attempt_id').references(() => quizAttempts.id, { onDelete: 'cascade' }).notNull(),
  questionId: uuid('question_id').references(() => quizQuestions.id, { onDelete: 'cascade' }).notNull(),
  selectedOptionIds: jsonb('selected_option_ids').$type<any>().default([]),
  isCorrect: boolean('is_correct').default(false).notNull(),
  pointsEarned: integer('points_earned').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 20. Completion Forms Table
export const completionForms = pgTable('completion_forms', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  rating: integer('rating').notNull(),
  feedbackText: text('feedback_text'),
  submittedDate: timestamp('submitted_date').defaultNow().notNull(),
});

// 21. Certificates Table
export const certificates = pgTable('certificates', {
  id: uuid('id').defaultRandom().primaryKey(),
  certificateCode: varchar('certificate_code', { length: 50 }).notNull().unique(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  issueDate: timestamp('issue_date').defaultNow().notNull(),
  pdfUrl: text('pdf_url'),
  status: certificateStatusEnum('status').default('valid').notNull(),
});

// 22. WebhookEvent Table
export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  providerEventId: varchar('provider_event_id', { length: 255 }).notNull().unique(),
  type: varchar('type', { length: 100 }).notNull(),
  processed: boolean('processed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
