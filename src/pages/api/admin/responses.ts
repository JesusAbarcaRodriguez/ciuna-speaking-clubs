import type { APIRoute } from 'astro';
import { desc } from 'drizzle-orm';
import { db } from '../../../db/client';
import { responses } from '../../../db/schema';

export const prerender = false;

export const GET: APIRoute = async () => {
  const rows = await db.select().from(responses).orderBy(desc(responses.submittedAt));

  return new Response(JSON.stringify({ responses: rows }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async () => {
  await db.delete(responses);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
