import { pgTable, serial, integer, text, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const forms = pgTable('forms', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  acceptingResponses: boolean('accepting_responses').notNull().default(true),
  // Si el job semanal de reset debe borrar las respuestas de este formulario.
  // Speaking Clubs sí (ciclo jueves-viernes); un formulario de aplicación
  // (ej. becas) probablemente no debería perder datos cada semana.
  weeklyReset: boolean('weekly_reset').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const questionTypes = [
  'short_text',
  'text_only',
  'numeric',
  'email',
  'select',
  'radio',
  'info',
] as const;
export type QuestionType = (typeof questionTypes)[number];

export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  formId: integer('form_id')
    .notNull()
    .references(() => forms.id, { onDelete: 'cascade' }),
  order: integer('order').notNull(),
  type: text('type').$type<QuestionType>().notNull(),
  label: text('label').notNull(),
  placeholder: text('placeholder'),
  required: boolean('required').notNull().default(true),
  options: jsonb('options').$type<string[]>(),
  imageKey: text('image_key'),
});

export const responses = pgTable('responses', {
  id: serial('id').primaryKey(),
  formId: integer('form_id')
    .notNull()
    .references(() => forms.id, { onDelete: 'cascade' }),
  submittedAt: timestamp('submitted_at').notNull().defaultNow(),
  answers: jsonb('answers').$type<Record<string, string>>().notNull(),
});
