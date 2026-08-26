-- Respaldo adicional para evitar que Supabase pause el proyecto por
-- inactividad (~7 días sin actividad en el plan gratuito). El reset
-- semanal de los lunes ya genera actividad, pero por si un job interno
-- de pg_cron no cuenta para ese detector, este agrega dos toques más a
-- la semana (domingo y miércoles), dejando el hueco más largo en ~2 días.

CREATE TABLE IF NOT EXISTS keepalive (
  id integer PRIMARY KEY DEFAULT 1,
  checked_at timestamp NOT NULL DEFAULT now()
);

INSERT INTO keepalive (id, checked_at)
VALUES (1, now())
ON CONFLICT (id) DO UPDATE SET checked_at = now();

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'keepalive-ping';

SELECT cron.schedule(
  'keepalive-ping',
  '0 12 * * 0,3',
  $$UPDATE keepalive SET checked_at = now() WHERE id = 1$$
);
