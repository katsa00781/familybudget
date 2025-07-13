'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Input } from '@/src/components/ui/input'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'
import { Textarea } from '@/src/components/ui/textarea'
import { 
  Package, Plus, Upload, Search, Edit, Trash2, QrCode, Store, DollarSign
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
  
  // Szűrők
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterStore, setFilterStore] = useState<string>('')
  
  // Új termék form
  const [newProduct, setNewProduct] = useState({
    name: '',
    brand: '',
    category: '',
    store_name: '',
    price: '',
    unit: 'db',
    barcode: '',
    sku: '',
    description: ''
  })
  
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
      
      if (error) throw error
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

    if (filterCategory) {
      filtered = filtered.filter(product => product.category === filterCategory)
    }

    if (filterStore) {
      filtered = filtered.filter(product => product.store_name === filterStore)
    }

    setFilteredProducts(filtered)
  }, [products, searchTerm, filterCategory, filterStore])

  // Új termék hozzáadása
  const addProduct = async () => {
    if (!currentUser) {
      toast.error('A mentéshez be kell jelentkezned!')
      return
    }

    if (!newProduct.name.trim() || !newProduct.category) {
      toast.error('Add meg legalább a termék nevét és kategóriáját!')
      return
    }

    try {
      setIsLoading(true)
      
      const productData = {
        user_id: currentUser.id,
        name: newProduct.name.trim(),
        brand: newProduct.brand.trim() || null,
        category: newProduct.category,
        store_name: newProduct.store_name || null,
        price: newProduct.price ? parseInt(newProduct.price) : null,
        unit: newProduct.unit,
        barcode: newProduct.barcode.trim() || null,
        sku: newProduct.sku.trim() || null,
        description: newProduct.description.trim() || null,
        available: true
      }

      const { error } = await supabase
        .from('products')
        .insert([productData])

      if (error) throw error

      toast.success('Termék sikeresen hozzáadva!')
      
      // Form reset
      setNewProduct({
        name: '',
        brand: '',
        category: '',
        store_name: '',
        price: '',
        unit: 'db',
        barcode: '',
        sku: '',
        description: ''
      })
      
      // Újratöltés
      loadProducts()
    } catch (error) {
      console.error('Hiba a mentéskor:', error)
      toast.error('Hiba történt a mentés során!')
    } finally {
      setIsLoading(false)
    }
  }

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

      const productsToInsert = jsonData.map((item: {
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
      }) => ({
        user_id: currentUser.id,
        name: item.name || item.termek_neve,
        brand: item.brand || item.marka || null,
        category: item.category || item.kategoria || 'Egyéb',
        store_name: item.store_name || item.bolt || null,
        price: item.price || item.ar || null,
        unit: item.unit || item.egyseg || 'db',
        barcode: item.barcode || item.vonalkod || null,
        sku: item.sku || item.termek_kod || null,
        description: item.description || item.leiras || null,
        available: item.available !== undefined ? item.available : true
      }))

      const { error } = await supabase
        .from('products')
        .insert(productsToInsert)

      if (error) throw error

      toast.success(`${productsToInsert.length} termék sikeresen importálva!`)
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
          {/* Bal oldali panel - Új termék hozzáadása */}
          <div className="space-y-6">
            <Card className="bg-white shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus size={20} className="text-green-600" />
                  Új termék hozzáadása
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    placeholder="Termék neve *"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  />
                  
                  <Input
                    placeholder="Márka"
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})}
                  />
                  
                  <Select value={newProduct.category} onValueChange={(value) => setNewProduct({...newProduct, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kategória *" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={newProduct.store_name} onValueChange={(value) => setNewProduct({...newProduct, store_name: value})}>
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
                      placeholder="Ár (HUF)"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                    />
                    <Select value={newProduct.unit} onValueChange={(value) => setNewProduct({...newProduct, unit: value})}>
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
                    value={newProduct.barcode}
                    onChange={(e) => setNewProduct({...newProduct, barcode: e.target.value})}
                  />
                  
                  <Input
                    placeholder="Termék kód (SKU)"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                  />
                  
                  <Textarea
                    placeholder="Leírás"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    rows={3}
                  />
                  
                  <Button 
                    onClick={addProduct}
                    disabled={isLoading || !currentUser}
                    className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white"
                  >
                    <Plus size={16} className="mr-2" />
                    {isLoading ? 'Hozzáadás...' : 'Termék hozzáadása'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* JSON Import */}
            <Card className="bg-white shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload size={20} className="text-blue-600" />
                  Tömeges import
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Dialog open={showJsonDialog} onOpenChange={setShowJsonDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Upload size={16} className="mr-2" />
                      JSON importálás
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Termékek importálása JSON-ból</DialogTitle>
                      <DialogDescription>
                        Illessz be egy JSON tömböt a termékekkel. Példa formátum:
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="bg-gray-100 p-3 rounded text-sm font-mono text-gray-700 max-h-40 overflow-y-auto">
                        <pre>{jsonExample}</pre>
                      </div>
                      <Textarea
                        placeholder="Illeszd be a JSON adatokat ide..."
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        rows={10}
                        className="font-mono text-sm"
                      />
                      <div className="flex gap-2">
                        <Button onClick={importFromJson} disabled={isLoading} className="flex-1">
                          <Upload size={16} className="mr-2" />
                          {isLoading ? 'Importálás...' : 'Importálás'}
                        </Button>
                        <Button variant="outline" onClick={() => setShowJsonDialog(false)}>
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
                      <SelectItem value="">Összes kategória</SelectItem>
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
                      <SelectItem value="">Összes bolt</SelectItem>
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
                    <p className="text-sm">Add hozzá az első terméket!</p>
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
                                  <DollarSign size={14} className="text-green-600" />
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
