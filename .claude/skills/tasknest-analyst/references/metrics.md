# Metrics: canonical definitions

Every number this skill reports comes from these definitions. If a stakeholder uses a fuzzy term, map it to one of these and say which one you used.

---

## 1. Definitions

| Metric | Definition | Grain | Notes |
|---|---|---|---|
| **Sign-ups (users)** | Rows in `trial_users` | user | Cohort = sign-up date (`signup_at`). |
| **Activation (official)** | ≥1 `project_created` AND ≥3 `task_created` with `event_at ∈ [signup_at, signup_at + 7 d]` | user | Company dashboard definition. |
| **Activation (tolerant)** | Same, window `[signup_at − 15 h, signup_at + 7 d]` | user | Corrects clock skew (1,928 events stamped before sign-up). Sensitivity only; report the official rule by default. |
| **% with a project** | ≥1 `project_created` in 7 d | user | NOT affected by the Android 3.2 bug. |
| **% with ≥3 tasks** | ≥3 `task_created` in 7 d | user | The "aha" threshold (see `business_context.md`). Affected by Android 3.2. |
| **Tasks per user** | Σ tasks 7 d / users | ratio | Affected by Android 3.2. |
| **Tasks per project** | Σ tasks 7 d / Σ projects 7 d | ratio | **Telemetry health ratio.** Healthy ≈ 3.5–5.7×. Below 2.5× means events are being lost. |
| **% reminder / % collaborator** | ≥1 `reminder_set` / `collaborator_invited` in 7 d | user | Add nothing to conversion once a user is activated. |
| **Trial conversion (CVR 14 d)** | `converted_at IS NOT NULL AND converted_at ≤ signup_at + 14 d` | user | 3 payments land 2–6 h after day 14 (hourly billing batch). The official rule excludes them; including them changes nothing material. |
| **Revenue per trial (RPTS)** | `monthly_price_usd` if converted in 14 d, else 0; averaged over all users | user | First month only. Not LTV. |
| **Days to pay** | `(converted_at − signup_at)` in days, converters only | user | Median ≈ 4.8 d. |
| **Mature (14 d)** | `signup_at + 14 d ≤ extracted_at`, where `extracted_at` = start of the last day with events (2026-08-07 00:00) | flag | Only mature users have a complete CVR. Today 155 users (sign-ups from Jul 24) are immature. |
| **Mature (7 d)** | `signup_at + 7 d ≤ extracted_at` | flag | Only mature users have a complete activation. |
| **Period** | `Pre` if `signup_at < 2026-06-01`, else `Post` | label | Guided and Creator Campaign start on 2026-06-01. |
| **Broken tracking** | `platform = 'Android' AND app_version = '3.2'` | flag | Extend this list if the health check flags a new version (`new_data_playbook.md` §3). |

**Aggregation rule:** always compute Σ numerator / Σ denominator. Never average per-segment rates.

---

## 2. The `user_facts` CTE (start every analysis from this)

One row per user with every flag above. It runs as-is on the read-only MCP. Templates in `queries.md` begin right after it (they start with `SELECT … FROM uf`).

