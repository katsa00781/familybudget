# Költségvetés: a Számlák és Tervezett Utalások induló egyenlege a Wallet-ből

- **Dátum:** 2026-11-06
- **Érintett terület:** üzleti logika / típusok (`budget_plans.budget_data` JSONB)
- **Mobil teendő szükséges:** igen

## Mi változott

A Költségvetés oldal (`app/koltsegvetes/page.tsx`) *Számlák és Tervezett Utalások* szekciójában a számlák induló egyenlege az élő Wallet számlaegyenlegekből frissül. Eddig kézzel kellett beírni.

- A számlák egy Wallet számlához köthetők (számlakártyánként választó, vagy „Kézi egyenleg”).
- Az alap számlák (`main-account`, `credit-card-1`, `credit-card-2`) az első szinkronkor maguktól kötődnek a típusuk szerinti első szabad Wallet számlához:
  - `main-account` → első `CurrentAccount`
  - `credit-card-1`, `credit-card-2` → első, illetve második `CreditCard`
- A Wallet-ből újabb számla is felvehető. A nem alap számlák törölhetők, és velük törlődnek a rájuk hivatkozó utalások.
- Csak a nem archivált, HUF pénznemű Wallet számlák vehetők fel.
- **Mikor frissül:**
  - Automatikusan frissül terv betöltésekor, új terv indításakor és a vonatkozási hónap váltásakor, de csak akkor, ha a `plan_month` az aktuális vagy egy későbbi hónap. A lezárt hónapok mentett induló értékei így nem íródnak felül.
  - A „Frissítés a Wallet-ből” gomb bármelyik hónapnál azonnal átveszi az egyenleget.
- **Előjel:** az induló egyenleg előjeles, a hitelkártya-tartozás **negatív**. Ugyanazt a `nettoEgyenleg()` szabályt használja, mint az Egyenleg változás oldal (`lib/egyenlegValtozas.ts`): `availableCredit − creditLimit`. Az értéket egész forintra kerekíti. A várható egyenleg képlete változatlan: `induló + bejövő − kimenő`. Egy hitelkártya-befizetés (utalás a kártyára) így a tartozást 0 felé viszi.
- A számla nevét a szinkron nem írja felül (a „Főszámla” név marad). Ha új számlát vesz fel a Wallet-ből, az a Wallet nevét kapja.

## Adatbázis / API változás

- Nincs migráció és nincs új Edge Function: a meglévő `wallet-accounts` függvényt használja (`fetchWalletAccounts()`).
- **JSONB bővülés:** `budget_plans.budget_data.transferPlan.accounts[]` elemein új, opcionális mező van:

  ```ts
  interface TransferAccount {
    id: string
    name: string
    initialBalance: number          // előjeles; hitelkártya-tartozás negatív
    walletAccountId?: string | null // Wallet számla UUID
  }
  ```

  A `walletAccountId` értékei:
  - hiányzik (`undefined`): még nincs kötve, az alap számla automatikusan kötődhet;
  - `null`: a felhasználó kézi egyenleget választott, ezt soha nem kötjük automatikusan;
  - string: a kötött Wallet számla id-ja.

- Visszafelé kompatibilis: régi terveknél a mező hiányzik. Ezeknél a régi, kézzel beírt (akár pozitív) hitelkártya-értékeket az első szinkron negatív tartozásra cseréli, ha a terv aktuális vagy jövőbeli hónapra szól.

## Teendő a mobil appban

1. A `transferPlan.accounts[]` olvasásakor és írásakor **őrizd meg** a `walletAccountId` mezőt, a `null` értéket is. Ha a mobil elhagyja, a web a következő szinkronkor újra automatikusan köti az alap számlát, a kézi beállítás pedig elveszik.
2. Ha a mobil is mutatja vagy szerkeszti a számlákat és utalásokat, ugyanígy töltse az induló egyenleget a `wallet-accounts` Edge Function-ből:
   - ugyanazzal a kötési szabállyal (alap számla → első szabad `CurrentAccount` vagy `CreditCard`; `null` kötést nem bánt);
   - ugyanazzal az előjel-szabállyal (`nettoEgyenleg`, kerekítve);
   - ugyanazzal a hónap-feltétellel (automatikusan csak aktuális vagy jövőbeli `plan_month` esetén).
3. Az induló egyenleg beviteli mezője negatív értéket is fogadjon el (eddig `min=0` volt).

## Kiegészítés: tervezett bevétel a főszámla előrejelzésében

A *Számla előrejelzés* a főszámla (`main-account`) bejövő összegébe a költségvetés **tervezett bevételét** is beleszámolja. Ez a kiválasztott bevételi terv összege, a webes kódban `expectedIncome`.

```
bejövő   = bejövő utalások + (főszámlánál: tervezett bevétel)
várható  = induló + bejövő − kimenő
```

A többi számla bejövő összege továbbra is csak az utalásokból áll. A tervezett bevétel nincs mentve a `transferPlan`-be, a megjelenítéskor számolódik.

Megszűnt a „Tervezett bevétel” és a „Tényleges bevétel” gomb. Ezek eddig a bevételt a főszámla induló egyenlegébe írták. Az induló egyenleg most a Wallet-ből jön, a bevétel pedig a bejövő oldalon szerepel, így a gombok duplán számolnák.

**Mobil teendő:** ha a mobil is számolja a számla-előrejelzést, a főszámla bejövő összegéhez adja hozzá a tervezett bevételt. A bevételt ne írja az induló egyenlegbe.
