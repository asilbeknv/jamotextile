import type { Metadata } from "next";
import { requireCustomer } from "@/server/auth/guards";
import { getCompanyProfile } from "@/server/services/clients";
import { CUSTOMER_ROLE_LABEL, INDUSTRY_LABEL } from "@/domain/catalog";
import { formatUzPhone } from "@/domain/phone";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = { title: "Компания" };

export default async function CompanyPage() {
  const user = await requireCustomer();
  const c = await getCompanyProfile(user.company.id);
  const rows: [string, React.ReactNode][] = [
    ["Название", c.name],
    ["ИНН", c.inn ?? "—"],
    ["Отрасль", INDUSTRY_LABEL[c.industry]],
    ["Статус", c.status === "APPROVED" ? <Badge tone="ok">Подтверждена</Badge> : <Badge tone="warn">Ждёт подтверждения</Badge>],
    ["Менеджер JAMO", c.manager?.name ?? "назначается"],
    ["Напоминание о повторном заказе", `каждые ${c.reminderMonths} мес.`],
  ];
  return (
    <>
      <PageHeader title="Компания" subtitle="Реквизиты, сотрудники с доступом и адреса доставки." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Реквизиты" />
          <dl className="grid grid-cols-[minmax(120px,auto)_1fr] gap-x-4 gap-y-2">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <CardHeader title="Адреса доставки" />
          {c.addresses.length ? (
            <ul className="flex flex-col gap-2">
              {c.addresses.map((a) => (
                <li key={a.id}>{a.address}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">Адресов пока нет — укажите адрес при оформлении заказа.</p>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Сотрудники с доступом" hint="Каждый входит по своему номеру телефона." />
          <ul className="divide-y divide-line">
            {c.users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>
                  <b>{u.name}</b>
                  <span className="ml-2 font-mono text-xs text-muted">{formatUzPhone(u.phone)}</span>
                </span>
                <Badge>{CUSTOMER_ROLE_LABEL[u.role]}</Badge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Редактирование профиля, логотипа и приглашение сотрудников — следующий этап.</p>
        </Card>
      </div>
    </>
  );
}
