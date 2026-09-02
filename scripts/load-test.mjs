// Simula un pico real de inscripciones contra /api/submit/<formSlug>, usando
// las preguntas y opciones actuales del formulario (leídas directo de la
// base de datos, para no depender de un snapshot que quede desactualizado).
//
// Uso:
//   node scripts/load-test.mjs [total] [concurrencia] [url] [formSlug] [--keep]
//   node scripts/load-test.mjs 900 40 http://localhost:4321 speaking-clubs
//   node scripts/load-test.mjs 900 40 http://localhost:4321 becas --keep
//
// Por defecto, al final borra únicamente las respuestas que él mismo creó
// (marcadas con el correo "loadtest-*") y nunca toca datos reales.
// Con --keep NO borra nada: quedan en la base para revisar el export.

import 'dotenv/config';
import postgres from 'postgres';

const rawArgs = process.argv.slice(2);
const KEEP = rawArgs.includes('--keep');
const positional = rawArgs.filter((a) => !a.startsWith('--'));

const TOTAL = Number(positional[0] || 300);
const CONCURRENCY = Number(positional[1] || 20);
const TARGET_URL = positional[2] || 'http://localhost:4321';
const FORM_SLUG = positional[3] || 'speaking-clubs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL no está definido.');
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false });

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildAnswers(questions, index) {
  const answers = {};
  const email = `loadtest-${index}-${Date.now()}@example.com`;

  for (const q of questions) {
    if (q.type === 'info') continue;

    if (q.label === 'Correo electrónico') {
      answers[q.label] = email;
    } else if (q.label === 'Confirme su correo electrónico') {
      answers[q.label] = email;
    } else if (q.label === 'Cédula') {
      answers[q.label] = String(100000000 + index);
    } else if (q.label === 'Nombre') {
      answers[q.label] = `Prueba${index}`;
    } else if (q.label === 'Apellidos') {
      answers[q.label] = 'CargaAutomatizada';
    } else if (q.type === 'select' || q.type === 'radio') {
      answers[q.label] = randomChoice(q.options || ['']);
    } else {
      answers[q.label] = `respuesta ${index}`;
    }
  }

  return answers;
}

async function submitOne(questions, index) {
  const answers = buildAnswers(questions, index);
  const start = Date.now();
  try {
    const res = await fetch(`${TARGET_URL}/api/submit/${FORM_SLUG}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, consent: true }),
    });
    const ms = Date.now() - start;
    if (res.ok) return { ok: true, ms };
    const data = await res.json().catch(() => ({}));
    return { ok: false, ms, error: data.error || `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, ms: Date.now() - start, error: err.message };
  }
}

async function runBatches(questions) {
  const results = [];
  let index = 0;

  while (index < TOTAL) {
    const batchSize = Math.min(CONCURRENCY, TOTAL - index);
    const batch = Array.from({ length: batchSize }, (_, i) => submitOne(questions, index + i));
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
    index += batchSize;
    process.stdout.write(`\r${index}/${TOTAL} enviados...`);
  }
  console.log('');
  return results;
}

async function main() {
  console.log(`Objetivo: ${TARGET_URL}`);
  console.log(`Formulario: ${FORM_SLUG}`);
  console.log(`Total: ${TOTAL}, concurrencia: ${CONCURRENCY}\n`);

  const [form] = await sql`SELECT id FROM forms WHERE slug = ${FORM_SLUG}`;
  if (!form) {
    console.error(`No existe el formulario "${FORM_SLUG}".`);
    process.exit(1);
  }

  const questions = await sql`SELECT type, label, options FROM questions WHERE form_id = ${form.id} ORDER BY "order"`;

  const startedAt = Date.now();
  const results = await runBatches(questions);
  const totalMs = Date.now() - startedAt;

  const ok = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  const capacityRejections = failed.filter((r) => r.error?.includes('cupo')).length;
  const otherFailures = failed.length - capacityRejections;
  const avgMs = Math.round(results.reduce((sum, r) => sum + r.ms, 0) / results.length);

  console.log('--- Resultado ---');
  console.log(`Exitosas:              ${ok}`);
  console.log(`Rechazadas (cupo lleno): ${capacityRejections}`);
  console.log(`Otras fallas:           ${otherFailures}`);
  console.log(`Tiempo total:           ${(totalMs / 1000).toFixed(1)}s`);
  console.log(`Latencia promedio:      ${avgMs}ms`);

  if (otherFailures > 0) {
    console.log('\nEjemplos de otras fallas:');
    failed
      .filter((r) => !r.error?.includes('cupo'))
      .slice(0, 5)
      .forEach((r) => console.log(' -', r.error));
  }

  // Verificar que ningún club haya superado la capacidad
  const radioQuestion = questions.find((q) => q.type === 'radio');
  if (radioQuestion) {
    const overCapacity = await sql`
      SELECT answers ->> ${radioQuestion.label} AS club, count(*) AS n
      FROM responses
      WHERE form_id = ${form.id} AND answers ->> 'Correo electrónico' LIKE 'loadtest-%'
      GROUP BY club
      HAVING count(*) > 17
    `;
    console.log(`\nClubs que superaron el cupo de 17: ${overCapacity.length} (debe ser 0)`);
  }

  if (KEEP) {
    console.log(
      `\n--keep activo: se conservan las respuestas de prueba (correo loadtest-*).`,
    );
    console.log('Para borrarlas más tarde, corré en la base:');
    console.log(
      `  DELETE FROM responses WHERE form_id = ${form.id} AND answers ->> 'Correo electrónico' LIKE 'loadtest-%';`,
    );
  } else {
    const deleted = await sql`
      DELETE FROM responses WHERE form_id = ${form.id} AND answers ->> 'Correo electrónico' LIKE 'loadtest-%'
    `;
    console.log(`\nLimpieza: ${deleted.count} respuestas de prueba eliminadas.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('ERROR:', err.message);
    process.exit(1);
  });
