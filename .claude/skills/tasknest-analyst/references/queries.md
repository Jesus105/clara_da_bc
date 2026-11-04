# Query templates

**How to use:** paste the `user_facts` CTE from `metrics.md` §2, then the template body right after it. Every template starts with `SELECT … FROM uf` or with `, name AS (…)` to continue the CTE chain. Lines marked `-- EDIT` are the ones you normally change. All templates were tested against the TaskNest DB and run as-is.

Filter idioms you will reuse in `WHERE` clauses:

```text
period = 'Post'                                   -- same weeks as Guided (since 2026-06-01)
signup_at >= '2026-07-01' AND signup_at < '2026-08-01'   -- a month of sign-ups
acquisition_channel <> 'Creator Campaign'         -- "everything but Creator"
platform = 'iOS' AND acquisition_channel = 'Creator Campaign'   -- a cross
NOT broken_tracking                               -- clean task/activation metrics
mature_14d                                        -- complete conversion
```

---

## §1 Snapshot of a slice

```sql
SELECT
  count(*)                                                                 AS users,
  round(100 * avg(converted_14d::int), 1)                                  AS cvr_pct,
  count(*) FILTER (WHERE NOT mature_14d)                                   AS immature_users,
  round(100 * avg(converted_14d::int) FILTER (WHERE mature_14d), 1)        AS cvr_mature_pct,
  round(avg(revenue_1m), 2)                                                AS rpts_usd,
  round(100 * avg(activated::int), 1)                                      AS activation_pct,
  round(100 * avg(activated::int) FILTER (WHERE NOT broken_tracking), 1)   AS activation_clean_pct,
  round(100 * avg(has_project::int), 1)                                    AS project_pct,
  round(100 * avg(has_3_tasks::int) FILTER (WHERE NOT broken_tracking), 1) AS three_tasks_clean_pct
FROM uf
WHERE platform = 'iOS'                                                     -- EDIT: slice
  AND signup_at >= '2026-07-01' AND signup_at < '2026-08-01'               -- EDIT: dates
```

Always give a reference next to the slice (the same KPI for all users in the same dates). Without one, a number is hard to read.

---

## §2 Timeline by sign-up cohort (week)

```sql
SELECT
  signup_week,
  count(*)                                                                 AS users,
  round(100 * avg(converted_14d::int), 1)                                  AS cvr_pct,
  bool_or(NOT mature_14d)                                                  AS cvr_incomplete,
  round(100 * avg(activated::int) FILTER (WHERE NOT broken_tracking), 1)   AS activation_clean_pct,
  round(100 * avg((onboarding_experience = 'Guided')::int), 0)             AS guided_share_pct,
  round(100 * avg((acquisition_channel = 'Creator Campaign')::int), 0)     AS creator_share_pct
FROM uf
-- WHERE platform = 'iOS'                                                  -- EDIT: optional slice
GROUP BY signup_week
ORDER BY signup_week
```

Weeks start on Monday. The first week (Apr 1 is a Wednesday) and the last week are partial. Weekly n is about 80–130 overall. Slices below 15 users per week are noise: switch to `signup_month`.

---

## §3 Compare custom segments (A vs B vs …) with 95% CI vs the first segment

```sql
, seg AS (
  SELECT *,
    CASE                                                                   -- EDIT: define up to 4 segments; first = baseline
      WHEN acquisition_channel <> 'Creator Campaign' THEN 'A · Not Creator'
      WHEN acquisition_channel =  'Creator Campaign' THEN 'B · Creator'
    END AS segment
  FROM uf
  WHERE signup_at >= '2026-04-01'                                          -- EDIT: dates
),
agg AS (
  SELECT segment, count(*)::numeric AS n,
         avg(converted_14d::int)::numeric AS p                             -- EDIT: metric (any boolean flag)
  FROM seg WHERE segment IS NOT NULL GROUP BY segment
),
base AS (SELECT * FROM agg ORDER BY segment LIMIT 1)
SELECT a.segment, a.n AS users, round(100 * a.p, 1) AS rate_pct,
  round(100 * (a.p - b.p), 1)                                                          AS diff_pp,
  round(100 * ((a.p - b.p) - 1.96 * sqrt(a.p*(1-a.p)/a.n + b.p*(1-b.p)/b.n)), 1)        AS ci_low_pp,
  round(100 * ((a.p - b.p) + 1.96 * sqrt(a.p*(1-a.p)/a.n + b.p*(1-b.p)/b.n)), 1)        AS ci_high_pp
FROM agg a CROSS JOIN base b
ORDER BY a.segment
```

Read it like this: the CI excludes 0 means the difference is significant at 95%; the CI crosses 0 means it can be noise. For activation, add `AND NOT broken_tracking` in `seg`. For conversion, consider `AND mature_14d`.

