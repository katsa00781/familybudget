'use client'

import { useState, useEffect, useMemo } from 'react'
import { Merge, Search, Store, X, Check, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { nevHasonlosag } from '@/lib/priceHistory'
import {
  osszevonasElonezet, termekekOsszevonasaAdatbazisban, type OsszevonhatoTermek,
} from '@/lib/termekOsszevonas'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'
import { Input } from '@/src/components/ui/input'
import { Checkbox } from '@/src/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/src/components/ui/dialog'

interface TermekOsszevonasDialogProps {
  /** A megtartandó (cél) termék; null esetén a dialógus zárva */
  cel: OsszevonhatoTermek | null
  osszesTermek: OsszevonhatoTermek[]
  onClose: () => void
  /** Sikeres összevonás után hívódik (lista újratöltése) */
  onKesz: () => void
}

const ft = (ertek?: number | null) =>
  ertek ? `${Math.round(ertek).toLocaleString('hu-HU')} Ft` : '–'

function TermekSor({ t }: { t: OsszevonhatoTermek }) {
  return (
    <div className="min-w-0">
      <p className="font-medium truncate">{t.name}</p>
      <p className="text-xs text-gray-500 flex flex-wrap items-center gap-x-2">
        {t.brand && <span>{t.brand}</span>}
        <span className="flex items-center gap-1"><Store className="h-3 w-3" />{t.store_name || 'nincs bolt'}</span>
        <span>{ft(t.price)}/{t.unit}</span>
        {t.category && <span>{t.category}</span>}
      </p>
    </div>
  )
}

export function TermekOsszevonasDialog({ cel, osszesTermek, onClose, onKesz }: TermekOsszevonasDialogProps) {
  const [kereso, setKereso] = useState('')
  const [kivalasztottIdk, setKivalasztottIdk] = useState<string[]>([])
  const [arelozmenyIs, setArelozmenyIs] = useState(true)
  const [statisztikaIs, setStatisztikaIs] = useState(true)
  const [folyamatban, setFolyamatban] = useState(false)

  useEffect(() => {
    setKereso('')
    setKivalasztottIdk([])
  }, [cel?.id])

  const jeloltek = useMemo(() => {
    if (!cel) return []
    const masok = osszesTermek
      .filter((t) => t.id !== cel.id)
      .map((t) => ({ t, hasonlosag: nevHasonlosag(cel.name, t.name) }))
    const keresett = kereso.trim().toLowerCase()
    if (keresett) {
      return masok
        .filter(({ t }) =>
          t.name.toLowerCase().includes(keresett) ||
          t.brand?.toLowerCase().includes(keresett) ||
          t.barcode?.includes(keresett))
        .sort((a, b) => b.hasonlosag - a.hasonlosag || a.t.name.localeCompare(b.t.name, 'hu'))
        .slice(0, 50)
    }
    // Keresés nélkül a hasonló nevűeket ajánljuk fel
    return masok
      .filter(({ hasonlosag }) => hasonlosag >= 0.5)
      .sort((a, b) => b.hasonlosag - a.hasonlosag)
      .slice(0, 20)
  }, [cel, osszesTermek, kereso])

  const kivalasztottak = useMemo(
    () => osszesTermek.filter((t) => kivalasztottIdk.includes(t.id)),
    [osszesTermek, kivalasztottIdk]
  )

  const elonezet = useMemo(
    () => (cel ? osszevonasElonezet(cel, kivalasztottak, osszesTermek) : {}),
    [cel, kivalasztottak, osszesTermek]
  )

  const valtas = (id: string) =>
    setKivalasztottIdk((elozo) => elozo.includes(id) ? elozo.filter((x) => x !== id) : [...elozo, id])

  const osszevonas = async () => {
    if (!cel || kivalasztottIdk.length === 0) return
    setFolyamatban(true)
    const eredmeny = await termekekOsszevonasaAdatbazisban(cel.id, kivalasztottIdk, { arelozmenyIs, statisztikaIs })
    setFolyamatban(false)
    if (!eredmeny.success || !eredmeny.data) {
      toast.error(`Összevonási hiba: ${eredmeny.error}`)
      return
    }
    const d = eredmeny.data
    const reszek = [
      d.beolvasztott > 0 && `${d.beolvasztott} beolvasztva`,
      d.atnevezett > 0 && `${d.atnevezett} átnevezve`,
      d.arelozmeny > 0 && `${d.arelozmeny} ártörténet-bejegyzés`,
      d.statisztika > 0 && `${d.statisztika} statisztika sor`,
    ].filter(Boolean)
    toast.success(`Összevonva: „${d.cel_nev}” (${reszek.join(', ')})`)
    onKesz()
    onClose()
  }

  return (
    <Dialog open={!!cel} onOpenChange={(nyitva) => { if (!nyitva) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" /> Termékek összevonása
          </DialogTitle>
          <DialogDescription>
            Jelöld be azokat a termékeket, amelyek valójában ugyanezek (pl. az OCR más néven vitte be).
            Mind a megtartott termék nevét és kategóriáját kapják.
          </DialogDescription>
        </DialogHeader>

        {cel && (
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-teal-300 bg-teal-50/50 p-3">
              <p className="text-xs font-semibold text-teal-700 mb-1">Megtartott termék</p>
              <TermekSor t={cel} />
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={kereso}
                onChange={(e) => setKereso(e.target.value)}
                placeholder="Keresés név, márka, vonalkód szerint…"
                className="pl-8"
              />
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                {kereso.trim() ? 'Találatok' : 'Hasonló nevű termékek'}
              </p>
              {jeloltek.length === 0 ? (
                <p className="text-sm text-gray-500 py-2">
                  {kereso.trim() ? 'Nincs találat.' : 'Nincs hasonló nevű termék — keress rá a fenti mezőben.'}
                </p>
              ) : (
                <div className="max-h-60 overflow-y-auto rounded-md border border-gray-200 divide-y">
                  {jeloltek.map(({ t }) => (
                    <label key={t.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                      <Checkbox checked={kivalasztottIdk.includes(t.id)} onCheckedChange={() => valtas(t.id)} />
                      <TermekSor t={t} />
                    </label>
                  ))}
                </div>
              )}
            </div>

            {kivalasztottak.length > 0 && (
              <div className="rounded-lg bg-gray-50 p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-600">Mi fog történni</p>
                {kivalasztottak.map((t) => (
                  <div key={t.id} className="flex items-start gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => valtas(t.id)}
                      className="mt-0.5 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                      aria-label={`${t.name} eltávolítása`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate">{t.name}</span>
                        <span className="text-xs text-gray-500">({t.store_name || 'nincs bolt'}, {t.unit})</span>
                        <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                        {elonezet[t.id] === 'beolvad' ? (
                          <Badge className="bg-teal-600 hover:bg-teal-600">beolvad</Badge>
                        ) : (
                          <Badge variant="outline">átneveződik</Badge>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {elonezet[t.id] === 'beolvad'
                          ? 'Azonos bolt és egység: a sor törlődik, a hivatkozásai (ártörténet, receptek, menü, bevásárlólisták) a megmaradó termékre kerülnek; a frissebb ár marad.'
                          : 'Más bolt vagy egység: külön sorként megmarad, csak a nevét és kategóriáját kapja meg.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={arelozmenyIs} onCheckedChange={(v) => setArelozmenyIs(v === true)} />
                Az ártörténetben (Árfigyelés) is egy termék legyen
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={statisztikaIs} onCheckedChange={(v) => setStatisztikaIs(v === true)} />
                A bevásárlási statisztikában is
              </label>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={folyamatban}>
                <X className="h-4 w-4 mr-1" /> Mégse
              </Button>
              <Button
                onClick={osszevonas}
                disabled={folyamatban || kivalasztottak.length === 0}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Check className="h-4 w-4 mr-1" />
                {folyamatban
                  ? 'Összevonás…'
                  : kivalasztottak.length === 0
                    ? 'Összevonás'
                    : `${kivalasztottak.length} termék összevonása`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
