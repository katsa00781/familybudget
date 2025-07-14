"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/utils/supabase/client';
import { useUserProfile } from '@/src/hooks/useUserProfile';
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  ShoppingCart, BarChart2,
  Wallet, TrendingUp, TrendingDown, Target,
  PiggyBank, ChefHat, Calculator
} from 'lucide-react';

interface BudgetItem {
  name: string;
  amount: number;
  category?: string;
  description?: string;
}

interface OtherIncome {
  name: string;
  amount: number;
  description?: string;
}

interface BudgetPlan {
  id: string;
  name: string;
  total_amount: number;
  budget_data: BudgetItem[];
}

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  category: string;
}

interface ShoppingList {
  id: string;
  name: string;
  items: { id: string; name: string; amount: number; checked: boolean }[];
  total_amount: number;
  date: string;
}

interface IncomePlan {
  id: string;
  base_income: number;
  other_income: OtherIncome[];
  total_income: number;
}

export default function Dashboard() {
  const [budgetPlans, setBudgetPlans] = useState<BudgetPlan[]>([]);
  const [incomePlans, setIncomePlans] = useState<IncomePlan[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  const { getUserDisplayName } = useUserProfile();
  const supabase = createClient();

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadData = async () => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);

      // Költségvetési tervek betöltése - csak a felhasználó saját tervei
      const { data: budgetData } = await supabase
        .from('budget_plans')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(1);

      // Bevételi tervek betöltése
      const { data: incomeData } = await supabase
        .from('income_plans')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(1);

      // Megtakarítási célok betöltése
      const { data: savingsData } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      // Mai bevásárló listák betöltése
      const today = new Date().toISOString().split('T')[0];
      const { data: shoppingData } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('date', today)
        .order('created_at', { ascending: false });

      setBudgetPlans(budgetData || []);
      setIncomePlans(incomeData || []);
      setSavingsGoals(savingsData || []);
      setShoppingLists(shoppingData || []);
      
      console.log('Dashboard data loaded:', {
        budgetData,
        incomeData,
        savingsData,
        shoppingData
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // Számítások
  const currentBudget = budgetPlans[0];
  const currentIncome = incomePlans[0];
  
  const totalIncome = currentIncome?.total_income || 0;
  const totalExpenses = currentBudget?.total_amount || 0;
  const balance = totalIncome - totalExpenses;

  // Költségvetési kategóriák a pie chart-hoz
  const getBudgetCategories = () => {
    if (!currentBudget?.budget_data) return [];
    
    const categories = currentBudget.budget_data.reduce((acc: Record<string, number>, item: BudgetItem) => {
      const category = item.category || 'Egyéb';
      acc[category] = (acc[category] || 0) + item.amount;
      return acc;
    }, {});

    const colors = ['#1fb6ff', '#00d4aa', '#ff9500', '#a855f7', '#f43f5e', '#10b981', '#8b5cf6'];
    
    return Object.entries(categories).map(([name, value], index) => ({
      name,
      value: value as number,
      color: colors[index % colors.length]
    }));
  };

  // Szükséglet, vágyak, megtakarítás százalékos eloszlása
  const getBudgetBreakdown = () => {
    if (!currentBudget?.budget_data) return [];

    const needs = currentBudget.budget_data
      .filter((item: BudgetItem) => ['Lakhatás', 'Élelmiszer', 'Közlekedés', 'Egészség'].includes(item.category || ''))
      .reduce((sum: number, item: BudgetItem) => sum + item.amount, 0);

    const wants = currentBudget.budget_data
      .filter((item: BudgetItem) => ['Szórakozás', 'Hobbi', 'Utazás', 'Ruházat'].includes(item.category || ''))
      .reduce((sum: number, item: BudgetItem) => sum + item.amount, 0);

    const totalSavings = savingsGoals.reduce((sum, goal) => sum + goal.current_amount, 0);

    const total = needs + wants + totalSavings;
    if (total === 0) return [];

    return [
      { name: 'Szükségletek', value: needs, percentage: ((needs / total) * 100).toFixed(1), color: '#10b981' },
      { name: 'Vágyak', value: wants, percentage: ((wants / total) * 100).toFixed(1), color: '#8b5cf6' },
      { name: 'Megtakarítások', value: totalSavings, percentage: ((totalSavings / total) * 100).toFixed(1), color: '#f59e0b' }
    ];
  };

  // Havi trend adatok (dummy data, később lehet bővíteni)
  const getMonthlyTrend = () => {
    const days = Array.from({ length: 30 }, (_, i) => i + 1);
    return days.map(day => ({
      name: day.toString(),
      Bevételek: totalIncome * (day / 30),
      Kiadások: totalExpenses * (day / 30)
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const categoryData = getBudgetCategories();
  const budgetBreakdown = getBudgetBreakdown();
  const monthlyData = getMonthlyTrend();
  const todayShoppingTotal = shoppingLists.reduce((sum, list) => sum + (list.total_amount || 0), 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-teal-500 to-green-500 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-lg">Adatok betöltése...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-teal-500 to-green-500 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Fejléc */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-4xl font-bold text-white">Családi Költségvetés</h1>
          <p className="text-cyan-100">
            {currentUser ? `Üdvözöljük, ${getUserDisplayName()}!` : 'Áttekintés a pénzügyi helyzetről'}
          </p>
        </div>

        {/* Főbb mutatók */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/90 backdrop-blur-sm hover:bg-white/95 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Havi bevétel</CardTitle>
              <TrendingUp className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-700">
                {formatCurrency(totalIncome)}
              </div>
              <p className="text-xs text-teal-600 mt-2">
                {currentIncome ? 'Aktuális terv alapján' : 'Nincs bevételi terv'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm hover:bg-white/95 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Havi kiadás</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalExpenses)}
              </div>
              <p className="text-xs text-red-500 mt-2">
                {currentBudget ? 'Tervezett kiadások' : 'Nincs költségvetési terv'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm hover:bg-white/95 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Egyenleg</CardTitle>
              <Wallet className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(balance)}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Bevétel - Kiadás
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm hover:bg-white/95 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Mai bevásárlás</CardTitle>
              <ShoppingCart className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(todayShoppingTotal)}
              </div>
              <p className="text-xs text-blue-500 mt-2">
                {shoppingLists.length} lista ma
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Megtakarítási célok és gyors műveletek */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-teal-700">
                <Target className="h-5 w-5" />
                Megtakarítási Célok
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {savingsGoals.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Még nincsenek megtakarítási célok</p>
              ) : (
                savingsGoals.slice(0, 3).map((goal) => {
                  const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
                  return (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-800">{goal.name}</span>
                        <span className="text-sm text-gray-600">
                          {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-teal-500 to-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{progress.toFixed(1)}% teljesítve</span>
                        <span>Határidő: {new Date(goal.target_date).toLocaleDateString('hu-HU')}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-teal-700">Gyors műveletek</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                <Calculator className="mr-2 h-4 w-4" />
                Bérkalkulátor
              </Button>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Új bevásárlólista
              </Button>
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                <ChefHat className="mr-2 h-4 w-4" />
                Receptek
              </Button>
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                <PiggyBank className="mr-2 h-4 w-4" />
                Megtakarítások
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Aktuális költségvetési terv */}
        {currentBudget && (
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-teal-700">
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5" />
                  Aktuális Költségvetési Terv
                </div>
                <Badge className="bg-teal-100 text-teal-700 text-sm">
                  {currentBudget.name}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentBudget.budget_data && currentBudget.budget_data.length > 0 ? (
                  currentBudget.budget_data.map((item: BudgetItem, index: number) => (
                    <div key={index} className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-800">{item.name || 'Névtelen tétel'}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.category || 'Egyéb'}
                        </Badge>
                      </div>
                      <div className="text-lg font-bold text-teal-600">
                        {formatCurrency(item.amount || 0)}
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500">A költségvetési tervben nincsenek tételek</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 p-4 bg-gradient-to-r from-teal-50 to-green-50 rounded-lg border border-teal-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Összes tervezett kiadás:</span>
                  <span className="text-xl font-bold text-teal-700">
                    {formatCurrency(totalExpenses)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-600">Tételek száma:</span>
                  <span className="text-sm font-medium text-gray-700">
                    {currentBudget.budget_data ? currentBudget.budget_data.length : 0} db
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Aktuális bevételi terv */}
        {currentIncome && (
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-teal-700">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Aktuális Bevételi Terv
                </div>
                <Badge className="bg-green-100 text-green-700 text-sm">
                  Bevételi terv
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-800">Alapbér</span>
                    <span className="text-lg font-bold text-green-600">
                      {formatCurrency(currentIncome.base_income || 0)}
                    </span>
                  </div>
                </div>
                
                {currentIncome.other_income && currentIncome.other_income.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">További bevételek:</h4>
                    {currentIncome.other_income.map((income: OtherIncome, index: number) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-800">
                            {income.name || 'Névtelen bevétel'}
                          </span>
                          <span className="font-bold text-green-600">
                            {formatCurrency(income.amount || 0)}
                          </span>
                        </div>
                        {income.description && (
                          <p className="text-xs text-gray-600 mt-1">{income.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Összes bevétel:</span>
                    <span className="text-xl font-bold text-green-700">
                      {formatCurrency(totalIncome)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Költségvetési breakdown és kategóriák */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {budgetBreakdown.length > 0 && (
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-teal-700">50/30/20 Szabály</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {budgetBreakdown.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="font-medium text-gray-800">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-800">{item.percentage}%</div>
                        <div className="text-sm text-gray-600">{formatCurrency(item.value)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {categoryData.length > 0 && (
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-teal-700">Kategóriák szerinti bontás</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${formatCurrency(value || 0)}`}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Havi trend grafikon */}
        {(totalIncome > 0 || totalExpenses > 0) && (
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-teal-700">
                <BarChart2 className="h-5 w-5" />
                Havi trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Line 
                      type="monotone" 
                      dataKey="Bevételek" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Kiadások" 
                      stroke="#ef4444" 
                      strokeWidth={3}
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Üres állapot, ha nincs adat */}
        {!currentBudget && !currentIncome && savingsGoals.length === 0 && (
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardContent className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <BarChart2 className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Kezdje el a költségvetés tervezését!
              </h3>
              <p className="text-gray-500 mb-6">
                Hozzon létre bevételi és költségvetési terveket a részletes áttekintéshez.
              </p>
              <div className="flex gap-4 justify-center">
                <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                  Bevételi terv létrehozása
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Költségvetési terv
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
