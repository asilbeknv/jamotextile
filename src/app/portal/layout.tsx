import { requireCustomer } from "@/server/auth/guards";
import { customerLogout } from "@/server/actions/customer-auth";
import { CUSTOMER_NAV } from "@/config/navigation";
import { CUSTOMER_ROLE_LABEL } from "@/domain/catalog";
import { AppShell } from "@/components/layout/app-shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCustomer();
  return (
    <AppShell
      realmLabel="Кабинет клиента"
      nav={CUSTOMER_NAV}
      user={{ name: user.name, detail: `${user.company.name} · ${CUSTOMER_ROLE_LABEL[user.role]}` }}
      signOut={customerLogout}
      banner={
        user.company.status === "PENDING" ? (
          <div className="bg-warn-soft px-4 py-2.5 text-sm font-medium text-warn sm:px-6">
            Компания ждёт подтверждения менеджером JAMO. Заявки можно отправлять — в работу они уйдут после подтверждения.
          </div>
        ) : undefined
      }
    >
      {children}
    </AppShell>
  );
}
