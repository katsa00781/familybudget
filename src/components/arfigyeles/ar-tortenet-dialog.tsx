'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import {
  Package, Store, AlertCircle, TrendingUp, TrendingDown, Pencil, Trash2, Tag, Check, X, ScanLine,
  Merge, Search, TextCursorInput,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getProductPriceHistory, updatePriceHistory, deletePriceHistory, isRegularPrice,
  termekekOsszevonasa, nevHasonlosag, type TermekNevDb,
} from '@/lib/priceHistory'
import type { ProductPriceHistory } from '@/types/enhanced'
import {
  egysegar, boltKulcs, boltNev, egysegCimke, osszehasonlitasiKulcs, type Mertekegyseg,
} from '@/lib/egysegar'
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
  /** Ezzel a bolttal nyíljon (pl. az árváltozás sorából); null = ismeretlen bolt */
  kezdoBolt?: string | null
  /** Ezzel a mértékegységgel nyíljon (pl. az árváltozás sorából) */
  kezdoMertekegyseg?: Mertekegyseg
  /** Az ártörténetben szereplő összes terméknév (átnevezés-ütközéshez és összevonáshoz) */
  termekNevek: TermekNevDb[]
  /** Bármilyen módosítás után hívódik (pl. az árváltozás-lista újratöltéséhez) */
  onModositas?: () => void
  /** Átnevezés után hívódik az új névvel — a szülő erre állítja át a megnyitott terméket */
  onAtnevezes?: (ujNev: string) => void
}

type NevMuvelet = 'nincs' | 'atnevezes' | 'osszevonas'

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
  /** Összes bolt nézetben boltonkénti vonal: `b:<boltKulcs>` → rendes egységár */
  [boltVonal: string]: string | number | null
}

const RENDES_SZIN = '#0d9488' // teal-600
const AKCIOS_SZIN = '#f97316' // orange-500
/** Összes bolt nézetben a boltonkénti vonalak színei */
const BOLT_SZINEK = ['#0d9488', '#2563eb', '#7c3aed', '#db2777', '#ca8a04', '#4b5563']

/** Bolt-szűrő értéke: egy bolt kulcsa, vagy az összes bolt */
const OSSZES_BOLT = '*'

const MERTEKEGYSEG_NEV: Record<Mertekegyseg, string> = {
  kg: 'Ft/kg', l: 'Ft/l', db: 'Ft/db', csomag: 'Ft/csomag',
}

const ft = (ertek: number) => `${Math.round(ertek).toLocaleString('hu-HU')} Ft`
const ftEgyseg = (ertek: number, m: Mertekegyseg) =>
  `${Math.round(ertek).toLocaleString('hu-HU')} ${egysegCimke(m)}`
const datumFormat = (datum: string) => new Date(datum).toLocaleDateString('hu-HU')
const rovidDatum = (datum: string) =>
  new Date(datum).toLocaleDateString('hu-HU', { month: '2-digit', day: '2-digit' })

/** Migráció hiányára utaló hiba felismerése (az `akcios` oszlop még nem létezik) */
const hianyzoMigracio = (hiba?: string) => !!hiba && hiba.includes('akcios')

