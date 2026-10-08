/**
 * Development seed: the catalog and demo clients from the original prototype
 * (prototype/main.html). Dates are relative to "now" so dashboards look alive.
 * Idempotent for reference data; demo orders are recreated on every run.
 */
import { PrismaClient, type OrderStage, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { priceLine, VAT_PCT } from "../src/domain/pricing";

const db = new PrismaClient();
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);
const daysAhead = (d: number) => new Date(Date.now() + d * 86_400_000);

const COLORS = [
  ["white", "Белый", "#f4f4f1"],
  ["black", "Чёрный", "#1c1c21"],
  ["navy", "Тёмно-синий", "#1f2f5a"],
  ["gray", "Серый меланж", "#9aa0a8"],
  ["red", "Красный", "#b3262e"],
  ["green", "Зелёный", "#2e6b4d"],
  ["khaki", "Хаки", "#747a52"],
  ["orange", "Сигнальный оранжевый", "#e5671b"],
] as const;

const PRODUCTS = [
  { slug: "tee", name: "Футболка", shape: "tee", basePrice: 48000, minQty: 50, leadDays: 7, fabric: "Хлопок 180 г/м²", sized: true, placements: ["left", "center", "back", "sleeve"], colors: ["white", "black", "navy", "gray", "red", "green"] },
  { slug: "cap", name: "Кепка", shape: "cap", basePrice: 36000, minQty: 50, leadDays: 10, fabric: "Хлопковый твил", sized: false, placements: ["front", "side"], colors: ["navy", "black", "white", "red", "khaki"] },
  { slug: "hoodie", name: "Худи", shape: "hoodie", basePrice: 210000, minQty: 30, leadDays: 12, fabric: "Футер 3-нитка с начёсом", sized: true, placements: ["left", "center", "back", "sleeve"], colors: ["navy", "black", "gray", "green", "red"] },
  { slug: "sweat", name: "Свитшот", shape: "sweat", basePrice: 165000, minQty: 30, leadDays: 12, fabric: "Футер 2-нитка", sized: true, placements: ["left", "center", "back", "sleeve"], colors: ["navy", "black", "gray", "green", "white"] },
  { slug: "vest", name: "Жилет", shape: "vest", basePrice: 140000, minQty: 30, leadDays: 12, fabric: "Софтшелл", sized: true, placements: ["left", "center", "back"], colors: ["navy", "black", "orange", "khaki"] },
  { slug: "work", name: "Спецодежда (куртка)", shape: "work", basePrice: 320000, minQty: 20, leadDays: 18, fabric: "Смесовая ткань, СО-полосы", sized: true, placements: ["left", "back", "sleeve"], colors: ["orange", "navy", "khaki", "gray"] },
];

const METHODS = [
  { slug: "embroidery", name: "Вышивка", feePerUnit: 9000, setupFee: 180000 },
  { slug: "screen", name: "Шелкография", feePerUnit: 4500, setupFee: 120000 },
  { slug: "dtf", name: "DTF-печать", feePerUnit: 6500, setupFee: 60000 },
  { slug: "heat", name: "Термотрансфер", feePerUnit: 3500, setupFee: 40000 },
];

const TIERS = [
  { minQty: 100, pct: 5 },
  { minQty: 300, pct: 10 },
  { minQty: 1000, pct: 15 },
];

/** Typical size split used for demo orders. */
function sizeSplit(q: number) {
  const men = { S: 0.05, M: 0.2, L: 0.2, XL: 0.1, XXL: 0.05 };
  const women = { S: 0.1, M: 0.15, L: 0.1, XL: 0.05, XXL: 0 };
  const m = Object.fromEntries(Object.entries(men).map(([k, v]) => [k, Math.floor(q * v)])) as Record<string, number>;
  const w = Object.fromEntries(Object.entries(women).map(([k, v]) => [k, Math.floor(q * v)])) as Record<string, number>;
  const used = [...Object.values(m), ...Object.values(w)].reduce((a, b) => a + b, 0);
  m.M += q - used;
  return { men: m, women: w };
}

