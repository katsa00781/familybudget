'use client'

import { useMemo, useState } from 'react'
import { PieChart as PieChartIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Button } from '@/src/components/ui/button'
import { MegoszlasTorta, SEMLEGES_SZIN, type MegoszlasTetel } from '@/src/components/grafikon/megoszlas-torta'

// A torta csak a megjelenítéshez szükséges mezőket várja
interface TortaKategoria {
  name: string
  items: { type: string; amount: number }[]
}

type Nezet = 'kategoria' | 'tipus'

// A típus-nézet színei megegyeznek az összesítő kártyákéval
const TIPUS_SZINEK: Record<string, string> = {
  Szükséglet: '#e11d48',
  Vágyak: '#4f46e5',
  Megtakarítás: '#0d9488',
}

export function KoltsegvetesTorta({ kategoriak }: { kategoriak: TortaKategoria[] }) {
  const [nezet, setNezet] = useState<Nezet>('kategoria')

  const tetelek = useMemo<MegoszlasTetel[]>(() => {
    if (nezet === 'kategoria') {
      return kategoriak.map(k => ({ nev: k.name, osszeg: k.items.reduce((s, i) => s + (i.amount || 0), 0) }))
    }
    const osszesTetel = kategoriak.flatMap(k => k.items)
    const osszegTipusra = (szuro: (tipus: string) => boolean) =>
      osszesTetel.filter(t => szuro(t.type)).reduce((s, t) => s + (t.amount || 0), 0)
    return [
      ...Object.entries(TIPUS_SZINEK).map(([tipus, szin]) => ({ nev: tipus, osszeg: osszegTipusra(t => t === tipus), szin })),
      { nev: 'Besorolatlan', osszeg: osszegTipusra(t => !(t in TIPUS_SZINEK)), szin: SEMLEGES_SZIN },
    ]
  }, [kategoriak, nezet])

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
        <MegoszlasTorta
          tetelek={tetelek}
          tobbiCimke="Többi kategória"
          uresSzoveg="Még nincs összeggel kitöltött tétel — add meg az összegeket a lenti kategóriákban."
        />
      </CardContent>
    </Card>
  )
}
