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

    // 2. Ensure courses table has all columns
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

    // 3. Ensure lessons table has all columns
    await sql`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_url TEXT;`;
    await sql`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS duration VARCHAR(50) DEFAULT '25 min';`;
    await sql`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_free_preview BOOLEAN DEFAULT false;`;
    await sql`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS resources JSONB DEFAULT '[]'::jsonb;`;

    // 4. Ensure purchases table has all columns
    await sql`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS order_id VARCHAR(255);`;
    await sql`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_session_id VARCHAR(255);`;
    await sql`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);`;
    await sql`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0;`;
    await sql`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS tax_amount INTEGER DEFAULT 0;`;
    await sql`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS receipt_url TEXT;`;

    // 5. Ensure coupons table exists
    await sql`
      CREATE TABLE IF NOT EXISTS coupons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) NOT NULL UNIQUE,
        discount_percent INTEGER NOT NULL DEFAULT 0,
        discount_amount_cents INTEGER NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT true,
        valid_until TIMESTAMP,
        max_uses INTEGER NOT NULL DEFAULT 100,
        times_used INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    // 6. Ensure course_reviews table exists
    await sql`
      CREATE TABLE IF NOT EXISTS course_reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        student_name VARCHAR(255) NOT NULL,
        student_role VARCHAR(255),
        rating INTEGER NOT NULL,
        review_text TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    console.log('[Neon PostgreSQL] Schema auto-migrated successfully (all columns verified).');
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
    // Run idempotent schema auto-migration
    schemaSyncPromise = ensureDatabaseSchema(sql);
  } else {
    console.warn('Neon DATABASE_URL not set or using placeholder. Running in fallback mode.');
  }
} catch (error) {
  console.warn('Failed to initialize Neon HTTP client. Fallback mode enabled:', error);
}

export const db = dbInstance;
export { schema };
