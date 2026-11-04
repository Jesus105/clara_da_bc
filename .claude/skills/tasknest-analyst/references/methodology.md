# Methodology

Three tools cover almost every TaskNest question. Pick the one that matches the question; don't mix them up.

---

## §1 Rate / mix decomposition: "why did a rate change between two periods?"

A company-level rate (CVR, activation) is `Σ numerator / Σ denominator` over segments. It can move because **rates inside segments changed** (rate effect) or because **the weights of segments changed** (mix effect). TaskNest's Pre → Post conversion drop is a textbook mix effect: Creator Campaign went from 3.7% to 34.1% of sign-ups and converts at about 13%.

For each segment `c` (base period = Pre, comparison = Post):

```
r_c      = rate inside c                 w_c = share of c in the denominator
R_pre    = company rate in the base period

Rate_c   = w_post,c × (r_post,c − r_pre,c)              ← Paasche: current weights
Mix_c    = (w_post,c − w_pre,c) × (r_pre,c − R_pre)     ← mix centered on the base rate
Total_c  = Rate_c + Mix_c
```

**Closure (mandatory):** `Σ Total_c = R_post − R_pre` exactly. Proof: Σw = 1 in both periods, so the centering term cancels. If it doesn't close, a denominator is wrong or a segment is missing.

**Reading the mix sign:** a segment below the base average that gains share has a negative mix effect (it drags the average down). A segment above average that loses share is also negative.

**Reference result (2026-08-07 data, CVR by channel):** rate +3.79 pp, mix −7.49 pp, total −3.70 pp. Creator Campaign alone has a mix effect of −6.75 pp. All four channels improved their rate.

Counterfactual standardization (Post rates × Pre weights) is a good one-number summary: Post with Pre channel mix = 36.8% (vs 28.9% observed).

---

## §2 Comparing two groups: same weeks, CI, stratification

**Rule 1: same weeks.** Guided only exists from 2026-06-01. Comparing Guided (Post) against "before" mixes in Creator Campaign and Android 3.2. Compare Guided vs Classic **within the Post period**.

**Rule 2: report uncertainty.** For a difference of two rates, use the Wald 95% CI:

```
diff = p_a − p_b
se   = sqrt(p_a(1−p_a)/n_a + p_b(1−p_b)/n_b)
CI   = diff ± 1.96 × se          → significant if the CI excludes 0
```

n < 30 per group: report the number but call it fragile. Many simultaneous comparisons (for example 7 weekdays) produce false positives by chance: don't report a lone "winner" without a prior hypothesis.

**Rule 3: control for assignment imbalance.** The rollout was not randomized (iOS 75% Guided, Web 44%). Compute the lift within channel × platform strata and weight it by stratum size (`queries.md` §5.2). If the standardized lift ≈ the raw lift, imbalance doesn't explain the result.

**Rule 4: check the baseline is stable.** Compare Classic Pre vs Classic Post within each channel (`queries.md` §5.3). A flat Classic means no calendar trend inflates Guided's lift.

**Reference results (2026-08-07):** CVR Guided 31.7% vs Classic 24.6%, +7.2 pp [+1.6, +12.7]. Mature cohorts +8.7 pp [+2.6, +14.7]. Activation (excl. Android 3.2) +9.1 pp [+1.9, +16.4]. Standardized lift +6.9 pp. Classic flat within channels.

**Mediation (how Guided works):** about 30% of the conversion lift comes from more users reaching activation (≥3 tasks); about 70% from higher conversion at every activation level (non-activated 11.1% → 16.8%, activated 36.9% → 42.0%).

---

## §3 Randomized holdout readout (when it exists)

The recommendation (`business_context.md`) is to run Guided at 90% with a **10% random holdout**. When data from that holdout arrives:

1. **Identify the holdout.** Look for a new column (for example `assignment`, `variant`, `is_holdout`) or new `onboarding_experience` values. Confirm the assignment date and that it's random: the channel, platform and price mix should be equal across arms (chi-square or simply compare shares).
2. **Analyze only users assigned after the holdout started**, arm vs arm, on **mature** cohorts. No stratification is needed, because randomization handles it, but show the balance table.
3. **Primary metric:** CVR 14 d. Secondary: activation (clean), RPTS. Report lift with 95% CI.
4. **Decision rule** (agreed in the recommendation): if the lift is **below 2 pp after 6 weeks**, the observational lift was selection bias, so revisit. If the lift is ≥ 2 pp and the CI excludes 0, the effect is confirmed causally.
5. **This result supersedes** the observational estimates in §2. Say so explicitly.

---

## Language

- Observational results: "associated with", "consistent with", "after controlling for…".
- Causal language ("Guided causes…") only for the randomized holdout.
- Always pair a rate with its n; always pair a difference with its CI.
