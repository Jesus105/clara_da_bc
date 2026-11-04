# New data playbook

Run this when the freshness check shows the data changed, or when a stakeholder says new data was loaded. Goal: **know what changed before answering anything**, and re-check whether the current recommendation still holds.

---

## §1 Freshness check (run once per session, always)

```sql
SELECT
  (SELECT count(*) FROM trial_users)                                AS users,
  (SELECT count(*) FROM product_events)                             AS events,
  (SELECT to_char(min(signup_at),'YYYY-MM-DD HH24:MI') FROM trial_users)   AS first_signup,
  (SELECT to_char(max(signup_at),'YYYY-MM-DD HH24:MI') FROM trial_users)   AS last_signup,
  (SELECT to_char(max(event_at),'YYYY-MM-DD HH24:MI') FROM product_events) AS max_event_at,
  (SELECT count(*) FROM trial_users WHERE converted_at IS NOT NULL) AS converters,
  (SELECT string_agg(DISTINCT acquisition_channel, ', ') FROM trial_users)   AS channels,
  (SELECT string_agg(DISTINCT onboarding_experience, ', ') FROM trial_users) AS experiences,
  (SELECT string_agg(DISTINCT platform || ' ' || app_version, ', ') FROM trial_users) AS versions,
  (SELECT string_agg(DISTINCT monthly_price_usd::text, ', ') FROM trial_users)      AS prices
```

**Baseline (2026-08-07 extraction):** users 1,800 · events 10,220 · sign-ups 2026-04-01 07:03 → 2026-07-31 22:32 · max event_at 2026-08-07 14:56 · converters 552 · channels {Creator Campaign, Organic, Paid Search, Referral} · experiences {Classic, Guided} · versions {Android 3.1, Android 3.2, Web Web, iOS 4.1} · prices {12, 15, 18}.

If everything matches, skip the rest of this playbook. Otherwise continue.

---

## §2 Integrity checks

```sql
SELECT
  (SELECT count(*) - count(DISTINCT user_id) FROM trial_users)                       AS dup_users,
  (SELECT count(*) - count(DISTINCT event_id) FROM product_events)                   AS dup_events,
  (SELECT count(*) FROM product_events e LEFT JOIN trial_users u USING (user_id) WHERE u.user_id IS NULL) AS orphan_events,
  (SELECT count(*) FROM trial_users u WHERE NOT EXISTS (SELECT 1 FROM product_events e WHERE e.user_id = u.user_id)) AS users_without_events,
  (SELECT count(*) FROM product_events e JOIN trial_users u USING (user_id) WHERE e.app_version <> u.app_version) AS version_mismatch,
  (SELECT count(*) FROM trial_users WHERE converted_at < signup_at)                  AS pay_before_signup,
  (SELECT round(100.0*avg((e.event_at < u.signup_at)::int),1) FROM product_events e JOIN trial_users u USING (user_id)) AS pct_events_before_signup,
  (SELECT count(*) FROM trial_users WHERE converted_at > signup_at + interval '14 days') AS pay_after_day14,
  (SELECT count(*) FROM trial_users WHERE converted_at IS NOT NULL AND date_trunc('hour', converted_at) <> converted_at) AS pay_not_on_hour
```

Baseline: 0 · 0 · 0 · 0 · 0 · 0 · 18.9% · 3 · 0. Anything non-zero that was zero before → report it before any analysis.

---

## §3 What's new? (categories, versions, tracking health)

1. **New categories.** Compare §1 `channels / experiences / versions / prices` with the baseline. For each new value:
   - New **channel** → show its volume, CVR and share by week. Mix shifts can distort aggregates again (`methodology.md` §1).
   - New **experience value** (for example `Holdout`, `Guided v2`) or a new column like `assignment` → probably the randomized holdout. Go to `methodology.md` §3.
   - New **app version** → run the telemetry health check below **before** using its task or activation numbers.
   - New **price** → check that its assignment is balanced across segments before reading it as a price effect.
2. **Telemetry health:** run `queries.md` §9. Any version × week with tasks per project < 2.5× and a normal project rate → flag it as broken tracking (extend `broken_tracking` in the CTE).
3. **Android 3.2 fix?** If a newer Android version appears, check whether tasks per project went back to about 3.5–5.7×. If yes, activation on that version is usable again. Say so.

---

## §4 Maturity

New sign-ups always arrive with incomplete windows. `user_facts` derives maturity from `extracted_at` automatically. Report:

```sql
SELECT count(*) FILTER (WHERE NOT mature_7d) AS users_without_7d, count(*) FILTER (WHERE NOT mature_14d) AS users_without_14d
FROM uf
```

(after the `user_facts` CTE). Baseline: 20 users without 7 days, 155 without 14 days. Conversion for cohorts without 14 days is a lower bound: exclude them from comparisons, or show them flagged.

---

## §5 Re-check the recommendation

Re-run these and compare with `business_context.md` §2:

1. Same-weeks Guided vs Classic (`queries.md` §5.1), using all Post sign-ups so far.
2. Standardized lift (§5.2) and Classic stability (§5.3).
3. Rate/mix decomposition of any company-level change since the last readout (§4), with the new period as the comparison.
4. If a holdout exists: holdout readout (`methodology.md` §3). It takes precedence.

Then answer explicitly: **"The recommendation still holds / should change, because…"**, using the thresholds in `business_context.md` §4.

---

## §6 Report what changed

Open the first answer after new data with a short "What's new in the data" block:

| Item | Before | Now |
|---|---|---|
| Sign-ups / extraction date | 1,800 · 2026-08-07 | … |
| New categories | – | … |
| Integrity issues | none | … |
| Tracking health | Android 3.2 broken | … |
| Guided vs Classic CVR lift | +7.2 pp [+1.6, +12.7] | … |
