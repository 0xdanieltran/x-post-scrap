import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { redirect } from "next/navigation";

export async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar
        isAdmin={profile?.role === "admin"}
        userName={profile?.full_name ?? user.email?.split("@")[0]}
        userEmail={user.email}
        avatarUrl={profile?.avatar_url ?? undefined}
      />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-4 md:p-6 md:pl-6 pt-16 md:pt-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
