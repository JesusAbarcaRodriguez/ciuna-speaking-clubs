import { pgTable, serial, integer, text, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const formMeta = pgTable('form_meta', {
  id: integer('id').primaryKey().default(1),
  title: text('title').notNull(),
  description: text('description').notNull(),
  acceptingResponses: boolean('accepting_responses').notNull().default(true),
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
  submittedAt: timestamp('submitted_at').notNull().defaultNow(),
  answers: jsonb('answers').$type<Record<string, string>>().notNull(),
});
