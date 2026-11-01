// wallet-balance-snapshot Edge Function
// Elmenti a Wallet-számlák aktuális egyenlegét az `egyenleg_pillanatkep` táblába, az
// aktuális (budapesti) hónaphoz. Az Egyenleg változás oldal (/egyenleg-valtozas) ezt
// hasonlítja össze a későbbi egyenleggel.
//
// Hívók:
//   - pg_cron minden hónap 1-jén: `x-cron-secret` fejléc (WALLET_SNAPSHOT_CRON_SECRET)
//   - „Mentés most” gomb: Supabase JWT, csak a WALLET_SNAPSHOT_USER_ID felhasználónak
//
// Egy hónapra egy mentés van: a meglévőt SOHA nem írja felül, ezért biztonságosan
// újrahívható. Hiányos Wallet-választ nem ment el, különben az a hónap mentése
// véglegesen rossz maradna.
//
// A BUDGETBAKERS_API_TOKEN a Supabase secrets-ből jön — SOHA nem a kliensről.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WALLET_API_BASE = "https://rest.budgetbakers.com/wallet/v1/api";
const TIME_ZONE = "Europe/Budapest";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
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

interface WalletBalance {
  currentBalance?: unknown;
  creditBalance?: unknown; // hitelkártya: aktuális tartozás
  creditLimit?: unknown; // hitelkártya: hitelkeret
  availableCredit?: unknown; // hitelkártya: elérhető keret
  currencyCode?: unknown;
}

interface WalletAccountRaw {
  id?: unknown;
  name?: unknown;
  accountType?: unknown; // "CurrentAccount" | "CreditCard" | "SavingAccount" | "Cash" | ...
  currencyCode?: unknown;
  archived?: unknown;
  balance?: WalletBalance | null;
}

function toNumberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.length > 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

// Előjeles egyenleg; hiányzó adatnál null. A hitelkártya-tartozás NEGATÍV. Ugyanez a
// szabály él a kliensen is: lib/egyenlegValtozas.ts → nettoEgyenleg().
function nettoEgyenleg(accountType: string, bal: WalletBalance): number | null {
  if (accountType !== "CreditCard") {
    const current = toNumberOrNull(bal.currentBalance);
    return current === null ? null : Math.round(current);
  }
  const limit = toNumberOrNull(bal.creditLimit);
  const available = toNumberOrNull(bal.availableCredit);
  if (limit !== null && limit > 0 && available !== null) {
    return Math.round(available) - Math.round(limit);
  }
  const debt = toNumberOrNull(bal.creditBalance ?? bal.currentBalance);
  return debt === null ? null : -Math.abs(Math.round(debt));
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// "YYYY-MM" a budapesti naptár szerint
function currentMonthKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()).slice(0, 7);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return errorResponse(405, "METHOD_NOT_ALLOWED", "Only POST is supported");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const ownerId = Deno.env.get("WALLET_SNAPSHOT_USER_ID") ?? "";
  const cronSecret = Deno.env.get("WALLET_SNAPSHOT_CRON_SECRET") ?? "";
  const walletToken = Deno.env.get("BUDGETBAKERS_API_TOKEN");

  if (!ownerId || !cronSecret || !serviceRoleKey || !walletToken) {
    console.error("wallet-balance-snapshot: hiányzó secret");
    return errorResponse(500, "CONFIGURATION_ERROR", "A mentés nincs beállítva a szerveren");
  }

  // 1. A hívó azonosítása: cron secret vagy a tulajdonos JWT-je
  let source: "automatikus" | "kezi";
  const cronHeader = req.headers.get("x-cron-secret");
  if (cronHeader !== null) {
    if (!constantTimeEquals(cronHeader, cronSecret)) {
      return errorResponse(401, "UNAUTHORIZED", "Invalid cron secret");
    }
    source = "automatikus";
  } else {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(401, "UNAUTHORIZED", "Missing or malformed Authorization header");
    }
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
    if (user.id !== ownerId) {
      return errorResponse(403, "FORBIDDEN", "Az egyenleg mentéséhez nincs jogosultságod");
    }
    source = "kezi";
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const month = currentMonthKey();

  // 2. Ha a hónapnak már van mentése, kész (a cron 2-i és 3-i futása ide jut)
  const { data: existing, error: readError } = await admin
    .from("egyenleg_pillanatkep")
    .select("*")
    .eq("user_id", ownerId)
    .eq("snapshot_month", month)
    .maybeSingle();

  if (readError) {
    console.error("Pillanatkép olvasási hiba:", readError);
    return errorResponse(500, "DATABASE_ERROR", "Nem sikerült ellenőrizni a meglévő mentést");
  }
  if (existing) {
    return jsonResponse({ month, created: false, snapshot: existing }, 200);
  }

  // 3. Számlák lekérése
  let raw: WalletAccountRaw[] = [];
  try {
    const res = await fetch(`${WALLET_API_BASE}/accounts?limit=100`, {
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
    raw = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.accounts)
        ? payload.accounts
        : [];
  } catch (networkError) {
    console.error("Wallet API network error:", networkError);
    return errorResponse(502, "UPSTREAM_ERROR", "Nem sikerült elérni a Wallet API-t");
  }

  // 4. Normalizálás. Hiányzó egyenleget nem mentünk 0-ként.
  const active = raw.filter((a) => a.archived !== true && asString(a.id).length > 0);
  const accounts = [];
  for (const a of active) {
    const bal = a.balance ?? {};
    const accountType = asString(a.accountType);
    const balance = nettoEgyenleg(accountType, bal);
    if (balance === null) {
      console.error(`Hiányzó egyenleg a Wallet-válaszban: ${asString(a.id)}`);
      return errorResponse(502, "INCOMPLETE_WALLET_DATA", "A Wallet-válaszból hiányzik egy számla egyenlege");
    }
    const limit = toNumberOrNull(bal.creditLimit);
    accounts.push({
      id: asString(a.id),
      name: asString(a.name, "Névtelen számla"),
      accountType,
      currencyCode: asString(bal.currencyCode ?? a.currencyCode, "HUF"),
      balance,
      creditLimit: accountType === "CreditCard" && limit !== null ? Math.round(limit) : null,
    });
  }

  if (accounts.length === 0) {
    return errorResponse(502, "INCOMPLETE_WALLET_DATA", "A Wallet API nem adott vissza számlát");
  }

  // 5. Mentés. Párhuzamos hívásnál a UNIQUE megszorítás miatt az első nyer.
  const { data: inserted, error: insertError } = await admin
    .from("egyenleg_pillanatkep")
    .upsert(
      { user_id: ownerId, snapshot_month: month, source, accounts },
      { onConflict: "user_id,snapshot_month", ignoreDuplicates: true },
    )
    .select();

  if (insertError) {
    console.error("Pillanatkép mentési hiba:", insertError);
    return errorResponse(500, "DATABASE_ERROR", "Nem sikerült menteni az egyenlegeket");
  }

  const snapshot = inserted?.[0] ?? null;

  console.log(
    JSON.stringify({
      event: "wallet_balance_snapshot",
      month,
      source,
      created: snapshot !== null,
      account_count: accounts.length,
    }),
  );

  return jsonResponse({ month, created: snapshot !== null, snapshot }, 200);
});
