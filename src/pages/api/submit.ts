import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { formMeta, questions, responses } from '../../db/schema';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const answers = body?.answers;

  if (!answers || typeof answers !== 'object') {
    return jsonError('Respuestas inválidas.');
  }

  const [meta] = await db.select().from(formMeta).where(eq(formMeta.id, 1));
  if (meta && !meta.acceptingResponses) {
    return jsonError('Este formulario ya no acepta respuestas.');
  }

  const email = answers['Correo electrónico'];
  const emailConfirm = answers['Confirme su correo electrónico'];
  if (email && emailConfirm && email !== emailConfirm) {
    return jsonError('Los correos no coinciden.');
  }

  const questionRows = await db.select().from(questions).orderBy(questions.order);

  for (const q of questionRows) {
    if (q.type === 'info') continue;
    if (q.required && !String(answers[q.label] ?? '').trim()) {
      return jsonError(`La pregunta "${q.label}" es obligatoria.`);
    }
  }

  await db.insert(responses).values({ answers });

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