```sql
WITH params AS (
  SELECT
    date_trunc('day', (SELECT max(event_at) FROM product_events)) AS extracted_at,  -- conservative: start of the last event day (it may be partial). EDIT: override with a literal if the stakeholder gives one
    interval '15 hours'                          AS skew_tolerance,
    timestamp '2026-06-01'                       AS launch_at
),
ev AS (
  SELECT u.user_id,
    count(*) FILTER (WHERE e.event_name = 'project_created' AND e.event_at BETWEEN u.signup_at AND u.signup_at + interval '7 days') AS projects_7d,
    count(*) FILTER (WHERE e.event_name = 'task_created'    AND e.event_at BETWEEN u.signup_at AND u.signup_at + interval '7 days') AS tasks_7d,
    count(*) FILTER (WHERE e.event_name = 'project_created' AND e.event_at BETWEEN u.signup_at - p.skew_tolerance AND u.signup_at + interval '7 days') AS projects_7d_tol,
    count(*) FILTER (WHERE e.event_name = 'task_created'    AND e.event_at BETWEEN u.signup_at - p.skew_tolerance AND u.signup_at + interval '7 days') AS tasks_7d_tol,
    count(*) FILTER (WHERE e.event_name = 'task_created'    AND e.event_at BETWEEN u.signup_at - p.skew_tolerance AND u.signup_at + interval '14 days') AS tasks_14d_tol,
    bool_or(e.event_name = 'reminder_set'         AND e.event_at <= u.signup_at + interval '7 days') AS reminder_7d,
    bool_or(e.event_name = 'collaborator_invited' AND e.event_at <= u.signup_at + interval '7 days') AS collaborator_7d
  FROM trial_users u
  CROSS JOIN params p
  LEFT JOIN product_events e ON e.user_id = u.user_id
  GROUP BY u.user_id
),
uf AS (
  SELECT
    u.user_id, u.signup_at, u.acquisition_channel, u.platform, u.onboarding_experience,
    u.app_version, u.monthly_price_usd, u.converted_at,
    CASE WHEN u.signup_at < p.launch_at THEN 'Pre' ELSE 'Post' END                         AS period,
    date_trunc('week', u.signup_at)::date                                                  AS signup_week,
    to_char(u.signup_at, 'YYYY-MM')                                                        AS signup_month,
    ev.projects_7d, ev.tasks_7d, ev.tasks_14d_tol,
    (ev.projects_7d >= 1 AND ev.tasks_7d >= 3)                                             AS activated,
    (ev.projects_7d_tol >= 1 AND ev.tasks_7d_tol >= 3)                                     AS activated_tol,
    (ev.projects_7d >= 1)                                                                  AS has_project,
    (ev.tasks_7d >= 3)                                                                     AS has_3_tasks,
    coalesce(ev.reminder_7d, false)                                                        AS reminder_7d,
    coalesce(ev.collaborator_7d, false)                                                    AS collaborator_7d,
    (u.converted_at IS NOT NULL AND u.converted_at <= u.signup_at + interval '14 days')    AS converted_14d,
    CASE WHEN u.converted_at IS NOT NULL AND u.converted_at <= u.signup_at + interval '14 days'
         THEN u.monthly_price_usd ELSE 0 END                                               AS revenue_1m,
    extract(epoch FROM u.converted_at - u.signup_at) / 86400.0                             AS days_to_pay,
    (u.signup_at + interval '14 days' <= p.extracted_at)                                   AS mature_14d,
    (u.signup_at + interval '7 days'  <= p.extracted_at)                                   AS mature_7d,
    (u.platform = 'Android' AND u.app_version = '3.2')                                     AS broken_tracking   -- EDIT: extend if a new version fails the health check
  FROM trial_users u
  JOIN ev USING (user_id)
  CROSS JOIN params p
)
```

### Standard aggregate block (reuse inside any GROUP BY)

```sql
-- paste after the user_facts CTE; EDIT the GROUP BY dimension
SELECT
  acquisition_channel                                                            AS segment,
  count(*)                                                                       AS users,
  round(100 * avg(converted_14d::int), 1)                                        AS cvr_pct,
  round(100 * avg(converted_14d::int) FILTER (WHERE mature_14d), 1)              AS cvr_mature_pct,
  round(avg(revenue_1m), 2)                                                      AS rpts_usd,
  round(100 * avg(activated::int) FILTER (WHERE NOT broken_tracking), 1)         AS activation_clean_pct,
  round(100 * avg(has_project::int), 1)                                          AS project_pct,
  round(sum(tasks_7d)::numeric / nullif(sum(projects_7d), 0), 2)                 AS tasks_per_project
FROM uf
GROUP BY 1
ORDER BY users DESC
```

---

## 3. Which metric for which question

| Stakeholder says | Use | Watch out |
|---|---|---|
| "conversion", "CVR", "paid", "monetization" | CVR 14 d (+ mature-only version) | Immature cohorts; 3 day-14 edge cases |
| "activation", "engagement", "onboarding success" | Activation (official), clean (no broken tracking) | Android 3.2; clock skew (show the tolerant rule as sensitivity) |
| "revenue", "money", "ARPU" | RPTS | First month only, not LTV |
| "is tracking OK?" | Tasks per project by version × week | Below 2.5× means event loss |
| "how fast do people pay?" | Days to pay (distribution, median) | Converters only |
