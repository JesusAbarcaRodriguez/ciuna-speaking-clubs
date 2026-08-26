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

  if (body?.consent !== true) {
    return jsonError('Debes aceptar el uso de tus datos para poder inscribirte.');
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

    const value = String(answers[q.label] ?? '').trim();

    if (q.required && !value) {
      return jsonError(`La pregunta "${q.label}" es obligatoria.`);
    }

    if (value && (q.type === 'select' || q.type === 'radio') && q.options && !q.options.includes(value)) {
      return jsonError(`La opción enviada para "${q.label}" no es válida.`);
    }
  }

  try {
    await db.insert(responses).values({ answers });
  } catch (err) {
    if (isClubFullError(err)) {
      return jsonError('Ese club ya alcanzó el cupo máximo. Por favor elige otro.');
    }
    throw err;
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

function isClubFullError(err: unknown): boolean {
  let current: unknown = err;
  for (let i = 0; i < 5 && current; i++) {
    if (current instanceof Error) {
      if (current.message.includes('CLUB_FULL')) return true;
      current = current.cause;
    } else {
      break;
    }
  }
  return false;
}

function jsonError(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}
