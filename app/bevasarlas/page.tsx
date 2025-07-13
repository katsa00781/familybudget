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

interface ShoppingItem {
  id: string
  name: string
  quantity: number
  unit: string
  price?: number
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
      
      if (error) throw error
      setSavedLists(data || [])
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

  // Új tétel hozzáadása
  const addItem = () => {
    if (!searchTerm.trim()) {
      toast.error('Add meg a termék nevét!')
      return
    }

    const newItem: ShoppingItem = {
      id: generateId(),
      name: searchTerm.trim(),
      quantity: 1,
      unit: selectedUnit || 'db',
      category: selectedCategory || 'Egyéb',
      checked: false
    }

    setCurrentItems(prev => [...prev, newItem])
    setSearchTerm('')
    setSelectedUnit('')
    setSelectedCategory('')
  }

  // Tétel eltávolítása
  const removeItem = (id: string) => {
    setCurrentItems(prev => prev.filter(item => item.id !== id))
  }

  // Tétel módosítása
  const updateItem = (id: string, field: keyof ShoppingItem, value: string | number | boolean) => {
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
      toast.error('Hiba történt a mentés során!')
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
        setCurrentItems(data.items as ShoppingItem[])
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const checkedItemsCount = currentItems.filter(item => item.checked).length
  const totalItemsCount = currentItems.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-teal-500 to-green-500 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-white mb-6">
          <div className="flex items-center gap-3 mb-4">
            <ShoppingCart className="text-white" size={32} />
            <h1 className="text-3xl font-bold">Bevásárlólisták</h1>
          </div>
          <p className="text-lg">
            Készíts bevásárlólistákat és kövesd nyomon a kiadásaidat.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bal oldali panel - Új lista és mentett listák */}
          <div className="space-y-6">
            {/* Új bevásárlólista */}
            <Card className="bg-white shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus size={20} className="text-green-600" />
                  Új bevásárlólista
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    placeholder="Lista neve"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                  />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                  <Button 
                    onClick={saveList}
                    disabled={isLoading || !currentUser}
                    className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white"
                  >
                    <Save size={16} className="mr-2" />
                    Létrehozás
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mentett bevásárlólisták */}
            <Card className="bg-white shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-green-600">Bevásárlólisták</CardTitle>
              </CardHeader>
              <CardContent>
                {savedLists.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    Még nincsenek mentett bevásárlólisták
                  </p>
                ) : (
                  <div className="space-y-3">
                    {savedLists.map((list) => (
                      <div key={list.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => loadList(list.id)}
                        >
                          <div className="flex items-center gap-2">
                            <Minus className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{list.name}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(list.date).toLocaleDateString('hu-HU')}
                          </div>
                          <div className="text-xs text-gray-600">
                            {list.items?.length || 0} tétel • {formatCurrency(list.total_amount)}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-green-600">
                              {list.items?.filter((item: ShoppingItem) => item.checked).length || 0}/{list.items?.length || 0}
                            </span>
                          </div>
                        </div>
                        <Button
                          onClick={() => deleteList(list.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <MoreVertical size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Középső panel - Heti nagybevásárlás */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-lg border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar size={20} className="text-green-600" />
                    {selectedListId ? 
                      savedLists.find(l => l.id === selectedListId)?.name || 'Heti nagybevásárlás' 
                      : 'Heti nagybevásárlás'
                    }
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <QrCode size={16} />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => loadList('')}>
                          <Plus size={16} className="mr-2" />
                          Új lista
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={toggleAllItems}>
                          <Check size={16} className="mr-2" />
                          Összes bejelölése
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardDescription>
                  {selectedDate && new Date(selectedDate).toLocaleDateString('hu-HU')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Termék hozzáadása */}
                <div className="flex gap-2 mb-6">
                  <div className="flex-1">
                    <Input
                      placeholder="Termék keresése vagy hozzáadása"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addItem()}
                    />
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Mennyiség" />
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
                    <SelectTrigger className="w-20">
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
                  <Button onClick={addItem} className="bg-cyan-500 hover:bg-cyan-600">
                    <Plus size={16} />
                  </Button>
                </div>

                {/* Tételek listája */}
                <div className="space-y-2 mb-6">
                  {currentItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <ShoppingCart size={48} className="mx-auto mb-4 text-gray-300" />
                      <p>Még nincsenek termékek a listán</p>
                      <p className="text-sm">Add hozzá az első terméket!</p>
                    </div>
                  ) : (
                    currentItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={(checked) => updateItem(item.id, 'checked', checked)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${item.checked ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {item.name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.quantity} {item.unit}
                            {item.price && ` • ${formatCurrency(item.price * item.quantity)}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateQuantity(item.id, false)}
                          >
                            <Minus size={14} />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateQuantity(item.id, true)}
                          >
                            <Plus size={14} />
                          </Button>
                        </div>
                        <Input
                          type="number"
                          placeholder="Ár"
                          value={item.price || ''}
                          onChange={(e) => updateItem(item.id, 'price', parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                {/* Receptekből hozzáadás gomb */}
                {currentItems.length > 0 && (
                  <div className="mb-6">
                    <Button variant="outline" className="w-full text-cyan-600 border-cyan-600 hover:bg-cyan-50">
                      <X size={16} className="mr-2" />
                      Receptekből hozzáadás
                    </Button>
                  </div>
                )}

                {/* Összegzés és mentés */}
                {currentItems.length > 0 && (
                  <div className="space-y-4">
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span>Összes tétel: {totalItemsCount}</span>
                      <span>Összesen: {formatCurrency(calculateTotal())}</span>
                    </div>
                    {checkedItemsCount > 0 && (
                      <div className="text-sm text-green-600 text-center">
                        ✓ {checkedItemsCount} tétel befejezve
                      </div>
                    )}
                    <Button 
                      onClick={saveList}
                      disabled={isLoading || !currentUser}
                      className="w-full bg-green-500 hover:bg-green-600 text-white"
                    >
                      <Save size={16} className="mr-2" />
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
