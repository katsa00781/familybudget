export interface WalletCategory {
  id: string
  name: string
  group: string
}

export const WALLET_CATEGORIES: WalletCategory[] = [
  { id: 'ba1dbb27-cac2-4e9b-b556-391104e383fc', name: 'Élelmiszerek', group: 'Étel' },
  { id: 'ea7668b0-8393-472a-bce1-fbc9664aad6a', name: 'Étel és ital', group: 'Étel' },
  { id: 'a077f250-e799-4716-a521-baead9cbca02', name: 'Étterem, gyorsétterem', group: 'Étel' },
  { id: 'a10361fb-b92b-4afd-95b3-d28721f4915d', name: 'Bár, kávézó', group: 'Étel' },
  { id: '4be5aff2-a918-4f67-a0ef-02e227140853', name: 'Gyerekek', group: 'Vásárlás' },
  { id: '78c0d3d4-e550-40bb-9fb0-add6abc59ffc', name: 'Otthon, kert', group: 'Vásárlás' },
  { id: 'bd237eb1-3d10-4240-8635-2aa2a281f08a', name: 'Elektronika, kiegészítők', group: 'Vásárlás' },
  { id: '2f9dfb2d-2664-4a5c-90b7-8ca88009fcd8', name: 'Gyógyszertár, drogéria', group: 'Vásárlás' },
  { id: 'f3452432-ae2b-46bb-9457-14a8bddaebff', name: 'Ruházat és cipő', group: 'Vásárlás' },
  { id: '69d54220-6a3f-4e4c-bdf8-fbd5cc7e750c', name: 'Egészségügyi ellátás, orvos', group: 'Egészség' },
  { id: '46c38faa-e533-42f7-bdcf-d2a346cd6e86', name: 'Egészség és szépség', group: 'Egészség' },
  { id: 'd1516469-9028-42a2-9a18-1fc930c4b9cc', name: 'Aktív sport, fitnesz', group: 'Szórakozás' },
  { id: '33d3e406-0f79-4c89-af70-bac03b4e6567', name: 'TV, streaming', group: 'Szórakozás' },
  { id: '82194194-5a20-4727-aa98-b10cce060d6a', name: 'Szoftverek, alkalmazások, játékok', group: 'Szórakozás' },
  { id: '4c549e30-93dc-4ccd-b24b-4cf521b3a619', name: 'Könyvek, hanganyagok, előfizetések', group: 'Szórakozás' },
  { id: 'ab67f678-9202-4518-b1e0-ad1f58518eee', name: 'Kultúra, sportesemények', group: 'Szórakozás' },
  { id: '97bfb943-b94d-40f2-bc47-88d887200c2a', name: 'Nyaralás, utazások, hotelek', group: 'Szórakozás' },
  { id: '8eaa8479-7cbd-4174-920e-bf535d80d29f', name: 'Hobbi', group: 'Szórakozás' },
  { id: 'ae2cdbe7-99ef-467e-b647-7464c8da9001', name: 'Üzemanyag', group: 'Jármű' },
  { id: 'd8d9eed8-44e2-4402-bf1f-297ab6b300f3', name: 'Parkolás', group: 'Jármű' },
  { id: 'c854b022-6721-4704-bacc-34bb25d90050', name: 'Jármű karbantartása', group: 'Jármű' },
  { id: '98cb0cb2-a8f1-45ff-adbc-303c4f6765fb', name: 'Lízing', group: 'Jármű' },
  { id: '8652e0ef-d3c6-4b19-9f2d-2eccabd0a10b', name: 'Jelzáloghitel', group: 'Lakhatás' },
  { id: '0c652764-bee2-4a88-b6cd-4bc7c1e11963', name: 'Energia, közművek', group: 'Lakhatás' },
  { id: 'baab1cc6-e082-4d0d-ab3c-b2f08c71221f', name: 'Szolgáltatások', group: 'Lakhatás' },
  { id: '67879bd3-779b-4f93-b97b-acbe850d1e68', name: 'Ingatlanbiztosítás', group: 'Lakhatás' },
  { id: 'f1fd2b42-6d87-45d0-b540-32851780e0b9', name: 'Karbantartás, javítások', group: 'Lakhatás' },
  { id: '5468cb5a-24aa-47a2-9572-579c6b9bbfda', name: 'Telefon, mobiltelefon', group: 'Kommunikáció' },
  { id: 'ec7a27f4-b53c-4778-a4ab-6a972df4f402', name: 'Internet', group: 'Kommunikáció' },
  { id: 'ad608f9e-1175-40a0-a566-72e1e31027c3', name: 'Kölcsönök, kamatok', group: 'Pénzügyek' },
  { id: '342f364d-5f7d-47e9-86ba-a34de34fb535', name: 'Díjak, tartozások', group: 'Pénzügyek' },
  { id: '76f3f616-000c-48de-becd-041b4166a39e', name: 'Egyéb', group: 'Egyéb' },
  { id: '9dc3957c-579d-41b3-8fc1-f941b8a74565', name: 'Hiányzó', group: 'Egyéb' },
  { id: '7bed4dc9-ba3f-456e-8f18-be32b22cd0bf', name: 'Mamci', group: 'Egyéb' },
  { id: '1b46b9a8-f441-4427-9229-29e6bd2d6f6b', name: 'Lottó, szerencsejáték', group: 'Egyéb' },

  // --- A Wallet többi rendszer-kategóriája a VALÓDI (globális) UUID-jukkal. Ezeknek nem
  // kell híd-bejegyzés a WALLET_SYSTEM_UUID_TO_INTERNAL-ban: a resolveWalletCategory az
  // ismeretlen valódi UUID-ra önmagát adja vissza, a nevet pedig innen olvassa ki, és a
  // költségvetési tervek is ezt a valódi UUID-t tárolják, ha a Költségvetés oldalon
  // hozzárendeled. (A valódi UUID-kat a Wallet MCP `get_categories` adja.)
  // Vásárlás
  { id: '5c5c07dc-0014-8000-8000-000000000000', name: 'Áruházak', group: 'Vásárlás' },
  { id: '5c5c07d9-0014-8000-8000-000000000000', name: 'Szabadidő', group: 'Vásárlás' },
  { id: '5c5c07d7-0014-8000-8000-000000000000', name: 'Ajándékok, örömök', group: 'Vásárlás' },
  { id: '5c5c07d1-0014-8000-8000-000000000000', name: 'Ékszerek, kiegészítők', group: 'Vásárlás' },
  { id: '5c5c07d5-0014-8000-8000-000000000000', name: 'Háziállatok', group: 'Vásárlás' },
  { id: '5c5c07da-0014-8000-8000-000000000000', name: 'Vásárlás (egyéb)', group: 'Vásárlás' },
  { id: '5c5c07d8-0014-8000-8000-000000000000', name: 'Papír-írószer, szerszámok', group: 'Vásárlás' },
  // Egészség / Szórakozás
  { id: '5c5c1771-003c-8000-8000-000000000000', name: 'Wellness, szépségápolás', group: 'Egészség' },
  { id: '5c5c177b-003c-8000-8000-000000000000', name: 'Alkohol, dohány', group: 'Szórakozás' },
  { id: '5c5c177a-003c-8000-8000-000000000000', name: 'Jótékonyság, ajándékok', group: 'Szórakozás' },
  { id: '5c5c1776-003c-8000-8000-000000000000', name: 'Oktatás, fejlődés', group: 'Szórakozás' },
  { id: '5c5c1774-003c-8000-8000-000000000000', name: 'Életesemények', group: 'Szórakozás' },
  { id: '5c5c177d-003c-8000-8000-000000000000', name: 'Élet és szórakozás (egyéb)', group: 'Szórakozás' },
  // Jármű / Közlekedés
  { id: '5c5c1392-0032-8000-8000-000000000000', name: 'Járműbiztosítás', group: 'Jármű' },
  { id: '5c5c138b-0032-8000-8000-000000000000', name: 'Bérlés (jármű)', group: 'Jármű' },
  { id: '5c5c138c-0032-8000-8000-000000000000', name: 'Jármű (egyéb)', group: 'Jármű' },
  { id: '5c5c0fa0-0028-8000-8000-000000000000', name: 'Tömegközlekedés', group: 'Közlekedés' },
  { id: '5c5c0fa1-0028-8000-8000-000000000000', name: 'Taxi', group: 'Közlekedés' },
  { id: '5c5c0fa2-0028-8000-8000-000000000000', name: 'Távolsági közlekedés', group: 'Közlekedés' },
  { id: '5c5c0fa3-0028-8000-8000-000000000000', name: 'Üzleti utak', group: 'Közlekedés' },
  { id: '5c5c0fa4-0028-8000-8000-000000000000', name: 'Közlekedés (egyéb)', group: 'Közlekedés' },
  // Lakhatás
  { id: '5c5c0bb8-001e-8000-8000-000000000000', name: 'Albérlet, lakbér', group: 'Lakhatás' },
  { id: '5c5c0bbd-001e-8000-8000-000000000000', name: 'Lakhatás (egyéb)', group: 'Lakhatás' },
  // Kommunikáció
  { id: '5c5c1b5c-0046-8000-8000-000000000000', name: 'Postai szolgáltatások', group: 'Kommunikáció' },
  { id: '5c5c1b5d-0046-8000-8000-000000000000', name: 'PC, kommunikáció (egyéb)', group: 'Kommunikáció' },
  // Pénzügyek
  { id: '5c5c1f40-0050-8000-8000-000000000000', name: 'Adók', group: 'Pénzügyek' },
  { id: '5c5c1f41-0050-8000-8000-000000000000', name: 'Biztosítások', group: 'Pénzügyek' },
  { id: '5c5c1f43-0050-8000-8000-000000000000', name: 'Bírságok', group: 'Pénzügyek' },
  { id: '5c5c1f44-0050-8000-8000-000000000000', name: 'Pénzügyi tanácsadás', group: 'Pénzügyek' },
  { id: '5c5c1f47-0050-8000-8000-000000000000', name: 'Tartásdíj', group: 'Pénzügyek' },
  { id: '5c5c1f48-0050-8000-8000-000000000000', name: 'Pénzügyi kiadások (egyéb)', group: 'Pénzügyek' },
  // Befektetés / megtakarítás
  { id: '5c5c232b-005a-8000-8000-000000000000', name: 'Megtakarítás', group: 'Befektetés' },
  { id: '5c5c232a-005a-8000-8000-000000000000', name: 'Pénzügyi befektetések', group: 'Befektetés' },
  { id: '5c5c232c-005a-8000-8000-000000000000', name: 'Gyűjtemények', group: 'Befektetés' },
  { id: '5c5c232d-005a-8000-8000-000000000000', name: 'Befektetések (egyéb)', group: 'Befektetés' },
  { id: '5c5c2328-005a-8000-8000-000000000000', name: 'Ingatlan', group: 'Befektetés' },
  { id: '5c5c2329-005a-8000-8000-000000000000', name: 'Járművek, ingóságok', group: 'Befektetés' },
  // Egyéb / ismeretlen
  { id: '5c5c32c9-0082-8000-8000-000000000000', name: 'Ismeretlen kiadás', group: 'Egyéb' },
]

