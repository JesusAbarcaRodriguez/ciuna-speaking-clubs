import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/client';
import { formMeta } from '../../../db/schema';

export const prerender = false;

export const PATCH: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const acceptingResponses = body?.acceptingResponses;

  if (typeof acceptingResponses !== 'boolean') {
    return new Response(JSON.stringify({ error: 'Valor inválido.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await db.update(formMeta).set({ acceptingResponses }).where(eq(formMeta.id, 1));

  return new Response(JSON.stringify({ ok: true, acceptingResponses }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
