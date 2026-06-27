"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/utils/supabase/client';
import { useUserProfile } from '@/src/hooks/useUserProfile';
import { getActiveIncomePlan, getActiveBudgetPlan } from '@/lib/userPreferences';
import { fetchWalletMonthlySpending, type WalletMonthlyResponse } from '@/lib/walletApi';
import { resolveWalletCategory } from '@/lib/walletCategories';
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
  PiggyBank, ChefHat, Calculator, Calendar
} from 'lucide-react';

interface BudgetItem {
  id: string;
  category: string;
  type: 'Szükséglet' | 'Vágyak' | 'Megtakarítás' | '' | null;
  subcategory: string;
  amount: number;
}

interface OtherIncome {
  name: string;
  amount: number;
  description?: string;
}

interface BudgetCategory {
  name: string;
  items: BudgetItem[];
  walletCategories?: string[]; // Wallet kategória UUID-k tömbje
}

interface BudgetStorageV2 {
  version: 'v2';
  categories: BudgetCategory[];
  transferPlan?: unknown;
}

type BudgetStoragePayload = BudgetCategory[] | BudgetItem[] | BudgetStorageV2;

interface BudgetPlan {
  id: string;
  name: string;
  total_amount: number;
  budget_data: BudgetStoragePayload; // Támogatjuk mindhárom formátumot
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
  const [walletData, setWalletData] = useState<WalletMonthlyResponse | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Aktuális hónap kulcsa (YYYY-MM) és magyar megnevezése a Wallet tényadathoz
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthLabel = now.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' });

