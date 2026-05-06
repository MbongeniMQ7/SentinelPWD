// ============================================================
// SentinelAI — Database TypeScript Types
// Auto-derived from 008_new_schema.sql
// ============================================================

export type UserRole = "OWNER" | "MANAGER" | "EMPLOYEE";
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type CompanyStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type ManagerLevel = "SENIOR_MANAGER" | "MANAGER" | "JUNIOR_MANAGER";
export type AccessScope = "COMPANY_WIDE" | "ASSIGNED_ONLY";
export type MonitoringType = "CAMERA" | "IOT_WRISTBAND" | "BOTH";
export type SessionStatus = "RUNNING" | "STOPPED" | "FAILED" | "INTERRUPTED";
export type RiskLevel = "LOW" | "MODERATE" | "HIGH";
export type AlertType =
  | "FATIGUE_WARNING"
  | "HIGH_RISK"
  | "LOW_FOCUS"
  | "LONG_EYE_CLOSURE"
  | "STRESS_WARNING"
  | "ANALYSIS_STOPPED"
  | "SYSTEM_WARNING";
export type WristbandStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "LOST";
export type BugStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type BugPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type ReportType =
  | "FINANCIAL_REPORT"
  | "USER_REPORT"
  | "COMPANY_REPORT"
  | "EMPLOYEE_REPORT"
  | "ALERT_REPORT"
  | "CAMERA_ANALYSIS_REPORT"
  | "BUG_REPORT"
  | "IOT_REPORT"
  | "AUDIT_LOG_REPORT";
export type SubscriptionStatus = "ACTIVE" | "INACTIVE" | "CANCELLED" | "EXPIRED";
export type PaymentStatus = "PAID" | "PENDING" | "FAILED" | "REFUNDED";

// ── Tables ────────────────────────────────────────────────────

export interface Company {
  company_id: string;
  company_name: string;
  industry: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  status: CompanyStatus;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  profile_id: string;
  auth_user_id: string | null;
  company_id: string | null;
  username: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManagerProfile {
  manager_profile_id: string;
  profile_id: string;
  manager_level: ManagerLevel;
  access_scope: AccessScope;
  reports_to_manager_id: string | null;
  job_title: string | null;
  can_create_managers: boolean;
  can_create_employees: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeProfile {
  employee_profile_id: string;
  profile_id: string;
  employee_number: string | null;
  department: string | null;
  job_title: string | null;
  monitoring_type: MonitoringType;
  is_monitoring_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ManagerEmployeeAssignment {
  assignment_id: string;
  manager_profile_id: string;
  employee_profile_id: string;
  assigned_at: string;
}

export interface UserPresence {
  presence_id: string;
  profile_id: string;
  is_online: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface CameraAnalysisSession {
  session_id: string;
  employee_profile_id: string;
  company_id: string;
  started_at: string;
  stopped_at: string | null;
  status: SessionStatus;
  stop_reason: string | null;
  model_version: string;
  created_at: string;
  updated_at: string;
}

export interface BiometricReading {
  reading_id: string;
  session_id: string;
  employee_profile_id: string;
  captured_at: string;
  blink_rate: number | null;
  eye_closure_duration_ms: number | null;
  focus_score: number | null;
  head_yaw: number | null;
  head_pitch: number | null;
  head_roll: number | null;
  fatigue_score: number | null;
  stress_score: number | null;
  fear_score: number | null;
  overall_risk_score: number | null;
  risk_level: RiskLevel;
}

export interface RiskAlert {
  alert_id: string;
  employee_profile_id: string;
  company_id: string;
  session_id: string | null;
  alert_type: AlertType;
  risk_level: RiskLevel;
  alert_message: string;
  fatigue_score: number | null;
  stress_score: number | null;
  focus_score: number | null;
  is_seen_by_employee: boolean;
  is_seen_by_manager: boolean;
  created_at: string;
}

export interface IotWristband {
  wristband_id: string;
  company_id: string;
  device_serial_number: string;
  assigned_employee_profile_id: string | null;
  status: WristbandStatus;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IotReading {
  iot_reading_id: string;
  wristband_id: string;
  employee_profile_id: string;
  captured_at: string;
  heart_rate: number | null;
  heart_rate_variability: number | null;
  skin_temperature: number | null;
  motion_level: number | null;
  stress_score: number | null;
  risk_level: RiskLevel | null;
}

export interface BugReport {
  bug_id: string;
  reported_by_profile_id: string;
  company_id: string | null;
  title: string;
  description: string;
  bug_status: BugStatus;
  priority: BugPriority;
  resolved_by_profile_id: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Report {
  report_id: string;
  generated_by_profile_id: string;
  company_id: string | null;
  report_type: ReportType;
  report_name: string;
  file_format: string;
  file_path: string | null;
  created_at: string;
}

export interface SubscriptionPlan {
  plan_id: string;
  plan_name: string;
  monthly_price: number;
  description: string | null;
  max_users: number | null;
  includes_iot: boolean;
  includes_camera: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanySubscription {
  subscription_id: string;
  company_id: string;
  plan_id: string;
  start_date: string;
  end_date: string | null;
  status: SubscriptionStatus;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  payment_id: string;
  company_id: string;
  subscription_id: string | null;
  amount: number;
  payment_date: string;
  payment_status: PaymentStatus;
  payment_method: string | null;
  created_at: string;
}

export interface AuditLog {
  audit_id: string;
  profile_id: string | null;
  company_id: string | null;
  action_type: string;
  description: string | null;
  created_at: string;
}
