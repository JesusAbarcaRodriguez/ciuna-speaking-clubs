import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/client';
import { formMeta, questions, questionTypes } from '../../../db/schema';

export const prerender = false;

export const GET: APIRoute = async () => {
  const [meta] = await db.select().from(formMeta).where(eq(formMeta.id, 1));
  const questionRows = await db.select().from(questions).orderBy(questions.order);

  return new Response(JSON.stringify({ meta, questions: questionRows }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

interface IncomingQuestion {
  type: string;
  label: string;
  placeholder?: string | null;
  required: boolean;
  options?: string[] | null;
  imageKey?: string | null;
}

export const PUT: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  const title = body?.meta?.title;
  const description = body?.meta?.description;
  const incomingQuestions: IncomingQuestion[] = body?.questions;

  if (typeof title !== 'string' || !title.trim()) {
    return jsonError('El título es obligatorio.');
  }
  if (typeof description !== 'string') {
    return jsonError('La descripción es inválida.');
  }
  if (!Array.isArray(incomingQuestions) || incomingQuestions.length === 0) {
    return jsonError('Debe haber al menos una pregunta.');
  }

  for (const q of incomingQuestions) {
    if (!questionTypes.includes(q.type as (typeof questionTypes)[number])) {
      return jsonError(`Tipo de pregunta inválido: ${q.type}`);
    }
    if (typeof q.label !== 'string' || !q.label.trim()) {
      return jsonError('Cada pregunta necesita un título.');
    }
    if ((q.type === 'select' || q.type === 'radio') && (!q.options || q.options.length === 0)) {
      return jsonError(`La pregunta "${q.label}" necesita al menos una opción.`);
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(formMeta)
      .values({ id: 1, title, description })
      .onConflictDoUpdate({ target: formMeta.id, set: { title, description } });

    await tx.delete(questions);

    await tx.insert(questions).values(
      incomingQuestions.map((q, index) => ({
        order: index + 1,
        type: q.type as (typeof questionTypes)[number],
        label: q.label,
        placeholder: q.placeholder || null,
        required: q.required,
        options: q.options && q.options.length > 0 ? q.options : null,
        imageKey: q.imageKey || null,
      })),
    );
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

function jsonError(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}
