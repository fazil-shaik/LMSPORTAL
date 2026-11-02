import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL || '';

let dbInstance: any = null;
export let isDatabaseConnected = false;

try {
  if (connectionString && !connectionString.includes('placeholder')) {
    const sql = neon(connectionString);
    dbInstance = drizzle(sql, { schema });
    isDatabaseConnected = true;
    console.log('Neon Database HTTP Client initialized with Drizzle ORM');
  } else {
    console.warn('Neon DATABASE_URL not set or using placeholder. Running in fallback mode.');
  }
} catch (error) {
  console.warn('Failed to initialize Neon HTTP client. Fallback mode enabled:', error);
}

export const db = dbInstance;
export { schema };
