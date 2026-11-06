'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

export interface MegoszlasTetel {
  nev: string
  osszeg: number
  /** Rögzített szín (pl. típusok, „Nem párosított”). Ha hiányzik, a palettából kap színt. */
  szin?: string
}

// Rögzített sorrendű kategória-paletta (színvak-barát, egymás melletti párokra validált)
export const KATEGORIA_SZINEK = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6']
export const SEMLEGES_SZIN = '#9ca3af'

const forint = (osszeg: number) =>
  new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(osszeg)

const szazalek = (resz: number, egesz: number) =>
  egesz > 0 ? `${((resz / egesz) * 100).toLocaleString('hu-HU', { maximumFractionDigits: 1 })}%` : '0%'

/**
 * Tortadiagram jelmagyarázattal (összeg + arány). A szín nélküli tételekből a legnagyobb
 * `KATEGORIA_SZINEK.length` darab kap saját szeletet — az eredeti sorrendben, hogy a színek ne
 * ugráljanak egy összeg módosításakor —, a többi a `tobbiCimke` szeletbe olvad.
 */
export function MegoszlasTorta({
  tetelek,
  tobbiCimke = 'Többi',
  uresSzoveg = 'Nincs megjeleníthető adat.',
}: {
  tetelek: MegoszlasTetel[]
  tobbiCimke?: string
  uresSzoveg?: string
}) {
  const szeletek = useMemo(() => {
    const pozitiv = tetelek.filter(t => t.osszeg > 0)
    const szinezendo = pozitiv.filter(t => !t.szin)
    const megtartott = new Set(
      [...szinezendo].sort((a, b) => b.osszeg - a.osszeg).slice(0, KATEGORIA_SZINEK.length).map(t => t.nev)
    )

    let paletta = 0
    const eredmeny: Required<MegoszlasTetel>[] = []
    pozitiv.forEach(t => {
      if (t.szin) eredmeny.push({ ...t, szin: t.szin })
      else if (megtartott.has(t.nev)) eredmeny.push({ ...t, szin: KATEGORIA_SZINEK[paletta++] })
    })

    const tobbi = szinezendo.filter(t => !megtartott.has(t.nev)).reduce((s, t) => s + t.osszeg, 0)
    if (tobbi > 0) eredmeny.push({ nev: tobbiCimke, osszeg: tobbi, szin: SEMLEGES_SZIN })
    return eredmeny
  }, [tetelek, tobbiCimke])

  const osszesen = szeletek.reduce((s, sz) => s + sz.osszeg, 0)

  if (szeletek.length === 0) {
    return <p className="text-sm text-gray-500 py-8 text-center">{uresSzoveg}</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
      <div className="h-56 sm:h-64">
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
              formatter={(ertek, nev) => [`${forint(Number(ertek))} (${szazalek(Number(ertek), osszesen)})`, nev]}
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
            <span className="tabular-nums text-gray-900 font-semibold">{forint(sz.osszeg)}</span>
            <span className="tabular-nums text-gray-500 w-14 text-right">{szazalek(sz.osszeg, osszesen)}</span>
          </li>
        ))}
        <li className="flex items-center gap-3 text-sm border-t border-gray-200 pt-2 mt-2">
          <span className="h-3 w-3 shrink-0" />
          <span className="flex-1 text-gray-900 font-semibold">Összesen</span>
          <span className="tabular-nums text-gray-900 font-bold">{forint(osszesen)}</span>
          <span className="w-14" />
        </li>
      </ul>
    </div>
  )
}
