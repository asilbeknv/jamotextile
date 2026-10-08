import "server-only";
import { db } from "@/lib/db";

export function listCompanies() {
  return db.company.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      manager: { select: { name: true } },
      _count: { select: { orders: true, users: true } },
      orders: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true, number: true } },
    },
  });
}

export async function approveCompany(companyId: string, managerId: string) {
  await db.company.update({
    where: { id: companyId },
    data: { status: "APPROVED", managerId },
  });
}

export function getCompanyProfile(companyId: string) {
  return db.company.findUniqueOrThrow({
    where: { id: companyId },
    include: {
      manager: { select: { name: true, email: true } },
      users: { orderBy: { createdAt: "asc" } },
      addresses: { orderBy: { createdAt: "asc" } },
    },
  });
}
