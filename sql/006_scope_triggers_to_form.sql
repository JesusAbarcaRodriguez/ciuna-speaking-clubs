-- Actualiza los triggers de cupo por club y correo único para que
-- consideren form_id: un mismo valor de opción o correo no debe chocar
-- entre formularios distintos (ej. alguien puede inscribirse a
-- Speaking Clubs y a Becas la misma semana).

CREATE OR REPLACE FUNCTION enforce_club_capacity() RETURNS trigger AS $$
DECLARE
  radio_label text;
  club_name text;
  current_count integer;
  capacity integer := 17;
BEGIN
  SELECT label INTO radio_label
  FROM questions
  WHERE type = 'radio' AND form_id = NEW.form_id
  ORDER BY id
  LIMIT 1;

  IF radio_label IS NULL THEN
    RETURN NEW;
  END IF;

  club_name := NEW.answers ->> radio_label;

  IF club_name IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('club:' || NEW.form_id || ':' || club_name));

  SELECT count(*) INTO current_count
  FROM responses
  WHERE form_id = NEW.form_id AND answers ->> radio_label = club_name;

  IF current_count >= capacity THEN
    RAISE EXCEPTION 'CLUB_FULL:%', club_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_unique_email_per_week() RETURNS trigger AS $$
DECLARE
  email_label text;
  normalized_email text;
  already_exists boolean;
BEGIN
  SELECT label INTO email_label
  FROM questions
  WHERE type = 'email' AND form_id = NEW.form_id
  ORDER BY "order" ASC
  LIMIT 1;

  IF email_label IS NULL THEN
    RETURN NEW;
  END IF;

  normalized_email := lower(trim(NEW.answers ->> email_label));

  IF normalized_email IS NULL OR normalized_email = '' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('email:' || NEW.form_id || ':' || normalized_email));

  SELECT EXISTS (
    SELECT 1 FROM responses
    WHERE form_id = NEW.form_id AND lower(trim(answers ->> email_label)) = normalized_email
  ) INTO already_exists;

  IF already_exists THEN
    RAISE EXCEPTION 'EMAIL_DUPLICATE:%', normalized_email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
