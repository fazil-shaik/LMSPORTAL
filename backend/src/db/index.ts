import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema.js';
import dotenv from 'dotenv';
dotenv.config();

// Ensure WebSocket is configured for Neon in Node environments if needed
const connectionString = process.env.DATABASE_URL || '';

let dbInstance: any = null;
export let isDatabaseConnected = false;

try {
  if (connectionString && !connectionString.includes('placeholder')) {
    const pool = new Pool({ connectionString });
    dbInstance = drizzle(pool, { schema });
    isDatabaseConnected = true;
    console.log('✅ Connected to Neon Database with Drizzle ORM');
  } else {
    console.warn('⚠️ Neon DATABASE_URL is not configured or using placeholder. Running in memory-safe fallback mode.');
  }
} catch (error) {
  console.warn('⚠️ Failed to connect to Neon database directly. Fallback mode enabled:', error);
}

export const db = dbInstance;
export { schema };
