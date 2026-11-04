# Report format

Stakeholders read the first two lines. Put the answer there.

## Structure

1. **Answer (1–2 sentences)** with the key number and its direction.
   > iOS converted at **33.2%** in Jun–Jul (n = 355), 4.3 pp above the all-platform rate for the same weeks.
2. **Evidence table**, compact:

   | Segment | n | Metric | Δ vs reference | 95% CI |
   |---|---|---|---|---|

3. **Caveats that apply**, one line each, only if relevant:
   - Android 3.2 included in a task-based metric.
   - Cohorts without 14 days included.
   - n < 30 in some group.
   - Observational (not randomized).
4. **So what (optional, one line):** what it means for the Guided decision or what to check next.
5. Sign-off: `— tasknest-analyst v1.0 · data extracted <YYYY-MM-DD>`

## Number formatting

| Kind | Format | Example |
|---|---|---|
| Rate | % with 1 decimal | 31.7% |
| Difference of rates | pp with 1 decimal, signed | +7.2 pp |
| Relative change | % without decimals | +29% |
| Money | $ with 2 decimals | $4.73 |
| Counts | thousands separator | 1,024 |
| CI | brackets | [+1.6, +12.7] |

## Language

- Reply in the stakeholder's language (Spanish or English); keep metric names as defined in `metrics.md`.
- Correlation verbs for observational results: "associated with", "consistent with", "explained by mix".
- Say "can't tell" when the CI crosses zero. Don't round noise into a finding.
- If the question can't be answered with the available data (for example LTV, CAC, retention after month 1), say so and name the data that would be needed.

## When the stakeholder wants a chart

Point them to the interactive dashboard in `app/` (Timeline and Comparativo tabs), with the exact filters or groups to set. Or return a small markdown table they can paste. Don't build new UI from this skill.
