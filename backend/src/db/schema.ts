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

// Enums as specified in PRD Section 7
export const roleEnum = pgEnum('user_role', ['student', 'admin']);
export const courseStatusEnum = pgEnum('course_status', ['draft', 'published']);
export const lessonTypeEnum = pgEnum('lesson_type', ['video', 'text']);
export const paymentProviderEnum = pgEnum('payment_provider', ['cashfree', 'stripe', 'paypal']);
export const purchaseStatusEnum = pgEnum('purchase_status', ['pending', 'paid', 'refunded', 'failed']);
export const enrollmentStatusEnum = pgEnum('enrollment_status', ['active', 'revoked']);
export const certificateStatusEnum = pgEnum('certificate_status', ['valid', 'revoked']);

// 1. Users Table (PRD Section 4.2 & 7)
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

// 2. Courses Table (PRD Section 4.4 & 7)
export const courses = pgTable('courses', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  thumbnail: text('thumbnail'),
  priceCents: integer('price_cents').default(20000).notNull(), // 200 USD = 20000 cents
  currency: varchar('currency', { length: 10 }).default('USD').notNull(),
  level: varchar('level', { length: 50 }).default('All Levels').notNull(),
  status: courseStatusEnum('status').default('published').notNull(),
  series: varchar('series', { length: 255 }).default('THE CAREER SERIES'),
  tagline: varchar('tagline', { length: 255 }).default('Build practical mastery.'),
  instructor: varchar('instructor', { length: 255 }).default('Lead Instructor').notNull(),
  instructorTitle: varchar('instructor_title', { length: 255 }).default('Industry Practitioner'),
  instructorBio: text('instructor_bio').default('Experienced industry practitioner and tech mentor with extensive real-world experience.'),
  instructorAvatar: text('instructor_avatar'),
  language: varchar('language', { length: 50 }).default('English').notNull(),
  lastUpdatedDate: varchar('last_updated_date', { length: 50 }).default('November 2026'),
  badge: varchar('badge', { length: 50 }),
  rating: varchar('rating', { length: 10 }).default('4.9'),
  reviewCount: integer('review_count').default(128),
  outcomes: jsonb('outcomes').$type<string[]>().default([]),
  requirements: jsonb('requirements').$type<string[]>().default([]),
  whoIsItFor: jsonb('who_is_it_for').$type<string[]>().default([]),
  totalDuration: varchar('total_duration', { length: 50 }).default('6 hours'),
  gradientFrom: varchar('gradient_from', { length: 20 }).default('#312e81'),
  gradientTo: varchar('gradient_to', { length: 20 }).default('#6d28d9'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Sections Table (PRD Section 7)
export const sections = pgTable('sections', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  order: integer('order').default(0).notNull(),
});

// 4. Lessons Table (PRD Section 7)
export const lessons = pgTable('lessons', {
  id: uuid('id').defaultRandom().primaryKey(),
  sectionId: uuid('section_id').references(() => sections.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  type: lessonTypeEnum('type').default('video').notNull(),
  videoAssetId: varchar('video_asset_id', { length: 255 }),
  videoUrl: text('video_url'),
  duration: varchar('duration', { length: 50 }).default('25 min'),
  durationSeconds: integer('duration_seconds').default(1800).notNull(),
  order: integer('order').default(0).notNull(),
  isFreePreview: boolean('is_free_preview').default(false).notNull(),
  resources: jsonb('resources').$type<Array<{ name: string; url: string; size?: string }>>().default([]),
});

// 5. Purchases Table (PRD Section 4.5 & 7)
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

// 5b. Coupons Table (PRD Section 4.5 FR-31)
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

// 5c. Course Reviews Table (PRD Section 4.4 FR-23)
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

// 6. Enrollments Table (PRD Section 7)
export const enrollments = pgTable('enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  purchaseId: uuid('purchase_id').references(() => purchases.id, { onDelete: 'set null' }),
  status: enrollmentStatusEnum('status').default('active').notNull(),
  enrolledDate: timestamp('enrolled_date').defaultNow().notNull(),
});

// 7. LessonProgress Table (PRD Section 7)
export const lessonProgress = pgTable('lesson_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'cascade' }).notNull(),
  secondsWatched: integer('seconds_watched').default(0).notNull(),
  lastPosition: integer('last_position').default(0).notNull(),
  completed: boolean('completed').default(false).notNull(),
  completedDate: timestamp('completed_date'),
});

// 8. CourseProgress Table (PRD Section 7)
export const courseProgress = pgTable('course_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  percentComplete: integer('percent_complete').default(0).notNull(),
  totalTimeWatched: integer('total_time_watched').default(0).notNull(),
  completedDate: timestamp('completed_date'),
});

// 9. CompletionForm Table (PRD Section 7)
export const completionForms = pgTable('completion_forms', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  rating: integer('rating').notNull(),
  feedbackText: text('feedback_text'),
  submittedDate: timestamp('submitted_date').defaultNow().notNull(),
});

// 10. Certificates Table (PRD Section 7)
export const certificates = pgTable('certificates', {
  id: uuid('id').defaultRandom().primaryKey(),
  certificateCode: varchar('certificate_code', { length: 50 }).notNull().unique(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  issueDate: timestamp('issue_date').defaultNow().notNull(),
  pdfUrl: text('pdf_url'),
  status: certificateStatusEnum('status').default('valid').notNull(),
});

// 11. WebhookEvent Table (PRD Section 7)
export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  providerEventId: varchar('provider_event_id', { length: 255 }).notNull().unique(),
  type: varchar('type', { length: 100 }).notNull(),
  processed: boolean('processed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
