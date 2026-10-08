/**
 * Navigation per realm. Adding a section to a dashboard = add an entry here
 * and a page under the matching route folder.
 */
export type NavItem = { href: string; label: string; icon: IconName; exact?: boolean };
export type IconName = "home" | "plus" | "box" | "building" | "users" | "tag" | "chart" | "kanban";

export const CUSTOMER_NAV: NavItem[] = [
  { href: "/portal", label: "Главная", icon: "home", exact: true },
  { href: "/portal/orders/new", label: "Новый заказ", icon: "plus" },
  { href: "/portal/orders", label: "Заказы", icon: "box" },
  { href: "/portal/company", label: "Компания", icon: "building" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Дашборд", icon: "chart", exact: true },
  { href: "/admin/orders", label: "Заказы", icon: "kanban" },
  { href: "/admin/clients", label: "Клиенты", icon: "users" },
  { href: "/admin/catalog", label: "Каталог и цены", icon: "tag" },
];
