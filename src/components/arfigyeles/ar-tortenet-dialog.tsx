'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import {
  Package, Store, AlertCircle, TrendingUp, TrendingDown, Pencil, Trash2, Tag, Check, X, ScanLine,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getProductPriceHistory, updatePriceHistory, deletePriceHistory, isRegularPrice,
} from '@/lib/priceHistory'
import type { ProductPriceHistory } from '@/types/enhanced'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'
import { Input } from '@/src/components/ui/input'
import { Checkbox } from '@/src/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/src/components/ui/dialog'

interface ArTortenetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  termekNev: string
  /** Bármilyen módosítás után hívódik (pl. az árváltozás-lista újratöltéséhez) */
  onModositas?: () => void
}

interface SzerkesztettErtekek {
  ar: string
  datum: string
  bolt: string
  akcios: boolean
}

interface GrafikonPont {
  id: string
  cimke: string
  rendes: number | null
  akcios: number | null
  bolt: string | null
}

const RENDES_SZIN = '#0d9488' // teal-600
const AKCIOS_SZIN = '#f97316' // orange-500

const ft = (ertek: number) => `${Math.round(ertek).toLocaleString('hu-HU')} Ft`
const datumFormat = (datum: string) => new Date(datum).toLocaleDateString('hu-HU')
const rovidDatum = (datum: string) =>
  new Date(datum).toLocaleDateString('hu-HU', { month: '2-digit', day: '2-digit' })

/** Migráció hiányára utaló hiba felismerése (az `akcios` oszlop még nem létezik) */
const hianyzoMigracio = (hiba?: string) => !!hiba && hiba.includes('akcios')

