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
]

// Wallet kategória neve → UUID (CSV alapú egyeztetéshez)
export const WALLET_CATEGORY_NAME_TO_ID = new Map(WALLET_CATEGORIES.map(c => [c.name, c.id]))

export const WALLET_CATEGORY_MAP = new Map(WALLET_CATEGORIES.map(c => [c.id, c]))