  const { getUserDisplayName } = useUserProfile();
  const supabase = createClient();
  const router = useRouter();

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    setCurrentUser(user);
  };

  const loadData = async () => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);

      // Költségvetési tervek betöltése - AKTÍV terv
      const activeBudgetPlan = await getActiveBudgetPlan(currentUser.id);
      
      // Ha van aktív terv, használjuk azt, különben az utolsót
      const budgetDataToUse = activeBudgetPlan ? [activeBudgetPlan] : null;

      // Bevételi tervek betöltése az income_plans táblából - AKTÍV terv
      const activeIncomePlan = await getActiveIncomePlan(currentUser.id);
      
      // Ha van aktív terv, használjuk azt, különben az utolsót
      const incomeDataToUse = activeIncomePlan ? [activeIncomePlan] : null;

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

      setBudgetPlans(budgetDataToUse || []);
      
      // Income plans feldolgozása - az aktív income_plan használata
      if (incomeDataToUse && incomeDataToUse.length > 0) {
        const latestIncome = incomeDataToUse[0];
        
        // Additional incomes parse-olása
        let additionalIncomes: OtherIncome[] = [];
        try {
          if (latestIncome.additional_incomes) {
            const parsed = typeof latestIncome.additional_incomes === 'string' 
              ? JSON.parse(latestIncome.additional_incomes)
              : latestIncome.additional_incomes;
            
            if (Array.isArray(parsed)) {
              additionalIncomes = parsed.map((income: { name?: string; amount?: number; description?: string }) => ({
                name: income.name || 'Egyéb jövedelem',
                amount: income.amount || 0,
                description: income.description || ''
              }));
            }
          }
        } catch (error) {
          console.warn('Error parsing additional incomes:', error);
        }

        // IncomePlan objektum összeállítása az income_plans táblából
        const incomeFromPlans: IncomePlan = {
          id: latestIncome.id,
          base_income: latestIncome.monthly_income || 0,  // monthly_income mező használata
          other_income: additionalIncomes,               // additional_incomes mező használata
          total_income: latestIncome.total_income || 0   // total_income mező használata
        };

        setIncomePlans([incomeFromPlans]);
      } else {
        setIncomePlans([]);
      }
      
      setSavingsGoals(savingsData || []);
      setShoppingLists(shoppingData || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Wallet havi tényadat betöltése (aktuális hónap) — a kezdőlap fő mutatóihoz
  const loadWalletData = async () => {
    try {
      setWalletLoading(true);
      setWalletError(null);
      const data = await fetchWalletMonthlySpending(currentMonthKey);
      setWalletData(data);
    } catch (error) {
      console.error('Error loading Wallet monthly data:', error);
      setWalletError(error instanceof Error ? error.message : 'Nem sikerült lekérni a Wallet adatokat');
      setWalletData(null);
    } finally {
      setWalletLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
      loadWalletData();
    }
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // Számítások
  const currentBudget = budgetPlans[0];
  const currentIncome = incomePlans[0];

  // Tényleges havi értékek a Wallet-ből (a kezdőlap fő mutatói ezt jelenítik meg)
  const actualIncome = walletData?.totalIncome || 0;
  const actualExpenses = walletData?.totalExpense || 0;
  const actualBalance = actualIncome - actualExpenses;

  // Tényleges havi kiadás-kategóriák a pie chart-hoz (Wallet adatból, magyar nevekkel)
  const getActualCategories = () => {
    const categories = walletData?.categories ?? [];
    const colors = ['#1fb6ff', '#00d4aa', '#ff9500', '#a855f7', '#f43f5e', '#10b981', '#8b5cf6'];

    return categories
      .filter((cat) => cat.expense > 0)
      .map((cat) => {
        const { name } = resolveWalletCategory(cat.categoryId, cat.categoryName);
        return { name, value: cat.expense };
      })
      .sort((a, b) => b.value - a.value)
      .map((cat, index) => ({ ...cat, color: colors[index % colors.length] }));
  };

  // Havi trend adatok — a Wallet napi bontásából göngyölített (kumulált) bevétel/kiadás
  const getMonthlyTrend = () => {
    const daily = walletData?.daily;
    if (daily && daily.length > 0) {
      let cumIncome = 0;
      let cumExpense = 0;
      return daily.map((d) => {
        cumIncome += d.income;
        cumExpense += d.expense;
        return {
          name: String(d.day),
          Bevételek: cumIncome,
          Kiadások: cumExpense,
        };
      });
    }
    // Visszaesés: lineáris vetület, ha a napi adat nem érhető el (régebbi Edge Function)
    const days = Array.from({ length: 30 }, (_, i) => i + 1);
    return days.map(day => ({
      name: day.toString(),
      Bevételek: actualIncome * (day / 30),
      Kiadások: actualExpenses * (day / 30)
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

  const categoryData = getActualCategories();
  const monthlyData = getMonthlyTrend();
  const todayShoppingTotal = shoppingLists.reduce((sum, list) => sum + (list.total_amount || 0), 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50 p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-teal-500/20 to-emerald-500/20 animate-gradient"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-700 text-lg font-semibold">Adatok betöltése...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50 p-3 sm:p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-teal-500/20 to-emerald-500/20 animate-gradient"></div>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 relative z-10">
        {/* Fejléc */}
        <div className="text-center space-y-2 mb-6 sm:mb-8 bg-white/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent tracking-tight">Családi Költségvetés</h1>
          <p className="text-gray-600 text-sm sm:text-base px-4 font-medium leading-relaxed">
            {currentUser ? `Üdvözöljük, ${getUserDisplayName()}!` : 'Áttekintés a pénzügyi helyzetről'}
          </p>
        </div>

        {/* Főbb mutatók */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 hover:shadow-emerald-500/30 hover:scale-105 transition-all duration-300 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-semibold text-gray-600">Havi bevétel</CardTitle>
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent tabular-nums">
                {walletLoading ? '…' : formatCurrency(actualIncome)}
              </div>
              <p className="text-xs text-emerald-600 mt-2 font-medium">
                {walletError ? 'Wallet adat nem elérhető' : `Tényleges – ${currentMonthLabel}`}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 hover:shadow-red-500/30 hover:scale-105 transition-all duration-300 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-semibold text-gray-600">Havi kiadás</CardTitle>
              <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl">
                <TrendingDown className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-red-500 to-rose-600 bg-clip-text text-transparent tabular-nums">
                {walletLoading ? '…' : formatCurrency(actualExpenses)}
              </div>
              <p className="text-xs text-red-500 mt-2 font-medium">
                {walletError ? 'Wallet adat nem elérhető' : `Tényleges – ${currentMonthLabel}`}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 hover:shadow-green-500/30 hover:scale-105 transition-all duration-300 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-semibold text-gray-600">Egyenleg</CardTitle>
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                <Wallet className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-lg sm:text-2xl lg:text-3xl font-extrabold tabular-nums ${actualBalance >= 0 ? 'bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent' : 'bg-gradient-to-r from-red-500 to-rose-600 bg-clip-text text-transparent'}`}>
                {walletLoading ? '…' : formatCurrency(actualBalance)}
              </div>
              <p className="text-xs text-gray-500 mt-2 font-medium">
                Tényleges bevétel − kiadás
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 hover:shadow-blue-500/30 hover:scale-105 transition-all duration-300 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-semibold text-gray-600">Mai bevásárlás</CardTitle>
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <ShoppingCart className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tabular-nums">
                {formatCurrency(todayShoppingTotal)}
              </div>
              <p className="text-xs text-blue-500 mt-2 font-medium">
                {shoppingLists.length} lista ma
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Megtakarítási célok és gyors műveletek */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="lg:col-span-2 bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 hover:shadow-emerald-500/20 transition-all duration-300 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Megtakarítási Célok</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {savingsGoals.length === 0 ? (
                <p className="text-gray-500 text-center py-4 text-sm sm:text-base">Még nincsenek megtakarítási célok</p>
              ) : (
                savingsGoals.slice(0, 3).map((goal) => {
                  const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
                  return (
                    <div key={goal.id} className="space-y-2 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 hover:shadow-md transition-all">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span className="font-semibold text-gray-900 text-sm sm:text-base truncate flex-1 min-w-0">{goal.name}</span>
                        <span className="text-xs sm:text-sm text-gray-700 font-medium whitespace-nowrap tabular-nums">
                          {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2.5 rounded-full transition-all duration-300 shadow-md"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 font-medium">
                        <span>{progress.toFixed(1)}% teljesítve</span>
                        <span>Határidő: {new Date(goal.target_date).toLocaleDateString('hu-HU')}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 hover:shadow-blue-500/20 transition-all duration-300 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg font-bold">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                    <BarChart2 className="h-4 w-4 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Gyors műveletek</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 sm:p-6">
              <a href="/berkalkulator" className="block">
                <Button className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white py-2 sm:py-3 text-sm sm:text-base shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 rounded-xl font-semibold">
                  <Calculator className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Bérkalkulátor
                </Button>
              </a>
              <a href="/bevasarlas-quick" className="block">
                <Button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-2 sm:py-3 text-sm sm:text-base shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 rounded-xl font-semibold">
                  <ShoppingCart className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Bevásárlólista
                </Button>
              </a>
              <a href="/statisztika" className="block">
                <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-2 sm:py-3 text-sm sm:text-base shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 rounded-xl font-semibold">
                  <BarChart2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Statisztika
                </Button>
              </a>
              <a href="/eves-koltsegvetes" className="block">
                <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white py-2 sm:py-3 text-sm sm:text-base shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 rounded-xl font-semibold">
                  <Calendar className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Éves költségvetés
                </Button>
              </a>
              <a href="/receptek" className="block">
                <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white py-2 sm:py-3 text-sm sm:text-base shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 rounded-xl font-semibold">
                  <ChefHat className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Receptek
                </Button>
              </a>
              <a href="/jelentesek" className="block">
                <Button className="w-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white py-2 sm:py-3 text-sm sm:text-base shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 rounded-xl font-semibold">
                  <PiggyBank className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Megtakarítások
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>

        {/* Tényleges havi bevétel/kiadás összevetés (Wallet) */}
        <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 hover:shadow-emerald-500/20 transition-all duration-300 rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent font-bold">Havi tényleges (Wallet)</span>
              </div>
              <Badge className="bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 text-sm border border-emerald-300 font-semibold">
                {currentMonthLabel}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {walletLoading ? (
              <p className="text-gray-500 text-center py-6 text-sm sm:text-base">Wallet adatok betöltése…</p>
            ) : walletError ? (
              <p className="text-red-500 text-center py-6 text-sm sm:text-base">{walletError}</p>
            ) : (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Tényleges bevétel:</span>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(actualIncome)}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Tényleges kiadás:</span>
                  <span className="text-lg font-bold text-red-600">
                    {formatCurrency(actualExpenses)}
                  </span>
                </div>
                <hr className="my-2 border-gray-300" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Egyenleg:</span>
                  <span className={`text-lg font-bold ${actualBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {actualBalance >= 0 ? '+' : ''}{formatCurrency(actualBalance)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tényleges kiadások kategóriánként (Wallet) */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {categoryData.length > 0 && (
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-teal-700 text-base sm:text-lg">Tényleges kiadások kategóriánként – {currentMonthLabel}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-1 xl:grid-cols-2 lg:gap-6">
                  {/* Pie Chart */}
                  <div className="h-48 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          outerRadius={window.innerWidth < 640 ? 60 : 80}
                          fill="#8884d8"
                          dataKey="value"
                          label={false} // Kikapcsoljuk a label-eket a chart-on
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => formatCurrency(value as number)} 
                          labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Legenda külön oszlopban */}
                  <div className="space-y-2 sm:space-y-3">
                    <h4 className="font-semibold text-gray-800 text-sm mb-2 sm:mb-3">Kategóriák:</h4>
                    {categoryData.map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <div 
                            className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: category.color }}
                          ></div>
                          <span className="text-xs sm:text-sm font-medium text-gray-800 truncate">
                            {category.name}
                          </span>
                        </div>
                        <div className="text-right ml-2">
                          <div className="text-xs sm:text-sm font-bold text-gray-800">
                            {formatCurrency(category.value)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {((category.value / categoryData.reduce((sum, cat) => sum + cat.value, 0)) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Összesen */}
                    <div className="mt-3 sm:mt-4 pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center p-2 bg-teal-50 rounded-lg">
                        <span className="text-xs sm:text-sm font-semibold text-teal-800">Összesen:</span>
                        <span className="text-base sm:text-lg font-bold text-teal-700">
                          {formatCurrency(categoryData.reduce((sum, cat) => sum + cat.value, 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Havi trend grafikon */}
        {(actualIncome > 0 || actualExpenses > 0) && (
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-teal-700 text-base sm:text-lg">
                <BarChart2 className="h-4 w-4 sm:h-5 sm:w-5" />
                Havi trend (göngyölített) – {currentMonthLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name"
                      fontSize={window.innerWidth < 640 ? 10 : 12}
                    />
                    <YAxis 
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                      fontSize={window.innerWidth < 640 ? 10 : 12}
                    />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Line 
                      type="monotone" 
                      dataKey="Bevételek" 
                      stroke="#10b981" 
                      strokeWidth={window.innerWidth < 640 ? 2 : 3}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: window.innerWidth < 640 ? 3 : 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Kiadások" 
                      stroke="#ef4444" 
                      strokeWidth={window.innerWidth < 640 ? 2 : 3}
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: window.innerWidth < 640 ? 3 : 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Üres állapot, ha nincs adat */}
        {!currentBudget && !currentIncome && savingsGoals.length === 0 && !walletData && (
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardContent className="text-center py-8 sm:py-12 px-4">
              <div className="text-gray-400 mb-4">
                <BarChart2 className="h-12 w-12 sm:h-16 sm:w-16 mx-auto" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">
                Kezdje el a költségvetés tervezését!
              </h3>
              <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6">
                Hozzon létre bevételi és költségvetési terveket a részletes áttekintéshez.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <a href="/berkalkulator" className="w-full sm:w-auto">
                  <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 text-sm sm:text-base">
                    Bér kalkulálása
                  </Button>
                </a>
                <a href="/koltsegvetes" className="w-full sm:w-auto">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 text-sm sm:text-base">
                    Költségvetési terv
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
