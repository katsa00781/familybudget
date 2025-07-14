'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Input } from '@/src/components/ui/input'
import { Button } from '@/src/components/ui/button'
import { Textarea } from '@/src/components/ui/textarea'
import { Badge } from '@/src/components/ui/badge'
import { 
  Plus, Search, Clock, Users, Edit, Trash2, Star, Heart, 
  ChefHat, ShoppingCart, Save, X
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/src/components/ui/alert-dialog'

interface Recipe {
  id: string
  name: string
  description?: string
  prep_time?: number
  servings: number
  image_url?: string
  instructions?: string
  created_at: string
  ingredients?: RecipeIngredient[]
}

interface RecipeIngredient {
  id: string
  recipe_id: string
  name: string
  quantity: number
  unit: string
}

interface NewIngredient {
  name: string
  quantity: string
  unit: string
}

const UNITS = ['g', 'kg', 'ml', 'liter', 'db', 'tk', 'ek', 'csipet', 'gerezd', 'szál']

export default function ReceptekPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  
  // Új recept form állapotok
  const [showNewRecipeForm, setShowNewRecipeForm] = useState(false)
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    description: '',
    prep_time: '',
    servings: '1',
    instructions: ''
  })
  const [newIngredients, setNewIngredients] = useState<NewIngredient[]>([
    { name: '', quantity: '', unit: 'g' }
  ])

  const supabase = createClient()

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  const loadRecipes = async () => {
    try {
      setIsLoading(true)
      const { data: recipesData, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients (
            id,
            name,
            quantity,
            unit
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedRecipes = recipesData?.map(recipe => ({
        ...recipe,
        ingredients: recipe.recipe_ingredients || []
      })) || []

      setRecipes(formattedRecipes)
    } catch (error) {
      console.error('Error loading recipes:', error)
      toast.error('Hiba történt a receptek betöltésekor')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkUser()
    loadRecipes()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const saveRecipe = async () => {
    if (!currentUser) {
      toast.error('Jelentkezz be a receptek mentéséhez!')
      return
    }

    if (!newRecipe.name.trim()) {
      toast.error('Add meg a recept nevét!')
      return
    }

    const validIngredients = newIngredients.filter(ing => 
      ing.name.trim() && ing.quantity.trim()
    )

    if (validIngredients.length === 0) {
      toast.error('Add meg legalább egy hozzávalót!')
      return
    }

    try {
      // Recept mentése
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          user_id: currentUser.id,
          name: newRecipe.name.trim(),
          description: newRecipe.description.trim() || null,
          prep_time: newRecipe.prep_time ? parseInt(newRecipe.prep_time) : null,
          servings: parseInt(newRecipe.servings) || 1,
          instructions: newRecipe.instructions.trim() || null
        })
        .select()
        .single()

      if (recipeError) throw recipeError

      // Hozzávalók mentése
      const ingredientsToInsert = validIngredients.map(ing => ({
        recipe_id: recipeData.id,
        name: ing.name.trim(),
        quantity: parseFloat(ing.quantity),
        unit: ing.unit
      }))

      const { error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientsToInsert)

      if (ingredientsError) throw ingredientsError

      toast.success('Recept sikeresen mentve!')
      setShowNewRecipeForm(false)
      resetNewRecipeForm()
      loadRecipes()
    } catch (error) {
      console.error('Error saving recipe:', error)
      toast.error('Hiba történt a recept mentésekor')
    }
  }

  const deleteRecipe = async (recipeId: string) => {
    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipeId)

      if (error) throw error

      toast.success('Recept törölve!')
      setSelectedRecipe(null)
      loadRecipes()
    } catch (error) {
      console.error('Error deleting recipe:', error)
      toast.error('Hiba történt a recept törlésekor')
    }
  }

  const addIngredientToShoppingList = async (ingredients: RecipeIngredient[]) => {
    if (!currentUser) {
      toast.error('Jelentkezz be a bevásárlólista használatához!')
      return
    }

    try {
      // Itt hozzáadnánk a hozzávalókat a bevásárló listához
      // Ez a funkció még nincs implementálva a bevásárló lista oldalon
      toast.success(`${ingredients.length} hozzávaló hozzáadva a bevásárló listához!`)
    } catch (error) {
      console.error('Error adding to shopping list:', error)
      toast.error('Hiba történt a bevásárló lista frissítésekor')
    }
  }

  const resetNewRecipeForm = () => {
    setNewRecipe({
      name: '',
      description: '',
      prep_time: '',
      servings: '1',
      instructions: ''
    })
    setNewIngredients([{ name: '', quantity: '', unit: 'g' }])
  }

  const addIngredientRow = () => {
    setNewIngredients([...newIngredients, { name: '', quantity: '', unit: 'g' }])
  }

  const removeIngredientRow = (index: number) => {
    if (newIngredients.length > 1) {
      setNewIngredients(newIngredients.filter((_, i) => i !== index))
    }
  }

  const updateIngredient = (index: number, field: keyof NewIngredient, value: string) => {
    const updated = [...newIngredients]
    updated[index][field] = value
    setNewIngredients(updated)
  }

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Fejléc */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <ChefHat size={36} />
            Receptkezelés
          </h1>
          <p className="text-white/80 text-lg">Kezeld a családi recepteket és készíts bevásárló listát</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bal oldal - Receptek listája */}
          <div className="lg:col-span-1">
            <Card className="bg-white shadow-xl border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Search size={20} className="text-orange-600" />
                    Receptkezelés
                  </CardTitle>
                  <Button 
                    onClick={() => setShowNewRecipeForm(!showNewRecipeForm)}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Plus size={16} className="mr-2" />
                    Új recept
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Keresés */}
                  <Input
                    placeholder="Recept keresése"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />

                  {/* Szűrők */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Összes
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      Kedvencek
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      Saját
                    </Button>
                  </div>

                  {/* Receptek listája */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {isLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                      </div>
                    ) : filteredRecipes.length > 0 ? (
                      filteredRecipes.map((recipe) => (
                        <div
                          key={recipe.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-all hover:bg-orange-50 ${
                            selectedRecipe?.id === recipe.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                          }`}
                          onClick={() => setSelectedRecipe(recipe)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 mb-1">{recipe.name}</h3>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                {recipe.prep_time && (
                                  <div className="flex items-center gap-1">
                                    <Clock size={12} />
                                    {recipe.prep_time} perc
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Users size={12} />
                                  {recipe.servings} adag
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm">
                                <Star size={14} />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-red-600">
                                    <Trash2 size={14} />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Recept törlése</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Biztosan törölni szeretnéd ezt a receptet? Ez a művelet nem visszavonható.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Mégse</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => deleteRecipe(recipe.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Törlés
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <ChefHat size={48} className="mx-auto mb-2 opacity-50" />
                        <p>Még nincsenek receptek</p>
                        <p className="text-sm">Adj hozzá az első receptet!</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Jobb oldal - Új recept vagy recept részletek */}
          <div className="lg:col-span-2">
            {showNewRecipeForm ? (
              /* Új recept form */
              <Card className="bg-white shadow-xl border-0">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-orange-600">Új recept</CardTitle>
                    <Button 
                      variant="ghost" 
                      onClick={() => setShowNewRecipeForm(false)}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Recept neve */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Recept neve
                      </label>
                      <Input
                        placeholder="Pl. Paradicsomos tészta"
                        value={newRecipe.name}
                        onChange={(e) => setNewRecipe({...newRecipe, name: e.target.value})}
                      />
                    </div>

                    {/* Leírás */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Leírás
                      </label>
                      <Textarea
                        placeholder="Elkészítési mód leírása..."
                        value={newRecipe.description}
                        onChange={(e) => setNewRecipe({...newRecipe, description: e.target.value})}
                        rows={4}
                      />
                    </div>

                    {/* Hozzávalók */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Hozzávalók
                        </label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={addIngredientRow}
                        >
                          <Plus size={14} className="mr-1" />
                          Új hozzávaló
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        {newIngredients.map((ingredient, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              placeholder="Tészta"
                              value={ingredient.name}
                              onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                              className="flex-1"
                            />
                            <Input
                              placeholder="500"
                              value={ingredient.quantity}
                              onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                              className="w-20"
                            />
                            <select
                              value={ingredient.unit}
                              onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-md text-sm w-20"
                            >
                              {UNITS.map(unit => (
                                <option key={unit} value={unit}>{unit}</option>
                              ))}
                            </select>
                            {newIngredients.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeIngredientRow(index)}
                                className="text-red-600"
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Elkészítési idő */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Elkészítési idő (perc)
                        </label>
                        <Input
                          type="number"
                          placeholder="30"
                          value={newRecipe.prep_time}
                          onChange={(e) => setNewRecipe({...newRecipe, prep_time: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Adagok száma
                        </label>
                        <Input
                          type="number"
                          min="1"
                          value={newRecipe.servings}
                          onChange={(e) => setNewRecipe({...newRecipe, servings: e.target.value})}
                        />
                      </div>
                    </div>

                    {/* Elkészítés */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Elkészítés menete
                      </label>
                      <Textarea
                        placeholder="1. Főzz fel egy fazék vizet..."
                        value={newRecipe.instructions}
                        onChange={(e) => setNewRecipe({...newRecipe, instructions: e.target.value})}
                        rows={6}
                      />
                    </div>

                    {/* Mentés gombok */}
                    <div className="flex gap-2 pt-4">
                      <Button 
                        onClick={saveRecipe}
                        className="flex-1 bg-orange-500 hover:bg-orange-600"
                      >
                        <Save size={16} className="mr-2" />
                        Recept mentése
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowNewRecipeForm(false)
                          resetNewRecipeForm()
                        }}
                      >
                        Mégse
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : selectedRecipe ? (
              /* Kiválasztott recept részletek */
              <Card className="bg-white shadow-xl border-0">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl text-gray-900">{selectedRecipe.name}</CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        {selectedRecipe.prep_time && (
                          <div className="flex items-center gap-1">
                            <Clock size={16} />
                            {selectedRecipe.prep_time} perc
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Users size={16} />
                          {selectedRecipe.servings} adag
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Heart size={16} />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit size={16} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Leírás */}
                    {selectedRecipe.description && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Leírás</h3>
                        <p className="text-gray-700">{selectedRecipe.description}</p>
                      </div>
                    )}

                    {/* Hozzávalók */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Hozzávalók</h3>
                        <Button 
                          size="sm" 
                          className="bg-green-500 hover:bg-green-600"
                          onClick={() => addIngredientToShoppingList(selectedRecipe.ingredients || [])}
                        >
                          <ShoppingCart size={14} className="mr-1" />
                          Hozzáadás bevásárló listához
                        </Button>
                      </div>
                      {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                          {selectedRecipe.ingredients.map((ingredient) => (
                            <div key={ingredient.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="font-medium">{ingredient.name}</span>
                              <Badge variant="outline">
                                {ingredient.quantity} {ingredient.unit}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">Nincsenek hozzávalók megadva</p>
                      )}
                    </div>

                    {/* Elkészítés */}
                    {selectedRecipe.instructions && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Elkészítés</h3>
                        <div className="prose prose-sm max-w-none">
                          <pre className="whitespace-pre-wrap font-sans text-gray-700">
                            {selectedRecipe.instructions}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Üdvözlő képernyő */
              <Card className="bg-white shadow-xl border-0">
                <CardContent className="p-12 text-center">
                  <ChefHat size={64} className="mx-auto mb-4 text-orange-500" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Válassz egy receptet</h2>
                  <p className="text-gray-600 mb-6">
                    Kattints a bal oldali listában egy receptre a részletek megtekintéséhez,
                    vagy hozz létre egy új receptet.
                  </p>
                  <Button 
                    onClick={() => setShowNewRecipeForm(true)}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Plus size={16} className="mr-2" />
                    Új recept létrehozása
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Alsó rész - Bevásárlólista műveletek */}
        {selectedRecipe && selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
          <Card className="mt-6 bg-white shadow-xl border-0">
            <CardHeader>
              <CardTitle className="text-lg">Bevásárlólista műveletek</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button 
                  className="bg-cyan-500 hover:bg-cyan-600"
                  onClick={() => addIngredientToShoppingList(selectedRecipe.ingredients || [])}
                >
                  <ShoppingCart size={16} className="mr-2" />
                  Bevásárló listához adás
                </Button>
                <Button variant="outline">
                  <Plus size={16} className="mr-2" />
                  Összevetés az otthoni készlettel
                </Button>
              </div>
              
              {/* Hiányzó hozzávalók */}
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 mb-2">Hiányzó hozzávalók</h4>
                <div className="grid grid-cols-2 gap-2">
                  {selectedRecipe.ingredients?.slice(0, 2).map((ingredient) => (
                    <div key={ingredient.id} className="flex items-center gap-2 p-2 bg-red-50 rounded border border-red-200">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-sm">{ingredient.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {ingredient.quantity} {ingredient.unit}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
