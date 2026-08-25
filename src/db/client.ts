import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const connectionString = import.meta.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Add it to your environment variables.');
}

// prepare: false porque Supabase's transaction pooler (puerto 6543) no soporta
// prepared statements.
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
