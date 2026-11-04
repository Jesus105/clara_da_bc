#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "=================================================="
echo "🔍 Verifying TaskNest PostgreSQL Database"
echo "=================================================="

# Check row counts
echo "1. Table Row Counts:"
docker exec -i tasknest-postgres psql -U postgres -d tasknest -c "
SELECT 'trial_users' AS table_name, count(*) AS row_count, 1800 AS expected FROM trial_users
UNION ALL
SELECT 'product_events', count(*), 10220 FROM product_events;
"

# Check referential integrity
echo "2. Referential Integrity Check (Orphans):"
docker exec -i tasknest-postgres psql -U postgres -d tasknest -c "
SELECT count(*) AS orphaned_events
FROM product_events e
LEFT JOIN trial_users u ON e.user_id = u.user_id
WHERE u.user_id IS NULL;
"

# Check executive dashboard metrics
echo "3. Executive Dashboard View (Simulated Pre vs Post):"
docker exec -i tasknest-postgres psql -U postgres -d tasknest -c "
SELECT * FROM v_executive_dashboard;
"

# Check sample conversion by experience in post period
echo "4. Post Period Onboarding Comparison:"
docker exec -i tasknest-postgres psql -U postgres -d tasknest -c "
SELECT 
    onboarding_experience,
    count(*) AS users,
    round(avg(case when converted_14d then 1.0 else 0.0 end)*100, 2) AS conv_rate_pct,
    round(avg(revenue_1m), 2) AS rpts_usd
FROM v_user_analytics
WHERE period = 'Post (Jun-Jul)'
GROUP BY onboarding_experience;
"
