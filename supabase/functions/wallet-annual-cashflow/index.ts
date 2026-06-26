// wallet-annual-cashflow Edge Function
// A BudgetBakers Wallet REST API-ból egy teljes ÉV havi TÉNYLEGES bevétel- és
// kiadás-összesítését adja vissza (havi bontásban), az éves cashflow oldal
// terv-vs-tény összevetéséhez.
//
// Testvérfüggvény: `wallet-spending` (egy hónap, kategória szerinti kiadás). Itt
// szándékosan külön végpont van, hogy annak a kontraktusát ne törjük.
//
// A BUDGETBAKERS_API_TOKEN a Supabase secrets-ből jön — SOHA nem a kliensről.
// A hívót a Supabase JWT azonosítja. A belső átvezetéseket (Transfer/Debt/
// Shopping list) kategória szerint hagyjuk ki — NEM a paymentType alapján, mert
// a bank-szinkronizált (pl. Revolut) tételeknél a paymentType megbízhatatlan:
// minden tételt "transfer"-nek jelöl, így a paymentType-szűrés a valós
// kiadásokat is eldobná (lásd a 2026-06-26-i hibajavítást).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WALLET_API_BASE = "https://rest.budgetbakers.com/wallet/v1/api";
const PAGE_SIZE = 200; // a Wallet REST max lapmérete
const MAX_PAGES = 80; // védőkorlát: ~16000 tétel/év

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, code: string, message: string): Response {
  return jsonResponse({ error: { code, message } }, status);
}

// Belső átvezetés / nem valós ki-bevétel — kihagyjuk az összesítésből.
const EXCLUDED_CATEGORIES = new Set<string>([
  "5c5c4e21-00c8-8000-8000-000000000000", // Transfer
  "5c5c4e20-00c8-8000-8000-000000000000", // Debt
  "5c5c4e22-00c8-8000-8000-000000000000", // Shopping list
]);

interface WalletAmount {
  value?: unknown;
  currencyCode?: unknown;
}

interface WalletRecord {
  category?: { id?: unknown; name?: unknown } | null;
  amount?: WalletAmount | null;
  convertedAmount?: WalletAmount | null;
  recordType?: unknown; // "income" | "expense"
  paymentType?: unknown;
  recordDate?: unknown;
}

function toFiniteNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

// Egy rekord HUF-összege (abszolút). A `convertTo=base` convertedAmount-ot
// részesítjük előnyben (forex), különben a saját devizás amount a fallback.
function recordBaseAmount(rec: WalletRecord): number {
  const conv = rec.convertedAmount;
  const raw = rec.amount;
  const value =
    conv && conv.value !== undefined && conv.value !== null
      ? toFiniteNumber(conv.value)
      : toFiniteNumber(raw?.value);
  return Math.abs(value);
}

function recordCategoryId(rec: WalletRecord): string | null {
  const id = rec.category?.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

// recordType: elsődlegesen a mező; fallback az amount előjele (negatív = kiadás).
function recordKind(rec: WalletRecord): "income" | "expense" {
  const t = typeof rec.recordType === "string" ? rec.recordType.toLowerCase() : "";
  if (t === "income") return "income";
  if (t === "expense") return "expense";
  const rawValue = toFiniteNumber(rec.amount?.value);
  return rawValue >= 0 ? "income" : "expense";
}

function monthFromRecordDate(rec: WalletRecord): number | null {
  const d = typeof rec.recordDate === "string" ? rec.recordDate : "";
  if (d.length < 7) return null;
  const m = parseInt(d.slice(5, 7), 10);
  return m >= 1 && m <= 12 ? m : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return errorResponse(405, "METHOD_NOT_ALLOWED", "Only POST is supported");
  }

  // 1. A hívó azonosítása Supabase JWT-vel
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return errorResponse(401, "UNAUTHORIZED", "Missing or malformed Authorization header");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return errorResponse(401, "UNAUTHORIZED", "Invalid or expired JWT");
  }

  // 2. Év meghatározása a body-ból (alapért. aktuális év)
  let year = new Date().getUTCFullYear();
  try {
    const text = await req.text();
    if (text) {
      const body = JSON.parse(text) as { year?: unknown };
      if (typeof body?.year === "number" && Number.isInteger(body.year)) {
        year = body.year;
      } else if (typeof body?.year === "string" && /^\d{4}$/.test(body.year)) {
        year = parseInt(body.year, 10);
      }
    }
  } catch {
    // üres / hibás body → marad az aktuális év
  }
  if (year < 2000 || year > 2100) {
    return errorResponse(400, "BAD_REQUEST", "Érvénytelen év");
  }
  const start = `${year}-01-01`;
  const end = `${year + 1}-01-01`;

  // 3. BudgetBakers token
  const walletToken = Deno.env.get("BUDGETBAKERS_API_TOKEN");
  if (!walletToken) {
    console.error("BUDGETBAKERS_API_TOKEN secret is not configured");
    return errorResponse(500, "CONFIGURATION_ERROR", "A Wallet API token nincs beállítva a szerveren");
  }

  // 4. Teljes év lapozott lekérése (bevétel + kiadás) és havi aggregálás
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income: 0,
    expense: 0,
    hasData: false,
  }));
  let recordCount = 0;

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams();
      params.append("recordDate", `gte.${start}`);
      params.append("recordDate", `lt.${end}`);
      params.set("convertTo", "base");
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(page * PAGE_SIZE));

      const res = await fetch(`${WALLET_API_BASE}/records?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${walletToken}`,
          Accept: "application/json",
        },
      });

      if (res.status === 401 || res.status === 403) {
        return errorResponse(502, "WALLET_AUTH_ERROR", "A Wallet API elutasította a tokent (lejárt vagy érvénytelen)");
      }
      if (res.status === 429) {
        return errorResponse(429, "WALLET_RATE_LIMIT", "A Wallet API rate limit elérve");
      }
      if (!res.ok) {
        const errText = await res.text();
        console.error(`Wallet API error ${res.status}:`, errText.slice(0, 500));
        return errorResponse(502, "UPSTREAM_ERROR", `Wallet API HTTP ${res.status}`);
      }

      const payload = await res.json();
      const records: WalletRecord[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.records)
          ? payload.records
          : [];

      for (const rec of records) {
        const catId = recordCategoryId(rec);
        if (catId && EXCLUDED_CATEGORIES.has(catId)) continue; // belső átvezetés (kategória szerint)
        const amount = recordBaseAmount(rec);
        if (amount <= 0) continue;
        const m = monthFromRecordDate(rec);
        if (m === null) continue;
        const slot = months[m - 1];
        if (recordKind(rec) === "income") slot.income += amount;
        else slot.expense += amount;
        slot.hasData = true;
      }

      recordCount += records.length;
      if (records.length < PAGE_SIZE) break; // utolsó lap
    }
  } catch (networkError) {
    console.error("Wallet API network error:", networkError);
    return errorResponse(502, "UPSTREAM_ERROR", "Nem sikerült elérni a Wallet API-t");
  }

  // Kerekítés egész forintra
  for (const slot of months) {
    slot.income = Math.round(slot.income);
    slot.expense = Math.round(slot.expense);
  }

  const result = {
    year,
    currency: "HUF",
    months,
    syncedAt: new Date().toISOString(),
  };

  console.log(
    JSON.stringify({
      event: "wallet_annual_cashflow",
      user_id: user.id,
      year,
      record_count: recordCount,
      months_with_data: months.filter((m) => m.hasData).length,
    }),
  );

  return jsonResponse(result, 200);
});
