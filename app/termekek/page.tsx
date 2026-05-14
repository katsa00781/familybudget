'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/utils/supabase/client'
import { savePriceHistory } from '@/lib/priceHistory'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Input } from '@/src/components/ui/input'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'
import { Textarea } from '@/src/components/ui/textarea'
import {
  Package, Upload, Search, Edit, Trash2, QrCode, Store, Coins
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/src/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table'

interface Product {
  id: string
  user_id: string
  name: string
  brand?: string
  category: string
  store_name?: string
  price?: number
  unit: string
  barcode?: string
  sku?: string
  description?: string
  image_url?: string
  available: boolean
  last_seen_at: string
  created_at: string
  updated_at?: string
}

interface User {
  id: string
  email?: string
}

// Helper function to generate unique IDs
// const generateId = () => Math.random().toString(36).substr(2, 9)

// Kategóriák és egységek
const CATEGORIES = [
  'Tejtermékek', 'Pékáruk', 'Húsok', 'Zöldségek', 'Gyümölcsök', 'Italok', 
  'Fagyasztott', 'Konzervek', 'Tisztítószerek', 'Kozmetikumok', 'Gyógyszer', 'Egyéb'
]

const UNITS = ['db', 'kg', 'g', 'l', 'ml', 'csomag', 'doboz', 'üveg', 'tasak']

const STORES = [
  'Tesco', 'Auchan', 'Spar', 'CBA', 'Reál', 'Penny Market', 'Lidl', 'Aldi', 
  'Metro', 'Interspar', 'Coop', 'Match', 'Egyéb'
]

export default function TermekekPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [migrationWarning, setMigrationWarning] = useState(false)
  
  // Szűrők
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStore, setFilterStore] = useState<string>('all')
  
  // JSON import
  const [jsonInput, setJsonInput] = useState('')
  const [showJsonDialog, setShowJsonDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  
  const supabase = createClient()

  // Felhasználó betöltése
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getUser()
  }, [supabase.auth])

  // Termékek betöltése
  const loadProducts = useCallback(async () => {
    if (!currentUser) return
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        // Ellenőrizzük, hogy a tábla létezik-e
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.error('A products tábla nem található. Futtasd le a 006_create_products.sql migration-t!')
          toast.error('A termékadatbázis még nincs beállítva. Futtasd le a migration fájlt a Supabase-ben!')
          setMigrationWarning(true)
          return
        }
        throw error
      }
      
      setProducts(data || [])
      setFilteredProducts(data || [])
    } catch (error) {
      console.error('Hiba a termékek betöltésekor:', error)
      toast.error('Hiba történt a termékek betöltésekor!')
    }
  }, [currentUser, supabase])

  // Betöltés amikor a felhasználó betöltődik
  useEffect(() => {
    if (currentUser) {
      loadProducts()
    }
  }, [currentUser, loadProducts])

  // Szűrés
  useEffect(() => {
    let filtered = products

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.includes(searchTerm) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterCategory && filterCategory !== 'all') {
      filtered = filtered.filter(product => product.category === filterCategory)
    }

    if (filterStore && filterStore !== 'all') {
      filtered = filtered.filter(product => product.store_name === filterStore)
    }

    setFilteredProducts(filtered)
  }, [products, searchTerm, filterCategory, filterStore])

  // Termék frissítése
  const updateProduct = async (product: Product) => {
    try {
      setIsLoading(true)
      
      const { error } = await supabase
        .from('products')
        .update({
          name: product.name,
          brand: product.brand,
          category: product.category,
          store_name: product.store_name,
          price: product.price,
          unit: product.unit,
          barcode: product.barcode,
          sku: product.sku,
          description: product.description,
          available: product.available
        })
        .eq('id', product.id)

      if (error) throw error

      toast.success('Termék sikeresen frissítve!')
      setEditingProduct(null)
      loadProducts()
    } catch (error) {
      console.error('Hiba a frissítéskor:', error)
      toast.error('Hiba történt a frissítés során!')
    } finally {
      setIsLoading(false)
    }
  }

  // Termék törlése
  const deleteProduct = async (id: string) => {
    if (!confirm('Biztosan törölni szeretnéd ezt a terméket?')) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Termék törölve!')
      loadProducts()
    } catch (error) {
      console.error('Hiba a törlésnél:', error)
      toast.error('Hiba történt a törlés során!')
    }
  }

  // JSON import
  const importFromJson = async () => {
    if (!currentUser) {
      toast.error('A mentéshez be kell jelentkezned!')
      return
    }

    if (!jsonInput.trim()) {
      toast.error('Add meg a JSON adatokat!')
      return
    }

    try {
      setIsLoading(true)
      const jsonData = JSON.parse(jsonInput)
      
      if (!Array.isArray(jsonData)) {
        throw new Error('A JSON-nak tömbnek kell lennie!')
      }

      // Meglévő termékek lekérése duplikáció ellenőrzéshez
      const { data: existingProducts, error: fetchError } = await supabase
        .from('products')
        .select('name, brand, barcode')
        .eq('user_id', currentUser.id)

      if (fetchError) throw fetchError

      const productsToInsert: Array<{
        user_id: string;
        name: string;
        brand: string | null;
        category: string;
        store_name: string | null;
        price: number | null;
        unit: string;
        barcode: string | null;
        sku: string | null;
        description: string | null;
        available: boolean;
      }> = []
      const productsToUpdate: Array<{
        name: string;
        price: number;
        category: string;
        store_name: string | null;
        unit: string;
      }> = []
      const skippedWithoutPrice: number[] = []
      const existingProductsSet = new Set()
      
      // ÚJ: Minden JSON elemet statisztikába mentünk (duplikáltakat is)
      const allItemsForStats: Array<{
        name: string;
        brand: string | null;
        category: string;
        store_name: string | null;
        price: number | null;
        unit: string;
      }> = []

      // Meglévő termékek indexelése
      existingProducts?.forEach(product => {
        // Vonalkód alapú egyediség (ha van vonalkód)
        if (product.barcode) {
          existingProductsSet.add(`barcode:${product.barcode}`)
        }
        // Név + márka alapú egyediség
        const key = `${product.name}|${product.brand || ''}`.toLowerCase()
        existingProductsSet.add(key)
      })

      jsonData.forEach((item: {
        name?: string;
        termek_neve?: string;
        brand?: string;
        marka?: string;
        category?: string;
        kategoria?: string;
        store_name?: string;
        bolt?: string;
        price?: number;
        ar?: number;
        unit?: string;
        egyseg?: string;
        barcode?: string;
        vonalkod?: string;
        sku?: string;
        termek_kod?: string;
        description?: string;
        leiras?: string;
        available?: boolean;
      }) => {
        const productName = item.name || item.termek_neve
        const productBrand = item.brand || item.marka || null
        const productBarcode = item.barcode || item.vonalkod || null

        if (!productName) {
          skippedWithoutPrice.push(0)
          return
        }

        const productCategory = item.category || item.kategoria || 'Egyéb'
        const productStoreName = item.store_name || item.bolt || null
        const productPrice = item.price || item.ar || null
        const productUnit = item.unit || item.egyseg || 'db'

        // ÚJ: MINDEN terméket hozzáadunk a statisztikához (árral rendelkezőket)
        if (productPrice && productPrice > 0) {
          allItemsForStats.push({
            name: productName,
            brand: productBrand,
            category: productCategory,
            store_name: productStoreName,
            price: productPrice,
            unit: productUnit
          })
        }

        // Duplikáció ellenőrzés CSAK a products táblához
        let isDuplicate = false
        
        // 1. Vonalkód alapú ellenőrzés (ha van)
        if (productBarcode && existingProductsSet.has(`barcode:${productBarcode}`)) {
          isDuplicate = true
        }
        
        // 2. Név + márka alapú ellenőrzés
        const nameKey = `${productName}|${productBrand || ''}`.toLowerCase()
        if (existingProductsSet.has(nameKey)) {
          isDuplicate = true
        }

        if (isDuplicate) {
          if (productPrice && productPrice > 0) {
            productsToUpdate.push({
              name: productName,
              price: productPrice,
              category: productCategory,
              store_name: productStoreName,
              unit: productUnit
            })
          } else {
            skippedWithoutPrice.push(0)
          }
          return
        }

        // Új termék hozzáadása a products táblához
        productsToInsert.push({
          user_id: currentUser.id,
          name: productName,
          brand: productBrand,
          category: productCategory,
          store_name: productStoreName,
          price: productPrice,
          unit: productUnit,
          barcode: productBarcode,
          sku: item.sku || item.termek_kod || null,
          description: item.description || item.leiras || null,
          available: item.available !== undefined ? item.available : true
        })

        // Indexhez hozzáadás, hogy az importon belüli duplikációkat is elkerüljük
        if (productBarcode) {
          existingProductsSet.add(`barcode:${productBarcode}`)
        }
        existingProductsSet.add(nameKey)
      })

      // Import végrehajtása
      if (productsToInsert.length > 0) {
        const { data: insertedProducts, error } = await supabase
          .from('products')
          .insert(productsToInsert)
          .select()

        if (error) throw error

        // Price history mentése CSAK az új termékekhez (árfigyeléshez)
        if (insertedProducts) {
          const priceHistoryPromises = insertedProducts
            .filter(product => product.price && product.price > 0)
            .map(product => 
              savePriceHistory(
                currentUser.id,
                product.name,
                product.price,
                {
                  productId: product.id,
                  productCategory: product.category,
                  storeName: product.store_name,
                  unit: product.unit,
                  source: 'import',
                  priceDate: new Date().toISOString().split('T')[0]
                }
              )
            );

          await Promise.allSettled(priceHistoryPromises);
        }
      }

      // Meglévő termékek árfrissítése + price history bejegyzés
      // A régi árbejegyzések megmaradnak — ez csak új sort ír a price_history-ba
      if (productsToUpdate.length > 0) {
        const currentDate = new Date().toISOString().split('T')[0]
        const updatePromises = productsToUpdate.map(async (product) => {
          await supabase
            .from('products')
            .update({ price: product.price })
            .eq('user_id', currentUser.id)
            .eq('name', product.name)

          await savePriceHistory(
            currentUser.id,
            product.name,
            product.price,
            {
              productCategory: product.category,
              storeName: product.store_name ?? undefined,
              unit: product.unit,
              source: 'import',
              priceDate: currentDate
            }
          )
        })
        await Promise.allSettled(updatePromises)
      }

      // Shopping statistics mentése MINDEN JSON elemből (duplikáltakkal együtt)
      if (allItemsForStats.length > 0) {
        const currentDate = new Date().toISOString().split('T')[0]
        
        const shoppingStatsToInsert = allItemsForStats.map(item => ({
          user_id: currentUser.id,
          shopping_date: currentDate,
          product_name: item.name,
          product_category: item.category,
          brand: item.brand,
          store_name: item.store_name,
          quantity: 1,
          unit: item.unit,
          unit_price: item.price,
          total_price: item.price,
          source: 'manual' // Ideiglenes: 'import' nem engedélyezett a CHECK constraint-ben
        }))

        // Statisztikák mentése
        const { error: statsError } = await supabase
          .from('shopping_statistics')
          .insert(shoppingStatsToInsert)

        if (statsError) {
          // Ne állítsuk meg az importot statisztika hiba esetén
          toast.error(`Figyelem: ${allItemsForStats.length} termék importálva, de a statisztika mentése sikertelen.`)
        }
      }

      // Eredmény kijelzése
      let message = ''

      if (productsToInsert.length > 0) {
        message += `${productsToInsert.length} új termék hozzáadva! `
      }
      if (productsToUpdate.length > 0) {
        message += `${productsToUpdate.length} termék ára frissítve! `
      }
      if (allItemsForStats.length > 0) {
        message += `${allItemsForStats.length} termék statisztikába mentve! `
      }
      if (productsToInsert.length === 0 && productsToUpdate.length === 0 && allItemsForStats.length === 0) {
        message = 'Nincs importálható termék árral!'
      }

      toast.success(message)
      setJsonInput('')
      setShowJsonDialog(false)
      loadProducts()
    } catch (error) {
      console.error('Hiba az importáláskor:', error)
      toast.error('Hiba történt az importálás során! Ellenőrizd a JSON formátumot.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const jsonExample = `[
  {
    "name": "Tej 2,8%",
    "brand": "Parmalat",
    "category": "Tejtermékek",
    "store_name": "Tesco",
    "price": 400,
    "unit": "l",
    "barcode": "1234567890123"
  },
  {
    "name": "Kenyér",
    "brand": "Bakers",
    "category": "Pékáruk", 
    "store_name": "Spar",
    "price": 650,
    "unit": "db"
  }
]`

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-teal-500 to-green-500 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Migration Warning */}
        {migrationWarning && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-r-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="font-medium">
                  Adatbázis migration szükséges!
                </p>
                <p className="text-sm">
                  A termékadatbázis működéséhez futtasd le a <code className="bg-yellow-200 px-1 rounded">supabase/migrations/006_create_products.sql</code> fájlt a Supabase SQL Editor-ban.
                </p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setMigrationWarning(false)}
                  className="inline-flex rounded-md bg-yellow-50 p-1.5 text-yellow-500 hover:bg-yellow-100"
                >
                  <span className="sr-only">Bezárás</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="text-white mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Package className="text-white" size={32} />
            <h1 className="text-3xl font-bold">Termékadatbázis</h1>
          </div>
          <p className="text-lg">
            Kezeld a termékeket, árakat és vonalkódokat. Későbbi mobilalkalmazás integráció támogatásával.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bal oldali panel - JSON Import */}
          <div className="space-y-6">
            <Card className="bg-white shadow-lg border-0">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Upload size={18} className="text-blue-600 sm:w-5 sm:h-5" />
                  Tömeges import
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <Dialog open={showJsonDialog} onOpenChange={setShowJsonDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full h-10 sm:h-11 text-sm sm:text-base">
                      <Upload size={16} className="mr-2" />
                      JSON importálás
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="flex-shrink-0 p-4 sm:p-6 pb-3 sm:pb-4">
                      <DialogTitle className="text-lg sm:text-xl">Termékek importálása JSON-ból</DialogTitle>
                      <DialogDescription className="text-xs sm:text-sm mt-2">
                        Illessz be egy JSON tömböt a termékekkel (blokkból másolt adatok).
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden flex flex-col px-4 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4">
                      {/* Példa formátum - összecsukható mobilon */}
                      <details className="bg-gray-50 rounded-lg border border-gray-200">
                        <summary className="px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 rounded-lg">
                          📄 Példa formátum
                        </summary>
                        <div className="px-3 pb-3 pt-2">
                          <div className="bg-white p-2 sm:p-3 rounded border text-xs font-mono text-gray-700 max-h-32 overflow-y-auto">
                            <pre>{jsonExample}</pre>
                          </div>
                        </div>
                      </details>
                      
                      {/* JSON beviteli mező */}
                      <div className="flex-1 min-h-0 flex flex-col">
                        <label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 px-1">
                          JSON adatok:
                        </label>
                        <Textarea
                          placeholder="Illeszd be a JSON adatokat ide (blokkból másolt termékek)..."
                          value={jsonInput}
                          onChange={(e) => setJsonInput(e.target.value)}
                          className="font-mono text-xs sm:text-sm h-full resize-none flex-1 min-h-[200px] sm:min-h-[250px]"
                        />
                        <p className="text-xs text-gray-500 mt-2 px-1">
                          💡 Tipp: Másold ki a blokkból az összes terméket, és illeszd be ide.
                        </p>
                      </div>
                      
                      {/* Gombok */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <Button 
                          onClick={importFromJson} 
                          disabled={isLoading || !jsonInput.trim()} 
                          className="flex-1 h-11 sm:h-10 text-sm sm:text-base"
                        >
                          <Upload size={16} className="mr-2" />
                          {isLoading ? 'Importálás...' : 'Termékek importálása'}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowJsonDialog(false)}
                          className="h-11 sm:h-10 text-sm sm:text-base sm:w-24"
                        >
                          Mégse
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>

          {/* Jobb oldali panel - Termékek listája */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package size={20} className="text-green-600" />
                  Termékek ({filteredProducts.length})
                </CardTitle>
                <CardDescription>
                  Kezeld a termékeidet, árait és vonalkódjait
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Szűrők */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Keresés név, márka, vonalkód szerint..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Összes kategória" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Összes kategória</SelectItem>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStore} onValueChange={setFilterStore}>
                    <SelectTrigger>
                      <SelectValue placeholder="Összes bolt" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Összes bolt</SelectItem>
                      {STORES.map((store) => (
                        <SelectItem key={store} value={store}>
                          {store}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Termékek táblázat */}
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Még nincsenek termékek az adatbázisban</p>
                    <p className="text-sm">Importálj termékeket a JSON import funkcióval!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Termék</TableHead>
                          <TableHead>Kategória</TableHead>
                          <TableHead>Bolt</TableHead>
                          <TableHead>Ár</TableHead>
                          <TableHead>Vonalkód</TableHead>
                          <TableHead>Műveletek</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{product.name}</div>
                                {product.brand && (
                                  <div className="text-sm text-gray-500">{product.brand}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{product.category}</Badge>
                            </TableCell>
                            <TableCell>
                              {product.store_name ? (
                                <div className="flex items-center gap-1">
                                  <Store size={14} className="text-gray-400" />
                                  <span className="text-sm">{product.store_name}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {product.price ? (
                                <div className="flex items-center gap-1">
                                  <Coins size={14} className="text-green-600" />
                                  <span className="font-medium">{formatCurrency(product.price)}</span>
                                  <span className="text-xs text-gray-500">/{product.unit}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {product.barcode ? (
                                <div className="flex items-center gap-1">
                                  <QrCode size={14} className="text-gray-400" />
                                  <span className="text-sm font-mono">{product.barcode}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingProduct(product)}
                                >
                                  <Edit size={14} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteProduct(product.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Szerkesztési dialog */}
        {editingProduct && (
          <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Termék szerkesztése</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Termék neve"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                />
                <Input
                  placeholder="Márka"
                  value={editingProduct.brand || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, brand: e.target.value})}
                />
                <Select value={editingProduct.category} onValueChange={(value) => setEditingProduct({...editingProduct, category: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={editingProduct.store_name || ''} onValueChange={(value) => setEditingProduct({...editingProduct, store_name: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Bolt" />
                  </SelectTrigger>
                  <SelectContent>
                    {STORES.map((store) => (
                      <SelectItem key={store} value={store}>
                        {store}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Ár"
                    value={editingProduct.price || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, price: parseInt(e.target.value) || undefined})}
                  />
                  <Select value={editingProduct.unit} onValueChange={(value) => setEditingProduct({...editingProduct, unit: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  placeholder="Vonalkód"
                  value={editingProduct.barcode || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, barcode: e.target.value})}
                />
                <div className="flex gap-2">
                  <Button onClick={() => updateProduct(editingProduct)} disabled={isLoading} className="flex-1">
                    {isLoading ? 'Mentés...' : 'Mentés'}
                  </Button>
                  <Button variant="outline" onClick={() => setEditingProduct(null)}>
                    Mégse
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
