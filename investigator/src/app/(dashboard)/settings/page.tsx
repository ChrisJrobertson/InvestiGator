import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";

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
    .select("name, email")
    .eq("id", profile!.organisation_id)
    .single();

  return (
    <>
      <Header title="Settings" description="Manage your account and organisation" />

      <div className="space-y-6 max-w-2xl">
        {/* Profile Section */}
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

        {/* Organisation Section */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-base font-semibold text-text mb-4">Organisation</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-text-muted">Name</p>
              <p className="text-text">{org?.name}</p>
            </div>
            <div>
              <p className="text-text-muted">Email</p>
              <p className="text-text">{org?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
