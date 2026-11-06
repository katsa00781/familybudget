'use client'

import { useMemo } from 'react'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartColumnBig, PieChart as PieChartIcon } from 'lucide-react'
import { MegoszlasTorta, type MegoszlasTetel } from '@/src/components/grafikon/megoszlas-torta'

interface GrafikonSor {
  kategoria: string
  terv: number
  teny: number
}

const TERV_SZIN = '#94a3b8'
const TENY_SZIN = '#0d9488'
const TULKOLTES_SZIN = '#e11d48'
const NEM_PAROSITOTT_SZIN = '#d97706'

const forint = (osszeg: number) => `${osszeg.toLocaleString('hu-HU', { maximumFractionDigits: 0 })} Ft`
const tomor = new Intl.NumberFormat('hu-HU', { notation: 'compact', maximumFractionDigits: 1 })

function TervTenyTooltip({ active, payload }: { active?: boolean; payload?: { payload: GrafikonSor }[] }) {
  if (!active || !payload?.length) return null
  const sor = payload[0].payload
  const elteres = sor.teny - sor.terv
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-semibold text-gray-900">{sor.kategoria}</p>
      <p className="flex justify-between gap-6 text-gray-600">Terv <span className="tabular-nums text-gray-900">{forint(sor.terv)}</span></p>
      <p className="flex justify-between gap-6 text-gray-600">Tény <span className="tabular-nums font-semibold text-gray-900">{forint(sor.teny)}</span></p>
      <p className="mt-1 flex justify-between gap-6 border-t border-gray-100 pt-1 text-gray-600">
        {elteres > 0 ? 'Túlköltés' : 'Megmaradt'}
        <span className={`tabular-nums font-semibold ${elteres > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{forint(Math.abs(elteres))}</span>
      </p>
    </div>
  )
}

/**
 * A Terv vs. Tény összesítő grafikonjai: kategóriánkénti terv–tény sávdiagram és a
 * tényleges költés megoszlása (a tervhez nem párosított Wallet-költéssel együtt).
 */
export function TervTenyGrafikon({ sorok, nemParositott }: { sorok: GrafikonSor[]; nemParositott: number }) {
  const savok = useMemo(
    () => sorok
      .filter(s => s.terv > 0 || s.teny > 0)
      .sort((a, b) => Math.max(b.terv, b.teny) - Math.max(a.terv, a.teny)),
    [sorok]
  )

  const tortaTetelek = useMemo<MegoszlasTetel[]>(() => [
    ...sorok.map(s => ({ nev: s.kategoria, osszeg: s.teny })),
    { nev: 'Nem párosított', osszeg: nemParositott, szin: NEM_PAROSITOTT_SZIN },
  ], [sorok, nemParositott])

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <ChartColumnBig className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-semibold text-slate-900">Terv és tény kategóriánként</h3>
              <p className="mt-1 text-sm text-slate-500">A legnagyobb tételek felül.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500" aria-label="Jelmagyarázat">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: TERV_SZIN }} />Terv</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: TENY_SZIN }} />Tény</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: TULKOLTES_SZIN }} />Tény (túlköltés)</span>
          </div>
        </div>

        {savok.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Nincs megjeleníthető kategória.</p>
        ) : (
          <div style={{ height: Math.max(200, savok.length * 44 + 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={savok} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }} barGap={2} barCategoryGap="22%">
                <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  tickFormatter={(ertek: number) => tomor.format(ertek)}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="kategoria"
                  width={112}
                  tick={{ fontSize: 12, fill: '#334155' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<TervTenyTooltip />} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="terv" name="Terv" fill={TERV_SZIN} radius={[0, 4, 4, 0]} maxBarSize={14} isAnimationActive={false} />
                <Bar dataKey="teny" name="Tény" radius={[0, 4, 4, 0]} maxBarSize={14} isAnimationActive={false}>
                  {savok.map(s => (
                    <Cell key={s.kategoria} fill={s.teny > s.terv ? TULKOLTES_SZIN : TENY_SZIN} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
            <PieChartIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-semibold text-slate-900">Tényleges költés megoszlása</h3>
            <p className="mt-1 text-sm text-slate-500">A Wallet-költés tervkategóriánként; a tervhez nem rendelt rész külön.</p>
          </div>
        </div>
        <MegoszlasTorta
          tetelek={tortaTetelek}
          tobbiCimke="Többi kategória"
          uresSzoveg="Ebben a hónapban még nincs kiadás."
        />
      </section>
    </div>
  )
}
