"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/actions/audit";
import { getStripe } from "@/lib/stripe";

const PLAN_LIMITS = {
  SOLO: { casesPerMonth: 10, reportsPerMonth: 5, maxUsers: 1 },
  PROFESSIONAL: { casesPerMonth: Number.POSITIVE_INFINITY, reportsPerMonth: 20, maxUsers: 3 },
  AGENCY: {
    casesPerMonth: Number.POSITIVE_INFINITY,
    reportsPerMonth: Number.POSITIVE_INFINITY,
    maxUsers: 10,
  },
  ENTERPRISE: {
    casesPerMonth: Number.POSITIVE_INFINITY,
    reportsPerMonth: Number.POSITIVE_INFINITY,
    maxUsers: Number.POSITIVE_INFINITY,
  },
} as const;

function startOfMonthIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

async function ensureStripeCustomer() {
  const stripe = getStripe();
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const { data: org, error } = await supabase
    .from("organisations")
    .select("id, name, email, stripe_customer_id, plan, subscription_status, stripe_subscription_id")
    .eq("id", profile.organisation_id)
    .single();
  if (error || !org) throw error ?? new Error("Organisation not found");

  if (org.stripe_customer_id) {
    return {
      organisationId: org.id,
      stripeCustomerId: org.stripe_customer_id,
      plan: org.plan,
      subscriptionStatus: org.subscription_status,
      stripeSubscriptionId: org.stripe_subscription_id,
    };
  }

  const customer = await stripe.customers.create({
    name: org.name ?? profile.name,
    email: org.email ?? profile.email,
    metadata: { organisation_id: org.id },
  });

  const { error: updateError } = await supabase
    .from("organisations")
    .update({ stripe_customer_id: customer.id })
    .eq("id", org.id);
  if (updateError) throw updateError;

  return {
    organisationId: org.id,
    stripeCustomerId: customer.id,
    plan: org.plan,
    subscriptionStatus: org.subscription_status,
    stripeSubscriptionId: org.stripe_subscription_id,
  };
}

export async function getSubscriptionStatus() {
  const org = await ensureStripeCustomer();
  return {
    plan: org.plan,
    subscriptionStatus: org.subscriptionStatus,
    stripeCustomerId: org.stripeCustomerId,
    stripeSubscriptionId: org.stripeSubscriptionId,
  };
}

export async function createCheckoutSession(priceId: string) {
  const stripe = getStripe();
  const org = await ensureStripeCustomer();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: org.stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/settings?checkout=success`,
    cancel_url: `${appUrl}/settings?checkout=cancelled`,
    allow_promotion_codes: true,
    metadata: { organisation_id: org.organisationId },
    subscription_data: {
      trial_period_days: 14,
      metadata: { organisation_id: org.organisationId },
    },
  });

  if (!session.url) throw new Error("Unable to create checkout session URL");
  return session.url;
}

export async function createPortalSession() {
  const stripe = getStripe();
  const org = await ensureStripeCustomer();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${appUrl}/settings`,
  });

  return session.url;
}

export async function getUsage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const monthStart = startOfMonthIso();

  const { data: org, error: orgError } = await supabase
    .from("organisations")
    .select("plan")
    .eq("id", profile.organisation_id)
    .single();
  if (orgError || !org) throw orgError ?? new Error("Organisation not found");

  const plan = (org.plan as keyof typeof PLAN_LIMITS) ?? "SOLO";

  const [{ count: caseCount }, { data: caseRows }] = await Promise.all([
    supabase
      .from("cases")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", profile.organisation_id)
      .gte("created_at", monthStart)
      .is("deleted_at", null),
    supabase
      .from("cases")
      .select("id")
      .eq("organisation_id", profile.organisation_id)
      .is("deleted_at", null),
  ]);

  const caseIds = (caseRows ?? []).map((item) => item.id);
  const { count: reportCount } = caseIds.length
    ? await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .in("case_id", caseIds)
        .gte("created_at", monthStart)
    : { count: 0 };

  return {
    plan,
    casesThisMonth: caseCount ?? 0,
    reportsThisMonth: reportCount ?? 0,
    limits: PLAN_LIMITS[plan],
  };
}
