// wallet-monthly-spending Edge Function
// A BudgetBakers Wallet REST API-ból EGY hónap TÉNYLEGES kiadásait és bevételeit
// adja vissza KATEGÓRIA szerinti bontásban (categoryId + categoryName). A Terv vs.
// Tény oldal (/bevetelek) ezt veti össze a kiválasztott havi költségvetési tervvel.
//
// Testvérfüggvény: `wallet-annual-cashflow` (teljes év, csak havi összesítés). Itt
// szándékosan külön végpont van, hogy annak a kontraktusát ne törjük.
//
// A BUDGETBAKERS_API_TOKEN a Supabase secrets-ből jön — SOHA nem a kliensről.
// A hívót a Supabase JWT azonosítja. A belső átvezetéseket (Transfer/Debt/
// Shopping list) kategória szerint hagyjuk ki — NEM a paymentType alapján, mert
// a bank-szinkronizált (pl. Revolut) tételeknél a paymentType megbízhatatlan.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WALLET_API_BASE = "https://rest.budgetbakers.com/wallet/v1/api";
const PAGE_SIZE = 200; // a Wallet REST max lapmérete
const MAX_PAGES = 40; // védőkorlát: ~8000 tétel/hónap

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

function recordCategoryName(rec: WalletRecord): string {
  const name = rec.category?.name;
  return typeof name === "string" && name.length > 0 ? name : "Ismeretlen";
}

// A rekord napja a hónapon belül (1-31) a recordDate "YYYY-MM-DD..." mezőből.
function recordDayOfMonth(rec: WalletRecord): number | null {
  const d = rec.recordDate;
  if (typeof d === "string" && d.length >= 10) {
    const day = parseInt(d.slice(8, 10), 10);
    return Number.isInteger(day) && day >= 1 && day <= 31 ? day : null;
  }
  return null;
}

// recordType: elsődlegesen a mező; fallback az amount előjele (negatív = kiadás).
function recordKind(rec: WalletRecord): "income" | "expense" {
  const t = typeof rec.recordType === "string" ? rec.recordType.toLowerCase() : "";
  if (t === "income") return "income";
  if (t === "expense") return "expense";
  const rawValue = toFiniteNumber(rec.amount?.value);
  return rawValue >= 0 ? "income" : "expense";
}

// A hónap utolsó napja (a tartomány felső, kizárólagos határához a következő hónap 1-je).
function nextMonthStart(year: number, month: number): string {
  const y = month === 12 ? year + 1 : year;
  const m = month === 12 ? 1 : month + 1;
  return `${y}-${String(m).padStart(2, "0")}-01`;
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

  // 2. Hónap meghatározása a body-ból. Elfogadjuk: { month: "YYYY-MM" } vagy { year, month }.
  let year = new Date().getUTCFullYear();
  let month = new Date().getUTCMonth() + 1;
  try {
    const text = await req.text();
    if (text) {
      const body = JSON.parse(text) as { month?: unknown; year?: unknown };
      if (typeof body?.month === "string" && /^\d{4}-\d{2}$/.test(body.month)) {
        year = parseInt(body.month.slice(0, 4), 10);
        month = parseInt(body.month.slice(5, 7), 10);
      } else {
        if (typeof body?.year === "number" && Number.isInteger(body.year)) year = body.year;
        else if (typeof body?.year === "string" && /^\d{4}$/.test(body.year)) year = parseInt(body.year, 10);
        if (typeof body?.month === "number" && Number.isInteger(body.month)) month = body.month;
        else if (typeof body?.month === "string" && /^\d{1,2}$/.test(body.month)) month = parseInt(body.month, 10);
      }
    }
  } catch {
    // üres / hibás body → marad az aktuális hónap
  }
  if (year < 2000 || year > 2100 || month < 1 || month > 12) {
    return errorResponse(400, "BAD_REQUEST", "Érvénytelen hónap");
  }
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = nextMonthStart(year, month);
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  // 3. BudgetBakers token
  const walletToken = Deno.env.get("BUDGETBAKERS_API_TOKEN");
  if (!walletToken) {
    console.error("BUDGETBAKERS_API_TOKEN secret is not configured");
    return errorResponse(500, "CONFIGURATION_ERROR", "A Wallet API token nincs beállítva a szerveren");
  }

  // A hónap napjainak száma (a napi trend feltöltéséhez)
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  // 4. A hónap lapozott lekérése (bevétel + kiadás) és kategória + nap szerinti aggregálás
  const catMap = new Map<string, { categoryId: string; categoryName: string; expense: number; income: number }>();
  // Napi bontás: index 0 = 1. nap ... index daysInMonth-1 = utolsó nap
  const dailyExpense = new Array<number>(daysInMonth).fill(0);
  const dailyIncome = new Array<number>(daysInMonth).fill(0);
  let totalExpense = 0;
  let totalIncome = 0;
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

        const id = catId ?? "unknown";
        const name = recordCategoryName(rec);
        const entry = catMap.get(id) ?? { categoryId: id, categoryName: name, expense: 0, income: 0 };

        const day = recordDayOfMonth(rec);
        const dayIdx = day !== null && day <= daysInMonth ? day - 1 : null;

        if (recordKind(rec) === "income") {
          entry.income += amount;
          totalIncome += amount;
          if (dayIdx !== null) dailyIncome[dayIdx] += amount;
        } else {
          entry.expense += amount;
          totalExpense += amount;
          if (dayIdx !== null) dailyExpense[dayIdx] += amount;
        }
        catMap.set(id, entry);
      }

      recordCount += records.length;
      if (records.length < PAGE_SIZE) break; // utolsó lap
    }
  } catch (networkError) {
    console.error("Wallet API network error:", networkError);
    return errorResponse(502, "UPSTREAM_ERROR", "Nem sikerült elérni a Wallet API-t");
  }

  // Kerekítés egész forintra
  const categories = Array.from(catMap.values()).map((c) => ({
    categoryId: c.categoryId,
    categoryName: c.categoryName,
    expense: Math.round(c.expense),
    income: Math.round(c.income),
  }));

  // Napi bontás: minden naphoz (1..daysInMonth) a tényleges bevétel/kiadás
  const daily = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    income: Math.round(dailyIncome[i]),
    expense: Math.round(dailyExpense[i]),
  }));

  const result = {
    month: monthKey,
    currency: "HUF",
    categories,
    daily,
    totalExpense: Math.round(totalExpense),
    totalIncome: Math.round(totalIncome),
    recordCount,
    syncedAt: new Date().toISOString(),
  };

  console.log(
    JSON.stringify({
      event: "wallet_monthly_spending",
      user_id: user.id,
      month: monthKey,
      record_count: recordCount,
      category_count: categories.length,
    }),
  );

  return jsonResponse(result, 200);
});
