-- Convierte el sistema de un formulario global a múltiples formularios
-- independientes (ej. "speaking-clubs", "becas"), cada uno con sus propias
-- preguntas y respuestas.

CREATE TABLE IF NOT EXISTS forms (
  id serial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  accepting_responses boolean NOT NULL DEFAULT true,
  weekly_reset boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now()
);

-- Migrar el contenido de form_meta a la primera fila de forms.
INSERT INTO forms (slug, name, title, description, accepting_responses, weekly_reset)
SELECT 'speaking-clubs', 'Speaking Clubs', title, description, accepting_responses, true
FROM form_meta
WHERE id = 1
ON CONFLICT (slug) DO NOTHING;

-- Agregar form_id a questions y responses, backfillear, y volverlo NOT NULL.
ALTER TABLE questions ADD COLUMN IF NOT EXISTS form_id integer;
ALTER TABLE responses ADD COLUMN IF NOT EXISTS form_id integer;

UPDATE questions SET form_id = (SELECT id FROM forms WHERE slug = 'speaking-clubs')
WHERE form_id IS NULL;

UPDATE responses SET form_id = (SELECT id FROM forms WHERE slug = 'speaking-clubs')
WHERE form_id IS NULL;

ALTER TABLE questions ALTER COLUMN form_id SET NOT NULL;
ALTER TABLE responses ALTER COLUMN form_id SET NOT NULL;

ALTER TABLE questions
  ADD CONSTRAINT questions_form_id_fkey FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE;
ALTER TABLE responses
  ADD CONSTRAINT responses_form_id_fkey FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE;

-- Clonar el formulario de Speaking Clubs como punto de partida para Becas
-- (el usuario editará título/preguntas desde /admin/becas después).
INSERT INTO forms (slug, name, title, description, accepting_responses, weekly_reset)
SELECT 'becas', 'Becas', title, description, false, true
FROM forms WHERE slug = 'speaking-clubs'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO questions (form_id, "order", type, label, placeholder, required, options, image_key)
SELECT (SELECT id FROM forms WHERE slug = 'becas'), "order", type, label, placeholder, required, options, image_key
FROM questions
WHERE form_id = (SELECT id FROM forms WHERE slug = 'speaking-clubs')
  AND NOT EXISTS (SELECT 1 FROM questions WHERE form_id = (SELECT id FROM forms WHERE slug = 'becas'));

DROP TABLE IF EXISTS form_meta;