---

## §4 Why did a rate change? Rate / mix decomposition (Pre vs Post by channel)

```sql
, b AS (
  SELECT acquisition_channel AS v,                                          -- EDIT: dimension
         (period = 'Post') AS cy,                                           -- EDIT: base (false) vs comparison (true)
         converted_14d::int AS c                                            -- EDIT: metric
  FROM uf
),
g AS (SELECT v,
  sum(c) FILTER (WHERE NOT cy)::numeric AS num_ly, count(*) FILTER (WHERE NOT cy)::numeric AS den_ly,
  sum(c) FILTER (WHERE cy)::numeric     AS num_cy, count(*) FILTER (WHERE cy)::numeric     AS den_cy
  FROM b GROUP BY v),
t AS (SELECT sum(num_ly)/sum(den_ly) AS kpi_ly, sum(num_cy)/sum(den_cy) AS kpi_cy, sum(den_ly) AS tl, sum(den_cy) AS tc FROM g),
d AS (SELECT v, num_ly/nullif(den_ly,0) AS r_ly, num_cy/nullif(den_cy,0) AS r_cy, den_ly/tl AS w_ly, den_cy/tc AS w_cy, kpi_ly, kpi_cy FROM g, t)
SELECT v AS segment,
  round(100*r_ly,1) AS rate_base, round(100*r_cy,1) AS rate_cmp,
  round(100*w_ly,1) AS share_base, round(100*w_cy,1) AS share_cmp,
  round(100*w_cy*(r_cy-r_ly),2)                 AS rate_effect_pp,
  round(100*(w_cy-w_ly)*(r_ly-kpi_ly),2)        AS mix_effect_pp,
  round(100*(w_cy*(r_cy-r_ly)+(w_cy-w_ly)*(r_ly-kpi_ly)),2) AS total_pp
FROM d
UNION ALL
SELECT 'TOTAL', round(100*max(kpi_ly),1), round(100*max(kpi_cy),1), 100, 100,
  round(100*sum(w_cy*(r_cy-r_ly)),2), round(100*sum((w_cy-w_ly)*(r_ly-kpi_ly)),2),
  round(100*sum(w_cy*(r_cy-r_ly)+(w_cy-w_ly)*(r_ly-kpi_ly)),2)
FROM d
ORDER BY total_pp
```

**Closure check:** the TOTAL `total_pp` must equal `rate_cmp − rate_base` of the TOTAL row (±0.01). If a segment has no users in the base period, `r_ly` is null: treat it as pure mix and mention it. Method: `methodology.md` §1.

---

## §5 Guided vs Classic

### 5.1 Same-weeks comparison with CI (the headline)

```sql
, m AS (
  SELECT 'cvr_14d' AS metric, onboarding_experience AS x, count(*)::numeric AS n, avg(converted_14d::int)::numeric AS p FROM uf WHERE period='Post' GROUP BY 2
  UNION ALL SELECT 'cvr_14d_mature', onboarding_experience, count(*), avg(converted_14d::int) FROM uf WHERE period='Post' AND mature_14d GROUP BY 2
  UNION ALL SELECT 'activation_clean', onboarding_experience, count(*), avg(activated::int) FROM uf WHERE period='Post' AND NOT broken_tracking GROUP BY 2
),
w AS (SELECT metric,
  max(n) FILTER (WHERE x='Guided') AS ng, max(p) FILTER (WHERE x='Guided') AS pg,
  max(n) FILTER (WHERE x='Classic') AS nc, max(p) FILTER (WHERE x='Classic') AS pc FROM m GROUP BY metric)
SELECT metric, ng AS n_guided, round(100*pg,1) AS guided_pct, nc AS n_classic, round(100*pc,1) AS classic_pct,
  round(100*(pg-pc),1) AS lift_pp,
  round(100*((pg-pc)-1.96*sqrt(pg*(1-pg)/ng+pc*(1-pc)/nc)),1) AS ci_low,
  round(100*((pg-pc)+1.96*sqrt(pg*(1-pg)/ng+pc*(1-pc)/nc)),1) AS ci_high
FROM w ORDER BY metric
```

Add RPTS separately with `avg(revenue_1m)` grouped by experience (`period = 'Post'`).

### 5.2 Lift controlled for channel × platform (assignment bias check)

