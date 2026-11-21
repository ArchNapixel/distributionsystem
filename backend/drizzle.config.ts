import { defineConfig } from 'drizzle-kit';
import { loadDotEnv } from './src/config/env';

loadDotEnv();
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set (copy backend/.env.example to backend/.env)');

// drizzle-kit writes into the Supabase migrations folder so there is one
// migration system. Uses the direct/session connection, never the pooler.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/*.ts',
  out: './supabase/migrations',
  migrations: { prefix: 'supabase' },
  dbCredentials: { url },
});
