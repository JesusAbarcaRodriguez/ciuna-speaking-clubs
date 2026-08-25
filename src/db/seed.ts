import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { formMeta, questions } from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set.');
}

const db = drizzle(postgres(connectionString, { prepare: false }), { schema });

const clubOptions = [
  'ELEMENTARY - MONDAY 5PM',
  'ELEMENTARY - MONDAY 6PM/G1',
  'ELEMENTARY - MONDAY 6PM/G2',
  'ELEMENTARY - MONDAY 7PM',
  'ELEMENTARY - TUESDAY 5PM/G1',
  'ELEMENTARY - TUESDAY 5PM/G2',
  'ELEMENTARY - TUESDAY 6PM/G1',
  'ELEMENTARY - TUESDAY 6PM/G2',
  'ELEMENTARY - TUESDAY 6:30PM/G1',
  'ELEMENTARY - TUESDAY 6:30PM/G2',
  'ELEMENTARY - TUESDAY 7PM',
  'ELEMENTARY - TUESDAY 7:30PM',
  'ELEMENTARY - WEDNESDAY 5PM',
  'ELEMENTARY - WEDNESDAY 6PM',
  'ELEMENTARY - WEDNESDAY 6:30PM',
  'ELEMENTARY - WEDNESDAY 7:30PM',
  'ELEMENTARY - THURSDAY 5PM PRESENCIAL AULA B4',
  'ELEMENTARY - THURSDAY 5PM',
  'ELEMENTARY - THURSDAY 6PM/G1',
  'ELEMENTARY - THURSDAY 6PM/G2',
  'ELEMENTARY - THURSDAY 7PM',
  'ELEMENTARY - FRIDAY 5PM PRESENCIAL AULA A6',
  'ELEMENTARY - FRIDAY 6PM',
  'ELEMENTARY - FRIDAY 6:30PM',
  'ELEMENTARY – FRIDAY 7PM',
  'ELEMENTARY - FRIDAY 7:30PM',
  'ELEMENTARY - SATURDAY 1PM',
  'ELEMENTARY - SATURDAY 2PM',
  'INTERMEDIATE - MONDAY 5:30PM',
  'INTERMEDIATE - MONDAY 7PM',
  'INTERMEDIATE - TUESDAY 5PM PRESENCIAL AULA C3',
  'INTERMEDIATE - TUESDAY 5PM',
  'INTERMEDIATE - TUESDAY 6PM',
  'INTERMEDIATE - TUESDAY 7PM',
  'INTERMEDIATE - WEDNESDAY 5PM',
  'INTERMEDIATE - WEDNESDAY 6PM',
  'INTERMEDIATE - WEDNESDAY 7PM',
  'INTERMEDIATE – THURSDAY 5PM',
  'INTERMEDIATE – THURSDAY 6PM',
  'INTERMEDIATE – THURSDAY 7PM',
  'INTERMEDIATE - FRIDAY 5PM',
  'INTERMEDIATE - FRIDAY 6PM',
  'INTERMEDIATE – FRIDAY 7PM',
  'INTERMEDIATE – SATURDAY 1PM',
  'INTERMEDIATE – SATURDAY 2PM',
  'ADVANCED - MONDAY 5PM',
  'ADVANCED - MONDAY 6PM',
  'ADVANCED - TUESDAY 5PM',
  'ADVANCED – TUESDAY 6PM',
  'ADVANCED – WEDNESDAY 5PM PRESENCIAL AULA B4',
  'ADVANCED – WEDNESDAY 5PM',
  'ADVANCED – WEDNESDAY 6PM',
  'ADVANCED – THURSDAY 5PM',
  'ADVANCED – THURSDAY 6PM',
  'ADVANCED - FRIDAY 5PM',
  'ADVANCED - FRIDAY 6PM',
  'ADVANCED - SATURDAY 1PM',
  'ADVANCED - SATURDAY 2PM',
];

const nivelOptions = [
  'NIVEL PRINCIPIANTE',
  'NIVEL 1',
  'NIVEL 2',
  'NIVEL 3',
  'NIVEL 4',
  'NIVEL 5',
  'NIVEL 6',
  'NIVEL 7',
  'NIVEL 8',
  'NIVEL 9',
  'NIVEL 10',
];

async function seed() {
  await db
    .insert(formMeta)
    .values({
      id: 1,
      title: 'Speaking Clubs Registration (NUEVO LINK)',
      description:
        'El horario de inscripción es solamente jueves y viernes de 3pm a 6pm, después de realizar la inscripción, la siguiente semana se le estará enviando el link del SPEAKING CLUB vía CORREO. Por favor, estar atento a su correo, ya que será el único medio oficial para enviar las invitaciones a los speaking clubs, adicional verificar cuando escribe el correo electrónico para que no posea errores. Puedes matricular cualquier speaking club, ya sea presencial o virtual, independientemente de la modalidad en que lleve el curso, **sin embargo, se le validará SOLAMENTE 1 SPEAKING CLUB POR SEMANA.**',
    })
    .onConflictDoNothing();

  await db.delete(questions);

  await db.insert(questions).values([
    {
      order: 1,
      type: 'email',
      label: 'Correo electrónico',
      placeholder: 'Tu dirección de correo electrónico',
      required: true,
    },
    {
      order: 2,
      type: 'email',
      label: 'Confirme su correo electrónico',
      placeholder: 'Tu respuesta',
      required: true,
    },
    {
      order: 3,
      type: 'short_text',
      label: 'Cédula',
      placeholder: 'Tu respuesta',
      required: true,
    },
    {
      order: 4,
      type: 'short_text',
      label: 'Nombre',
      placeholder: 'Tu respuesta',
      required: true,
    },
    {
      order: 5,
      type: 'short_text',
      label: 'Apellidos',
      placeholder: 'Tu respuesta',
      required: true,
    },
    {
      order: 6,
      type: 'info',
      label: 'NIVEL DE SPEAKING CLUB',
      required: false,
      imageKey: 'levels',
    },
    {
      order: 7,
      type: 'select',
      label: 'Nivel',
      required: true,
      options: nivelOptions,
    },
    {
      order: 8,
      type: 'radio',
      label: 'CLUBS (24 AL 29 DE AGOSTO)',
      required: true,
      options: clubOptions,
    },
  ]);

  console.log('Seed completado.');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
