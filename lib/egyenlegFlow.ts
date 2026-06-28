// Egyenleg Flow — napi bankszámla-egyenleg előrejelző motor.
// Tiszta (UI-független) függvények: az ismétlődő tételek kibontása konkrét napokra,
// majd a számlánkénti egyenleg göngyölítése napról napra az induló egyenlegből.
//
// Hitelkártya-szemantika: a hitelkártya `openingBalance`/egyenleg a TARTOZÁST jelenti
// (pozitív = ennyivel tartozol). Ezért egy számlára beáramló pénz (applyDelta +) a
// hitelkártyánál CSÖKKENTI a tartozást, a kiáramlás (–) pedig NÖVELI. Lásd applyDelta.

import type {
  FlowAccount,
  FlowEvent,
  FlowOccurrence,
  DayRow,
  DayAccountBalance,
} from '@/types/egyenleg-flow'

// ── Dátum-segédfüggvények (UTC, hogy ne csússzon a nap a időzónától) ──────────

export function parseDate(iso: string): Date {
  // "YYYY-MM-DD" → UTC éjfél
  const [y, m, d] = iso.slice(0, 10).split('-').map((s) => parseInt(s, 10))
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1))
}

export function toIso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number): string {
  const d = parseDate(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return toIso(d)
}

// Hónap hozzáadása a kezdő nap megőrzésével (a hónap hosszára csonkolva — pl. 31. → 28/30.)
export function addMonths(iso: string, months: number): string {
  const d = parseDate(iso)
  const day = d.getUTCDate()
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return toIso(target)
}

export function dayOfMonth(iso: string): number {
  return parseDate(iso).getUTCDate()
}

// "YYYY. hónap NN." magyar dátum
const MONTHS_HU_SHORT = [
  'jan.', 'feb.', 'márc.', 'ápr.', 'máj.', 'jún.',
  'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.',
]
const WEEKDAYS_HU = ['vas.', 'hét.', 'kedd', 'sze.', 'csüt.', 'pén.', 'szo.']

export function formatFlowDate(iso: string): string {
  const d = parseDate(iso)
  return `${MONTHS_HU_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}. (${WEEKDAYS_HU[d.getUTCDay()]})`
}

// ── 1. Ismétlődő tételek kibontása konkrét, dátumozott előfordulásokra ─────────

export function expandEvents(
  events: FlowEvent[],
  startDate: string,
  horizonDays: number,
): FlowOccurrence[] {
  const horizonEnd = addDays(startDate, horizonDays - 1)
  const occurrences: FlowOccurrence[] = []
  // védőkorlát a végtelen ciklus ellen
  const MAX_STEPS = 1000

  for (const event of events) {
    if (!event.amount || event.amount <= 0) continue
    const recurrenceEnd = event.endDate && event.endDate < horizonEnd ? event.endDate : horizonEnd

    let cursor = event.date
    let steps = 0
    while (cursor <= recurrenceEnd && steps < MAX_STEPS) {
      if (cursor >= startDate) {
        occurrences.push({ date: cursor, event })
      }
      if (event.recurrence === 'egyszeri') break
      if (event.recurrence === 'napi') cursor = addDays(cursor, 1)
      else if (event.recurrence === 'heti') cursor = addDays(cursor, 7)
      else if (event.recurrence === 'havi') cursor = addMonths(cursor, 1)
      else break
      steps++
    }
  }

  occurrences.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  return occurrences
}

// ── 2. Napi egyenleg-göngyölítés ──────────────────────────────────────────────

// Egy számlára beáramló (delta>0) vagy kiáramló (delta<0) pénz hatása az egyenlegre.
// Normál számlánál: egyenleg += delta. Hitelkártyánál (egyenleg = tartozás): a beáramlás
// csökkenti a tartozást, ezért egyenleg -= delta.
function applyDelta(
  running: Map<string, number>,
  account: FlowAccount | undefined,
  accountId: string,
  delta: number,
) {
  const prev = running.get(accountId) ?? 0
  if (account?.type === 'hitelkartya') {
    running.set(accountId, prev - delta)
  } else {
    running.set(accountId, prev + delta)
  }
}

export function computeDailyBalances(
  accounts: FlowAccount[],
  occurrences: FlowOccurrence[],
  startDate: string,
  horizonDays: number,
): DayRow[] {
  const tracked = accounts.filter((a) => a.track)
  const accountById = new Map(accounts.map((a) => [a.id, a]))

  // Induló egyenlegek
  const running = new Map<string, number>()
  for (const a of accounts) running.set(a.id, a.openingBalance || 0)

  // Előfordulások napra csoportosítva
  const byDay = new Map<string, FlowOccurrence[]>()
  for (const occ of occurrences) {
    const list = byDay.get(occ.date) ?? []
    list.push(occ)
    byDay.set(occ.date, list)
  }

  const rows: DayRow[] = []

  for (let i = 0; i < horizonDays; i++) {
    const date = addDays(startDate, i)
    const dayOccurrences = byDay.get(date) ?? []
    let netChange = 0

    for (const { event } of dayOccurrences) {
      if (event.type === 'bevetel') {
        applyDelta(running, accountById.get(event.accountId), event.accountId, event.amount)
        netChange += event.amount
      } else if (event.type === 'kiadas') {
        applyDelta(running, accountById.get(event.accountId), event.accountId, -event.amount)
        netChange -= event.amount
      } else if (event.type === 'atvezetes') {
        applyDelta(running, accountById.get(event.accountId), event.accountId, -event.amount)
        if (event.toAccountId) {
          applyDelta(running, accountById.get(event.toAccountId), event.toAccountId, event.amount)
        }
        // átvezetés: belső mozgás, a nettó pénzmozgásba nem számít
      }
    }

    const balances: DayAccountBalance[] = tracked.map((a) => {
      const balance = running.get(a.id) ?? 0
      const overLimit =
        a.type === 'hitelkartya' && a.creditLimit != null && balance > a.creditLimit
      return { accountId: a.id, balance, overLimit }
    })

    const foszamlaNegativ = tracked.some(
      (a) => a.type === 'foszamla' && (running.get(a.id) ?? 0) < 0,
    )
    const hitelkartyaDue = tracked.some(
      (a) => a.type === 'hitelkartya' && a.dueDay === dayOfMonth(date),
    )

    rows.push({
      date,
      occurrences: dayOccurrences,
      balances,
      foszamlaNegativ,
      hitelkartyaDue,
      netChange,
    })
  }

  return rows
}

// ── Kényelmi összegző: a teljes előrejelzés egy lépésben ──────────────────────

export function buildForecast(
  accounts: FlowAccount[],
  events: FlowEvent[],
  startDate: string,
  horizonDays: number,
): DayRow[] {
  const occurrences = expandEvents(events, startDate, horizonDays)
  return computeDailyBalances(accounts, occurrences, startDate, horizonDays)
}
