import type { CustomerRole, Industry } from "@prisma/client";

export const PLACEMENT_LABEL: Record<string, string> = {
  left: "Грудь слева",
  center: "Грудь по центру",
  back: "Спина",
  sleeve: "Рукав",
  front: "Фронт",
  side: "Бок",
};

export const INDUSTRY_LABEL: Record<Industry, string> = {
  HOSPITALITY: "Гостиницы и рестораны",
  RETAIL: "Ритейл",
  INDUSTRY: "Производство и логистика",
  SERVICE: "Сервис и медицина",
  OTHER: "Другое",
};

export const CUSTOMER_ROLE_LABEL: Record<CustomerRole, string> = {
  BUYER: "Закупщик",
  ACCOUNTANT: "Бухгалтер",
  HR: "HR",
  HEAD: "Руководитель",
};

export const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