```sql
, s AS (
  SELECT acquisition_channel AS ch, platform AS pl,
    count(*) FILTER (WHERE onboarding_experience='Guided')  AS ng, avg(converted_14d::int) FILTER (WHERE onboarding_experience='Guided')  AS cg,
    count(*) FILTER (WHERE onboarding_experience='Classic') AS nc, avg(converted_14d::int) FILTER (WHERE onboarding_experience='Classic') AS cc
  FROM uf WHERE period = 'Post' GROUP BY 1,2
)
SELECT ch, pl, ng, round(100*cg,1) AS guided_pct, nc, round(100*cc,1) AS classic_pct, round(100*(cg-cc),1) AS lift_pp FROM s
UNION ALL
SELECT 'STANDARDIZED', '(weights = stratum n)', sum(ng), NULL, sum(nc), NULL,
  round(100*sum((cg-cc)*(ng+nc))/sum(ng+nc),2) FROM s WHERE ng > 0 AND nc > 0
ORDER BY 1,2
```

If the standardized lift is close to the raw lift (§5.1), assignment imbalance does not explain the effect. Expect some negative cells with fewer than 60 users per arm: that is noise, not a contradiction.

### 5.3 Is Classic a valid baseline? (hidden-trend check)

```sql
SELECT acquisition_channel,
  count(*) FILTER (WHERE period='Pre')                                                         AS n_classic_pre,
  round(100*avg(converted_14d::int) FILTER (WHERE period='Pre'),1)                             AS classic_pre_pct,
  count(*) FILTER (WHERE period='Post' AND onboarding_experience='Classic')                     AS n_classic_post,
  round(100*avg(converted_14d::int) FILTER (WHERE period='Post' AND onboarding_experience='Classic'),1) AS classic_post_pct,
  round(100*avg(converted_14d::int) FILTER (WHERE period='Post' AND onboarding_experience='Guided'),1)  AS guided_post_pct
FROM uf GROUP BY 1 ORDER BY 1
```

Classic flat from Pre to Post within channels means no secular trend: Guided's lift is not a calendar effect.

---

## §6 The "aha" curve: conversion by number of tasks

```sql
SELECT least(tasks_14d_tol, 6) AS tasks_14d_capped, count(*) AS users,
       round(100*avg(converted_14d::int),1) AS cvr_pct
FROM uf
WHERE NOT broken_tracking                                                  -- required: broken versions under-count tasks
GROUP BY 1 ORDER BY 1
```

Expected shape: flat around 17% for 0–2 tasks, a jump to around 40% at 3 or more.

---

## §7 Time to pay

```sql
SELECT floor(days_to_pay)::int AS day, count(*) AS payers,
       round(100.0*count(*)/sum(count(*)) OVER (), 1) AS pct_of_payers
FROM uf WHERE converted_14d
GROUP BY 1 ORDER BY 1
```

Median: `SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY days_to_pay) FROM uf WHERE converted_14d`.

---

## §8 Price: conversion, revenue per trial and elasticity

```sql
, pr AS (
  SELECT monthly_price_usd AS price, count(*)::numeric AS n, avg(converted_14d::int)::numeric AS cvr, avg(revenue_1m) AS rpts
  FROM uf
  -- WHERE period = 'Post' AND onboarding_experience = 'Guided'            -- EDIT: optional slice
  GROUP BY 1
)
SELECT price, n AS users, round(100*cvr,1) AS cvr_pct, round(rpts,2) AS rpts_usd,
  round((( (SELECT cvr FROM pr ORDER BY price DESC LIMIT 1) - (SELECT cvr FROM pr ORDER BY price LIMIT 1) )
        / ( ((SELECT cvr FROM pr ORDER BY price DESC LIMIT 1) + (SELECT cvr FROM pr ORDER BY price LIMIT 1)) / 2 ))
        / ( (max(price) OVER () - min(price) OVER ()) / ((max(price) OVER () + min(price) OVER ()) / 2) ), 3) AS arc_elasticity_low_to_high
FROM pr ORDER BY price
```

Before reading price as causal, check that the price mix is balanced across segments: `SELECT acquisition_channel, monthly_price_usd, count(*) FROM uf GROUP BY 1,2`. So far it is about 25/55/20 everywhere.

---

## §9 Telemetry health: tasks per project by version × week

```sql
SELECT platform, app_version, signup_week, count(*) AS users,
  round(sum(tasks_7d)::numeric / nullif(sum(projects_7d),0), 2) AS tasks_per_project,
  round(100*avg(has_project::int),1) AS project_pct,
  CASE WHEN sum(tasks_7d)::numeric / nullif(sum(projects_7d),0) < 2.5 THEN '⚠ event loss' ELSE 'ok' END AS status
FROM uf
GROUP BY 1,2,3
ORDER BY 1,2,3
```

A version with tasks per project below 2.5× while `project_pct` stays normal has a **tracking problem, not a usage problem**. Add it to `broken_tracking` in the CTE for the rest of the session and tell the user.
