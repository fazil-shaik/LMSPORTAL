import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL || '';

let dbInstance: any = null;
export let isDatabaseConnected = false;
export let rawSql: any = null;
export let schemaSyncPromise: Promise<void> | null = null;

export async function ensureDatabaseSchema(sql: any): Promise<void> {
  if (!sql) return;
  try {
    // 1. Add Cashfree to payment_provider enum if not already present
    await sql`
      DO $$ BEGIN
        ALTER TYPE payment_provider ADD VALUE IF NOT EXISTS 'cashfree';
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
    `;

    // 2. Ensure courses table has all columns matching PDF Section 3 & 11
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS subtitle TEXT;`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS banner TEXT;`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS preview_video TEXT;`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS content_version INTEGER DEFAULT 1;`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS published_time TIMESTAMP;`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Engineering';`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS series VARCHAR(255) DEFAULT 'THE CAREER SERIES';`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS tagline VARCHAR(255) DEFAULT 'Build practical mastery.';`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor VARCHAR(255) DEFAULT 'Lead Instructor';`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_title VARCHAR(255) DEFAULT 'Industry Practitioner';`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_bio TEXT DEFAULT 'Experienced industry practitioner.';`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_avatar TEXT;`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS language VARCHAR(50) DEFAULT 'English';`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS last_updated_date VARCHAR(50) DEFAULT 'November 2026';`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS badge VARCHAR(50);`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS rating VARCHAR(10) DEFAULT '4.9';`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 128;`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS outcomes JSONB DEFAULT '[]'::jsonb;`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS requirements JSONB DEFAULT '[]'::jsonb;`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS who_is_it_for JSONB DEFAULT '[]'::jsonb;`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS total_duration VARCHAR(50) DEFAULT '6 hours';`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS gradient_from VARCHAR(20) DEFAULT '#312e81';`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS gradient_to VARCHAR(20) DEFAULT '#6d28d9';`;

    // 3. Modules table (PDF Section 4 & 11)
    await sql`
      CREATE TABLE IF NOT EXISTS modules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        objectives JSONB DEFAULT '[]'::jsonb,
        position INTEGER NOT NULL DEFAULT 1,
        completion_rule VARCHAR(50) NOT NULL DEFAULT 'all_lessons',
        unlock_rule VARCHAR(50) NOT NULL DEFAULT 'open',
        status VARCHAR(20) NOT NULL DEFAULT 'published',
        archived BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    // 4. Module Timelines table (PDF Section 5 & 11)
    await sql`
      CREATE TABLE IF NOT EXISTS module_timelines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        module_id UUID NOT NULL UNIQUE REFERENCES modules(id) ON DELETE CASCADE,
        label VARCHAR(100) DEFAULT 'Week 1',
        suggested_duration VARCHAR(100) DEFAULT '3 days',
        start_offset_days INTEGER NOT NULL DEFAULT 1,
        release_mode VARCHAR(20) NOT NULL DEFAULT 'self_paced',
        release_after_days INTEGER NOT NULL DEFAULT 0,
        buffer_minutes INTEGER NOT NULL DEFAULT 0,
        estimated_study_time_minutes INTEGER NOT NULL DEFAULT 60,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    // 5. Lessons table (PDF Section 4.1 & 11)
    await sql`
      CREATE TABLE IF NOT EXISTS lessons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
        section_id UUID,
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        type VARCHAR(50) NOT NULL DEFAULT 'video',
        article_body TEXT DEFAULT '',
        media_asset_id VARCHAR(255),
        media_url TEXT,
        video_url TEXT,
        video_asset_id VARCHAR(255),
        duration VARCHAR(50) DEFAULT '15 min',
        duration_formatted VARCHAR(50) DEFAULT '15 min',
        duration_seconds INTEGER NOT NULL DEFAULT 900,
        position INTEGER NOT NULL DEFAULT 1,
        "order" INTEGER NOT NULL DEFAULT 1,
        is_free_preview BOOLEAN NOT NULL DEFAULT false,
        is_required BOOLEAN NOT NULL DEFAULT true,
        status VARCHAR(20) NOT NULL DEFAULT 'published',
        archived BOOLEAN NOT NULL DEFAULT false,
        resources JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    // Ensure lessons has all new columns
    await sql`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES modules(id) ON DELETE CASCADE;`;
    await sql`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';`;
    await sql`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS article_body TEXT DEFAULT '';`;
    await sql`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS media_asset_id VARCHAR(255);`;
    await sql`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS media_url TEXT;`;
    await sql`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS duration_formatted VARCHAR(50) DEFAULT '15 min';`;
    await sql`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 1;`;
    await sql`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT true;`;
    await sql`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published';`;
    await sql`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;`;

    // 6. Media Assets table (PDF Section 10 & 11)
    await sql`
      CREATE TABLE IF NOT EXISTS media_assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        public_id VARCHAR(255) NOT NULL,
        resource_type VARCHAR(50) NOT NULL DEFAULT 'image',
        delivery_type VARCHAR(50) NOT NULL DEFAULT 'public',
        format VARCHAR(50),
        duration INTEGER,
        bytes INTEGER,
        version VARCHAR(50),
        uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    // 7. Lesson Resources table (PDF Section 11)
    await sql`
      CREATE TABLE IF NOT EXISTS lesson_resources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
        module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        media_asset_id VARCHAR(255),
        url TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    // 8. Quizzes table (PDF Section 6 & 11)
    await sql`
      CREATE TABLE IF NOT EXISTS quizzes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        module_id UUID NOT NULL UNIQUE REFERENCES modules(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        instructions TEXT DEFAULT '',
        is_required BOOLEAN NOT NULL DEFAULT false,
        passing_percent INTEGER NOT NULL DEFAULT 70,
        time_limit_minutes INTEGER NOT NULL DEFAULT 0,
        attempts_allowed INTEGER NOT NULL DEFAULT 0,
        shuffle_questions BOOLEAN NOT NULL DEFAULT false,
        shuffle_options BOOLEAN NOT NULL DEFAULT false,
        show_results_mode VARCHAR(50) NOT NULL DEFAULT 'score_and_correct',
        unlock_next BOOLEAN NOT NULL DEFAULT false,
        pool_size INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'published',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    // 9. Quiz Questions table (PDF Section 6.2 & 11)
    await sql`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL DEFAULT 'single_choice',
        question_text TEXT NOT NULL,
        image_url TEXT,
        explanation TEXT DEFAULT '',
        points INTEGER NOT NULL DEFAULT 1,
        position INTEGER NOT NULL DEFAULT 1,
        accepted_short_answers JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    // 10. Quiz Options table (PDF Section 6.2 & 11)
    await sql`
      CREATE TABLE IF NOT EXISTS quiz_options (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
        option_text TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL DEFAULT false,
        position INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    // 11. Module Progress table (PDF Section 7.2 & 11)
    await sql`
      CREATE TABLE IF NOT EXISTS module_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
        percent INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'not_started',
        started_time TIMESTAMP,
        completed_time TIMESTAMP,
        unlocked_time TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    // 12. Quiz Attempts table (PDF Section 6.3 & 11)
    await sql`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        attempt_number INTEGER NOT NULL DEFAULT 1,
        score_percent INTEGER NOT NULL DEFAULT 0,
        passed BOOLEAN NOT NULL DEFAULT false,
        started_time TIMESTAMP NOT NULL DEFAULT NOW(),
        submitted_time TIMESTAMP,
        time_taken_seconds INTEGER NOT NULL DEFAULT 0,
        saved_answers JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    // 13. Quiz Attempt Answers table (PDF Section 11)
    await sql`
      CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
        question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
        selected_option_ids JSONB DEFAULT '[]'::jsonb,
        is_correct BOOLEAN NOT NULL DEFAULT false,
        points_earned INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    // 14. Add any missing columns to enrollments, purchases, coupons, reviews, course_progress, lessons
    await sql`ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS completed_date TIMESTAMP;`;
    await sql`ALTER TABLE course_progress ADD COLUMN IF NOT EXISTS percent INTEGER DEFAULT 0;`;
    await sql`ALTER TABLE course_progress ADD COLUMN IF NOT EXISTS time_watched INTEGER DEFAULT 0;`;
    await sql`ALTER TABLE course_progress ADD COLUMN IF NOT EXISTS current_lesson_id UUID;`;
    await sql`ALTER TABLE course_progress ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'not_started';`;
    await sql`ALTER TABLE course_progress ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`;
    await sql`ALTER TABLE course_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`;
    await sql`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`;
    await sql`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`;

    console.log('[Neon PostgreSQL] Schema auto-migrated successfully (all LMS course structure tables & columns verified).');
  } catch (err: any) {
    console.warn('[Neon PostgreSQL] Schema auto-migration warning:', err?.message || err);
  }
}

try {
  if (connectionString && !connectionString.includes('placeholder')) {
    const sql = neon(connectionString);
    rawSql = sql;
    dbInstance = drizzle(sql, { schema });
    isDatabaseConnected = true;
    console.log('Neon Database HTTP Client initialized with Drizzle ORM');
    // Run idempotent schema auto-migration with error handler
    schemaSyncPromise = ensureDatabaseSchema(sql).catch((err) => {
      console.warn('Neon connection or schema sync notice:', err?.message || err);
    });
  } else {
    console.warn('Neon DATABASE_URL not set or using placeholder. Running in fallback mode.');
  }
} catch (error) {
  console.warn('Failed to initialize Neon HTTP client. Fallback mode enabled:', error);
}

export const db = dbInstance;
export { schema };
