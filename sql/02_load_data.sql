-- TaskNest Data Load Script
-- Loads trial_users.csv and product_events.csv into PostgreSQL

-- Truncate existing data to allow idempotent re-runs
TRUNCATE TABLE product_events CASCADE;
TRUNCATE TABLE trial_users CASCADE;

-- 1. Ingest trial_users
COPY trial_users (
    user_id,
    signup_at,
    acquisition_channel,
    platform,
    onboarding_experience,
    app_version,
    trial_length_days,
    monthly_price_usd,
    converted_at
)
FROM '/data/trial_users.csv'
WITH (FORMAT csv, HEADER true, NULL '');

-- 2. Ingest product_events
COPY product_events (
    event_id,
    user_id,
    event_at,
    event_name,
    app_version
)
FROM '/data/product_events.csv'
WITH (FORMAT csv, HEADER true, NULL '');
