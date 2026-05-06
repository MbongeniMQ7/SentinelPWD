-- ============================================================
-- SentinelAI Smart Workforce - PostgreSQL / Supabase Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('OWNER', 'MANAGER', 'EMPLOYEE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE company_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE manager_level AS ENUM ('SENIOR_MANAGER', 'MANAGER', 'JUNIOR_MANAGER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE access_scope AS ENUM ('COMPANY_WIDE', 'ASSIGNED_ONLY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE monitoring_type AS ENUM ('CAMERA', 'IOT_WRISTBAND', 'BOTH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('RUNNING', 'STOPPED', 'FAILED', 'INTERRUPTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE risk_level AS ENUM ('LOW', 'MODERATE', 'HIGH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_type AS ENUM (
        'FATIGUE_WARNING',
        'HIGH_RISK',
        'LOW_FOCUS',
        'LONG_EYE_CLOSURE',
        'STRESS_WARNING',
        'ANALYSIS_STOPPED',
        'SYSTEM_WARNING'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE wristband_status AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'LOST');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE bug_status AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE bug_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE report_type AS ENUM (
        'FINANCIAL_REPORT',
        'USER_REPORT',
        'COMPANY_REPORT',
        'EMPLOYEE_REPORT',
        'ALERT_REPORT',
        'CAMERA_ANALYSIS_REPORT',
        'BUG_REPORT',
        'IOT_REPORT',
        'AUDIT_LOG_REPORT'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'INACTIVE', 'CANCELLED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('PAID', 'PENDING', 'FAILED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- COMPANIES
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
    company_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    industry TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    status company_status DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROFILES
-- Migrate from old schema (id-based) to new schema (profile_id-based)
-- ============================================================

-- Drop old profiles table if it uses the old schema (has full_name, no profile_id)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'full_name'
    ) THEN
        DROP TABLE IF EXISTS public.leave_requests CASCADE;
        DROP TABLE IF EXISTS public.break_requests CASCADE;
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
        DROP TABLE IF EXISTS public.profiles CASCADE;
        RAISE NOTICE 'Dropped old profiles table to apply new schema';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS profiles (
    profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id) ON DELETE SET NULL,

    username TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,

    role user_role NOT NULL,
    status user_status DEFAULT 'ACTIVE',

    created_by UUID REFERENCES profiles(profile_id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MANAGER PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS manager_profiles (
    manager_profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,

    manager_level manager_level NOT NULL,
    access_scope access_scope NOT NULL,

    reports_to_manager_id UUID REFERENCES profiles(profile_id) ON DELETE SET NULL,
    job_title TEXT,

    can_create_managers BOOLEAN DEFAULT FALSE,
    can_create_employees BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EMPLOYEE PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS employee_profiles (
    employee_profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,

    employee_number TEXT,
    department TEXT,
    job_title TEXT,

    monitoring_type monitoring_type NOT NULL DEFAULT 'CAMERA',
    is_monitoring_enabled BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MANAGER TO EMPLOYEE ASSIGNMENTS
-- Used for junior managers who only see assigned workers
-- ============================================================

CREATE TABLE IF NOT EXISTS manager_employee_assignments (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    manager_profile_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
    employee_profile_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,

    assigned_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(manager_profile_id, employee_profile_id)
);

-- ============================================================
-- USER PRESENCE
-- Used for active/offline dashboard metrics
-- ============================================================

CREATE TABLE IF NOT EXISTS user_presence (
    presence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,

    is_online BOOLEAN DEFAULT FALSE,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CAMERA ANALYSIS SESSIONS
-- Stores when analysis starts and stops
-- ============================================================

CREATE TABLE IF NOT EXISTS camera_analysis_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    employee_profile_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    started_at TIMESTAMPTZ DEFAULT NOW(),
    stopped_at TIMESTAMPTZ,

    status session_status DEFAULT 'RUNNING',
    stop_reason TEXT,
    model_version TEXT DEFAULT 'sentinelai-camera-v1',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BIOMETRIC READINGS
-- Stores camera analysis results
-- ============================================================

CREATE TABLE IF NOT EXISTS biometric_readings (
    reading_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    session_id UUID NOT NULL REFERENCES camera_analysis_sessions(session_id) ON DELETE CASCADE,
    employee_profile_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,

    captured_at TIMESTAMPTZ DEFAULT NOW(),

    blink_rate NUMERIC(6,2),
    eye_closure_duration_ms INTEGER,
    focus_score NUMERIC(6,2),

    head_yaw NUMERIC(6,2),
    head_pitch NUMERIC(6,2),
    head_roll NUMERIC(6,2),

    fatigue_score NUMERIC(6,2),
    stress_score NUMERIC(6,2),
    fear_score NUMERIC(6,2),
    overall_risk_score NUMERIC(6,2),

    risk_level risk_level NOT NULL DEFAULT 'LOW'
);

-- ============================================================
-- RISK ALERTS
-- Stores alerts from AI/risk engine
-- ============================================================

CREATE TABLE IF NOT EXISTS risk_alerts (
    alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    employee_profile_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    session_id UUID REFERENCES camera_analysis_sessions(session_id) ON DELETE SET NULL,

    alert_type alert_type NOT NULL,
    risk_level risk_level NOT NULL,
    alert_message TEXT NOT NULL,

    fatigue_score NUMERIC(6,2),
    stress_score NUMERIC(6,2),
    focus_score NUMERIC(6,2),

    is_seen_by_employee BOOLEAN DEFAULT FALSE,
    is_seen_by_manager BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- IOT WRISTBANDS
-- Future integration table
-- ============================================================

CREATE TABLE IF NOT EXISTS iot_wristbands (
    wristband_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    device_serial_number TEXT UNIQUE NOT NULL,

    assigned_employee_profile_id UUID REFERENCES profiles(profile_id) ON DELETE SET NULL,

    status wristband_status DEFAULT 'INACTIVE',
    last_active_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- IOT READINGS
-- Future integration table
-- ============================================================

CREATE TABLE IF NOT EXISTS iot_readings (
    iot_reading_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    wristband_id UUID NOT NULL REFERENCES iot_wristbands(wristband_id) ON DELETE CASCADE,
    employee_profile_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,

    captured_at TIMESTAMPTZ DEFAULT NOW(),

    heart_rate INTEGER,
    heart_rate_variability NUMERIC(6,2),
    skin_temperature NUMERIC(6,2),
    motion_level NUMERIC(6,2),

    stress_score NUMERIC(6,2),
    risk_level risk_level
);

-- ============================================================
-- BUG REPORTS
-- ============================================================

CREATE TABLE IF NOT EXISTS bug_reports (
    bug_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    reported_by_profile_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id) ON DELETE SET NULL,

    title TEXT NOT NULL,
    description TEXT NOT NULL,

    bug_status bug_status DEFAULT 'OPEN',
    priority bug_priority DEFAULT 'NORMAL',

    resolved_by_profile_id UUID REFERENCES profiles(profile_id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REPORTS
-- Stores generated report metadata
-- Actual Excel files can be stored in Supabase Storage
-- ============================================================

CREATE TABLE IF NOT EXISTS reports (
    report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    generated_by_profile_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id) ON DELETE SET NULL,

    report_type report_type NOT NULL,
    report_name TEXT NOT NULL,
    file_format TEXT DEFAULT 'EXCEL',
    file_path TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SUBSCRIPTION PLANS
-- ============================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    plan_name TEXT NOT NULL,
    monthly_price NUMERIC(10,2) NOT NULL,
    description TEXT,

    max_users INTEGER,
    includes_iot BOOLEAN DEFAULT FALSE,
    includes_camera BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMPANY SUBSCRIPTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS company_subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(plan_id) ON DELETE CASCADE,

    start_date DATE NOT NULL,
    end_date DATE,

    status subscription_status DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- Used for owner financial metrics
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES company_subscriptions(subscription_id) ON DELETE SET NULL,

    amount NUMERIC(10,2) NOT NULL,
    payment_date DATE NOT NULL,

    payment_status payment_status DEFAULT 'PAID',
    payment_method TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- Tracks important actions
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    profile_id UUID REFERENCES profiles(profile_id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(company_id) ON DELETE SET NULL,

    action_type TEXT NOT NULL,
    description TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON companies
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_manager_profiles_updated_at ON manager_profiles;
CREATE TRIGGER update_manager_profiles_updated_at
BEFORE UPDATE ON manager_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employee_profiles_updated_at ON employee_profiles;
CREATE TRIGGER update_employee_profiles_updated_at
BEFORE UPDATE ON employee_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_presence_updated_at ON user_presence;
CREATE TRIGGER update_user_presence_updated_at
BEFORE UPDATE ON user_presence
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_camera_sessions_updated_at ON camera_analysis_sessions;
CREATE TRIGGER update_camera_sessions_updated_at
BEFORE UPDATE ON camera_analysis_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_iot_wristbands_updated_at ON iot_wristbands;
CREATE TRIGGER update_iot_wristbands_updated_at
BEFORE UPDATE ON iot_wristbands
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bug_reports_updated_at ON bug_reports;
CREATE TRIGGER update_bug_reports_updated_at
BEFORE UPDATE ON bug_reports
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON subscription_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_subscriptions_updated_at ON company_subscriptions;
CREATE TRIGGER update_company_subscriptions_updated_at
BEFORE UPDATE ON company_subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

CREATE INDEX IF NOT EXISTS idx_manager_profiles_profile_id ON manager_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_employee_profiles_profile_id ON employee_profiles(profile_id);

CREATE INDEX IF NOT EXISTS idx_assignments_manager ON manager_employee_assignments(manager_profile_id);
CREATE INDEX IF NOT EXISTS idx_assignments_employee ON manager_employee_assignments(employee_profile_id);

CREATE INDEX IF NOT EXISTS idx_camera_sessions_employee ON camera_analysis_sessions(employee_profile_id);
CREATE INDEX IF NOT EXISTS idx_camera_sessions_company ON camera_analysis_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_camera_sessions_status ON camera_analysis_sessions(status);
CREATE INDEX IF NOT EXISTS idx_camera_sessions_started_at ON camera_analysis_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_biometric_readings_session ON biometric_readings(session_id);
CREATE INDEX IF NOT EXISTS idx_biometric_readings_employee ON biometric_readings(employee_profile_id);
CREATE INDEX IF NOT EXISTS idx_biometric_readings_captured_at ON biometric_readings(captured_at);
CREATE INDEX IF NOT EXISTS idx_biometric_readings_risk_level ON biometric_readings(risk_level);

CREATE INDEX IF NOT EXISTS idx_risk_alerts_employee ON risk_alerts(employee_profile_id);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_company ON risk_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_session ON risk_alerts(session_id);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_risk_level ON risk_alerts(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_created_at ON risk_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_bug_reports_company ON bug_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_reported_by ON bug_reports(reported_by_profile_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(bug_status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_priority ON bug_reports(priority);

CREATE INDEX IF NOT EXISTS idx_reports_generated_by ON reports(generated_by_profile_id);
CREATE INDEX IF NOT EXISTS idx_reports_company ON reports(company_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);

CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_audit_logs_profile ON audit_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================
-- REALTIME SUPPORT
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE risk_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE biometric_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE camera_analysis_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE bug_reports;
