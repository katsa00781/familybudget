'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select'
import { AlertTriangle, ArrowLeftRight, RefreshCw, Save, TrendingDown, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { fetchWalletAccounts, saveWalletBalanceSnapshot } from '@/lib/walletApi'
import {
  aktualisHonap, formatHonap, kovetkezoHonap, szamolValtozas, walletToPillanatkepSzamla,
} from '@/lib/egyenlegValtozas'
import type { EgyenlegPillanatkep, PillanatkepSzamla } from '@/types/egyenleg-pillanatkep'

const fmt = (n: number, currencyCode: string) =>
  `${Math.round(n).toLocaleString('hu-HU')} ${currencyCode === 'HUF' ? 'Ft' : currencyCode}`

const fmtKulonbseg = (n: number, currencyCode: string) => `${n > 0 ? '+' : ''}${fmt(n, currencyCode)}`

const kulonbsegSzin = (n: number) =>
  n > 0 ? 'text-emerald-600' : n < 0 ? 'text-red-600' : 'text-gray-500'

const fmtIdopont = (iso: string) =>
  new Date(iso).toLocaleString('hu-HU', {
    timeZone: 'Europe/Budapest', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

export default function EgyenlegValtozasPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const aktualis = useMemo(() => aktualisHonap(), [])

  const [pillanatkepek, setPillanatkepek] = useState<EgyenlegPillanatkep[]>([])
  const [kivalasztott, setKivalasztott] = useState(aktualis)
  const [isLoading, setIsLoading] = useState(true)
  const [betoltesiHiba, setBetoltesiHiba] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [eloSzamlak, setEloSzamlak] = useState<PillanatkepSzamla[] | null>(null)
  const [eloIdopont, setEloIdopont] = useState<string | null>(null)
  const [eloHiba, setEloHiba] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  const loadPillanatkepek = useCallback(async () => {
    const { data, error } = await supabase
      .from('egyenleg_pillanatkep')
      .select('*')
      .order('snapshot_month', { ascending: false })
    if (error) {
      setBetoltesiHiba('Nem sikerült betölteni a mentett egyenlegeket')
      return
    }
    setBetoltesiHiba(null)
    setPillanatkepek((data ?? []) as EgyenlegPillanatkep[])
  }, [supabase])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      await loadPillanatkepek()
      setIsLoading(false)
    }
    init()
  }, [supabase, router, loadPillanatkepek])

  const syncWallet = useCallback(async () => {
    setIsSyncing(true)
    setEloHiba(null)
    try {
      const res = await fetchWalletAccounts()
      setEloSzamlak(res.accounts.map(walletToPillanatkepSzamla))
      setEloIdopont(res.syncedAt)
    } catch (e) {
      setEloSzamlak(null)
      setEloHiba(e instanceof Error ? e.message : 'Wallet hiba')
    } finally {
      setIsSyncing(false)
    }
  }, [])

  // Az élő egyenleg csak az aktuális hónap összevetéséhez kell
  useEffect(() => {
    if (kivalasztott === aktualis) syncWallet()
  }, [kivalasztott, aktualis, syncWallet])

  const mentesMost = async () => {
    setIsSaving(true)
    try {
      await saveWalletBalanceSnapshot()
      await loadPillanatkepek()
      toast.success('Számlaegyenlegek elmentve')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Nem sikerült menteni')
    } finally {
      setIsSaving(false)
    }
  }

  const honapok = useMemo(() => {
    const mentett = pillanatkepek.map((p) => p.snapshot_month)
    return mentett.includes(aktualis) ? mentett : [aktualis, ...mentett]
  }, [pillanatkepek, aktualis])

  const isAktualis = kivalasztott === aktualis
  const kezdoKep = pillanatkepek.find((p) => p.snapshot_month === kivalasztott)
  const zaroKep = pillanatkepek.find((p) => p.snapshot_month === kovetkezoHonap(kivalasztott))
  const zaroSzamlak = isAktualis ? eloSzamlak : zaroKep?.accounts ?? null

  const valtozas = useMemo(
    () => (kezdoKep && zaroSzamlak ? szamolValtozas(kezdoKep.accounts, zaroSzamlak) : null),
    [kezdoKep, zaroSzamlak],
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-cyan-50 to-teal-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">

        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl shadow-lg w-fit">
              <ArrowLeftRight className="text-white" size={32} />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-4xl font-extrabold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent tracking-tight">
                Egyenleg változás
              </h1>
              <p className="text-sm sm:text-base text-gray-600 font-medium mt-1">
                A hónap eleji számlaegyenlegek összevetése a hónap közbeni vagy záró egyenleggel
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center mt-4">
            <Select value={kivalasztott} onValueChange={setKivalasztott}>
              <SelectTrigger className="w-full sm:w-56 rounded-xl border-2 capitalize" aria-label="Hónap">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {honapok.map((h) => (
                  <SelectItem key={h} value={h}>{formatHonap(h)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAktualis && (
              <Button onClick={syncWallet} disabled={isSyncing} variant="outline" className="rounded-xl border-2">
                <RefreshCw size={15} className={`mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                Frissítés a Wallet-ből
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <Card className="rounded-2xl">
            <CardContent className="py-10 text-center text-gray-500">Betöltés…</CardContent>
          </Card>
        ) : betoltesiHiba ? (
          <Card className="rounded-2xl border-red-200 bg-red-50">
            <CardContent className="py-6 flex items-center gap-3 text-red-800">
              <AlertTriangle size={20} className="shrink-0" />
              {betoltesiHiba}
            </CardContent>
          </Card>
        ) : !kezdoKep ? (
          <Card className="rounded-2xl border-amber-200 bg-amber-50">
            <CardContent className="py-6 flex flex-col sm:flex-row sm:items-center gap-3">
              <AlertTriangle size={20} className="text-amber-600 shrink-0" />
              <p className="flex-1 text-sm text-amber-900">
                Ehhez a hónaphoz még nincs mentett egyenleg. A mentés minden hónap 1-jén reggel automatikusan elkészül, de most is elindíthatod.
              </p>
              <Button onClick={mentesMost} disabled={isSaving} className="rounded-xl">
                <Save size={15} className="mr-1.5" />
                {isSaving ? 'Mentés…' : 'Mentés most'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {eloHiba && isAktualis && (
              <Card className="rounded-2xl border-red-200 bg-red-50">
                <CardContent className="py-4 flex items-center gap-3 text-sm text-red-800">
                  <AlertTriangle size={18} className="shrink-0" />
                  Nem sikerült lekérni az élő egyenlegeket: {eloHiba}
                </CardContent>
              </Card>
            )}
            {!isAktualis && !zaroKep && (
              <Card className="rounded-2xl border-amber-200 bg-amber-50">
                <CardContent className="py-4 flex items-center gap-3 text-sm text-amber-900">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                  A következő hónapnak nincs mentett egyenlege, ezért a hónap különbsége nem számolható.
                </CardContent>
              </Card>
            )}

            {/* Összesítők pénznemenként */}
            {valtozas && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {valtozas.osszesitok.map((o) => (
                  <Card key={o.currencyCode} className="rounded-2xl">
                    <CardHeader className="pb-2">
                      <CardDescription>Összes különbség ({o.currencyCode})</CardDescription>
                      <CardTitle className={`text-2xl sm:text-3xl flex items-center gap-2 ${kulonbsegSzin(o.kulonbseg)}`}>
                        {o.kulonbseg > 0 && <TrendingUp size={24} />}
                        {o.kulonbseg < 0 && <TrendingDown size={24} />}
                        {fmtKulonbseg(o.kulonbseg, o.currencyCode)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-600">
                      {fmt(o.kezdo, o.currencyCode)} → {fmt(o.zaro, o.currencyCode)}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Számlánkénti bontás */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg capitalize">{formatHonap(kivalasztott)}</CardTitle>
                <CardDescription>
                  Kezdő: {fmtIdopont(kezdoKep.snapshot_at)} ({kezdoKep.source === 'kezi' ? 'kézi mentés' : 'automatikus mentés'})
                  {' · '}
                  Záró: {isAktualis
                    ? (eloIdopont ? `élő Wallet, ${fmtIdopont(eloIdopont)}` : 'élő Wallet')
                    : (zaroKep ? fmtIdopont(zaroKep.snapshot_at) : 'nincs adat')}
                  <br />
                  A hitelkártya-tartozás negatív értékként számít, a pozitív különbség ott a tartozás csökkenését jelenti.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {valtozas ? (
                  <ul className="divide-y divide-gray-100">
                    {valtozas.szamlak.map((s) => (
                      <li key={s.id} className="py-3">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="font-medium text-gray-900 break-words min-w-0">{s.name}</span>
                          {s.allapot === 'uj' && <Badge variant="outline">új számla</Badge>}
                          {s.allapot === 'megszunt' && <Badge variant="outline">már nincs a Walletben</Badge>}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <div className="text-xs text-gray-500">Kezdő</div>
                            <div className="tabular-nums">{fmt(s.kezdo, s.currencyCode)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">{isAktualis ? 'Most' : 'Záró'}</div>
                            <div className="tabular-nums">{fmt(s.zaro, s.currencyCode)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">Különbség</div>
                            <div className={`tabular-nums font-semibold ${kulonbsegSzin(s.kulonbseg)}`}>
                              {fmtKulonbseg(s.kulonbseg, s.currencyCode)}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {kezdoKep.accounts.map((s) => (
                      <li key={s.id} className="py-3 flex justify-between gap-3 text-sm">
                        <span className="font-medium text-gray-900 break-words min-w-0">{s.name}</span>
                        <span className="tabular-nums shrink-0">{fmt(s.balance, s.currencyCode)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
