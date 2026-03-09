import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ToastProvider } from "@/components/ui/Toast";
import { headers } from "next/headers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, organisation_id")
    .eq("id", user.id)
    .single();

  const { data: org } = await supabase
    .from("organisations")
    .select("onboarding_completed")
    .eq("id", profile!.organisation_id)
    .single();

  const headersList = await headers();
  const pathname = headersList.get("x-next-pathname") ?? headersList.get("x-invoke-path") ?? "";
  const isOnboardingPage = pathname.includes("/onboarding");

  if (!org?.onboarding_completed && !isOnboardingPage) {
    redirect("/onboarding");
  }

  return (
    <ToastProvider>
      <Sidebar
        userName={profile?.name ?? user.email?.split("@")[0] ?? "User"}
        userEmail={profile?.email ?? user.email ?? ""}
      />
      <PageWrapper>{children}</PageWrapper>
    </ToastProvider>
  );
}
