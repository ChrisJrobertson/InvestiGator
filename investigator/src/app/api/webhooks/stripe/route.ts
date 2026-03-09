import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe, planFromPriceId } from "@/lib/stripe";

const processedEventIds = new Set<string>();

function resolvePlanFromSubscription(subscription: Stripe.Subscription) {
  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price?.id ?? "";
  const mapped = planFromPriceId(priceId);
  if (mapped !== "SOLO") return mapped;

  const amount = firstItem?.price?.unit_amount ?? 0;
  if (amount >= 14900) return "AGENCY";
  if (amount >= 7900) return "PROFESSIONAL";
  return "SOLO";
}

async function updateOrgByCustomerId(
  customerId: string,
  values: Record<string, string | null>,
) {
  const supabaseAdmin = getSupabaseAdmin();
  await supabaseAdmin
    .from("organisations")
    .update(values as never)
    .eq("stripe_customer_id", customerId);
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing Stripe signature configuration" }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  const stripe = getStripe();
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid Stripe webhook signature", detail: String(error) },
      { status: 400 },
    );
  }

  if (processedEventIds.has(event.id)) {
    return NextResponse.json({ received: true, duplicate: true });
  }
  processedEventIds.add(event.id);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const orgId = session.metadata?.organisation_id;

        let plan = "SOLO";
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          plan = resolvePlanFromSubscription(subscription);
        }

        if (orgId) {
          const supabaseAdmin = getSupabaseAdmin();
          await supabaseAdmin
            .from("organisations")
            .update(
              {
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                subscription_status: "active",
                plan,
              } as never,
            )
            .eq("id", orgId);
        } else if (customerId) {
          await updateOrgByCustomerId(customerId, {
            stripe_subscription_id: subscriptionId,
            subscription_status: "active",
            plan,
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const plan = resolvePlanFromSubscription(subscription);

        await updateOrgByCustomerId(customerId, {
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
          plan,
        });
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        await updateOrgByCustomerId(customerId, {
          stripe_subscription_id: null,
          subscription_status: "locked",
          plan: "SOLO",
        });
        break;
      }
      case "customer.subscription.trial_will_end":
        console.warn("Stripe trial ending soon", event.id);
        break;
      case "invoice.payment_failed":
        console.warn("Stripe invoice payment failed", event.id);
        break;
      default:
        break;
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Webhook processing failed", detail: String(error) },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
