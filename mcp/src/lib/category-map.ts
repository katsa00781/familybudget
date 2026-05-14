// Pontos másolat az app/statisztika/page.tsx CATEGORY_ALIAS_MAP és FALLBACK_CATEGORY_MAP alapján

export const CATEGORY_ALIAS_MAP: Record<string, string> = {
  'Élelmiszerek': 'Bevásárlás',
  'Drogéria': 'Gyógyszertár, drogéria',
  'Egészség, szépség': 'Egészségügyi ellátás, orvos',
  'Ajándékok, örömök': 'Ajándékok, örömök',
  'Ruházat és lábbelik': 'Ruházat és cipő',
  'Jármű karbantartás': 'Jármű karbantartása',
  'Jótékonyság, ajándékok': 'Jótékonyság, ajándékok',
  'Bár, kávézó': 'Bár, kávézó'
}

export const FALLBACK_CATEGORY_MAP: Record<string, string> = {
  'Ajándékok, örömök': 'Szórakozás',
  'Bár, kávézó': 'Szórakozás',
  'Jótékonyság, ajándékok': 'Mama',
  'Kultúra, sportesemények': 'Szórakozás',
  'Nyaralás, kirándulások, szállodák': 'Szórakozás',
  'Jelzáloghitel': 'Hitel',
  'Kölcsönök, törlesztőrészletek': 'Hitel',
  'Díjak': 'Hitel',
  'Internet': 'Rezsi',
  'Szolgáltatások': 'Rezsi',
  'Ruházat és lábbelik': 'Háztartás',
  'Egyéb': 'Egyéb',
  'Járműbiztosítás': 'Autó'
}
