import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../../../db/client';
import { forms } from '../../../../db/schema';

export const prerender = false;

export const PATCH: APIRoute = async ({ request, params }) => {
  const { formSlug } = params;
  const [form] = await db.select().from(forms).where(eq(forms.slug, formSlug!));

  if (!form) {
    return new Response(JSON.stringify({ error: 'Formulario no encontrado.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json().catch(() => null);
  const acceptingResponses = body?.acceptingResponses;

  if (typeof acceptingResponses !== 'boolean') {
    return new Response(JSON.stringify({ error: 'Valor inválido.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await db.update(forms).set({ acceptingResponses }).where(eq(forms.id, form.id));

  return new Response(JSON.stringify({ ok: true, acceptingResponses }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
