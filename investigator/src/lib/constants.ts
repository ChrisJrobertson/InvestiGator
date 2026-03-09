export const CASE_STATUSES = ["OPEN", "IN_PROGRESS", "REVIEW", "CLOSED", "ARCHIVED"] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const CASE_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type CasePriority = (typeof CASE_PRIORITIES)[number];

export const FINDING_TYPES = ["OBSERVATION", "INTERVIEW", "DOCUMENT", "DIGITAL", "PHYSICAL", "FINANCIAL", "OTHER"] as const;
export type FindingType = (typeof FINDING_TYPES)[number];

export const FINDING_SEVERITIES = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];

export const FINDING_STATUSES = ["DRAFT", "CONFIRMED", "DISPUTED", "RETRACTED"] as const;
export type FindingStatus = (typeof FINDING_STATUSES)[number];

export const REPORT_TYPES = ["INTERIM", "FINAL", "SUPPLEMENTAL", "SUMMARY"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_STATUSES = ["DRAFT", "REVIEW", "APPROVED", "ISSUED"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const INVOICE_STATUSES = ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const EXPENSE_CATEGORIES = ["TRAVEL", "ACCOMMODATION", "EQUIPMENT", "SUPPLIES", "SUBCONTRACTOR", "OTHER"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const USER_ROLES = ["OWNER", "ADMIN", "INVESTIGATOR", "REVIEWER", "READONLY"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PLAN_LIMITS = {
  free: { cases: 5, storage_mb: 100, users: 2 },
  pro: { cases: 50, storage_mb: 5000, users: 10 },
  enterprise: { cases: Infinity, storage_mb: Infinity, users: Infinity },
} as const;

export const STATUS_COLORS: Record<string, string> = {
  OPEN: "text-accent",
  IN_PROGRESS: "text-warning",
  REVIEW: "text-blue-400",
  CLOSED: "text-text-muted",
  ARCHIVED: "text-text-muted",
  DRAFT: "text-text-muted",
  CONFIRMED: "text-accent",
  DISPUTED: "text-danger",
  RETRACTED: "text-text-muted",
  SENT: "text-blue-400",
  PAID: "text-accent",
  OVERDUE: "text-danger",
  CANCELLED: "text-text-muted",
  LOW: "text-text-muted",
  MEDIUM: "text-warning",
  HIGH: "text-orange-400",
  CRITICAL: "text-danger",
  INFO: "text-blue-400",
};
