import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const connectionString = import.meta.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Add it to your environment variables.');
}

// prepare: false porque Supabase's transaction pooler (puerto 6543) no soporta
// prepared statements. idle_timeout cierra conexiones ociosas de nuestro lado
// antes de que el pooler las cierre del suyo, evitando errores de
// CONNECTION_CLOSED al reutilizar una conexión que el servidor ya mató.
const client = postgres(connectionString, {
  prepare: false,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