export const WALLET_CATEGORY_MAP = new Map(WALLET_CATEGORIES.map(c => [c.id, c]))

// Wallet kategória neve → UUID (CSV alapú egyeztetéshez)
export const WALLET_CATEGORY_NAME_TO_ID = new Map(WALLET_CATEGORIES.map(c => [c.name, c.id]))

// A Wallet REST API a VALÓDI, globális rendszer-kategória UUID-kat adja vissza
// (pl. 5c5c03e8-... = "Groceries", angol néven). A FamilyBudget viszont a saját
// BELSŐ UUID-jaival (WALLET_CATEGORIES, magyar nevek) hivatkozik a kategóriákra, és
// a költségvetési tervek `walletCategories` mezője is ezeket tárolja. Ez a híd a
// valódi rendszer-UUID-t a belső UUID-ra fordítja, így az élő API adatai egyeztethetők.
// (A custom kategóriák — pl. Mamci 7bed4dc9 — valódi UUID-ja már megegyezik a belsővel,
// ezeket nem kell fordítani; a fallback önmagát adja vissza.)
export const WALLET_SYSTEM_UUID_TO_INTERNAL: Record<string, string> = {
  '5c5c03e8-000a-8000-8000-000000000000': 'ba1dbb27-cac2-4e9b-b556-391104e383fc', // Groceries → Élelmiszerek
  '5c5c03eb-000a-8000-8000-000000000000': 'ea7668b0-8393-472a-bce1-fbc9664aad6a', // Food & Drinks → Étel és ital
  '5c5c03e9-000a-8000-8000-000000000000': 'a077f250-e799-4716-a521-baead9cbca02', // Restaurants & fast food → Étterem, gyorsétterem
  '5c5c03ea-000a-8000-8000-000000000000': 'a10361fb-b92b-4afd-95b3-d28721f4915d', // Bar cafe → Bár, kávézó
  '5c5c07d3-0014-8000-8000-000000000000': '4be5aff2-a918-4f67-a0ef-02e227140853', // Kids → Gyerekek
  '5c5c07d4-0014-8000-8000-000000000000': '78c0d3d4-e550-40bb-9fb0-add6abc59ffc', // Home & garden → Otthon, kert
  '5c5c07d6-0014-8000-8000-000000000000': 'bd237eb1-3d10-4240-8635-2aa2a281f08a', // Electronics & accessories → Elektronika, kiegészítők
  '5c5c07db-0014-8000-8000-000000000000': '2f9dfb2d-2664-4a5c-90b7-8ca88009fcd8', // Drugstore → Gyógyszertár, drogéria
  '5c5c07d0-0014-8000-8000-000000000000': 'f3452432-ae2b-46bb-9457-14a8bddaebff', // Clothes & shoes → Ruházat és cipő
  '5c5c1770-003c-8000-8000-000000000000': '69d54220-6a3f-4e4c-bdf8-fbd5cc7e750c', // Health care & doctor → Egészségügyi ellátás, orvos
  '5c5c07d2-0014-8000-8000-000000000000': '46c38faa-e533-42f7-bdcf-d2a346cd6e86', // Health & beauty → Egészség és szépség
  '5c5c1772-003c-8000-8000-000000000000': 'd1516469-9028-42a2-9a18-1fc930c4b9cc', // Active sport, fitness → Aktív sport, fitnesz
  '5c5c1778-003c-8000-8000-000000000000': '33d3e406-0f79-4c89-af70-bac03b4e6567', // Tv, streaming → TV, streaming
  '5c5c1b5b-0046-8000-8000-000000000000': '82194194-5a20-4727-aa98-b10cce060d6a', // Software, apps, games → Szoftverek, alkalmazások, játékok
  '5c5c1777-003c-8000-8000-000000000000': '4c549e30-93dc-4ccd-b24b-4cf521b3a619', // Books, audio, subscription → Könyvek, hanganyagok, előfizetések
  '5c5c1773-003c-8000-8000-000000000000': 'ab67f678-9202-4518-b1e0-ad1f58518eee', // Culture, sport events → Kultúra, sportesemények
  '5c5c1779-003c-8000-8000-000000000000': '97bfb943-b94d-40f2-bc47-88d887200c2a', // Holidays, trips, hotels → Nyaralás, utazások, hotelek
  '5c5c1775-003c-8000-8000-000000000000': '8eaa8479-7cbd-4174-920e-bf535d80d29f', // Hobbies → Hobbi
  '5c5c1388-0032-8000-8000-000000000000': 'ae2cdbe7-99ef-467e-b647-7464c8da9001', // Fuel → Üzemanyag
  '5c5c1389-0032-8000-8000-000000000000': 'd8d9eed8-44e2-4402-bf1f-297ab6b300f3', // Parking → Parkolás
  '5c5c138a-0032-8000-8000-000000000000': 'c854b022-6721-4704-bacc-34bb25d90050', // Vehicle maintenance → Jármű karbantartása
  '5c5c1f46-0032-8000-8000-000000000000': '98cb0cb2-a8f1-45ff-adbc-303c4f6765fb', // Leasing → Lízing
  '5c5c0bb9-001e-8000-8000-000000000000': '8652e0ef-d3c6-4b19-9f2d-2eccabd0a10b', // Mortgage → Jelzáloghitel
  '5c5c0bba-001e-8000-8000-000000000000': '0c652764-bee2-4a88-b6cd-4bc7c1e11963', // Energy & utilities → Energia, közművek
  '5c5c0bbb-001e-8000-8000-000000000000': 'baab1cc6-e082-4d0d-ab3c-b2f08c71221f', // Services → Szolgáltatások
  '5c5c0bc2-001e-8000-8000-000000000000': '67879bd3-779b-4f93-b97b-acbe850d1e68', // Insurance (Housing) → Ingatlanbiztosítás
  '5c5c0bbc-001e-8000-8000-000000000000': 'f1fd2b42-6d87-45d0-b540-32851780e0b9', // Maintenance & repairs → Karbantartás, javítások
  '5c5c1b59-0046-8000-8000-000000000000': '5468cb5a-24aa-47a2-9572-579c6b9bbfda', // Phone, cell phones → Telefon, mobiltelefon
  '5c5c1b5a-0046-8000-8000-000000000000': 'ec7a27f4-b53c-4778-a4ab-6a972df4f402', // Internet → Internet
  '5c5c1f42-0050-8000-8000-000000000000': 'ad608f9e-1175-40a0-a566-72e1e31027c3', // Loan, interests → Kölcsönök, kamatok
  '5c5c1f45-0050-8000-8000-000000000000': '342f364d-5f7d-47e9-86ba-a34de34fb535', // Charges, fees → Díjak, tartozások
  '5c5c2af8-006e-8000-8000-000000000000': '76f3f616-000c-48de-becd-041b4166a39e', // Others → Egyéb
  '5c5c2af9-006e-8000-8000-000000000000': '9dc3957c-579d-41b3-8fc1-f941b8a74565', // Missing (others__missing) → Hiányzó
  '5c5c177c-003c-8000-8000-000000000000': '1b46b9a8-f441-4427-9229-29e6bd2d6f6b', // Lottery, gambling → Lottó, szerencsejáték
}