export function ArTortenetDialog({ open, onOpenChange, userId, termekNev, onModositas }: ArTortenetDialogProps) {
  const [tortenet, setTortenet] = useState<ProductPriceHistory[]>([])
  const [betoltes, setBetoltes] = useState(false)
  const [szerkesztettId, setSzerkesztettId] = useState<string | null>(null)
  const [szerkesztett, setSzerkesztett] = useState<SzerkesztettErtekek | null>(null)
  const [torlendoId, setTorlendoId] = useState<string | null>(null)
  const [mentes, setMentes] = useState(false)

  const betolt = useCallback(async () => {
    if (!termekNev) return
    setBetoltes(true)
    try {
      const adat = await getProductPriceHistory(userId, termekNev, 500)
      setTortenet(adat)
    } finally {
      setBetoltes(false)
    }
  }, [userId, termekNev])

  useEffect(() => {
    if (open) {
      setSzerkesztettId(null)
      setTorlendoId(null)
      betolt()
    }
  }, [open, betolt])

  // Időrendben növekvő lista a grafikonhoz és a változás-számításhoz
  const novekvo = useMemo(() => [...tortenet].reverse(), [tortenet])

  const grafikonAdat: GrafikonPont[] = useMemo(() => novekvo.map((t) => {
    const ar = Number(t.unit_price)
    const akcios = !isRegularPrice(t)
    return {
      id: t.id,
      cimke: rovidDatum(t.price_date),
      rendes: akcios ? null : ar,
      akcios: akcios ? ar : null,
      bolt: t.store_name ?? null,
    }
  }), [novekvo])

  // Minden bejegyzéshez az előző (régebbi) RENDES ár — ehhez mérjük a változást / akciós kedvezményt
  const elozoRendesAr = useMemo(() => {
    const terkep: Record<string, number | undefined> = {}
    let utolsoRendes: number | undefined
    novekvo.forEach((t) => {
      terkep[t.id] = utolsoRendes
      if (isRegularPrice(t)) utolsoRendes = Number(t.unit_price)
    })
    return terkep
  }, [novekvo])

  const osszesito = useMemo(() => {
    const rendesArak = tortenet.filter(isRegularPrice).map((t) => Number(t.unit_price))
    const akciosDb = tortenet.length - rendesArak.length
    if (rendesArak.length === 0) return { akciosDb, jelenlegi: null, min: null, max: null, atlag: null }
    return {
      akciosDb,
      jelenlegi: rendesArak[0], // a lista csökkenő dátum szerint rendezett
      min: Math.min(...rendesArak),
      max: Math.max(...rendesArak),
      atlag: rendesArak.reduce((s, a) => s + a, 0) / rendesArak.length,
    }
  }, [tortenet])

  const utanModositas = async () => {
    await betolt()
    onModositas?.()
  }

  const szerkesztesInditas = (t: ProductPriceHistory) => {
    setTorlendoId(null)
    setSzerkesztettId(t.id)
    setSzerkesztett({
      ar: String(Number(t.unit_price)),
      datum: t.price_date,
      bolt: t.store_name ?? '',
      akcios: !!t.akcios,
    })
  }

  const szerkesztesMentes = async () => {
    if (!szerkesztettId || !szerkesztett) return
    const ar = parseFloat(szerkesztett.ar.replace(',', '.'))
    if (!Number.isFinite(ar) || ar <= 0) {
      toast.error('Adj meg érvényes, pozitív árat!')
      return
    }
    if (!szerkesztett.datum) {
      toast.error('Adj meg dátumot!')
      return
    }
    setMentes(true)
    const eredmeny = await updatePriceHistory(szerkesztettId, {
      unitPrice: ar,
      priceDate: szerkesztett.datum,
      storeName: szerkesztett.bolt.trim() || null,
      akcios: szerkesztett.akcios,
    })
    setMentes(false)
    if (!eredmeny.success) {
      toast.error(hianyzoMigracio(eredmeny.error)
        ? 'Az akciós jelöléshez futtasd a 20261106_002 migrációt!'
        : `Mentési hiba: ${eredmeny.error}`)
      return
    }
    toast.success('Ár módosítva')
    setSzerkesztettId(null)
    setSzerkesztett(null)
    await utanModositas()
  }

  const akciosValtas = async (t: ProductPriceHistory) => {
    const eredmeny = await updatePriceHistory(t.id, { akcios: !t.akcios })
    if (!eredmeny.success) {
      toast.error(hianyzoMigracio(eredmeny.error)
        ? 'Az akciós jelöléshez futtasd a 20261106_002 migrációt!'
        : `Mentési hiba: ${eredmeny.error}`)
      return
    }
    toast.success(t.akcios ? 'Akciós jelölés törölve' : 'Akciós árként jelölve')
    await utanModositas()
  }

  const torles = async (id: string) => {
    const eredmeny = await deletePriceHistory(id)
    if (!eredmeny.success) {
      toast.error(`Törlési hiba: ${eredmeny.error}`)
      return
    }
    toast.success('Bejegyzés törölve')
    setTorlendoId(null)
    await utanModositas()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {termekNev} – Ártörténet
          </DialogTitle>
          <DialogDescription>
            Hibás (pl. OCR) árat javíthatsz vagy törölhetsz, az akciós árakat megjelölheted — ezek nem számítanak árváltozásnak.
          </DialogDescription>
        </DialogHeader>

        {betoltes && tortenet.length === 0 ? (
          <p className="text-center py-8 text-gray-500">Betöltés…</p>
        ) : tortenet.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nincs ártörténet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Összesítő */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { cim: 'Jelenlegi rendes ár', ertek: osszesito.jelenlegi },
                { cim: 'Legalacsonyabb', ertek: osszesito.min },
                { cim: 'Legmagasabb', ertek: osszesito.max },
              ].map((m) => (
                <div key={m.cim} className="rounded-lg bg-gray-50 p-2.5">
                  <p className="text-xs text-gray-500">{m.cim}</p>
                  <p className="font-semibold tabular-nums">{m.ertek !== null ? ft(m.ertek) : '–'}</p>
                </div>
              ))}
              <div className="rounded-lg bg-orange-50 p-2.5">
                <p className="text-xs text-orange-700">Akciós alkalom</p>
                <p className="font-semibold text-orange-700 tabular-nums">{osszesito.akciosDb} db</p>
              </div>
            </div>

            {/* Grafikon */}
            <div className="rounded-lg border border-gray-200 p-2 sm:p-3">
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={grafikonAdat} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="cimke" tick={{ fontSize: 11, fill: '#6b7280' }} minTickGap={16} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    width={56}
                    domain={['auto', 'auto']}
                    tickFormatter={(v: number) => Math.round(v).toLocaleString('hu-HU')}
                  />
                  <Tooltip content={<GrafikonTooltip />} />
                  {osszesito.atlag !== null && (
                    <ReferenceLine
                      y={osszesito.atlag}
                      stroke="#9ca3af"
                      strokeDasharray="4 4"
                      label={{ value: 'átlag', position: 'insideTopRight', fontSize: 10, fill: '#6b7280' }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="rendes"
                    name="Rendes ár"
                    stroke={RENDES_SZIN}
                    strokeWidth={2}
                    dot={{ r: 3, fill: RENDES_SZIN }}
                    activeDot={{ r: 5 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                  <Line
                    dataKey="akcios"
                    name="Akciós ár"
                    stroke="transparent"
                    dot={{ r: 5, fill: AKCIOS_SZIN, stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: AKCIOS_SZIN }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-4 mt-1 px-1 text-xs text-gray-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 rounded" style={{ backgroundColor: RENDES_SZIN }} /> Rendes ár
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: AKCIOS_SZIN }} /> Akciós ár
                </span>
                {osszesito.atlag !== null && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 border-t border-dashed border-gray-400" /> Rendes átlag ({ft(osszesito.atlag)})
                  </span>
                )}
              </div>
            </div>

            {/* Szerkeszthető lista */}
            <div className="space-y-2">
              {tortenet.map((t) => {
                const ar = Number(t.unit_price)
                const elozo = elozoRendesAr[t.id]
                const valtozas = elozo ? ((ar - elozo) / elozo) * 100 : null
                const akcios = !isRegularPrice(t)

                if (szerkesztettId === t.id && szerkesztett) {
                  return (
                    <div key={t.id} className="rounded-lg border-2 border-teal-300 bg-teal-50/40 p-3 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <label className="text-xs text-gray-600 space-y-1">
                          <span>Egységár (Ft)</span>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="1"
                            value={szerkesztett.ar}
                            onChange={(e) => setSzerkesztett({ ...szerkesztett, ar: e.target.value })}
                            className="bg-white"
                            autoFocus
                          />
                        </label>
                        <label className="text-xs text-gray-600 space-y-1">
                          <span>Dátum</span>
                          <Input
                            type="date"
                            value={szerkesztett.datum}
                            onChange={(e) => setSzerkesztett({ ...szerkesztett, datum: e.target.value })}
                            className="bg-white"
                          />
                        </label>
                        <label className="text-xs text-gray-600 space-y-1">
                          <span>Bolt</span>
                          <Input
                            value={szerkesztett.bolt}
                            onChange={(e) => setSzerkesztett({ ...szerkesztett, bolt: e.target.value })}
                            placeholder="pl. Lidl"
                            className="bg-white"
                          />
                        </label>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={szerkesztett.akcios}
                            onCheckedChange={(v) => setSzerkesztett({ ...szerkesztett, akcios: v === true })}
                          />
                          Akciós ár (nem valódi árváltozás)
                        </label>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSzerkesztettId(null); setSzerkesztett(null) }}
                            disabled={mentes}
                          >
                            <X className="h-4 w-4 mr-1" /> Mégse
                          </Button>
                          <Button size="sm" onClick={szerkesztesMentes} disabled={mentes} className="bg-teal-600 hover:bg-teal-700">
                            <Check className="h-4 w-4 mr-1" /> {mentes ? 'Mentés…' : 'Mentés'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={t.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg ${akcios ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'}`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`font-semibold tabular-nums ${akcios ? 'text-orange-700' : ''}`}>{ft(ar)}</p>
                        {akcios && (
                          <Badge className="bg-orange-500 hover:bg-orange-500">
                            <Tag className="h-3 w-3 mr-1" /> Akciós
                          </Badge>
                        )}
                        {valtozas !== null && Math.abs(valtozas) >= 0.05 && (
                          akcios ? (
                            <span className="text-xs text-orange-700">
                              {valtozas < 0 ? `${valtozas.toFixed(1)}% a rendes árhoz képest` : `+${valtozas.toFixed(1)}% a rendes árhoz képest`}
                            </span>
                          ) : (
                            <Badge className={valtozas > 0 ? 'bg-red-500 hover:bg-red-500' : 'bg-green-500 hover:bg-green-500'}>
                              {valtozas > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                              {valtozas > 0 ? '+' : ''}{valtozas.toFixed(1)}%
                            </Badge>
                          )
                        )}
                        {t.source === 'ocr' && (
                          <Badge variant="outline" className="text-gray-500">
                            <ScanLine className="h-3 w-3 mr-1" /> OCR
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5 flex flex-wrap items-center gap-x-3">
                        <span>{datumFormat(t.price_date)}</span>
                        {t.store_name && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Store className="h-3 w-3" /> {t.store_name}
                          </span>
                        )}
                      </p>
                    </div>

                    {torlendoId === t.id ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm text-red-700">Biztosan törlöd?</span>
                        <Button size="sm" variant="destructive" onClick={() => torles(t.id)}>Igen</Button>
                        <Button size="sm" variant="outline" onClick={() => setTorlendoId(null)}>Mégse</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => akciosValtas(t)}
                          title={akcios ? 'Akciós jelölés törlése' : 'Jelölés akciós árként'}
                          className={akcios ? 'text-orange-700 hover:text-orange-800' : 'text-gray-600'}
                        >
                          <Tag className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">{akcios ? 'Nem akciós' : 'Akciós'}</span>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => szerkesztesInditas(t)} title="Szerkesztés" className="text-gray-600">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setSzerkesztettId(null); setTorlendoId(t.id) }}
                          title="Törlés"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface GrafikonTooltipProps {
  active?: boolean
  payload?: Array<{ payload: GrafikonPont }>
  label?: string
}

function GrafikonTooltip({ active, payload, label }: GrafikonTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const pont = payload[0].payload
  const akcios = pont.akcios !== null
  const ar = akcios ? pont.akcios : pont.rendes
  if (ar === null) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="text-gray-500">{label}</p>
      <p className={`font-semibold ${akcios ? 'text-orange-600' : 'text-gray-900'}`}>
        {ft(ar)}{akcios && ' · akciós'}
      </p>
      {pont.bolt && <p className="text-gray-500">{pont.bolt}</p>}
    </div>
  )
}
