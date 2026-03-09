import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { getUsage } from "@/lib/actions/plan-limits";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, role, organisation_id")
    .eq("id", user!.id)
    .single();

  const { data: org } = await supabase
    .from("organisations")
    .select("name, email, address, phone, vat_registered, vat_number, plan, stripe_customer_id, subscription_status")
    .eq("id", profile!.organisation_id)
    .single();

  const usage = await getUsage(profile!.organisation_id);

  return (
    <>
      <Header title="Settings" description="Manage your account and organisation" />

      <div className="space-y-6 max-w-3xl">
        {/* Profile */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-base font-semibold text-text mb-4">Profile</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-text-muted">Name</p>
              <p className="text-text">{profile?.name}</p>
            </div>
            <div>
              <p className="text-text-muted">Email</p>
              <p className="text-text">{profile?.email}</p>
            </div>
            <div>
              <p className="text-text-muted">Role</p>
              <p className="text-text">{profile?.role}</p>
            </div>
          </div>
        </div>

        {/* Organisation */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-base font-semibold text-text mb-4">Organisation</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-text-muted">Name</p>
              <p className="text-text">{org?.name}</p>
            </div>
            <div>
              <p className="text-text-muted">Email</p>
              <p className="text-text">{org?.email ?? "—"}</p>
            </div>
            {org?.address && (
              <div>
                <p className="text-text-muted">Address</p>
                <p className="text-text">{org.address}</p>
              </div>
            )}
            {org?.vat_registered && (
              <div>
                <p className="text-text-muted">VAT Number</p>
                <p className="text-text">{org.vat_number ?? "—"}</p>
              </div>
            )}
          </div>
        </div>

        {/* Plan & Usage */}
        <SettingsClient
          plan={usage.plan}
          usage={usage}
          subscriptionStatus={org?.subscription_status ?? "inactive"}
          hasStripeCustomer={!!org?.stripe_customer_id}
        />
      </div>
    </>
  );
}
