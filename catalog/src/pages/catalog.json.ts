// Публічний машинний фід /catalog.json (PHASE1_BRIEF §5).
// Проєкція контракту: тільки published, без внутрішніх полів. Валідується в білді
// проти catalog.public.schema.json (scripts/check-public-artifacts.mjs).
import type { APIRoute } from "astro";
import { buildPublicFeed } from "../lib/publicFeed";

export const GET: APIRoute = ({ site }) => {
  const feed = buildPublicFeed(site!.href);
  return new Response(JSON.stringify(feed, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
