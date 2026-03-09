export const PLAN_LIMITS = {
  SOLO: { aiCredits: 50, casesPerMonth: 10, reportsPerMonth: 5, maxUsers: 1 },
  PROFESSIONAL: {
    aiCredits: 150,
    casesPerMonth: Number.POSITIVE_INFINITY,
    reportsPerMonth: 20,
    maxUsers: 3,
  },
  AGENCY: {
    aiCredits: 500,
    casesPerMonth: Number.POSITIVE_INFINITY,
    reportsPerMonth: Number.POSITIVE_INFINITY,
    maxUsers: 10,
  },
  ENTERPRISE: {
    aiCredits: Number.POSITIVE_INFINITY,
    casesPerMonth: Number.POSITIVE_INFINITY,
    reportsPerMonth: Number.POSITIVE_INFINITY,
    maxUsers: Number.POSITIVE_INFINITY,
  },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/cases", label: "Cases" },
  { href: "/clients", label: "Clients" },
  { href: "/reports", label: "Reports" },
  { href: "/billing", label: "Billing" },
  { href: "/settings", label: "Settings" },
] as const;
