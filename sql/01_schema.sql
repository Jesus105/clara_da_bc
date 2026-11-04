-- TaskNest Relational Schema Definition
-- Database: tasknest

DROP TABLE IF EXISTS product_events CASCADE;
DROP TABLE IF EXISTS trial_users CASCADE;

-- 1. Trial Users Table
CREATE TABLE trial_users (
    user_id VARCHAR(32) PRIMARY KEY,
    signup_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    acquisition_channel VARCHAR(50) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    onboarding_experience VARCHAR(50) NOT NULL,
    app_version VARCHAR(50) NOT NULL,
    trial_length_days INTEGER NOT NULL,
    monthly_price_usd NUMERIC(10, 2) NOT NULL,
    converted_at TIMESTAMP WITHOUT TIME ZONE NULL
);

-- 2. Product Events Table
CREATE TABLE product_events (
    event_id VARCHAR(32) PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL REFERENCES trial_users(user_id) ON DELETE CASCADE,
    event_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    event_name VARCHAR(100) NOT NULL,
    app_version VARCHAR(50) NOT NULL
);

-- 3. Optimized Indexes for Analytical Query Performance
CREATE INDEX idx_product_events_user_id ON product_events(user_id);
CREATE INDEX idx_product_events_name_at ON product_events(event_name, event_at);
CREATE INDEX idx_product_events_user_name_at ON product_events(user_id, event_name, event_at);
CREATE INDEX idx_trial_users_signup ON trial_users(signup_at);
CREATE INDEX idx_trial_users_onboarding ON trial_users(onboarding_experience);
CREATE INDEX idx_trial_users_channel ON trial_users(acquisition_channel);
CREATE INDEX idx_trial_users_platform ON trial_users(platform);
