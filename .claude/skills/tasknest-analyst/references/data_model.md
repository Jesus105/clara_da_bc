# Data model: TaskNest (PostgreSQL 16, database `tasknest`)

Snapshot as of the **2026-08-07 extraction**. If the freshness check (`new_data_playbook.md` §1) returns different numbers, new data has arrived.

---

## Tables

### `trial_users`: one row per trial sign-up

| Column | Type | Domain (as of extraction) | Notes |
|---|---|---|---|
| `user_id` | varchar PK | `U00001`–`U01800` | 1,800 unique |
| `signup_at` | timestamp | 2026-04-01 07:03 → 2026-07-31 22:32 | Minute granularity. Cohort key. |
| `acquisition_channel` | varchar | Organic 615 · Paid Search 463 · Creator Campaign 378 · Referral 344 | Creator is 3.7% of Pre and 34.1% of Post |
| `platform` | varchar | iOS 612 · Android 749 · Web 439 | |
| `onboarding_experience` | varchar | Classic 1,179 · Guided 621 | Guided only from 2026-06-01 (~60% of Post). Not randomized: iOS 75% Guided, Web 44%. |
| `app_version` | varchar | `4.1` (iOS) · `3.1` / `3.2` (Android) · `Web` | Deterministic by platform. Android 3.2 from 2026-06-20. |
| `trial_length_days` | int | 14 for everyone | |
| `monthly_price_usd` | numeric | 12 (450) · 15 (986) · 18 (364) | ~25/55/20 in every segment |
| `converted_at` | timestamp, nullable | 552 non-null | Always on the hour (hourly billing batch) |

### `product_events`: one row per product event

| Column | Type | Notes |
|---|---|---|
| `event_id` | varchar PK | 10,220 unique |
| `user_id` | varchar FK | No orphans; every user has ≥1 event |
| `event_at` | timestamp | 2026-04-01 → 2026-08-07 14:56. **1,928 events are earlier than the user's `signup_at`** (up to −14.9 h, clock skew). |
| `event_name` | varchar | see below |
| `app_version` | varchar | Always equals `trial_users.app_version` for the user |

| `event_name` | Events | Users | Per user |
|---|---|---|---|
| `trial_started` | 1,800 | 1,800 | 1 |
| `app_open` | 1,800 | 1,800 | 1 |
| `project_created` | 1,247 | 1,247 | max 1 |
| `task_created` | 4,780 | 1,453 | 3.29 (the only repeatable event) |
| `reminder_set` | 412 | 412 | max 1 |
| `collaborator_invited` | 181 | 181 | max 1 |

---

## Pre-built views (read, but don't rely on them blindly)

| View | What it does | Caveat |
|---|---|---|
| `v_user_events_7d` | projects_7d, tasks_7d per user (strict window) | No clock-skew tolerance |
| `v_user_analytics` | user-level flags: `period`, `is_activated_7d`, `converted_14d`, `revenue_1m`, `conversion_days` | No maturity flag; `period` label is `'Pre (Abr-May)'` / `'Post (Jun-Jul)'` |
| `v_executive_dashboard` | Pre vs Post totals | **This is the misleading company view** (mixes everything) |
| `v_simpson_breakdown` | period × experience × channel | Handy for a quick look |

Prefer the `user_facts` CTE (`metrics.md` §2): it adds maturity, the tolerant activation rule and the broken-tracking flag, and it does not depend on hard-coded period labels.

---

## Known data quality facts

1. **Android 3.2 under-logs `task_created`** from 2026-06-20. Tasks per user 2.81 → 0.94; ≥3 tasks 51% → 8%; tasks per project 4.48× → 1.54×. Projects (63% → 61%) and conversion (29.1% → 31.0%) are unchanged.
2. **Clock skew:** 1,928 events precede sign-up (range −14.9 h … +14.3 h). The strict window drops 106 projects and 80 tasks, which biases activation down for evening sign-ups (42% vs ~54% corrected).
3. **Immature cohorts:** with the skill's conservative cutoff (start of the last event day, 2026-08-07 00:00), **155 users** who signed up from 2026-07-24 lack a complete 14-day window (Post: 530 Guided / 339 Classic mature). The dashboard app uses end of day (122 immature, from Jul 25). Both give the same conclusion.
4. **Day-14 edge:** 3 payments land 2–6 h after day 14.
5. **Integrity:** no duplicate PKs, no orphans, no version mismatches between tables.

---

## Discovery (when something isn't in this catalog)

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position
```

```sql
SELECT 'channel' AS dim, acquisition_channel AS value, count(*) FROM trial_users GROUP BY 2
UNION ALL SELECT 'platform', platform, count(*) FROM trial_users GROUP BY 2
UNION ALL SELECT 'experience', onboarding_experience, count(*) FROM trial_users GROUP BY 2
UNION ALL SELECT 'version', app_version, count(*) FROM trial_users GROUP BY 2
UNION ALL SELECT 'price', monthly_price_usd::text, count(*) FROM trial_users GROUP BY 2
UNION ALL SELECT 'event', event_name, count(*) FROM product_events GROUP BY 2
ORDER BY 1, 3 DESC
```
