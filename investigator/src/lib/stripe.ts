import Stripe from "stripe";

let cachedStripeClient: Stripe | null = null;

export function getStripe() {
  if (cachedStripeClient) return cachedStripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is missing.");
  }

  cachedStripeClient = new Stripe(secretKey);
  return cachedStripeClient;
}

export function planFromPriceId(priceId: string): string {
  if (!priceId) return "SOLO";

  if (priceId === process.env.STRIPE_PRICE_SOLO) return "SOLO";
  if (priceId === process.env.STRIPE_PRICE_PROFESSIONAL) return "PROFESSIONAL";
  if (priceId === process.env.STRIPE_PRICE_AGENCY) return "AGENCY";

  return "SOLO";
}
