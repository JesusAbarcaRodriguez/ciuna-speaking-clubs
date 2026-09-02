import type { APIRoute } from 'astro';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../../../db/client';
import { forms, responses } from '../../../../db/schema';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { formSlug } = params;
  const [form] = await db.select().from(forms).where(eq(forms.slug, formSlug!));

  if (!form) {
    return jsonError('Formulario no encontrado.', 404);
  }

  const rows = await db
    .select()
    .from(responses)
    .where(eq(responses.formId, form.id))
    .orderBy(desc(responses.submittedAt));

  return new Response(JSON.stringify({ responses: rows }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params }) => {
  const { formSlug } = params;
  const [form] = await db.select().from(forms).where(eq(forms.slug, formSlug!));

  if (!form) {
    return jsonError('Formulario no encontrado.', 404);
  }

  await db.delete(responses).where(eq(responses.formId, form.id));

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
