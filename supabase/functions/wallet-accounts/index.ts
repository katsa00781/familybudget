// wallet-accounts Edge Function
// A BudgetBakers Wallet REST API-ból a felhasználó bankszámláinak / pénztárcáinak
// AKTUÁLIS egyenlegét adja vissza. Az Egyenleg Flow oldal (/egyenleg-flow) ebből
// tölti fel a napi egyenleg-előrejelzés induló (mai) egyenlegeit.
//
// Testvérfüggvények: `wallet-monthly-spending`, `wallet-annual-cashflow` (records
// végpont). Itt a `/accounts` végpontot hívjuk — a számlák egyenlege, nem a tételek.
//
// A BUDGETBAKERS_API_TOKEN a Supabase secrets-ből jön — SOHA nem a kliensről.
// A hívót a Supabase JWT azonosítja.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WALLET_API_BASE = "https://rest.budgetbakers.com/wallet/v1/api";

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

interface WalletBalance {
  currentBalance?: unknown; // aktuális egyenleg (standard számláknál); hitelkártyánál a tartozás
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
  initialBalance?: { value?: unknown; currencyCode?: unknown } | null;
}

function toFiniteNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.length > 0 ? v : fallback;
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

  // 2. Opcionális body: { includeArchived?: boolean } — alapból az archivált számlák kimaradnak
  let includeArchived = false;
  try {
    const text = await req.text();
    if (text) {
      const body = JSON.parse(text) as { includeArchived?: unknown };
      if (typeof body?.includeArchived === "boolean") includeArchived = body.includeArchived;
    }
  } catch {
    // üres / hibás body → marad az alapérték
  }

  // 3. BudgetBakers token
  const walletToken = Deno.env.get("BUDGETBAKERS_API_TOKEN");
  if (!walletToken) {
    console.error("BUDGETBAKERS_API_TOKEN secret is not configured");
    return errorResponse(500, "CONFIGURATION_ERROR", "A Wallet API token nincs beállítva a szerveren");
  }

  // 4. Számlák lekérése
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

  // 5. Normalizálás. Hitelkártyánál a currentBalance = tartozás (pozitív szám), a
  // creditLimit a keret. Standard számláknál a currentBalance az aktuális egyenleg
  // (lehet negatív, pl. overdraft).
  const accounts = raw
    .filter((a) => includeArchived || a.archived !== true)
    .map((a) => {
      const bal = a.balance ?? {};
      const accountType = asString(a.accountType);
      const isCredit = accountType === "CreditCard";
      const currentBalance = isCredit
        ? toFiniteNumber(bal.creditBalance ?? bal.currentBalance)
        : toFiniteNumber(bal.currentBalance);
      return {
        id: asString(a.id),
        name: asString(a.name, "Névtelen számla"),
        accountType,
        currencyCode: asString(bal.currencyCode ?? a.currencyCode, "HUF"),
        archived: a.archived === true,
        currentBalance: Math.round(currentBalance),
        creditLimit: isCredit ? Math.round(toFiniteNumber(bal.creditLimit)) : null,
        creditBalance: isCredit ? Math.round(toFiniteNumber(bal.creditBalance)) : null,
        availableCredit: isCredit ? Math.round(toFiniteNumber(bal.availableCredit)) : null,
      };
    })
    .filter((a) => a.id.length > 0);

  const result = {
    currency: "HUF",
    accounts,
    syncedAt: new Date().toISOString(),
  };

  console.log(
    JSON.stringify({
      event: "wallet_accounts",
      user_id: user.id,
      account_count: accounts.length,
    }),
  );

  return jsonResponse(result, 200);
});
