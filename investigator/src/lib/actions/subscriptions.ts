"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthProfile } from "./audit";
import { STRIPE_PLANS } from "@/lib/plans";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

export async function getSubscriptionStatus() {
  const supabase = await createClient();
  const { profile } = await getAuthProfile();

  const { data: org } = await supabase
    .from("organisations")
    .select("plan, stripe_customer_id, stripe_subscription_id, subscription_status")
    .eq("id", profile.organisation_id)
    .single();

  return {
    plan: org?.plan ?? "SOLO",
    stripeCustomerId: org?.stripe_customer_id ?? null,
    stripeSubscriptionId: org?.stripe_subscription_id ?? null,
    subscriptionStatus: org?.subscription_status ?? "inactive",
  };
}

export async function createCheckoutSession(planKey: string) {
  const stripe = getStripe();
  const { profile } = await getAuthProfile();
  const supabase = await createClient();

  const plan = STRIPE_PLANS[planKey as keyof typeof STRIPE_PLANS];
  if (!plan) throw new Error("Invalid plan");

  const { data: org } = await supabase
    .from("organisations")
    .select("stripe_customer_id, name, email")
    .eq("id", profile.organisation_id)
    .single();

  let customerId = org?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: org?.name ?? undefined,
      email: org?.email ?? profile.email,
      metadata: { organisation_id: profile.organisation_id },
    });
    customerId = customer.id;

    await supabase
      .from("organisations")
      .update({ stripe_customer_id: customerId })
      .eq("id", profile.organisation_id);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: plan.priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 14 },
    success_url: `${baseUrl}/settings?checkout=success`,
    cancel_url: `${baseUrl}/settings?checkout=cancelled`,
    metadata: {
      organisation_id: profile.organisation_id,
      plan: planKey,
    },
  });

  return { url: session.url };
}

export async function createPortalSession() {
  const stripe = getStripe();
  const { profile } = await getAuthProfile();
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organisations")
    .select("stripe_customer_id")
    .eq("id", profile.organisation_id)
    .single();

  if (!org?.stripe_customer_id) {
    throw new Error("No billing account found. Subscribe to a plan first.");
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${baseUrl}/settings`,
  });

  return { url: session.url };
}
