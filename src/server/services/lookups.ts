import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

/** Small reference tables used to label order items. Cached per request. */
export const getLookups = cache(async () => {
  const [colors, methods] = await Promise.all([db.color.findMany(), db.decorationMethod.findMany()]);
  return {
    colors: new Map(colors.map((c) => [c.slug, { name: c.name, hex: c.hex }])),
    methods: new Map(methods.map((m) => [m.slug, m.name])),
  };
});
