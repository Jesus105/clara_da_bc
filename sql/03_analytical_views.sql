-- TaskNest Business Case Analytical Views
-- Mirrors the business logic defined in the brief & analisis_tasknest.py

-- 1. View: User Events within 7 Days Window (Activation Window)
CREATE OR REPLACE VIEW v_user_events_7d AS
SELECT
    u.user_id,
    COUNT(CASE WHEN e.event_name = 'project_created' THEN 1 END) AS projects_7d,
    COUNT(CASE WHEN e.event_name = 'task_created' THEN 1 END) AS tasks_7d
FROM trial_users u
LEFT JOIN product_events e
    ON u.user_id = e.user_id
   AND e.event_at >= u.signup_at
   AND e.event_at <= (u.signup_at + INTERVAL '7 days')
GROUP BY u.user_id;

-- 2. View: Comprehensive User Analysis View
CREATE OR REPLACE VIEW v_user_analytics AS
SELECT
    u.user_id,
    u.signup_at,
    u.acquisition_channel,
    u.platform,
    u.onboarding_experience,
    u.app_version,
    u.trial_length_days,
    u.monthly_price_usd,
    u.converted_at,
    
    -- Period Classification
    CASE 
        WHEN u.signup_at < '2026-06-01' THEN 'Pre (Abr-May)'
        ELSE 'Post (Jun-Jul)'
    END AS period,

    -- 7-Day Activation Metrics
    COALESCE(e7.projects_7d, 0) AS projects_7d,
    COALESCE(e7.tasks_7d, 0) AS tasks_7d,
    (COALESCE(e7.projects_7d, 0) >= 1 AND COALESCE(e7.tasks_7d, 0) >= 3) AS is_activated_7d,

    -- 14-Day Conversion Metrics
    CASE 
        WHEN u.converted_at IS NOT NULL 
         AND u.converted_at >= u.signup_at 
         AND u.converted_at <= (u.signup_at + INTERVAL '14 days') 
        THEN TRUE 
        ELSE FALSE 
    END AS converted_14d,

    CASE 
        WHEN u.converted_at IS NOT NULL 
        THEN ROUND(EXTRACT(EPOCH FROM (u.converted_at - u.signup_at)) / 86400.0, 2)
        ELSE NULL 
    END AS conversion_days,

    -- Revenue generated in 1st month
    CASE 
        WHEN u.converted_at IS NOT NULL 
         AND u.converted_at >= u.signup_at 
         AND u.converted_at <= (u.signup_at + INTERVAL '14 days') 
        THEN u.monthly_price_usd 
        ELSE 0.00 
    END AS revenue_1m
FROM trial_users u
LEFT JOIN v_user_events_7d e7 ON u.user_id = e7.user_id;

-- 3. View: Executive Dashboard (Simulated Aggregate Dashboard)
CREATE OR REPLACE VIEW v_executive_dashboard AS
SELECT
    period,
    COUNT(*) AS total_users,
    ROUND(AVG(CASE WHEN is_activated_7d THEN 1.0 ELSE 0.0 END) * 100, 2) AS activation_rate_pct,
    ROUND(AVG(CASE WHEN converted_14d THEN 1.0 ELSE 0.0 END) * 100, 2) AS conversion_rate_pct,
    ROUND(AVG(revenue_1m), 2) AS rpts_usd,
    SUM(revenue_1m) AS total_revenue_usd
FROM v_user_analytics
GROUP BY period
ORDER BY period DESC;

-- 4. View: Simpson's Paradox Breakdown (By Period, Onboarding & Channel)
CREATE OR REPLACE VIEW v_simpson_breakdown AS
SELECT
    period,
    onboarding_experience,
    acquisition_channel,
    COUNT(*) AS user_count,
    ROUND(AVG(CASE WHEN is_activated_7d THEN 1.0 ELSE 0.0 END) * 100, 2) AS activation_rate_pct,
    ROUND(AVG(CASE WHEN converted_14d THEN 1.0 ELSE 0.0 END) * 100, 2) AS conversion_rate_pct,
    ROUND(AVG(revenue_1m), 2) AS rpts_usd
FROM v_user_analytics
GROUP BY period, onboarding_experience, acquisition_channel
ORDER BY period DESC, acquisition_channel, onboarding_experience;
