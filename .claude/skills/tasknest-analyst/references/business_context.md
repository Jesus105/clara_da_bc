# Business context: findings to date (2026-08-07 extraction)

Use these as **baselines**. If a new query on the same data gives a different number, your query is probably wrong. If the data changed, explain the difference.

---

## §1 The case

TaskNest (fictional productivity app, 14-day free trial) launched **Guided Onboarding** on 2026-06-01 for part of new users, expecting higher activation and conversion. The company dashboard instead showed **activation 50.1% → 37.0% and conversion 32.6% → 28.9%** (Apr–May vs Jun–Jul). In the same window, a **Creator Campaign** started (Jun 1) and **Android 3.2** changed task tracking (Jun 20). No randomized experiment was run. The CPO must decide: **expand, modify or stop Guided?**

---

## §2 Findings

| # | Finding | Key numbers |
|---|---|---|
| 1 | **The conversion drop is channel mix.** Every channel improved; Creator Campaign (≈13% CVR) grew from 3.7% to 34.1% of sign-ups. | Rate +3.79 pp, mix −7.49 pp, total −3.70 pp. Post with Pre mix = 36.8%. |
| 2 | **The activation drop is a tracking bug** on Android 3.2. | ≥3 tasks 51.0% → 8.1%; projects 62.8% → 60.9%; CVR 29.1% → 31.0%; payers who look activated 66.9% → 7.1%. |
| 3 | **Guided beats Classic in the same weeks.** | CVR 31.7% vs 24.6% (+7.2 pp [+1.6, +12.7]); mature +8.7 pp; activation excl. 3.2: 51.0% vs 41.8% (+9.1 pp); RPTS $4.73 vs $3.61 (+31%). |
| 4 | **The lift survives stress tests** (still observational). | Standardized by channel × platform +6.9 pp; Classic flat Pre → Post within channels; Guided ahead on all 4 platforms (iOS +4.3, Web +9.3, Android 3.1 +3.0, Android 3.2 +5.8 pp). 3 of 12 small strata negative (noise). |
| 5 | **The "aha" moment is the 3rd task.** | CVR ~17% with 0–2 tasks, ~41% with 3 or more. A project without 3 tasks converts like nothing (16.4%). Reminders and collaborators add nothing once activated. |
| 6 | **Price is inelastic on first payment.** | CVR 31.1 / 30.6 / 29.4% at $12 / $15 / $18; arc elasticity −0.14; $12 vs $18 diff +1.7 pp [−4.6, +8.1]; RPTS $3.73 / $4.59 / $5.29. Watch Organic and Web at $18 (small n). |
| 7 | **Users decide early.** | 74% of payers pay within 7 days; median 4.8 days; small bump on day 13. |
| 8 | **Channel quality varies 3.6×.** | RPTS: Referral $6.99 · Organic $5.12 · Paid $3.99 · Creator $1.95. Activated Creator users convert at 25% (an intent problem, not a product problem). |

Mature cohorts = sign-ups before 2026-07-24 (conservative cutoff). Clock-skew sensitivity: the tolerant rule changes Guided's activation lift from +7.4 to +7.6 pp. The conclusion is robust to it.

---

## §3 Recommendation delivered

1. **Expand Guided to 90%** of new users with a **10% random holdout** (hash of `user_id`).
2. **P0 fix** for Android 3.2 task tracking.
3. **Rebuild the dashboard:** by channel, complete cohorts only, broken versions flagged, UTC timestamps.
4. **Guided 2.0** aimed at reaching 3 tasks in 72 h.
5. **Test $15 vs $18** with 90-day retention; test a 7-day trial; audit Creator Campaign CAC.

Order of magnitude (~510 sign-ups/month): Guided 60% → 90% ≈ +12 paying customers/month; full value ≈ +39/month.

---

## §4 What would change the recommendation

| Signal | Threshold | Implication |
|---|---|---|
| Holdout lift (randomized) | < 2 pp after 6 weeks | Observational lift was selection bias → revisit Guided |
| Guided retention months 2–3 | Lower churn-adjusted revenue than Classic | Guided pulls low-quality conversions → modify |
| Android activation after the fix | Doesn't recover to ~40–45% | Real usage drop on 3.2, not just tracking → investigate the app |
| Same-weeks lift with new data | CI crosses 0 on mature cohorts | Evidence weakened → keep the holdout longer before scaling |
