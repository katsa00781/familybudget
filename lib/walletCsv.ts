// Wallet (budgetbakers.com) CSV export feldolgozása — közös a statisztika és az
// éves cashflow oldal között.

export interface WalletRecord {
  account: string
  category: string
  currency: string
  amount: number
  type: string
  note: string
  date: string
  transfer: boolean
  payment_type?: string
  labels?: string
  payee?: string
}

export const parseWalletCsv = (content: string): WalletRecord[] => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) return []

  const headers = lines[0].split(';').map((header) => header.trim())
  const records: WalletRecord[] = []

  for (const line of lines.slice(1)) {
    const values = line.split(';')
    if (values.length < headers.length) continue

    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() ?? ''
    })

    const amount = Number(row.amount?.replace(',', '.') ?? NaN)
    if (!row.date || Number.isNaN(amount)) continue

    records.push({
      account: row.account || '',
      category: row.category || 'Ismeretlen',
      currency: row.currency || 'HUF',
      amount,
      type: row.type || 'Kiadás',
      note: row.note || '',
      date: row.date,
      transfer: (row.transfer || '').toLowerCase() === 'true',
      payment_type: row.payment_type,
      labels: row.labels,
      payee: row.payee
    })
  }

  return records
}

// Havi tényadatok egy adott évre — bevétel és (pozitív előjelű) kiadás összesítve.
export interface MonthlyActuals {
  month: number // 1-12
  income: number
  expense: number
  hasData: boolean // van-e egyáltalán (nem-transzfer) tranzakció a hónapban
}

export const aggregateWalletByMonth = (records: WalletRecord[], year: number): MonthlyActuals[] => {
  const result: MonthlyActuals[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income: 0,
    expense: 0,
    hasData: false
  }))

  records.forEach((record) => {
    if (record.transfer) return
    if (!Number.isFinite(record.amount)) return
    if (!record.date.startsWith(`${year}-`)) return

    const month = parseInt(record.date.slice(5, 7))
    if (!(month >= 1 && month <= 12)) return

    const entry = result[month - 1]
    if (record.type === 'Bevétel') {
      entry.income += record.amount
      entry.hasData = true
    } else if (record.type === 'Kiadás') {
      entry.expense += Math.abs(record.amount)
      entry.hasData = true
    }
  })

  return result
}