// Egy Wallet REST kategória (valódi UUID + a REST által adott név) feloldása a belső
// kategóriára: visszaadja a belső UUID-t (egyeztetéshez) és a magyar nevet (megjelenítéshez).
export function resolveWalletCategory(realId: string, fallbackName: string): { internalId: string; name: string } {
  const internalId = WALLET_SYSTEM_UUID_TO_INTERNAL[realId] ?? realId
  const name = WALLET_CATEGORY_MAP.get(internalId)?.name ?? fallbackName
  return { internalId, name }
}

// Régi szöveges alkategória → UUID-k (migráció és compat réteghez)
export const OLD_SUBCATEGORY_TO_IDS: Record<string, string[]> = {
  'Bevásárlás': ['ba1dbb27-cac2-4e9b-b556-391104e383fc', 'ea7668b0-8393-472a-bce1-fbc9664aad6a'],
  'Étterem, gyorsétterem': ['a077f250-e799-4716-a521-baead9cbca02', 'a10361fb-b92b-4afd-95b3-d28721f4915d'],
  'Bár, kávézó': ['a10361fb-b92b-4afd-95b3-d28721f4915d'],
  'Gyerekek': ['4be5aff2-a918-4f67-a0ef-02e227140853'],
  'Otthon, kert': ['78c0d3d4-e550-40bb-9fb0-add6abc59ffc'],
  'Elektronika, tartozékok': ['bd237eb1-3d10-4240-8635-2aa2a281f08a'],
  'Gyógyszertár, drogéria': ['2f9dfb2d-2664-4a5c-90b7-8ca88009fcd8'],
  'Ruházat és cipő': ['f3452432-ae2b-46bb-9457-14a8bddaebff'],
  'Egészségügyi ellátás, orvos': ['69d54220-6a3f-4e4c-bdf8-fbd5cc7e750c'],
  'Egészség, szépség': ['46c38faa-e533-42f7-bdcf-d2a346cd6e86'],
  'Aktiv sport, Fitness': ['d1516469-9028-42a2-9a18-1fc930c4b9cc'],
  'TV, streaming': ['33d3e406-0f79-4c89-af70-bac03b4e6567'],
  'Szoftverek, alkalmazások, játékok': ['82194194-5a20-4727-aa98-b10cce060d6a'],
  'Könyvek, hanganyagok': ['4c549e30-93dc-4ccd-b24b-4cf521b3a619'],
  'Kultúra, sportesemények': ['ab67f678-9202-4518-b1e0-ad1f58518eee'],
  'Nyaralás, utazások, hotelek': ['97bfb943-b94d-40f2-bc47-88d887200c2a'],
  'Hobbi': ['8eaa8479-7cbd-4174-920e-bf535d80d29f'],
  'Üzemanyag': ['ae2cdbe7-99ef-467e-b647-7464c8da9001'],
  'Parkolás': ['d8d9eed8-44e2-4402-bf1f-297ab6b300f3'],
  'Jármű karbantartása': ['c854b022-6721-4704-bacc-34bb25d90050'],
  'Lizing': ['98cb0cb2-a8f1-45ff-adbc-303c4f6765fb'],
  'Jelzáloghitel': ['8652e0ef-d3c6-4b19-9f2d-2eccabd0a10b'],
  'Energia, közművek': ['0c652764-bee2-4a88-b6cd-4bc7c1e11963'],
  'Szolgáltatások': ['baab1cc6-e082-4d0d-ab3c-b2f08c71221f'],
  'Ingatlanbiztosítás': ['67879bd3-779b-4f93-b97b-acbe850d1e68'],
  'Karbantartás, javítások': ['f1fd2b42-6d87-45d0-b540-32851780e0b9'],
  'Telefon, mobiltelefon': ['5468cb5a-24aa-47a2-9572-579c6b9bbfda'],
  'Internet': ['ec7a27f4-b53c-4778-a4ab-6a972df4f402'],
  'Kölcsönök, kamatok': ['ad608f9e-1175-40a0-a566-72e1e31027c3'],
  'Kölcsönök, törlesztőrészletek': ['ad608f9e-1175-40a0-a566-72e1e31027c3'],
  'Díjak': ['342f364d-5f7d-47e9-86ba-a34de34fb535'],
  'Díjak, tartozások': ['342f364d-5f7d-47e9-86ba-a34de34fb535'],
  'Egyebek': ['76f3f616-000c-48de-becd-041b4166a39e'],
  'Egyéb': ['76f3f616-000c-48de-becd-041b4166a39e'],
  'Hiányzó': ['9dc3957c-579d-41b3-8fc1-f941b8a74565'],
}

// Régi { mainCategory, subCategories } tömböt UUID-tömbbé alakít
export function convertOldWalletCategoriesToIds(
  oldCategories: Array<{ mainCategory: string; subCategories: string[] }>
): string[] {
  const ids: string[] = []
  for (const wc of oldCategories) {
    for (const sub of wc.subCategories) {
      const mapped = OLD_SUBCATEGORY_TO_IDS[sub]
      if (mapped) ids.push(...mapped)
    }
    // Ha nincs alkategória, próbáljuk a főkategóriát is
    if (wc.subCategories.length === 0) {
      const mapped = OLD_SUBCATEGORY_TO_IDS[wc.mainCategory]
      if (mapped) ids.push(...mapped)
    }
  }
  return [...new Set(ids)]
}
