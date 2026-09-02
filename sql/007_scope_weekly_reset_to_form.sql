-- El reset semanal ahora solo borra respuestas de formularios marcados con
-- weekly_reset = true (todos, por ahora, pero deja la puerta abierta a un
-- futuro formulario que no deba perder datos cada semana).

SELECT cron.unschedule('weekly-reset-responses');

SELECT cron.schedule(
  'weekly-reset-responses',
  '0 6 * * 1',
  $$DELETE FROM responses WHERE form_id IN (SELECT id FROM forms WHERE weekly_reset = true)$$
);
