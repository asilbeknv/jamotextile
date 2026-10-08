const money = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Tashkent" });
const dateTime = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Tashkent",
});

export const formatSum = (n: number) => `${money.format(Math.round(n))} сум`;
export const formatCompactSum = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(".", ",")} млн сум` : formatSum(n);
export const formatDate = (d: Date | string | null | undefined) => (d ? date.format(new Date(d)) : "—");
export const formatDateTime = (d: Date | string) => dateTime.format(new Date(d));
