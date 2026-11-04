# Pitfalls: mistakes that produce wrong TaskNest answers

Check this list before presenting any number.

## 1. Comparing periods instead of cohorts
**Wrong:** "Conversion fell after Guided launched (32.6% → 28.9%), so Guided hurts."
**Right:** compare Guided vs Classic in the same weeks; explain the period change with a rate/mix decomposition. The period comparison mixes Guided with Creator Campaign and Android 3.2.

## 2. Comparing experiences with Pre data
Before 2026-06-01 every user was Classic. "Guided vs Classic over Apr–Jul" puts spring Classic users, with a different channel mix, into the Classic group. It gives about +1.9 pp (not significant) instead of +7.2 pp. **Always filter `period = 'Post'`.**

## 3. Using task-based metrics on Android 3.2
Activation, ≥3 tasks, tasks per user and tasks per project are under-counted on 3.2. Use `NOT broken_tracking`, or flag the number. Conversion and % with a project are fine on 3.2.

## 4. Reading immature conversion as low conversion
Cohorts from 2026-07-24 (155 users; and any recent cohort in new data) don't have a complete 14-day window yet. About 25% of conversions happen on days 8–14. Exclude them (`mature_14d`) or show them as a lower bound.

## 5. Averaging ratios
Never average weekly or segment rates. Use Σ converters / Σ users. Same for tasks per project: Σ tasks / Σ projects.

## 6. Ignoring the clock skew
The strict window drops events stamped before sign-up, which penalizes evening sign-ups (42% vs ~54%). For activation-by-time-of-day questions, use `activated_tol`. For headline numbers, report the official rule and mention that the tolerant rule doesn't change conclusions.

## 7. Small samples and multiple comparisons
Cross-segments get small fast (Creator · iOS · Guided ≈ 84 users). Weekly points below 15 users are noise. With many comparisons, one "significant" winner can be chance. Report n and CIs, and prefer monthly grain for small slices.

## 8. Causal language on observational data
The rollout was not randomized. Say "associated with" and "after controlling for channel and platform". Causal claims only from the randomized holdout.

## 9. Over-reading price
Price looks randomly assigned, but we only observe the **first** payment. Don't recommend a list-price change from this data alone. Recommend a test with retention.

## 10. Trusting the pre-built views blindly
`v_user_analytics` has no maturity flag and no skew tolerance, and its period labels are hard-coded. `v_executive_dashboard` reproduces the misleading company view. Use the `user_facts` CTE.

## 11. MCP timestamp display
The MCP client shifts displayed timestamps by the local UTC offset. SQL filters are correct. Format with `to_char` when you show times.

## 12. Inventing columns
Check `data_model.md` or `information_schema.columns` before writing a query. For example, there is no `converted` boolean column: derive it with `converted_14d` in the CTE.
