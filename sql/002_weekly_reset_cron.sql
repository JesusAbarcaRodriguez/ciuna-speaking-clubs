-- Clears all responses every Monday at 00:00 America/Costa_Rica (UTC-6,
-- no DST), i.e. 06:00 UTC, replacing the manual Sunday Google Apps
-- Script reset with a job that runs inside Postgres itself.

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'weekly-reset-responses';

SELECT cron.schedule(
  'weekly-reset-responses',
  '0 6 * * 1',
  $$DELETE FROM responses$$
);
