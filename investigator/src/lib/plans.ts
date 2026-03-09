export const PLAN_LIMITS: Record<string, { casesPerMonth: number; reportsPerMonth: number; maxUsers: number }> = {
  SOLO: { casesPerMonth: 10, reportsPerMonth: 5, maxUsers: 1 },
  PROFESSIONAL: { casesPerMonth: Infinity, reportsPerMonth: 20, maxUsers: 3 },
  AGENCY: { casesPerMonth: Infinity, reportsPerMonth: Infinity, maxUsers: 10 },
  ENTERPRISE: { casesPerMonth: Infinity, reportsPerMonth: Infinity, maxUsers: Infinity },
};

export const STRIPE_PLANS = {
  SOLO: {
    name: "Solo",
    priceId: "price_1T93EUJBjlYCYeTTDen3Oeep",
    productId: "prod_U7HnGCriNvOcVd",
    price: 49,
  },
  PROFESSIONAL: {
    name: "Professional",
    priceId: "price_1T93EUJBjlYCYeTT4148uMw5",
    productId: "prod_U7HnjH9sCZJxhj",
    price: 79,
  },
  AGENCY: {
    name: "Agency",
    priceId: "price_1T93EUJBjlYCYeTTWeZF87rN",
    productId: "prod_U7HnGk0gLoDLub",
    price: 149,
  },
} as const;
