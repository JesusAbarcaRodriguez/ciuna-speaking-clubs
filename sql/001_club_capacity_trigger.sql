-- Enforces a max of 17 responses per option on the "clubs" question
-- (the single radio-type question). Looked up by question type, not by
-- its label text, because the admin edits that label's date range every
-- week — hardcoding the label would silently break enforcement.
--
-- Uses pg_advisory_xact_lock to serialize concurrent inserts competing
-- for the same club, avoiding the classic count-then-insert race
-- condition (two near-simultaneous submissions both reading "16 taken"
-- and both being allowed through).

CREATE OR REPLACE FUNCTION enforce_club_capacity() RETURNS trigger AS $$
DECLARE
  radio_label text;
  club_name text;
  current_count integer;
  capacity integer := 17;
BEGIN
  SELECT label INTO radio_label FROM questions WHERE type = 'radio' ORDER BY id LIMIT 1;

  IF radio_label IS NULL THEN
    RETURN NEW;
  END IF;

  club_name := NEW.answers ->> radio_label;

  IF club_name IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(club_name));

  SELECT count(*) INTO current_count
  FROM responses
  WHERE answers ->> radio_label = club_name;

  IF current_count >= capacity THEN
    RAISE EXCEPTION 'CLUB_FULL:%', club_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_club_capacity ON responses;

CREATE TRIGGER trg_enforce_club_capacity
BEFORE INSERT ON responses
FOR EACH ROW EXECUTE FUNCTION enforce_club_capacity();
