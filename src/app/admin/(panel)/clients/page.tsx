import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/guards";
import { listCompanies } from "@/server/services/clients";
import { approveCompanyAction } from "@/server/actions/admin-orders";
import { INDUSTRY_LABEL } from "@/domain/catalog";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionForm } from "@/components/orders/action-form";

export const metadata: Metadata = { title: "Клиенты" };

export default async function ClientsPage() {
  await requireAdmin();
  const companies = await listCompanies();
  const pending = companies.filter((c) => c.status === "PENDING").length;

  return (
    <>
      <PageHeader title="Клиенты" subtitle={pending ? `${pending} компани${pending === 1 ? "я ждёт" : "и ждут"} подтверждения` : "Все компании подтверждены"} />
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="bg-surface2 text-left text-[11px] uppercase tracking-wider text-muted">
              {["Компания", "Отрасль", "Менеджер", "Заказы", "Последний заказ", "Скидка", "Статус"].map((h) => (
                <th key={h} className="px-3 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className="border-t border-line align-middle">
                <td className="px-3 py-2.5">
                  <b>{c.name}</b>
                  {c.inn && <div className="font-mono text-xs text-muted">ИНН {c.inn}</div>}
                </td>
                <td className="px-3 py-2.5 text-muted">{INDUSTRY_LABEL[c.industry]}</td>
                <td className="px-3 py-2.5">{c.manager?.name ?? "—"}</td>
                <td className="px-3 py-2.5 font-mono">{c._count.orders}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{c.orders[0] ? `${c.orders[0].number} · ${formatDate(c.orders[0].createdAt)}` : "—"}</td>
                <td className="px-3 py-2.5 font-mono">{c.discountPct ? `${c.discountPct}%` : "—"}</td>
                <td className="px-3 py-2.5">
                  {c.status === "PENDING" ? (
                    <ActionForm action={approveCompanyAction} hidden={{ companyId: c.id }}>
                      <SubmitButton variant="primary" size="sm" pendingLabel="…">
                        Подтвердить
                      </SubmitButton>
                    </ActionForm>
                  ) : c.status === "APPROVED" ? (
                    <Badge tone="ok">Активен</Badge>
                  ) : (
                    <Badge tone="bad">Заблокирован</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">При подтверждении компании назначается менеджер, который её подтвердил.</p>
    </>
  );
}
