import { requireAdmin } from "@/server/auth/guards";
import { adminLogout } from "@/server/actions/admin-auth";
import { ADMIN_NAV } from "@/config/navigation";
import { AppShell } from "@/components/layout/app-shell";

export const metadata = { robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <AppShell
      realmLabel="Back office"
      nav={ADMIN_NAV}
      user={{ name: admin.name, detail: admin.role === "OWNER" ? "Владелец" : "Менеджер" }}
      signOut={adminLogout}
    >
      {children}
    </AppShell>
  );
}
