'use client'

import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { PieChart as PieChartIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Button } from '@/src/components/ui/button'

// A torta csak a megjelenítéshez szükséges mezőket várja
interface TortaTetel {
  type: string
  amount: number
}

interface TortaKategoria {
  name: string
  items: TortaTetel[]
}

interface Szelet {
  nev: string
  osszeg: number
  szin: string
}

type Nezet = 'kategoria' | 'tipus'

// Rögzített sorrendű kategória-paletta (színvak-barát, egymás melletti párokra validált)
const KATEGORIA_SZINEK = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6']
const TOBBI_SZIN = '#9ca3af'
// Ennél több kategória a „Többi kategória” szeletbe olvad (különben a színek összemosódnak)
const MAX_KATEGORIA = KATEGORIA_SZINEK.length

// A típus-nézet színei megegyeznek az összesítő kártyákéval
const TIPUS_SZINEK: Record<string, string> = {
  Szükséglet: '#e11d48',
  Vágyak: '#4f46e5',
  Megtakarítás: '#0d9488',
}

const formatCurrency = (osszeg: number) =>
  new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(osszeg)

const formatSzazalek = (resz: number, egesz: number) =>
  egesz > 0 ? `${((resz / egesz) * 100).toLocaleString('hu-HU', { maximumFractionDigits: 1 })}%` : '0%'

export function KoltsegvetesTorta({ kategoriak }: { kategoriak: TortaKategoria[] }) {
  const [nezet, setNezet] = useState<Nezet>('kategoria')

  const kategoriaSzeletek = useMemo<Szelet[]>(() => {
    const osszegek = kategoriak
      .map(k => ({ nev: k.name, osszeg: k.items.reduce((s, i) => s + (i.amount || 0), 0) }))
      .filter(k => k.osszeg > 0)

    // A legnagyobb kategóriák maradnak meg külön szeletként, de az eredeti (oldalbeli) sorrendben,
    // így egy kategória színe nem ugrál, amikor egy összeg módosul.
    const megtartott = new Set(
      [...osszegek].sort((a, b) => b.osszeg - a.osszeg).slice(0, MAX_KATEGORIA).map(k => k.nev)
    )
    const szeletek: Szelet[] = osszegek
      .filter(k => megtartott.has(k.nev))
      .map((k, idx) => ({ ...k, szin: KATEGORIA_SZINEK[idx] }))

    const tobbi = osszegek.filter(k => !megtartott.has(k.nev)).reduce((s, k) => s + k.osszeg, 0)
    if (tobbi > 0) szeletek.push({ nev: 'Többi kategória', osszeg: tobbi, szin: TOBBI_SZIN })
    return szeletek
  }, [kategoriak])

  const tipusSzeletek = useMemo<Szelet[]>(() => {
    const tetelek = kategoriak.flatMap(k => k.items)
    const szeletek: Szelet[] = Object.entries(TIPUS_SZINEK).map(([tipus, szin]) => ({
      nev: tipus,
      osszeg: tetelek.filter(t => t.type === tipus).reduce((s, t) => s + (t.amount || 0), 0),
      szin,
    }))
    const besorolatlan = tetelek.filter(t => !(t.type in TIPUS_SZINEK)).reduce((s, t) => s + (t.amount || 0), 0)
    szeletek.push({ nev: 'Besorolatlan', osszeg: besorolatlan, szin: TOBBI_SZIN })
    return szeletek.filter(s => s.osszeg > 0)
  }, [kategoriak])

  const szeletek = nezet === 'kategoria' ? kategoriaSzeletek : tipusSzeletek
  const osszesen = szeletek.reduce((s, sz) => s + sz.osszeg, 0)

  return (
    <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl mb-6 sm:mb-8">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl">
                <PieChartIcon size={16} className="text-white sm:w-5 sm:h-5" />
              </div>
              Költségvetés megoszlása
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 leading-relaxed mt-1.5">
              A tervezett tételek összege {nezet === 'kategoria' ? 'kategóriánként' : 'típusonként'}
            </CardDescription>
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg self-start">
            <Button
              size="sm"
              variant={nezet === 'kategoria' ? 'default' : 'ghost'}
              className="h-8"
              onClick={() => setNezet('kategoria')}
            >
              Kategória
            </Button>
            <Button
              size="sm"
              variant={nezet === 'tipus' ? 'default' : 'ghost'}
              className="h-8"
              onClick={() => setNezet('tipus')}
            >
              Típus
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {szeletek.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            Még nincs összeggel kitöltött tétel — add meg az összegeket a lenti kategóriákban.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="relative h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={szeletek}
                    dataKey="osszeg"
                    nameKey="nev"
                    cx="50%"
                    cy="50%"
                    outerRadius="90%"
                    stroke="#ffffff"
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {szeletek.map(sz => (
                      <Cell key={sz.nev} fill={sz.szin} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(ertek, nev) => [
                      `${formatCurrency(Number(ertek))} (${formatSzazalek(Number(ertek), osszesen)})`,
                      nev,
                    ]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '13px',
                    }}
                    itemStyle={{ color: '#111827' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Jelmagyarázat összeggel és arányszámmal (táblázatos nézetként is szolgál) */}
            <ul className="space-y-2">
              {szeletek.map(sz => (
                <li key={sz.nev} className="flex items-center gap-3 text-sm">
                  <span className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: sz.szin }} />
                  <span className="flex-1 truncate text-gray-700 font-medium">{sz.nev}</span>
                  <span className="tabular-nums text-gray-900 font-semibold">{formatCurrency(sz.osszeg)}</span>
                  <span className="tabular-nums text-gray-500 w-14 text-right">{formatSzazalek(sz.osszeg, osszesen)}</span>
                </li>
              ))}
              <li className="flex items-center gap-3 text-sm border-t border-gray-200 pt-2 mt-2">
                <span className="h-3 w-3 shrink-0" />
                <span className="flex-1 text-gray-900 font-semibold">Összesen</span>
                <span className="tabular-nums text-gray-900 font-bold">{formatCurrency(osszesen)}</span>
                <span className="w-14" />
              </li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
