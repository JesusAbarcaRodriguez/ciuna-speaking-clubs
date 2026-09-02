import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/client';
import { forms, questions, responses } from '../../../db/schema';

export const prerender = false;

const TEXT_ONLY_PATTERN = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]+$/;
const NUMERIC_PATTERN = /^[0-9]+$/;

export const POST: APIRoute = async ({ request, params }) => {
  const { formSlug } = params;
  const [form] = await db.select().from(forms).where(eq(forms.slug, formSlug!));

  if (!form) {
    return jsonError('Formulario no encontrado.', 404);
  }

  const body = await request.json().catch(() => null);
  const answers = body?.answers;

  if (!answers || typeof answers !== 'object') {
    return jsonError('Respuestas inválidas.');
  }

  if (body?.consent !== true) {
    return jsonError('Debes aceptar el uso de tus datos para poder inscribirte.');
  }

  if (!form.acceptingResponses) {
    return jsonError('Este formulario ya no acepta respuestas.');
  }

  const email = answers['Correo electrónico'];
  const emailConfirm = answers['Confirme su correo electrónico'];
  if (email && emailConfirm && email !== emailConfirm) {
    return jsonError('Los correos no coinciden.');
  }

  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.formId, form.id))
    .orderBy(questions.order);

  for (const q of questionRows) {
    if (q.type === 'info') continue;

    const value = String(answers[q.label] ?? '').trim();

    if (q.required && !value) {
      return jsonError(`La pregunta "${q.label}" es obligatoria.`);
    }

    if (value && (q.type === 'select' || q.type === 'radio') && q.options && !q.options.includes(value)) {
      return jsonError(`La opción enviada para "${q.label}" no es válida.`);
    }

    if (value && q.type === 'text_only' && !TEXT_ONLY_PATTERN.test(value)) {
      return jsonError(`La pregunta "${q.label}" solo admite letras.`);
    }

    if (value && q.type === 'numeric' && !NUMERIC_PATTERN.test(value)) {
      return jsonError(`La pregunta "${q.label}" solo admite números.`);
    }
  }

  try {
    await db.insert(responses).values({ formId: form.id, answers });
  } catch (err) {
    const message = extractPgErrorMessage(err);
    if (message?.includes('CLUB_FULL')) {
      return jsonError('Ese club ya alcanzó el cupo máximo. Por favor elige otro.');
    }
    if (message?.includes('EMAIL_DUPLICATE')) {
      return jsonError('Ese correo ya se registró esta semana. Solo se permite una inscripción por correo.');
    }
    throw err;
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// Drizzle envuelve el error real de Postgres en su propio DrizzleQueryError;
// el mensaje que nos importa (ej. "CLUB_FULL:..." o "EMAIL_DUPLICATE:...")
// queda anidado en `.cause`, no en el mensaje de nivel superior.
function extractPgErrorMessage(err: unknown): string | null {
  let current: unknown = err;
  for (let i = 0; i < 5 && current; i++) {
    if (current instanceof Error) {
      if (current.message.includes('CLUB_FULL') || current.message.includes('EMAIL_DUPLICATE')) {
        return current.message;
      }
      current = current.cause;
    } else {
      break;
    }
  }
  return null;
}

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
