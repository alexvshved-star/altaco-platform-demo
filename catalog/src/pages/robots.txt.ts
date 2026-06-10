// robots.txt: AI-краулери НЕ блокуються — агентська видимість це канал продажів
// (PHASE1_BRIEF §5). Явні Allow для GPTBot/ClaudeBot/PerplexityBot — задокументований намір.
import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const base = new URL(import.meta.env.BASE_URL, site!).href.replace(/\/$/, "");
  const body = `User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: ${base}/sitemap-index.xml
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
