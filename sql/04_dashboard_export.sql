-- TaskNest · Export user-level para el dashboard (una fila por usuario, flags precalculados en SQL)
-- Uso: scripts/export_dashboard_data.sh  ->  app/public/data/users.json
--
-- Reglas (ver ANALISIS_COMPLETO_TASKNEST.md):
--   * Activación oficial : >=1 project_created y >=3 task_created en [signup_at, signup_at + 7d]
--   * Activación tolerante: igual pero con ventana [signup_at - 15h, signup_at + 7d] (desfase de reloj)
--   * Conversión 14d      : converted_at <= signup_at + 14d
--   * Cohorte madura      : signup_at + 14d <= extracción (2026-08-07)
WITH ev AS (
  SELECT u.user_id,
    count(*) FILTER (WHERE e.event_name = 'project_created' AND e.event_at BETWEEN u.signup_at AND u.signup_at + interval '7 days') AS ps,
    count(*) FILTER (WHERE e.event_name = 'task_created'    AND e.event_at BETWEEN u.signup_at AND u.signup_at + interval '7 days') AS ts,
    count(*) FILTER (WHERE e.event_name = 'project_created' AND e.event_at BETWEEN u.signup_at - interval '15 hours' AND u.signup_at + interval '7 days') AS pt,
    count(*) FILTER (WHERE e.event_name = 'task_created'    AND e.event_at BETWEEN u.signup_at - interval '15 hours' AND u.signup_at + interval '7 days') AS tt,
    count(*) FILTER (WHERE e.event_name = 'reminder_set'         AND e.event_at BETWEEN u.signup_at - interval '15 hours' AND u.signup_at + interval '7 days') AS rm,
    count(*) FILTER (WHERE e.event_name = 'collaborator_invited' AND e.event_at BETWEEN u.signup_at - interval '15 hours' AND u.signup_at + interval '7 days') AS cl
  FROM trial_users u
  LEFT JOIN product_events e ON e.user_id = u.user_id
  GROUP BY u.user_id
)
SELECT json_build_object(
  'generated_at', now(),
  'extraction_date', '2026-08-07',
  'users', json_agg(json_build_object(
    'id', u.user_id,
    's',  to_char(u.signup_at, 'YYYY-MM-DD"T"HH24:MI'),
    'ch', u.acquisition_channel,
    'pl', u.platform,
    'x',  u.onboarding_experience,
    'v',  u.app_version,
    'p',  u.monthly_price_usd::int,
    'c',  (u.converted_at IS NOT NULL AND u.converted_at <= u.signup_at + interval '14 days')::int,
    'm',  (u.signup_at + interval '14 days' <= timestamp '2026-08-07 23:59:59')::int,
    'ps', ev.ps, 'ts', ev.ts, 'pt', ev.pt, 'tt', ev.tt,
    'rm', least(ev.rm, 1), 'cl', least(ev.cl, 1)
  ) ORDER BY u.signup_at)
)
FROM trial_users u JOIN ev USING (user_id);