async function main() {
  // Reference data
  for (const [slug, name, hex] of COLORS) await db.color.upsert({ where: { slug }, update: { name, hex }, create: { slug, name, hex } });
  for (const [i, p] of PRODUCTS.entries())
    await db.product.upsert({ where: { slug: p.slug }, update: { ...p, sortOrder: i }, create: { ...p, sortOrder: i } });
  for (const m of METHODS) await db.decorationMethod.upsert({ where: { slug: m.slug }, update: m, create: m });
  for (const t of TIERS) await db.discountTier.upsert({ where: { minQty: t.minQty }, update: t, create: t });

  // Staff
  const ownerEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@jamotextile.uz").toLowerCase();
  const ownerPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const owner = await db.adminUser.upsert({
    where: { email: ownerEmail },
    update: {},
    create: { email: ownerEmail, name: "Азиза Каримова", role: "OWNER", passwordHash: await bcrypt.hash(ownerPassword, 12) },
  });
  const manager = await db.adminUser.upsert({
    where: { email: "timur@jamotextile.uz" },
    update: {},
    create: { email: "timur@jamotextile.uz", name: "Тимур Рашидов", role: "MANAGER", passwordHash: await bcrypt.hash(ownerPassword, 12) },
  });

  const workshops = [];
  for (const w of [
    { name: "Цех №1 (Ташкент)", capacityPerMonth: 6000 },
    { name: "Цех №2 (Чирчик)", capacityPerMonth: 4000 },
  ]) {
    workshops.push((await db.workshop.findFirst({ where: { name: w.name } })) ?? (await db.workshop.create({ data: w })));
  }
  const [w1, w2] = workshops;

  // Demo clients (status, manager, users, addresses)
  const CLIENTS = [
    { key: "c1", name: "Samarkand Plaza Hotel", industry: "HOSPITALITY", inn: "305118224", reminderMonths: 6, discountPct: 0, managerId: owner.id, status: "APPROVED",
      users: [["Дилноза Юсупова", "+998901234567", "BUYER"], ["Шерзод Мирзаев", "+998901234568", "ACCOUNTANT"], ["Малика Исакова", "+998901234569", "HR"]],
      addresses: ["Самарканд, ул. Регистан, 12 (склад отеля)", "Ташкент, Мирзо-Улугбекский р-н, пр. Мустакиллик, 40"] },
    { key: "c2", name: "Zamin Market", industry: "RETAIL", inn: "302774019", reminderMonths: 12, discountPct: 3, managerId: manager.id, status: "APPROVED",
      users: [["Рустам Алиев", "+998935551020", "BUYER"]], addresses: ["Ташкент, Чиланзарский р-н, ул. Бунёдкор, 7"] },
    { key: "c3", name: "Oltin Vodiy Agro", industry: "INDUSTRY", inn: "307221880", reminderMonths: 6, discountPct: 0, managerId: owner.id, status: "APPROVED",
      users: [["Бахтиёр Саидов", "+998978102233", "BUYER"]], addresses: ["Андижан, пром. зона, склад 3"] },
    { key: "c4", name: "Tashkent Logistic Group", industry: "INDUSTRY", inn: "301990441", reminderMonths: 3, discountPct: 5, managerId: manager.id, status: "APPROVED",
      users: [["Зафар Каримов", "+998712003344", "BUYER"], ["Нигора Ахмедова", "+998712003345", "HR"]], addresses: ["Ташкент, Сергелийский р-н, терминал 2"] },
    { key: "c5", name: "Bekzod Auto Service", industry: "SERVICE", inn: "309004118", reminderMonths: 12, discountPct: 0, managerId: owner.id, status: "APPROVED",
      users: [["Бекзод Орипов", "+998993007070", "HEAD"]], addresses: ["Ташкент, Яшнабадский р-н, ул. Кундузсой, 30"] },
    { key: "c6", name: "Nur Dental Clinic", industry: "SERVICE", inn: "310552906", reminderMonths: 6, discountPct: 0, managerId: null, status: "PENDING",
      users: [["Севара Хасанова", "+998947771212", "HEAD"]], addresses: ["Ташкент, Мирабадский р-н, ул. Нукус, 5"] },
  ] as const;

  const companyId: Record<string, string> = {};
  for (const c of CLIENTS) {
    const data = { name: c.name, industry: c.industry, reminderMonths: c.reminderMonths, discountPct: c.discountPct, managerId: c.managerId, status: c.status };
    const company = await db.company.upsert({ where: { inn: c.inn }, update: data, create: { ...data, inn: c.inn } });
    companyId[c.key] = company.id;
    for (const [name, phone, role] of c.users)
      await db.customerUser.upsert({ where: { phone }, update: { name, role, companyId: company.id }, create: { name, phone, role, companyId: company.id } });
    if (!(await db.deliveryAddress.count({ where: { companyId: company.id } })))
      await db.deliveryAddress.createMany({ data: c.addresses.map((address) => ({ companyId: company.id, address })) });
  }

  // Demo orders: recreated each run
  await db.order.deleteMany({ where: { number: { in: ["O-2041", "O-2064", "O-2079", "O-2087", "O-2093", "O-2095", "O-2101"] } } });
  const products = new Map((await db.product.findMany()).map((p) => [p.slug, p]));
  const methods = new Map((await db.decorationMethod.findMany()).map((m) => [m.slug, m]));
  const companies = new Map((await db.company.findMany()).map((c) => [c.id, c]));

  type Item = [product: string, color: string, qty: number, placement: string, method: string];
  type Seed = {
    number: string; client: string; created: number; due: number; stage: OrderStage; paid: boolean; manager: string; workshop?: string;
    note?: string; items: Item[]; chat?: [from: "ADMIN" | "CUSTOMER", text: string, daysAgo: number][]; log: [text: string, daysAgo: number][];
  };
  const ORDERS: Seed[] = [
    { number: "O-2041", client: "c1", created: 208, due: -189, stage: "DONE", paid: true, manager: owner.id, workshop: w1.id,
      items: [["hoodie", "navy", 80, "left", "embroidery"], ["tee", "white", 40, "center", "dtf"]],
      chat: [["ADMIN", "Заказ доставлен. Спасибо!", 189]], log: [["Заявка создана клиентом", 208], ["Заказ закрыт", 189]] },
    { number: "O-2087", client: "c1", created: 16, due: 7, stage: "SEWING", paid: true, manager: owner.id, workshop: w2.id, note: "Козырёк усилить",
      items: [["cap", "navy", 200, "front", "embroidery"]],
      chat: [["ADMIN", "Макет утверждён, вышивка оцифрована. Запускаем в раскрой.", 14], ["CUSTOMER", "Отлично, ждём к сроку.", 14]],
      log: [["Заявка создана клиентом", 16], ["Передан на фабрику: Цех №2 (Чирчик)", 13], ["Этап: Пошив", 8]] },
    { number: "O-2093", client: "c2", created: 7, due: 16, stage: "QUOTE", paid: false, manager: manager.id,
      items: [["tee", "green", 300, "center", "dtf"]], log: [["Заявка создана клиентом", 7], ["Макет проверен, подготовлено КП", 5]] },
    { number: "O-2095", client: "c3", created: 5, due: 28, stage: "MOCKUP", paid: false, manager: owner.id,
      items: [["work", "orange", 60, "left", "embroidery"]], chat: [["CUSTOMER", "Нужны светоотражающие полосы на рукавах.", 5]],
      log: [["Заявка создана клиентом", 5]] },
    { number: "O-2079", client: "c4", created: 28, due: -1, stage: "DELIVERY", paid: true, manager: manager.id, workshop: w1.id,
      items: [["hoodie", "gray", 150, "back", "screen"]], log: [["Заявка создана клиентом", 28], ["Этап: Доставка", 4]] },
    { number: "O-2064", client: "c5", created: 10, due: 18, stage: "PAYMENT", paid: false, manager: owner.id,
      items: [["sweat", "black", 40, "left", "embroidery"]], log: [["Заявка создана клиентом", 10], ["КП согласовано, выставлен счёт", 6]] },
    { number: "O-2101", client: "c4", created: 3, due: 25, stage: "PAYMENT", paid: true, manager: manager.id,
      items: [["tee", "gray", 400, "center", "dtf"]], log: [["Заявка создана клиентом", 3], ["Оплата получена", 2]] },
  ];

  for (const o of ORDERS) {
    const company = companies.get(companyId[o.client])!;
    const items: Prisma.OrderItemCreateWithoutOrderInput[] = o.items.map(([slug, color, qty, placement, methodSlug]) => {
      const p = products.get(slug)!;
      const m = methods.get(methodSlug)!;
      const price = priceLine({ basePrice: p.basePrice, qty, feePerUnit: m.feePerUnit, setupFee: m.setupFee, tiers: TIERS, companyDiscountPct: company.discountPct });
      return { product: { connect: { id: p.id } }, method: { connect: { slug: m.slug } }, colorSlug: color, placement, qty, sizes: p.sized ? sizeSplit(qty) : undefined, ...price };
    });
    await db.order.create({
      data: {
        number: o.number,
        company: { connect: { id: company.id } },
        manager: { connect: { id: o.manager } },
        ...(o.workshop && { workshop: { connect: { id: o.workshop } } }),
        stage: o.stage,
        isPaid: o.paid,
        paidAt: o.paid ? daysAgo(Math.max(0, o.created - 3)) : null,
        dueDate: o.due >= 0 ? daysAhead(o.due) : daysAgo(-o.due),
        internalNote: o.note,
        netAmount: items.reduce((a, i) => a + i.lineTotal, 0),
        vatPct: VAT_PCT,
        createdAt: daysAgo(o.created),
        items: { create: items },
        events: { create: o.log.map(([message, d]) => ({ actorType: "SYSTEM" as const, message, createdAt: daysAgo(d) })) },
        messages: {
          create: (o.chat ?? []).map(([from, body, d]) => ({
            authorType: from,
            authorName: from === "ADMIN" ? "JAMO" : company.name,
            body,
            createdAt: daysAgo(d),
          })),
        },
      },
    });
  }

  console.log(`Seeded. Admin login: ${ownerEmail} / ${process.env.SEED_ADMIN_PASSWORD ? "(SEED_ADMIN_PASSWORD)" : ownerPassword}`);
  console.log("Customer login: +998 90 123-45-67 (Samarkand Plaza Hotel) — the SMS code is printed by the dev server.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
