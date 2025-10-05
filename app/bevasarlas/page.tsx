'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Input } from '@/src/components/ui/input'
import { Button } from '@/src/components/ui/button'
import { Separator } from '@/src/components/ui/separator'
import { Badge } from '@/src/components/ui/badge'
import { 
  ShoppingCart, Plus, Minus, X, Save, Trash2, Calendar, Check, MoreVertical, QrCode
} from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu'
import { Checkbox } from '@/src/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select'

interface Product {
  id: string
  name: string
  brand?: string
  category: string
  store_name?: string
  price?: number
  unit: string
  barcode?: string
}

interface ShoppingItem {
  id: string
  name: string
  quantity: number
  unit: string
  price?: number
  previousPrice?: number // Korábbi ár az összehasonlításhoz
  category: string
  checked: boolean
}

interface ShoppingList {
  id: string
  user_id: string
  name: string
  date: string
  items: ShoppingItem[]
  total_amount: number
  completed: boolean
  created_at: string
  updated_at?: string
}

interface User {
  id: string
  email?: string
}

// Helper function to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9)

// Kategóriák és egységek
const CATEGORIES = [
  'Tejtermékek', 'Pékáruk', 'Húsok', 'Zöldségek', 'Gyümölcsök', 'Italok', 
  'Fagyasztott', 'Konzervek', 'Tisztítószerek', 'Egyéb'
]

const UNITS = ['db', 'kg', 'g', 'l', 'ml', 'csomag', 'doboz']

