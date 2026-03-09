import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ToastProvider } from "@/components/ui/Toast";

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
    .select("name, email")
    .eq("id", user.id)
    .single();

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
