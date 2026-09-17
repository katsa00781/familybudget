'use client'

import { useId, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, ChartNoAxesCombined, Check, ChevronDown } from 'lucide-react'
import { Button } from '@/src/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select'

export interface KategoriaTervTenySor {
  kategoria: string
  terv: number
  teny: number
  reszletek: { nev: string; osszeg: number }[]
}

type Szuro = 'osszes' | 'tulkoltes' | 'kereten-belul'
type Rendezes = 'elteres' | 'koltes' | 'nev'

const forint = (osszeg: number) => `${osszeg.toLocaleString('hu-HU', { maximumFractionDigits: 0 })} Ft`
const szazalek = (ertek: number) => `${ertek.toLocaleString('hu-HU', { maximumFractionDigits: 1 })}%`

function KategoriaSor({ sor }: { sor: KategoriaTervTenySor }) {
  const [nyitva, setNyitva] = useState(false)
  const azonosito = useId()
  const elteres = sor.teny - sor.terv
  const tulkoltes = elteres > 0
  const vanKeret = sor.terv > 0
  const kihasznaltsag = vanKeret ? (sor.teny / sor.terv) * 100 : null
  const tenySavSzelesseg = kihasznaltsag !== null
    ? Math.min(100, Math.max(0, kihasznaltsag))
    : sor.teny > 0 ? 100 : 0
  const keretKozeleben = kihasznaltsag !== null && kihasznaltsag >= 80 && elteres < 0
  const allapot = !vanKeret
    ? 'Nincs tervezett keret'
    : tulkoltes
      ? 'Túlköltés'
      : elteres === 0
        ? 'Keret elérve'
        : keretKozeleben
          ? 'Keret közelében'
          : 'Kereten belül'
  const allapotSzin = tulkoltes
    ? 'bg-rose-50 text-rose-700 ring-rose-200'
    : keretKozeleben
      ? 'bg-amber-50 text-amber-800 ring-amber-200'
      : vanKeret && elteres < 0
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
        : 'bg-slate-100 text-slate-600 ring-slate-200'
  const savSzin = tulkoltes ? 'bg-rose-500' : keretKozeleben ? 'bg-amber-500' : 'bg-teal-500'
  const ElteresIkon = tulkoltes ? ArrowUpRight : elteres < 0 ? ArrowDownRight : Check

  return (
    <article className={`overflow-hidden rounded-2xl border bg-white transition-colors ${tulkoltes ? 'border-rose-200' : 'border-slate-200'}`}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)_minmax(0,1fr)_5rem] @3xl:gap-6 @3xl:px-5">
        <div className="col-span-2 min-w-0 @3xl:col-span-1">
          <h4 className="break-words font-semibold text-slate-900">{sor.kategoria}</h4>
          <span className={`mt-2 inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${allapotSzin}`}>
            {tulkoltes ? <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
            {allapot}
          </span>
          <p className="mt-2 text-xs text-slate-500">
            {kihasznaltsag !== null ? (
              <><span className="font-semibold tabular-nums text-slate-700">{szazalek(kihasznaltsag)}</span> keretkihasználtság</>
            ) : sor.teny > 0 ? 'Tervezés nélküli kiadás' : 'Még nincs költés'}
          </p>
        </div>

        <dl className="col-span-2 min-w-0 space-y-3 @3xl:col-span-1">
          {[
            { nev: 'Terv', osszeg: sor.terv, szin: 'bg-slate-300', szelesseg: vanKeret ? 100 : 0 },
            { nev: 'Tény', osszeg: sor.teny, szin: savSzin, szelesseg: tenySavSzelesseg },
          ].map((tetel) => (
            <div key={tetel.nev}>
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
                <dt className="text-slate-500">{tetel.nev}</dt>
                <dd className={`tabular-nums ${tetel.nev === 'Tény' ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                  {forint(tetel.osszeg)}
                </dd>
              </div>
              <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${tetel.szin}`}
                  style={{ width: `${tetel.szelesseg}%` }}
                />
              </div>
            </div>
          ))}
        </dl>

        <div className="col-span-2 flex flex-wrap items-center justify-between gap-3 @3xl:contents">
          <div className="min-w-0 @3xl:text-right">
            <p className="mb-1 text-xs text-slate-500 @3xl:hidden">Eltérés</p>
            <p className={`flex flex-wrap items-center gap-1 text-base font-semibold tabular-nums @3xl:justify-end ${tulkoltes ? 'text-rose-700' : elteres < 0 ? 'text-emerald-700' : 'text-slate-600'}`}>
              <ElteresIkon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{elteres > 0 ? '+' : elteres < 0 ? '−' : ''}{forint(Math.abs(elteres))}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {tulkoltes ? 'kereten felül' : elteres < 0 ? 'még elkölthető' : vanKeret ? 'pontosan a terv szerint' : 'nincs eltérés'}
            </p>
          </div>

          <div className="ml-auto text-right @3xl:ml-0">
            {sor.reszletek.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                className="h-11 gap-1.5 rounded-xl px-3 text-slate-600 hover:bg-slate-100"
                aria-expanded={nyitva}
                aria-controls={`${azonosito}-reszletek`}
                aria-label={`${sor.kategoria} részletei (${sor.reszletek.length} Wallet-kategória)`}
                onClick={() => setNyitva(!nyitva)}
              >
                <span className="@3xl:hidden">Részletek</span>
                <span className="tabular-nums">{sor.reszletek.length}</span>
                <ChevronDown className={`h-4 w-4 motion-safe:transition-transform ${nyitva ? 'rotate-180' : ''}`} aria-hidden="true" />
              </Button>
            ) : (
              <span className="text-xs text-slate-400">Nincs tétel</span>
            )}
          </div>
        </div>
      </div>

      {sor.reszletek.length > 0 && (
        <div id={`${azonosito}-reszletek`} hidden={!nyitva} className="border-t border-slate-100 bg-slate-50/80 p-4 @3xl:px-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h5 className="text-sm font-semibold text-slate-700">Wallet-kategóriák bontása</h5>
            <p className="text-xs text-slate-500">Részesedés a kategória tényleges költéséből</p>
          </div>
          <ul className="grid gap-x-8 gap-y-4 @xl:grid-cols-2">
            {sor.reszletek.map((tetel) => {
              const reszesedes = sor.teny > 0 ? (tetel.osszeg / sor.teny) * 100 : 0
              return (
                <li key={tetel.nev} className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
                    <span className="break-words text-slate-600">{tetel.nev}</span>
                    <span className="font-medium tabular-nums text-slate-800">
                      {forint(tetel.osszeg)} <span className="ml-1 text-xs font-normal text-slate-500">{szazalek(reszesedes)}</span>
                    </span>
                  </div>
                  <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-slate-200/70">
                    <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.min(100, Math.max(0, reszesedes))}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </article>
  )
}

export function KategoriaOsszehasonlitas({ sorok }: { sorok: KategoriaTervTenySor[] }) {
  const [szuro, setSzuro] = useState<Szuro>('osszes')
  const [rendezes, setRendezes] = useState<Rendezes>('elteres')
  const azonosito = useId()
  const tulkoltottDarab = sorok.filter((sor) => sor.teny > sor.terv).length
  const lathatoSorok = sorok
    .filter((sor) => szuro === 'osszes' || (szuro === 'tulkoltes' ? sor.teny > sor.terv : sor.teny <= sor.terv))
    .sort((elso, masodik) => {
      const kulonbseg = rendezes === 'elteres'
        ? (masodik.teny - masodik.terv) - (elso.teny - elso.terv)
        : rendezes === 'koltes'
          ? masodik.teny - elso.teny
          : 0
      return kulonbseg || elso.kategoria.localeCompare(masodik.kategoria, 'hu')
    })
  const szurok: { ertek: Szuro; cimke: string; darab: number }[] = [
    { ertek: 'osszes', cimke: 'Összes', darab: sorok.length },
    { ertek: 'tulkoltes', cimke: 'Túlköltés', darab: tulkoltottDarab },
    { ertek: 'kereten-belul', cimke: 'Kereten belül', darab: sorok.length - tulkoltottDarab },
  ]

  return (
    <section aria-labelledby={`${azonosito}-cim`} className="@container overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/70">
      <div className="space-y-5 border-b border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <ChartNoAxesCombined className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 id={`${azonosito}-cim`} className="font-semibold text-slate-900">Kategóriánkénti összehasonlítás</h3>
              <p className="mt-1 text-sm text-slate-500">Tervezett keret, tényleges költés és a különbség egy helyen.</p>
            </div>
          </div>
          {tulkoltottDarab > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              {tulkoltottDarab} kategóriában túlköltés
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Kategóriák szűrése" className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
            {szurok.map((elem) => (
              <Button
                key={elem.ertek}
                type="button"
                variant="ghost"
                aria-pressed={szuro === elem.ertek}
                onClick={() => setSzuro(elem.ertek)}
                className={`h-10 gap-2 rounded-lg px-3 text-xs ${szuro === elem.ertek ? 'bg-white text-slate-900 shadow-sm hover:bg-white' : 'text-slate-500 hover:bg-white/60'}`}
              >
                {elem.cimke}
                <span className={`rounded-md px-1.5 py-0.5 tabular-nums ${elem.ertek === 'tulkoltes' && elem.darab > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-200/60 text-slate-600'}`}>
                  {elem.darab}
                </span>
              </Button>
            ))}
          </div>
          <Select value={rendezes} onValueChange={(ertek: Rendezes) => setRendezes(ertek)}>
            <SelectTrigger aria-label="Kategóriák rendezése" className="w-full rounded-xl border-slate-200 bg-white text-xs sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="elteres">Túlköltés elöl</SelectItem>
              <SelectItem value="koltes">Legnagyobb költés</SelectItem>
              <SelectItem value="nev">Kategórianév szerint</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-1 text-xs text-slate-500">
          <div className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Jelmagyarázat">
            <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-slate-300" aria-hidden="true" />Terv</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-teal-500" aria-hidden="true" />Tény</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-amber-500" aria-hidden="true" />Keret közelében (80–100%)</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-rose-500" aria-hidden="true" />Túlköltés</span>
          </div>
          <span>100% = a kategória saját kerete</span>
        </div>

        <div aria-hidden="true" className="mb-2 hidden grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)_minmax(0,1fr)_5rem] gap-6 px-5 text-xs font-medium text-slate-500 @3xl:grid">
          <span>Kategória</span>
          <span>Terv és tény</span>
          <span className="text-right">Eltérés</span>
          <span className="text-right">Részletek</span>
        </div>

        <p role="status" className="sr-only">{lathatoSorok.length} kategória megjelenítve.</p>
        <div className="space-y-3">
          {lathatoSorok.map((sor) => <KategoriaSor key={sor.kategoria} sor={sor} />)}
        </div>

        {lathatoSorok.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center">
            <Check className="mx-auto mb-3 h-6 w-6 text-teal-600" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-700">
              {sorok.length === 0 ? 'Nincs megjeleníthető kategória.' : szuro === 'tulkoltes' ? 'Egyik kategóriában sincs túlköltés.' : 'Nincs a szűrésnek megfelelő kategória.'}
            </p>
            {sorok.length > 0 && <Button type="button" variant="link" className="mt-2 text-teal-700" onClick={() => setSzuro('osszes')}>Összes kategória mutatása</Button>}
          </div>
        )}

        <p className="mt-4 px-1 text-xs leading-relaxed text-slate-500">
          Az eltérés a tény és a terv különbsége. A pozitív érték túlköltést, a negatív megmaradt keretet jelez.
        </p>
      </div>
    </section>
  )
}