export default function BevasarlasPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [currentItems, setCurrentItems] = useState<ShoppingItem[]>([])
  const [savedLists, setSavedLists] = useState<ShoppingList[]>([])
  const [selectedListId, setSelectedListId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedUnit, setSelectedUnit] = useState<string>('')
  const [productSuggestions, setProductSuggestions] = useState<Product[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [migrationWarning, setMigrationWarning] = useState(false)
  const supabase = createClient()

  // Felhasználó betöltése
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getUser()
  }, [supabase.auth])

  // Mentett bevásárlólisták betöltése
  const loadSavedLists = useCallback(async () => {
    if (!currentUser) return
    
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        // Ellenőrizzük, hogy a tábla létezik-e
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.error('A shopping_lists tábla nem található. Futtasd le a 005_create_shopping_lists.sql migration-t!')
          toast.error('A bevásárlólista adatbázis még nincs beállítva. Futtasd le a migration fájlt a Supabase-ben!')
          setMigrationWarning(true)
          return
        }
        throw error
      }
      
      // Biztosítjuk, hogy az items mező mindig array legyen
      const processedData = (data || []).map(list => ({
        ...list,
        items: Array.isArray(list.items) ? list.items : 
               (typeof list.items === 'string' ? JSON.parse(list.items || '[]') : [])
      }))
      
      setSavedLists(processedData)
    } catch (error) {
      console.error('Hiba a bevásárlólisták betöltésekor:', error)
      toast.error('Hiba történt a bevásárlólisták betöltésekor!')
    }
  }, [currentUser, supabase])

  // Betöltés amikor a felhasználó betöltődik
  useEffect(() => {
    if (currentUser) {
      loadSavedLists()
    }
  }, [currentUser, loadSavedLists])

  // Automatikus betöltés: ha van mentett lista és nincs kiválasztva, betöltjük a legutolsót
  useEffect(() => {
    if (savedLists.length > 0 && !selectedListId && currentUser) {
      const latestList = savedLists[0] // Már created_at szerint csökkenő sorrendben van
      console.log('Automatikusan betöltöm a legutolsó bevásárlólistát:', latestList.name)
      loadList(latestList.id)
    }
  }, [savedLists, selectedListId, currentUser]) // eslint-disable-line react-hooks/exhaustive-deps

  // Termékkeresés
  const searchProducts = useCallback(async (searchText: string) => {
    if (!currentUser || searchText.length < 2) {
      setProductSuggestions([])
      setShowSuggestions(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', currentUser.id)
        .or(`name.ilike.%${searchText}%,brand.ilike.%${searchText}%,barcode.ilike.%${searchText}%`)
        .limit(5)

      if (error) throw error
      setProductSuggestions(data || [])
      setShowSuggestions(true)
    } catch (error) {
      console.error('Hiba a termékkereséskor:', error)
      setProductSuggestions([])
      setShowSuggestions(false)
    }
  }, [currentUser, supabase])

  // Keresőmező változás
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchProducts(searchTerm)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchTerm, searchProducts])

  // Új tétel hozzáadása
  const addItem = (product?: Product) => {
    let itemData: Partial<ShoppingItem>

    if (product) {
      // Ellenőrizzük, hogy van-e már ilyen termék a listában
      const existingItem = currentItems.find(item => 
        item.name.toLowerCase() === (product.brand ? `${product.brand} ${product.name}` : product.name).toLowerCase()
      )

      // Termékből hozzáadás
      itemData = {
        name: product.brand ? `${product.brand} ${product.name}` : product.name,
        quantity: 1,
        unit: product.unit,
        category: product.category,
        price: product.price,
        previousPrice: existingItem?.price, // Korábbi ár tárolása
        checked: false
      }

      // Árváltozás értesítés
      if (existingItem?.price && product.price && existingItem.price !== product.price) {
        const priceChange = ((product.price - existingItem.price) / existingItem.price) * 100
        const changeText = priceChange > 0 ? 'drágulás' : 'árcsökkenés'
        const changeColor = priceChange > 0 ? '🔴' : '🟢'
        
        toast.info(
          `${changeColor} Árváltozás: ${product.name} - ${Math.abs(priceChange).toFixed(1)}% ${changeText}`,
          { duration: 5000 }
        )
      }
    } else {
      // Manuális hozzáadás
      if (!searchTerm.trim()) {
        toast.error('Add meg a termék nevét!')
        return
      }
      
      // Ellenőrizzük a meglévő tételeket manuális hozzáadásnál is
      const existingItem = currentItems.find(item => 
        item.name.toLowerCase() === searchTerm.trim().toLowerCase()
      )

      itemData = {
        name: searchTerm.trim(),
        quantity: 1,
        unit: selectedUnit || 'db',
        category: selectedCategory || 'Egyéb',
        previousPrice: existingItem?.price,
        checked: false
      }
    }

    const newItem: ShoppingItem = {
      id: generateId(),
      ...itemData
    } as ShoppingItem

    setCurrentItems(prev => [...prev, newItem])
    setSearchTerm('')
    setSelectedUnit('')
    setSelectedCategory('')
    setShowSuggestions(false)
  }

  // Tétel eltávolítása
  const removeItem = (id: string) => {
    setCurrentItems(prev => prev.filter(item => item.id !== id))
  }

  // Tétel módosítása
  const updateItem = async (id: string, field: keyof ShoppingItem, value: string | number | boolean) => {
    const item = currentItems.find(item => item.id === id)
    if (!item) return

    // Ha az ár változik, frissítsük a termékadatbázisban is
    if (field === 'price' && typeof value === 'number' && currentUser && value > 0) {
      try {
        // Keressük meg a terméket az adatbázisban név alapján
        const { data: products, error: searchError } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', currentUser.id)
          .ilike('name', `%${item.name.replace(/^[^\s]+ /, '')}%`) // Brand nélküli keresés
          .limit(1)

        if (!searchError && products && products.length > 0) {
          const product = products[0]
          
          // Árváltozás számítása
          const oldPrice = product.price || 0
          if (oldPrice > 0 && oldPrice !== value) {
            const priceChange = ((value - oldPrice) / oldPrice) * 100
            const changeText = priceChange > 0 ? 'drágulás' : 'árcsökkenés'
            const changeIcon = priceChange > 0 ? '🔴' : '🟢'
            
            toast.info(
              `${changeIcon} Ár frissítve: ${item.name} - ${Math.abs(priceChange).toFixed(1)}% ${changeText}`,
              { duration: 4000 }
            )
          }
          
          // Frissítsük a termék árát az adatbázisban
          const { error: updateError } = await supabase
            .from('products')
            .update({ 
              price: value,
              updated_at: new Date().toISOString()
            })
            .eq('id', product.id)

          if (!updateError) {
            console.log(`Termék ár frissítve: ${item.name} - ${value} Ft`)
          }
        }
      } catch (error) {
        console.error('Hiba a termék ár frissítésekor:', error)
      }
    }

    setCurrentItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  // Mennyiség módosítása
  const updateQuantity = (id: string, increment: boolean) => {
    setCurrentItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQuantity = increment ? item.quantity + 1 : Math.max(1, item.quantity - 1)
        return { ...item, quantity: newQuantity }
      }
      return item
    }))
  }

  // Összes tétel bejelölése/kijelölése
  const toggleAllItems = () => {
    const allChecked = currentItems.every(item => item.checked)
    setCurrentItems(prev => prev.map(item => ({ ...item, checked: !allChecked })))
  }

  // Összeg számítása
  const calculateTotal = () => {
    return currentItems.reduce((sum, item) => {
      const price = item.price || 0
      return sum + (price * item.quantity)
    }, 0)
  }

  // Bevásárlólista mentése
  const saveList = async () => {
    if (!currentUser) {
      toast.error('A mentéshez be kell jelentkezned!')
      return
    }

    if (!newListName.trim()) {
      toast.error('Add meg a lista nevét!')
      return
    }

    if (currentItems.length === 0) {
      toast.error('Add hozzá legalább egy terméket a listához!')
      return
    }

    try {
      setIsLoading(true)
      
      const listData = {
        user_id: currentUser.id,
        name: newListName.trim(),
        date: selectedDate,
        items: currentItems,
        total_amount: calculateTotal(),
        completed: false
      }

      let data, error

      if (selectedListId) {
        // Meglévő lista frissítése
        const updateResult = await supabase
          .from('shopping_lists')
          .update(listData)
          .eq('id', selectedListId)
          .select()
        
        data = updateResult.data
        error = updateResult.error
        
        if (!error) {
          toast.success("Bevásárlólista sikeresen frissítve!")
        }
      } else {
        // Új lista létrehozása
        const insertResult = await supabase
          .from('shopping_lists')
          .insert([{
            ...listData,
            created_at: new Date().toISOString()
          }])
          .select()
        
        data = insertResult.data
        error = insertResult.error
        
        if (!error) {
          toast.success("Új bevásárlólista sikeresen elmentve!")
          if (data && data[0]) {
            setSelectedListId(data[0].id)
          }
        }
      }

      if (error) throw error

      // Frissítjük a mentett listák listáját
      loadSavedLists()
      
    } catch (error) {
      console.error('Hiba a mentéskor:', error)
      // Specifikus hibaüzenet, ha a tábla nem létezik
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('does not exist') || errorMessage.includes('PGRST116')) {
        toast.error('A bevásárlólista adatbázis még nincs beállítva. Futtasd le a 005_create_shopping_lists.sql migration-t a Supabase-ben!')
      } else {
        toast.error('Hiba történt a mentés során!')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Lista betöltése
  const loadList = useCallback(async (listId: string) => {
    if (!listId || listId === '') {
      setNewListName('')
      setSelectedDate(new Date().toISOString().split('T')[0])
      setSelectedListId('')
      setCurrentItems([])
      return
    }
    
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('id', listId)
        .single()
      
      if (error) throw error
      
      if (data) {
        // Biztosítjuk, hogy az items mező mindig array legyen
        const items = Array.isArray(data.items) ? data.items : 
                     (typeof data.items === 'string' ? JSON.parse(data.items || '[]') : [])
        
        setCurrentItems(items as ShoppingItem[])
        setNewListName(data.name || '')
        setSelectedDate(data.date || new Date().toISOString().split('T')[0])
        setSelectedListId(listId)
        
        toast.success(`Bevásárlólista betöltve: ${data.name}`)
      }
    } catch (error) {
      console.error('Hiba a lista betöltésekor:', error)
      toast.error('Hiba történt a lista betöltésekor!')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  // Lista törlése
  const deleteList = async (id: string) => {
    if (!confirm('Biztosan törölni szeretnéd ezt a bevásárlólistát?')) return

    try {
      const { error } = await supabase
        .from('shopping_lists')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Bevásárlólista törölve!')
      loadSavedLists()
      
      // Ha az éppen szerkesztett listát töröljük
      if (selectedListId === id) {
        setSelectedListId('')
        setNewListName('')
        setCurrentItems([])
      }
    } catch (error) {
      console.error('Hiba a törlésnél:', error)
      toast.error('Hiba történt a törlés során!')
    }
  }

  // Árváltozás számítása és megjelenítése
  const getPriceChangeInfo = (item: ShoppingItem) => {
    if (!item.price || !item.previousPrice || item.price === item.previousPrice) {
      return null
    }
    
    const change = ((item.price - item.previousPrice) / item.previousPrice) * 100
    const isIncrease = change > 0
    
    return {
      percentage: Math.abs(change).toFixed(1),
      isIncrease,
      icon: isIncrease ? '📈' : '📉',
      color: isIncrease ? 'text-red-600' : 'text-green-600',
      bgColor: isIncrease ? 'bg-red-50' : 'bg-green-50',
      text: isIncrease ? 'drágulás' : 'árcsökkenés'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Teszt árváltozás funkció
  const addTestPriceChange = () => {
    const testItems: ShoppingItem[] = [
      {
        id: `test-increase-${Date.now()}`,
        name: '🍞 Teszt Kenyér',
        quantity: 1,
        unit: 'db',
        price: 500,
        previousPrice: 450, // 11.1% drágulás
        category: 'Pékáru',
        checked: false
      },
      {
        id: `test-decrease-${Date.now() + 1}`,
        name: '🥛 Teszt Tej',
        quantity: 1,
        unit: 'liter',
        price: 350,
        previousPrice: 400, // 12.5% árcsökkenés
        category: 'Tejtermék',
        checked: false
      }
    ]
    
    setCurrentItems(prev => [...prev, ...testItems])
    toast.success('Teszt termékek hozzáadva árváltozással!', {
      description: 'Egy drágulás és egy árcsökkenés példa'
    })
  }

  const checkedItemsCount = currentItems.filter(item => item.checked).length
  const totalItemsCount = currentItems.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-teal-500 to-green-500 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Migration Warning */}
        {migrationWarning && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 md:p-4 mb-4 md:mb-6 rounded-r-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-4 w-4 md:h-5 md:w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-2 md:ml-3">
                <p className="font-medium text-sm md:text-base">
                  Adatbázis migration szükséges!
                </p>
                <p className="text-xs md:text-sm">
                  A bevásárlólista funkcióhoz futtasd le a <code className="bg-yellow-200 px-1 rounded text-xs">supabase/migrations/005_create_shopping_lists.sql</code> fájlt a Supabase SQL Editor-ban.
                </p>
              </div>
              <div className="ml-auto pl-2 md:pl-3">
                <button
                  onClick={() => setMigrationWarning(false)}
                  className="inline-flex rounded-md bg-yellow-50 p-1 md:p-1.5 text-yellow-500 hover:bg-yellow-100"
                >
                  <span className="sr-only">Bezárás</span>
                  <svg className="h-4 w-4 md:h-5 md:w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="text-white mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3 md:mb-4">
            <ShoppingCart className="text-white" size={28} />
            <h1 className="text-2xl sm:text-3xl font-bold">Bevásárlólisták</h1>
          </div>
          <p className="text-sm sm:text-base md:text-lg">
            Készíts bevásárlólistákat és kövesd nyomon a kiadásaidat.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
          {/* Bal oldali panel - Új lista és mentett listák */}
          <div className="space-y-4 md:space-y-6 xl:order-1 order-2">
            {/* Új bevásárlólista */}
            <Card className="bg-white shadow-lg border-0">
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Plus size={18} className="text-green-600" />
                  Új bevásárlólista
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3 md:space-y-4">
                  <Input
                    placeholder="Lista neve"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    className="h-9 md:h-10 text-sm"
                  />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-9 md:h-10 text-sm"
                  />
                  <Button 
                    onClick={saveList}
                    disabled={isLoading || !currentUser}
                    className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white h-9 md:h-10 text-sm"
                  >
                    <Save size={14} className="mr-2" />
                    Létrehozás
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mentett bevásárlólisták */}
            <Card className="bg-white shadow-lg border-0">
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="text-green-600 text-base md:text-lg">Bevásárlólisták</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {savedLists.length === 0 ? (
                  <p className="text-center text-gray-500 py-4 text-sm">
                    Még nincsenek mentett bevásárlólisták
                  </p>
                ) : (
                  <div className="space-y-2 md:space-y-3">
                    {savedLists.map((list) => (
                      <div key={list.id} className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div 
                          className="flex-1 cursor-pointer min-w-0"
                          onClick={() => loadList(list.id)}
                        >
                          <div className="flex items-center gap-2">
                            <Minus className="w-3 h-3 md:w-4 md:h-4 text-gray-400 flex-shrink-0" />
                            <span className="font-medium text-gray-900 text-sm md:text-base truncate">{list.name}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(list.date).toLocaleDateString('hu-HU')}
                          </div>
                          <div className="text-xs text-gray-600">
                            {Array.isArray(list.items) ? list.items.length : 0} tétel • {formatCurrency(list.total_amount)}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                            <span className="text-xs text-green-600">
                              {Array.isArray(list.items) ? list.items.filter((item: ShoppingItem) => item.checked).length : 0}/{Array.isArray(list.items) ? list.items.length : 0}
                            </span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-600 hover:text-gray-700 p-1 md:p-2 flex-shrink-0"
                            >
                              <MoreVertical size={14} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteList(list.id);
                              }}
                              className="text-red-600 focus:text-red-700"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Törlés
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Középső panel - Heti nagybevásárlás */}
          <div className="xl:col-span-2 xl:order-2 order-1">
            <Card className="bg-white shadow-lg border-0">
              <CardHeader className="pb-3 md:pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Calendar size={18} className="text-green-600" />
                    <span className="truncate">
                      {selectedListId ? 
                        savedLists.find(l => l.id === selectedListId)?.name || 'Heti nagybevásárlás' 
                        : 'Heti nagybevásárlás'
                      }
                    </span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="p-2">
                      <QrCode size={14} />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="p-2">
                          <MoreVertical size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => loadList('')}>
                          <Plus size={14} className="mr-2" />
                          Új lista
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={toggleAllItems}>
                          <Check size={14} className="mr-2" />
                          Összes bejelölése
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addTestPriceChange()}>
                          <Plus size={14} className="mr-2" />
                          Teszt árváltozás
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardDescription className="text-xs md:text-sm">
                  {selectedDate && new Date(selectedDate).toLocaleDateString('hu-HU')}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Termék hozzáadása */}
                <div className="flex flex-col sm:flex-row gap-2 mb-4 md:mb-6">
                  <div className="flex-1">
                    <Input
                      placeholder="Termék keresése vagy hozzáadása"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addItem()}
                      className="h-9 md:h-10 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-28 md:w-32 h-9 md:h-10 text-sm">
                        <SelectValue placeholder="Kategória" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                      <SelectTrigger className="w-20 h-9 md:h-10 text-sm">
                        <SelectValue placeholder="Egység" />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={() => addItem()} className="bg-cyan-500 hover:bg-cyan-600 p-2 h-9 md:h-10">
                      <Plus size={14} />
                    </Button>
                    <Button 
                      onClick={() => addTestPriceChange()} 
                      className="bg-orange-500 hover:bg-orange-600 text-white p-2 h-9 md:h-10 hidden sm:flex"
                      title="Teszt termék hozzáadása árváltozással"
                    >
                      🧪
                    </Button>
                  </div>
                </div>

                {/* Termék javaslatok */}
                {showSuggestions && productSuggestions.length > 0 && (
                  <div className="mb-4 bg-white border rounded-lg shadow-sm">
                    <div className="p-2 md:p-3 border-b">
                      <h4 className="text-xs md:text-sm font-medium text-gray-700">Termék javaslatok az adatbázisból:</h4>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {productSuggestions.map((product) => (
                        <div 
                          key={product.id} 
                          className="flex items-center justify-between p-2 md:p-3 hover:bg-gray-50 border-b last:border-b-0 cursor-pointer"
                          onClick={() => addItem(product)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate">
                              {product.brand ? `${product.brand} ${product.name}` : product.name}
                            </div>
                            <div className="text-xs text-gray-500 flex flex-wrap items-center gap-1 md:gap-2">
                              <Badge variant="outline" className="text-xs">{product.category}</Badge>
                              {product.store_name && (
                                <span className="text-xs">• {product.store_name}</span>
                              )}
                              {product.price && (
                                <span className="text-xs">• {formatCurrency(product.price)}/{product.unit}</span>
                              )}
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="text-green-600 p-1 md:p-2 flex-shrink-0">
                            <Plus size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="p-1 md:p-2 border-t bg-gray-50">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowSuggestions(false)}
                        className="w-full text-xs text-gray-500 h-8"
                      >
                        Javaslatok elrejtése
                      </Button>
                    </div>
                  </div>
                )}

                {/* Tételek listája */}
                <div className="space-y-2 mb-4 md:mb-6">
                  {currentItems.length === 0 ? (
                    <div className="text-center py-6 md:py-8 text-gray-500">
                      <ShoppingCart size={40} className="mx-auto mb-3 md:mb-4 text-gray-300" />
                      <p className="text-sm md:text-base">Még nincsenek termékek a listán</p>
                      <p className="text-xs md:text-sm">Add hozzá az első terméket!</p>
                    </div>
                  ) : (
                    currentItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 md:gap-3 p-2 md:p-3 border rounded-lg hover:bg-gray-50">
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={(checked) => updateItem(item.id, 'checked', checked)}
                          className="flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1 md:gap-2 mb-1">
                            <span className={`font-medium text-sm md:text-base ${item.checked ? 'line-through text-gray-500' : 'text-gray-900'} truncate`}>
                              {item.name}
                            </span>
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {item.category}
                            </Badge>
                            {(() => {
                              const priceChange = getPriceChangeInfo(item)
                              return priceChange ? (
                                <div className={`flex items-center gap-1 px-1 md:px-2 py-1 rounded-full text-xs ${priceChange.bgColor} ${priceChange.color} flex-shrink-0`}>
                                  <span>{priceChange.icon}</span>
                                  <span className="font-medium">{priceChange.percentage}%</span>
                                  <span className="hidden sm:inline">{priceChange.text}</span>
                                </div>
                              ) : null
                            })()}
                          </div>
                          <div className="text-xs md:text-sm text-gray-500">
                            {item.quantity} {item.unit}
                            {item.price && ` • ${formatCurrency(item.price * item.quantity)}`}
                            {(() => {
                              const priceChange = getPriceChangeInfo(item)
                              return priceChange ? (
                                <span className="ml-2 text-xs text-gray-400 hidden sm:inline">
                                  (előző: {formatCurrency(item.previousPrice!)})
                                </span>
                              ) : null
                            })()}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateQuantity(item.id, false)}
                            className="h-7 w-7 p-0"
                          >
                            <Minus size={12} />
                          </Button>
                          <span className="w-6 md:w-8 text-center text-xs md:text-sm">{item.quantity}</span>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateQuantity(item.id, true)}
                            className="h-7 w-7 p-0"
                          >
                            <Plus size={12} />
                          </Button>
                        </div>
                        <Input
                          type="number"
                          placeholder="Ár"
                          value={item.price || ''}
                          onChange={(e) => updateItem(item.id, 'price', parseInt(e.target.value) || 0)}
                          className="w-16 md:w-20 h-7 md:h-8 text-xs flex-shrink-0"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-700 h-7 w-7 p-0 flex-shrink-0"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                {/* Receptekből hozzáadás gomb */}
                {currentItems.length > 0 && (
                  <div className="mb-4 md:mb-6">
                    <Button variant="outline" className="w-full text-cyan-600 border-cyan-600 hover:bg-cyan-50 h-9 md:h-10 text-sm">
                      <X size={14} className="mr-2" />
                      Receptekből hozzáadás
                    </Button>
                  </div>
                )}

                {/* Összegzés és mentés */}
                {currentItems.length > 0 && (
                  <div className="space-y-3 md:space-y-4">
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span>Összes tétel: {totalItemsCount}</span>
                      <span className="font-medium">Összesen: {formatCurrency(calculateTotal())}</span>
                    </div>
                    {checkedItemsCount > 0 && (
                      <div className="text-xs md:text-sm text-green-600 text-center">
                        ✓ {checkedItemsCount} tétel befejezve
                      </div>
                    )}
                    <Button 
                      onClick={saveList}
                      disabled={isLoading || !currentUser}
                      className="w-full bg-green-500 hover:bg-green-600 text-white h-9 md:h-10 text-sm"
                    >
                      <Save size={14} className="mr-2" />
                      {selectedListId ? 'Frissítés' : 'Mentés'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
