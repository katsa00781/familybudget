// Egyenleg Flow — napi bankszámla-egyenleg előrejelző típusai.
// Az adatok az `egyenleg_flow` táblában JSONB-ben tárolódnak (accounts, events),
// a napi előrejelzést a lib/egyenlegFlow.ts számolja.

export type FlowAccountType =
  | 'foszamla'
  | 'hitelkartya'
  | 'megtakaritas'
  | 'keszpenz'
  | 'egyeb'

export const FLOW_ACCOUNT_TYPE_LABELS: Record<FlowAccountType, string> = {
  foszamla: 'Főszámla',
  hitelkartya: 'Hitelkártya',
  megtakaritas: 'Megtakarítás',
  keszpenz: 'Készpénz',
  egyeb: 'Egyéb',
}

// Egy követett számla a flow-tervben.
export interface FlowAccount {
  id: string
  name: string
  type: FlowAccountType
  walletAccountId?: string // a Wallet számla UUID-ja — élő egyenleg-szinkronhoz
  openingBalance: number // induló (mai) egyenleg; hitelkártyánál a tartozás (pozitív)
  openingDate: string // YYYY-MM-DD — melyik naptól érvényes az openingBalance
  creditLimit?: number // csak hitelkártyánál: hitelkeret
  dueDay?: number // csak hitelkártyánál: a havi befizetési határidő napja (1-31)
  color?: string // megjelenítéshez (hex)
  track: boolean // szerepeljen-e a napi előrejelzésben
}

export type FlowEventType = 'bevetel' | 'kiadas' | 'atvezetes'

export type FlowRecurrence = 'egyszeri' | 'napi' | 'heti' | 'havi'

export const FLOW_RECURRENCE_LABELS: Record<FlowRecurrence, string> = {
  egyszeri: 'Egyszeri',
  napi: 'Napi (gördülő)',
  heti: 'Heti',
  havi: 'Havi',
}

// Egy tervezett tétel (bevétel / kiadás / számlák közti átvezetés).
export interface FlowEvent {
  id: string
  name: string
  amount: number // mindig pozitív; az irányt a type adja
  type: FlowEventType
  accountId: string // bevétel: hova; kiadás/átvezetés: honnan
  toAccountId?: string // átvezetésnél a cél számla
  date: string // YYYY-MM-DD — az első előfordulás napja
  recurrence: FlowRecurrence
  endDate?: string // ismétlődő tétel utolsó napja (opcionális)
  category?: string
  note?: string
}

// A teljes flow-terv (egy DB sor megfelelője).
export interface FlowPlan {
  id?: string
  name: string
  horizonDays: number
  accounts: FlowAccount[]
  events: FlowEvent[]
}

// Egy konkrét, dátumozott esemény-előfordulás (az ismétlődések kibontása után).
export interface FlowOccurrence {
  date: string // YYYY-MM-DD
  event: FlowEvent
}

// Egy számla záró egyenlege egy adott napon.
export interface DayAccountBalance {
  accountId: string
  balance: number // záró egyenleg aznap végén (hitelkártyánál a tartozás)
  overLimit: boolean // hitelkártya: a tartozás meghaladja a keretet
}

// Egy nap az előrejelzési idővonalon.
export interface DayRow {
  date: string // YYYY-MM-DD
  occurrences: FlowOccurrence[] // aznapi események
  balances: DayAccountBalance[] // számlánkénti záró egyenleg
  foszamlaNegativ: boolean // valamelyik főszámla mínuszba ment
  hitelkartyaDue: boolean // aznap esedékes egy hitelkártya befizetési határidő
  netChange: number // aznapi nettó pénzmozgás (külső be- és kiáramlás, átvezetés nélkül)
}
