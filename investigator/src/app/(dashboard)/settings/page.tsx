import { Header } from "@/components/layout/header";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCheckoutSession,
  createPortalSession,
  getSubscriptionStatus,
  getUsage,
} from "@/lib/actions/subscriptions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .single();

  const { data: organisation } = profile
    ? await supabase
        .from("organisations")
        .select("id, name, logo_url, address, vat_number")
        .eq("id", profile.organisation_id)
        .single()
    : { data: null };

  const [subscription, usage] = await Promise.all([getSubscriptionStatus(), getUsage()]);

  async function updateOrganisationAction(formData: FormData) {
    "use server";
    const supabaseServer = await createClient();
    const { data: currentProfile } = await supabaseServer
      .from("profiles")
      .select("organisation_id")
      .single();
    if (!currentProfile?.organisation_id) return;

    await supabaseServer
      .from("organisations")
      .update({
        name: String(formData.get("name") ?? ""),
        logo_url: String(formData.get("logo_url") ?? ""),
        address: String(formData.get("address") ?? ""),
        vat_number: String(formData.get("vat_number") ?? ""),
      })
      .eq("id", currentProfile.organisation_id);
  }

  async function checkoutAction(formData: FormData) {
    "use server";
    const priceId = String(formData.get("price_id") ?? "");
    if (!priceId) return;
    const url = await createCheckoutSession(priceId);
    redirect(url);
  }

  async function portalAction() {
    "use server";
    const url = await createPortalSession();
    redirect(url);
  }

  const casesLimit =
    Number.isFinite(usage.limits.casesPerMonth) ? String(usage.limits.casesPerMonth) : "∞";
  const reportsLimit =
    Number.isFinite(usage.limits.reportsPerMonth) ? String(usage.limits.reportsPerMonth) : "∞";

  return (
    <PageWrapper>
      <Header title="Settings" />
      <section className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-lg font-semibold">Organisation details</h2>
        <form action={updateOrganisationAction} className="grid gap-3 md:grid-cols-2">
          <Input name="name" placeholder="Organisation name" defaultValue={organisation?.name ?? ""} />
          <Input name="logo_url" placeholder="Logo URL" defaultValue={organisation?.logo_url ?? ""} />
          <Input name="address" placeholder="Address" defaultValue={organisation?.address ?? ""} />
          <Input name="vat_number" placeholder="VAT number" defaultValue={organisation?.vat_number ?? ""} />
          <div className="md:col-span-2">
            <Button type="submit">Save details</Button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-lg font-semibold">Subscription</h2>
        <p className="text-sm">
          Plan: <strong>{subscription.plan}</strong> · Status:{" "}
          <strong>{subscription.subscriptionStatus}</strong>
        </p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Cases this month: {usage.casesThisMonth}/{casesLimit} · Reports this month:{" "}
          {usage.reportsThisMonth}/{reportsLimit}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <form action={checkoutAction}>
            <input type="hidden" name="price_id" value={process.env.STRIPE_PRICE_SOLO ?? ""} />
            <Button type="submit" variant="ghost">
              Solo (£49)
            </Button>
          </form>
          <form action={checkoutAction}>
            <input
              type="hidden"
              name="price_id"
              value={process.env.STRIPE_PRICE_PROFESSIONAL ?? ""}
            />
            <Button type="submit" variant="ghost">
              Professional (£79)
            </Button>
          </form>
          <form action={checkoutAction}>
            <input type="hidden" name="price_id" value={process.env.STRIPE_PRICE_AGENCY ?? ""} />
            <Button type="submit" variant="ghost">
              Agency (£149)
            </Button>
          </form>
          <form action={portalAction}>
            <Button type="submit">Manage Billing</Button>
          </form>
        </div>
      </section>
    </PageWrapper>
  );
}
