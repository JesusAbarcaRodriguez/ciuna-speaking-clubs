-- Permite solo una inscripción por correo electrónico dentro de la semana
-- en curso (las respuestas se borran cada lunes, así que esto equivale a
-- "una inscripción por correo por semana").
--
-- Igual que el trigger de cupo por club: busca la pregunta de correo por
-- TIPO ('email'), no por texto de título, y usa la de menor "order" entre
-- las de tipo email (la principal, no la de "confirme su correo") para no
-- depender de que el admin nunca renombre esas preguntas.
--
-- Normaliza a minúsculas y sin espacios antes de comparar, para que
-- "Test@Gmail.com " y "test@gmail.com" cuenten como el mismo correo.
--
-- Usa pg_advisory_xact_lock por la misma razón que el trigger de clubs:
-- evitar que dos envíos casi simultáneos con el mismo correo pasen los dos.

CREATE OR REPLACE FUNCTION enforce_unique_email_per_week() RETURNS trigger AS $$
DECLARE
  email_label text;
  normalized_email text;
  already_exists boolean;
BEGIN
  SELECT label INTO email_label
  FROM questions
  WHERE type = 'email'
  ORDER BY "order" ASC
  LIMIT 1;

  IF email_label IS NULL THEN
    RETURN NEW;
  END IF;

  normalized_email := lower(trim(NEW.answers ->> email_label));

  IF normalized_email IS NULL OR normalized_email = '' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('email:' || normalized_email));

  SELECT EXISTS (
    SELECT 1 FROM responses
    WHERE lower(trim(answers ->> email_label)) = normalized_email
  ) INTO already_exists;

  IF already_exists THEN
    RAISE EXCEPTION 'EMAIL_DUPLICATE:%', normalized_email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_unique_email ON responses;

CREATE TRIGGER trg_enforce_unique_email
BEFORE INSERT ON responses
FOR EACH ROW EXECUTE FUNCTION enforce_unique_email_per_week();
