import { Header } from "@/components/layout/header";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  async function completeOnboarding(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("organisation_id")
      .eq("id", user.id)
      .single();
    if (!profile?.organisation_id) return;

    const organisationId = profile.organisation_id;
    const organisationName = String(formData.get("organisation_name") ?? "");
    const address = String(formData.get("address") ?? "");
    const phone = String(formData.get("phone") ?? "");
    const firstClientName = String(formData.get("first_client_name") ?? "");
    const firstClientType = String(formData.get("first_client_type") ?? "CORPORATE");
    const firstCaseTitle = String(formData.get("first_case_title") ?? "");
    const firstCaseType = String(formData.get("first_case_type") ?? "OTHER");

    await supabase
      .from("organisations")
      .update({
        name: organisationName || "My Agency",
        address,
        phone,
        onboarding_completed: true,
      })
      .eq("id", organisationId);

    let createdClientId: string | null = null;
    if (firstClientName.trim()) {
      const { data: client } = await supabase
        .from("clients")
        .insert({
          organisation_id: organisationId,
          name: firstClientName,
          type: firstClientType,
        })
        .select("id")
        .single();
      createdClientId = client?.id ?? null;
    }

    if (firstCaseTitle.trim()) {
      const { data: ref } = await supabase.rpc("next_ref", {
        p_scope: `org:${organisationId}`,
        p_prefix: `INV-${new Date().getFullYear()}`,
      });

      await supabase.from("cases").insert({
        organisation_id: organisationId,
        client_id: createdClientId,
        investigator_id: user.id,
        assigned_to: user.id,
        ref: ref ?? `INV-${new Date().getFullYear()}-001`,
        title: firstCaseTitle,
        type: firstCaseType,
        status: "OPEN",
        priority: "MEDIUM",
        rate: 500,
      });
    }

    redirect("/");
  }

  return (
    <PageWrapper>
      <Header title="Onboarding" />

      <form action={completeOnboarding} className="space-y-6">
        <section className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="mb-2 text-lg font-semibold">Step 1 — Welcome</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Configure your workspace details to get started.
          </p>
        </section>

        <section className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="mb-3 text-lg font-semibold">Step 2 — Organisation</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Input name="organisation_name" placeholder="Organisation name" />
            <Input name="phone" placeholder="Phone" />
            <Input name="address" placeholder="Address" className="md:col-span-2" />
          </div>
        </section>

        <section className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="mb-3 text-lg font-semibold">Step 3 — First Client (optional)</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Input name="first_client_name" placeholder="Client name" />
            <Input name="first_client_type" placeholder="Client type" defaultValue="CORPORATE" />
          </div>
        </section>

        <section className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="mb-3 text-lg font-semibold">Step 4 — First Case (optional)</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Input name="first_case_title" placeholder="Case title" />
            <Input name="first_case_type" placeholder="Case type" defaultValue="OTHER" />
          </div>
        </section>

        <section className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="mb-2 text-lg font-semibold">Step 5 — Complete</h2>
          <p className="mb-3 text-sm text-[var(--text-muted)]">
            You can edit all of this later in Settings.
          </p>
          <Button type="submit">Finish onboarding</Button>
        </section>
      </form>
    </PageWrapper>
  );
}