export function ArTortenetDialog({
  open, onOpenChange, userId, termekNev, kezdoBolt, kezdoMertekegyseg, termekNevek, onModositas, onAtnevezes,
}: ArTortenetDialogProps) {
  const [tortenet, setTortenet] = useState<ProductPriceHistory[]>([])
  const [betoltes, setBetoltes] = useState(false)
  const [szerkesztettId, setSzerkesztettId] = useState<string | null>(null)
  const [szerkesztett, setSzerkesztett] = useState<SzerkesztettErtekek | null>(null)
  const [torlendoId, setTorlendoId] = useState<string | null>(null)
  const [mentes, setMentes] = useState(false)

  // Összehasonlítás csak azonos boltban és azonos mértékegységben értelmes
  const [boltSzuro, setBoltSzuro] = useState<string>(OSSZES_BOLT)
  const [egysegSzuro, setEgysegSzuro] = useState<Mertekegyseg | null>(null)

  // Terméknév-műveletek: átnevezés / összevonás
  const [nevMuvelet, setNevMuvelet] = useState<NevMuvelet>('nincs')
  const [ujNev, setUjNev] = useState('')
  const [kereso, setKereso] = useState('')
  const [osszevonandok, setOsszevonandok] = useState<string[]>([])
  const [statisztikaIs, setStatisztikaIs] = useState(true)

  const betolt = useCallback(async () => {
    if (!termekNev) return
    setBetoltes(true)
    try {
      const adat = await getProductPriceHistory(userId, termekNev, 500)
      setTortenet(adat)
      return adat
    } finally {
      setBetoltes(false)
    }
  }, [userId, termekNev])

  useEffect(() => {
    if (open) {
      setSzerkesztettId(null)
      setTorlendoId(null)
      setNevMuvelet('nincs')
      setOsszevonandok([])
      setKereso('')
      betolt().then((adat) => {
        if (!adat || adat.length === 0) return
        // Kezdő szűrő: a megadott bolt/egység, különben a legfrissebb bejegyzésé
        const kezdoKulcs = kezdoBolt !== undefined ? boltKulcs(kezdoBolt) : boltKulcs(adat[0].store_name)
        const boltban = adat.filter((t) => boltKulcs(t.store_name) === kezdoKulcs)
        const bolt = boltban.length > 0 ? kezdoKulcs : OSSZES_BOLT
        const forras = boltban.length > 0 ? boltban : adat
        const egysegek = new Set(forras.map((t) => egysegar(t).mertekegyseg))
        setBoltSzuro(bolt)
        setEgysegSzuro(kezdoMertekegyseg && egysegek.has(kezdoMertekegyseg)
          ? kezdoMertekegyseg
          : egysegar(forras[0]).mertekegyseg)
      })
    }
    // A kezdő szűrő csak megnyitáskor számít
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, betolt])

  // Bejegyzésenként az egységár (Ft/kg, Ft/l, Ft/db, Ft/csomag)
  const egysegarak = useMemo(() => {
    const terkep: Record<string, ReturnType<typeof egysegar>> = {}
    tortenet.forEach((t) => { terkep[t.id] = egysegar(t) })
    return terkep
  }, [tortenet])

  // Boltok (bejegyzésszámmal) és a kiválasztott bolt(ok) mértékegységei
  const boltok = useMemo(() => {
    const m = new Map<string, { nev: string; db: number }>()
    tortenet.forEach((t) => {
      const k = boltKulcs(t.store_name)
      const elozo = m.get(k)
      m.set(k, { nev: elozo?.nev ?? boltNev(t.store_name), db: (elozo?.db ?? 0) + 1 })
    })
    return [...m.entries()].map(([kulcs, v]) => ({ kulcs, ...v })).sort((a, b) => b.db - a.db)
  }, [tortenet])

  // Ha a választott bolt (pl. szerkesztés után) már nem szerepel, az összes boltot mutatjuk
  const aktivBolt = boltok.some((b) => b.kulcs === boltSzuro) ? boltSzuro : OSSZES_BOLT

  const boltbanLevo = useMemo(
    () => tortenet.filter((t) => aktivBolt === OSSZES_BOLT || boltKulcs(t.store_name) === aktivBolt),
    [tortenet, aktivBolt]
  )

  const mertekegysegek = useMemo(() => {
    const m = new Map<Mertekegyseg, number>()
    boltbanLevo.forEach((t) => {
      const e = egysegarak[t.id]?.mertekegyseg
      if (e) m.set(e, (m.get(e) ?? 0) + 1)
    })
    return [...m.entries()].map(([egyseg, db]) => ({ egyseg, db })).sort((a, b) => b.db - a.db)
  }, [boltbanLevo, egysegarak])

  // Ha a választott egység ebben a boltban nincs, a leggyakoribbra váltunk
  const aktivEgyseg: Mertekegyseg | null = mertekegysegek.some((m) => m.egyseg === egysegSzuro)
    ? egysegSzuro
    : (mertekegysegek[0]?.egyseg ?? null)

  // A szűrt (azonos mértékegységű) bejegyzések, csökkenő dátum szerint
  const szurt = useMemo(
    () => boltbanLevo.filter((t) => egysegarak[t.id]?.mertekegyseg === aktivEgyseg),
    [boltbanLevo, egysegarak, aktivEgyseg]
  )

  // Időrendben növekvő lista a grafikonhoz
  const novekvo = useMemo(() => [...szurt].reverse(), [szurt])

  // Összes bolt nézetben a grafikonon boltonként külön vonal
  const grafikonBoltok = useMemo(() => {
    if (aktivBolt !== OSSZES_BOLT || boltok.length < 2) return []
    const kulcsok = [...new Set(szurt.map((t) => boltKulcs(t.store_name)))]
    return kulcsok.map((kulcs, i) => ({
      kulcs,
      nev: boltok.find((b) => b.kulcs === kulcs)?.nev ?? boltNev(kulcs),
      szin: BOLT_SZINEK[i % BOLT_SZINEK.length],
    }))
  }, [aktivBolt, szurt, boltok])

  const grafikonAdat: GrafikonPont[] = useMemo(() => novekvo.map((t) => {
    const ar = egysegarak[t.id]?.ertek ?? Number(t.unit_price)
    const akcios = !isRegularPrice(t)
    const pont: GrafikonPont = {
      id: t.id,
      cimke: rovidDatum(t.price_date),
      rendes: akcios ? null : ar,
      akcios: akcios ? ar : null,
      bolt: t.store_name ?? null,
    }
    grafikonBoltok.forEach((b) => {
      pont[`b:${b.kulcs}`] = !akcios && boltKulcs(t.store_name) === b.kulcs ? ar : null
    })
    return pont
  }), [novekvo, egysegarak, grafikonBoltok])

  // Minden bejegyzéshez az előző (régebbi) RENDES egységár UGYANABBAN a boltban és
  // mértékegységben — ehhez mérjük a változást / akciós kedvezményt
  const elozoRendesAr = useMemo(() => {
    const terkep: Record<string, number | undefined> = {}
    const utolsoRendes: Record<string, number> = {}
    ;[...tortenet].reverse().forEach((t) => {
      const kulcs = osszehasonlitasiKulcs(t)
      terkep[t.id] = utolsoRendes[kulcs]
      if (isRegularPrice(t)) utolsoRendes[kulcs] = egysegarak[t.id].ertek
    })
    return terkep
  }, [tortenet, egysegarak])

  const osszesito = useMemo(() => {
    const rendesArak = szurt.filter(isRegularPrice).map((t) => egysegarak[t.id].ertek)
    const akciosDb = szurt.length - rendesArak.length
    if (rendesArak.length === 0) return { akciosDb, jelenlegi: null, min: null, max: null, atlag: null }
    return {
      akciosDb,
      jelenlegi: rendesArak[0], // a lista csökkenő dátum szerint rendezett
      min: Math.min(...rendesArak),
      max: Math.max(...rendesArak),
      atlag: rendesArak.reduce((s, a) => s + a, 0) / rendesArak.length,
    }
  }, [szurt, egysegarak])

  const egysegFt = (ertek: number) => (aktivEgyseg ? ftEgyseg(ertek, aktivEgyseg) : ft(ertek))

  // --- Átnevezés ---
  const ujNevTiszta = ujNev.trim()
  // Ha az új név (kis/nagybetűtől függetlenül) egy MÁSIK meglévő termék neve → összevonás lesz belőle
  const utkozoTermek = termekNevek.find(
    (t) => t.nev !== termekNev && t.nev.toLowerCase() === ujNevTiszta.toLowerCase()
  )

  const atnevezes = async () => {
    if (!ujNevTiszta) {
      toast.error('Az új név nem lehet üres!')
      return
    }
    const celNev = utkozoTermek ? utkozoTermek.nev : ujNevTiszta
    if (celNev === termekNev) {
      setNevMuvelet('nincs')
      return
    }
    setMentes(true)
    const eredmeny = await termekekOsszevonasa(userId, [termekNev], celNev, { statisztikaIs })
    setMentes(false)
    if (!eredmeny.success) {
      toast.error(`Átnevezési hiba: ${eredmeny.error}`)
      return
    }
    toast.success(utkozoTermek
      ? `Összevonva ezzel: „${celNev}” (${eredmeny.arTortenetDb} bejegyzés)`
      : `Átnevezve: „${celNev}” (${eredmeny.arTortenetDb} bejegyzés)`)
    setNevMuvelet('nincs')
    onModositas?.()
    onAtnevezes?.(celNev)
  }

  // --- Összevonás ---
  const jeloltek = useMemo(() => {
    const masok = termekNevek.filter((t) => t.nev !== termekNev)
    const keresett = kereso.trim().toLowerCase()
    const pontozott = masok.map((t) => ({ ...t, hasonlosag: nevHasonlosag(termekNev, t.nev) }))
    if (keresett) {
      return pontozott
        .filter((t) => t.nev.toLowerCase().includes(keresett))
        .sort((a, b) => b.hasonlosag - a.hasonlosag || a.nev.localeCompare(b.nev, 'hu'))
        .slice(0, 50)
    }
    // Keresés nélkül a hasonló nevűeket ajánljuk fel
    return pontozott
      .filter((t) => t.hasonlosag >= 0.5)
      .sort((a, b) => b.hasonlosag - a.hasonlosag)
      .slice(0, 15)
  }, [termekNevek, termekNev, kereso])

  const osszevonandoDb = osszevonandok.reduce(
    (s, nev) => s + (termekNevek.find((t) => t.nev === nev)?.db ?? 0), 0
  )

  const osszevonandoValtas = (nev: string) => {
    setOsszevonandok((elozo) => elozo.includes(nev) ? elozo.filter((n) => n !== nev) : [...elozo, nev])
  }

  const osszevonas = async () => {
    if (osszevonandok.length === 0) return
    setMentes(true)
    const eredmeny = await termekekOsszevonasa(userId, osszevonandok, termekNev, { statisztikaIs })
    setMentes(false)
    if (!eredmeny.success) {
      toast.error(`Összevonási hiba: ${eredmeny.error}`)
      return
    }
    toast.success(`${osszevonandok.length} termék összevonva ide: „${termekNev}” (${eredmeny.arTortenetDb} bejegyzés)`)
    setOsszevonandok([])
    setKereso('')
    setNevMuvelet('nincs')
    await utanModositas()
  }

  const nevMuveletValtas = (muvelet: NevMuvelet) => {
    setSzerkesztettId(null)
    setTorlendoId(null)
    if (muvelet === 'atnevezes') setUjNev(termekNev)
    setNevMuvelet((elozo) => elozo === muvelet ? 'nincs' : muvelet)
  }

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
            Az árak boltonként, egységárban (Ft/kg, Ft/l, Ft/db) vethetők össze. Hibás (pl. OCR) árat javíthatsz vagy törölhetsz, az akciós árakat megjelölheted — ezek nem számítanak árváltozásnak.
          </DialogDescription>
        </DialogHeader>

        {/* Terméknév-műveletek */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={nevMuvelet === 'atnevezes' ? 'default' : 'outline'}
            onClick={() => nevMuveletValtas('atnevezes')}
          >
            <TextCursorInput className="h-4 w-4 mr-1" /> Átnevezés
          </Button>
          <Button
            size="sm"
            variant={nevMuvelet === 'osszevonas' ? 'default' : 'outline'}
            onClick={() => nevMuveletValtas('osszevonas')}
          >
            <Merge className="h-4 w-4 mr-1" /> Összevonás más termékkel
          </Button>
        </div>

        {nevMuvelet === 'atnevezes' && (
          <div className="rounded-lg border-2 border-teal-300 bg-teal-50/40 p-3 space-y-3">
            <label className="text-xs text-gray-600 space-y-1 block">
              <span>Új terméknév</span>
              <Input
                value={ujNev}
                onChange={(e) => setUjNev(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') atnevezes() }}
                className="bg-white"
                autoFocus
              />
            </label>
            {utkozoTermek && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2">
                Már létezik „{utkozoTermek.nev}” nevű termék ({utkozoTermek.db} bejegyzés) — a két termék
                története <strong>összevonódik</strong>.
              </p>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={statisztikaIs} onCheckedChange={(v) => setStatisztikaIs(v === true)} />
                A bevásárlási statisztikában is
              </label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setNevMuvelet('nincs')} disabled={mentes}>
                  <X className="h-4 w-4 mr-1" /> Mégse
                </Button>
                <Button size="sm" onClick={atnevezes} disabled={mentes || !ujNevTiszta} className="bg-teal-600 hover:bg-teal-700">
                  <Check className="h-4 w-4 mr-1" />
                  {mentes ? 'Mentés…' : utkozoTermek ? 'Összevonás' : 'Átnevezés'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {nevMuvelet === 'osszevonas' && (
          <div className="rounded-lg border-2 border-teal-300 bg-teal-50/40 p-3 space-y-3">
            <p className="text-sm text-gray-700">
              Jelöld be azokat a termékeket, amelyek valójában ugyanezek. A történetük a(z){' '}
              <strong>„{termekNev}”</strong> termékhez kerül, a régi nevek megszűnnek.
            </p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={kereso}
                onChange={(e) => setKereso(e.target.value)}
                placeholder="Keresés a termékek között…"
                className="bg-white pl-8"
              />
            </div>

            {osszevonandok.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {osszevonandok.map((nev) => (
                  <Badge key={nev} variant="secondary" className="gap-1 pr-1">
                    {nev}
                    <button
                      type="button"
                      onClick={() => osszevonandoValtas(nev)}
                      className="rounded-full p-0.5 hover:bg-gray-300"
                      aria-label={`${nev} eltávolítása`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                {kereso.trim() ? 'Találatok' : 'Hasonló nevű termékek'}
              </p>
              {jeloltek.length === 0 ? (
                <p className="text-sm text-gray-500 py-2">
                  {kereso.trim() ? 'Nincs találat.' : 'Nincs hasonló nevű termék — keress rá a fenti mezőben.'}
                </p>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-white divide-y">
                  {jeloltek.map((t) => (
                    <label key={t.nev} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                      <Checkbox
                        checked={osszevonandok.includes(t.nev)}
                        onCheckedChange={() => osszevonandoValtas(t.nev)}
                      />
                      <span className="flex-1 min-w-0 truncate">{t.nev}</span>
                      <span className="text-xs text-gray-500 shrink-0">{t.db} bejegyzés</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={statisztikaIs} onCheckedChange={(v) => setStatisztikaIs(v === true)} />
                A bevásárlási statisztikában is
              </label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setNevMuvelet('nincs')} disabled={mentes}>
                  <X className="h-4 w-4 mr-1" /> Mégse
                </Button>
                <Button
                  size="sm"
                  onClick={osszevonas}
                  disabled={mentes || osszevonandok.length === 0}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Merge className="h-4 w-4 mr-1" />
                  {mentes
                    ? 'Összevonás…'
                    : osszevonandok.length === 0
                      ? 'Összevonás'
                      : `${osszevonandok.length} termék összevonása (${osszevonandoDb} bejegyzés)`}
                </Button>
              </div>
            </div>
          </div>
        )}

        {betoltes && tortenet.length === 0 ? (
          <p className="text-center py-8 text-gray-500">Betöltés…</p>
        ) : tortenet.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nincs ártörténet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Bolt- és mértékegység-szűrő: ár csak azonos boltban, azonos egységre vetítve vethető össze */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-gray-500 mr-1 flex items-center gap-1"><Store className="h-3.5 w-3.5" /> Bolt:</span>
                {boltok.length > 1 && (
                  <Button
                    size="sm"
                    variant={aktivBolt === OSSZES_BOLT ? 'default' : 'outline'}
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setBoltSzuro(OSSZES_BOLT)}
                  >
                    Összes bolt
                  </Button>
                )}
                {boltok.map((b) => (
                  <Button
                    key={b.kulcs}
                    size="sm"
                    variant={aktivBolt === b.kulcs || boltok.length === 1 ? 'default' : 'outline'}
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setBoltSzuro(b.kulcs)}
                  >
                    {b.nev} <span className="ml-1 opacity-70">({b.db})</span>
                  </Button>
                ))}
              </div>
              {mertekegysegek.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-gray-500 mr-1">Egységár:</span>
                  {mertekegysegek.map((m) => (
                    <Button
                      key={m.egyseg}
                      size="sm"
                      variant={aktivEgyseg === m.egyseg ? 'default' : 'outline'}
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setEgysegSzuro(m.egyseg)}
                    >
                      {MERTEKEGYSEG_NEV[m.egyseg]} <span className="ml-1 opacity-70">({m.db})</span>
                    </Button>
                  ))}
                </div>
              )}
              {aktivEgyseg === 'csomag' && (
                <p className="text-xs text-gray-500">
                  Ezeknél a bejegyzéseknél a kiszerelés mérete ismeretlen (pl. „db”), ezért csomagáron hasonlítjuk össze őket.
                </p>
              )}
            </div>

            {/* Összesítő */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { cim: 'Jelenlegi rendes egységár', ertek: osszesito.jelenlegi },
                { cim: 'Legalacsonyabb', ertek: osszesito.min },
                { cim: 'Legmagasabb', ertek: osszesito.max },
              ].map((m) => (
                <div key={m.cim} className="rounded-lg bg-gray-50 p-2.5">
                  <p className="text-xs text-gray-500">{m.cim}</p>
                  <p className="font-semibold tabular-nums">{m.ertek !== null ? egysegFt(m.ertek) : '–'}</p>
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
                  <Tooltip content={<GrafikonTooltip mertekegyseg={aktivEgyseg} />} />
                  {osszesito.atlag !== null && (
                    <ReferenceLine
                      y={osszesito.atlag}
                      stroke="#9ca3af"
                      strokeDasharray="4 4"
                      label={{ value: 'átlag', position: 'insideTopRight', fontSize: 10, fill: '#6b7280' }}
                    />
                  )}
                  {grafikonBoltok.length > 0 ? grafikonBoltok.map((b) => (
                    <Line
                      key={b.kulcs}
                      type="monotone"
                      dataKey={`b:${b.kulcs}`}
                      name={b.nev}
                      stroke={b.szin}
                      strokeWidth={2}
                      dot={{ r: 3, fill: b.szin }}
                      activeDot={{ r: 5 }}
                      connectNulls
                      isAnimationActive={false}
                    />
                  )) : (
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
                  )}
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
                {grafikonBoltok.length > 0 ? grafikonBoltok.map((b) => (
                  <span key={b.kulcs} className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 rounded" style={{ backgroundColor: b.szin }} /> {b.nev}
                  </span>
                )) : (
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 rounded" style={{ backgroundColor: RENDES_SZIN }} /> Rendes egységár
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: AKCIOS_SZIN }} /> Akciós ár
                </span>
                {osszesito.atlag !== null && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 border-t border-dashed border-gray-400" /> Rendes átlag ({egysegFt(osszesito.atlag)})
                  </span>
                )}
              </div>
            </div>

            {/* Szerkeszthető lista */}
            <div className="space-y-2">
              {szurt.map((t) => {
                const ar = Number(t.unit_price)
                const egyseg = egysegarak[t.id]
                const elozo = elozoRendesAr[t.id]
                const valtozas = elozo ? ((egyseg.ertek - elozo) / elozo) * 100 : null
                const akcios = !isRegularPrice(t)

                if (szerkesztettId === t.id && szerkesztett) {
                  return (
                    <div key={t.id} className="rounded-lg border-2 border-teal-300 bg-teal-50/40 p-3 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <label className="text-xs text-gray-600 space-y-1">
                          <span>Ár (Ft, a rögzített kiszerelésre)</span>
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
                        <p className={`font-semibold tabular-nums ${akcios ? 'text-orange-700' : ''}`}>
                          {ftEgyseg(egyseg.ertek, egyseg.mertekegyseg)}
                        </p>
                        {Math.round(ar) !== Math.round(egyseg.ertek) && (
                          <span className="text-xs text-gray-500 tabular-nums">
                            ({ft(ar)}{t.unit ? ` / ${t.unit}` : ''})
                          </span>
                        )}
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
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Store className="h-3 w-3" /> {boltNev(t.store_name)}
                        </span>
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
  mertekegyseg?: Mertekegyseg | null
}

function GrafikonTooltip({ active, payload, label, mertekegyseg }: GrafikonTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const pont = payload[0].payload
  const akcios = pont.akcios !== null
  const ar = akcios ? pont.akcios : pont.rendes
  if (ar === null) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="text-gray-500">{label}</p>
      <p className={`font-semibold ${akcios ? 'text-orange-600' : 'text-gray-900'}`}>
        {mertekegyseg ? ftEgyseg(ar, mertekegyseg) : ft(ar)}{akcios && ' · akciós'}
      </p>
      <p className="text-gray-500">{boltNev(pont.bolt)}</p>
    </div>
  )
}
