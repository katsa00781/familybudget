"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  ShoppingCart, Home as HomeIcon, Car, Film, Package, Plus, BarChart2, Settings, CreditCard,
  Wallet, CalendarDays
} from 'lucide-react';

export default function Dashboard() {
  // Minta adatok a havi trendhez
  const monthlyData = [
    { name: '5', bevétel: 15000, kiadás: 12000 },
    { name: '10', bevétel: 20000, kiadás: 18000 },
    { name: '15', bevétel: 30000, kiadás: 25000 },
    { name: '20', bevétel: 40000, kiadás: 30000 },
    { name: '25', bevétel: 50000, kiadás: 45000 },
    { name: '30', bevétel: 60000, kiadás: 52000 }
  ];

  // Minta adatok a kategóriák kördiagramjához
  const categoryData = [
    { name: 'Élelmiszer', value: 45000, color: '#0084C7' },
    { name: 'Lakhatás', value: 120000, color: '#00B4DB' },
    { name: 'Közlekedés', value: 25000, color: '#00C9A7' },
    { name: 'Szórakozás', value: 15000, color: '#C1E1C5' },
    { name: 'Egyéb', value: 10000, color: '#F0F8FF' }
  ];

  // Minta tranzakciók
  const recentTransactions = [
    { icon: <ShoppingCart size={16} />, name: 'Tesco', date: '2023.11.28', category: 'Élelmiszer', amount: -12500 },
    { icon: <HomeIcon size={16} />, name: 'Lakbér', date: '2023.11.27', category: 'Lakhatás', amount: -120000 },
    { icon: <Car size={16} />, name: 'Benzin', date: '2023.11.26', category: 'Közlekedés', amount: -15000 },
    { icon: <Film size={16} />, name: 'Mozi', date: '2023.11.25', category: 'Szórakozás', amount: -4500 },
    { icon: <CreditCard size={16} />, name: 'Fizetés', date: '2023.11.24', category: 'Bevétel', amount: 475000 },
  ];

  // Közelgő számlák
  const upcomingBills = [
    { icon: <HomeIcon size={16} />, name: 'Lakbér', dueDate: '2023.12.05', amount: 120000 },
    { icon: <Package size={16} />, name: 'Internet', dueDate: '2023.12.10', amount: 8500 },
  ];

  // Gyors műveletek
  const quickActions = [
    { icon: <Plus size={18} />, name: 'Új tranzakció', color: 'bg-familybudget-teal' },
    { icon: <Wallet size={18} />, name: 'Új számla', color: 'bg-familybudget-blue' },
    { icon: <BarChart2 size={18} />, name: 'Jelentések', color: 'bg-familybudget-green' },
    { icon: <Settings size={18} />, name: 'Beállítások', color: 'bg-gray-700' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-teal-500/20 to-emerald-500/20 animate-gradient"></div>
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-white/20 p-6 shadow-xl relative z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse-slow">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent tracking-tight">FamilyBudget</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/80 px-4 py-2 rounded-xl shadow-md font-medium">
            <CalendarDays size={18} className="text-emerald-600" />
            <span>November 2023</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 space-y-6 relative z-10">
        {/* Összesítő kártyák */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Egyenleg</p>
                  <p className="text-3xl font-extrabold drop-shadow-lg tabular-nums">385,000 Ft</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Wallet className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-xl hover:shadow-emerald-500/30 hover:scale-105 transition-all duration-300 rounded-2xl border border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-semibold">Havi bevétel</p>
                  <p className="text-3xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent tabular-nums">475,000 Ft</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-2xl font-bold">↗</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-xl hover:shadow-red-500/30 hover:scale-105 transition-all duration-300 rounded-2xl border border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-semibold">Havi kiadás</p>
                  <p className="text-3xl font-extrabold bg-gradient-to-r from-red-500 to-rose-600 bg-clip-text text-transparent tabular-nums">215,000 Ft</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-2xl font-bold">↘</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-xl hover:shadow-blue-500/30 hover:scale-105 transition-all duration-300 rounded-2xl border border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-semibold">Megtakarítás</p>
                  <p className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tabular-nums">260,000 Ft</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg text-2xl">
                  <span>💰</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Diagramok */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Havi trend */}
          <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-xl hover:shadow-emerald-500/20 transition-all duration-300 rounded-2xl border border-white/20">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                  <BarChart2 size={18} className="text-white" />
                </div>
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Havi trend</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="bevétel" 
                      stroke="#00C9A7" 
                      strokeWidth={3}
                      dot={{ fill: '#00C9A7', strokeWidth: 2, r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="kiadás" 
                      stroke="#FF6B6B" 
                      strokeWidth={3}
                      dot={{ fill: '#FF6B6B', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Kategóriák megoszlása */}
          <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-xl hover:shadow-blue-500/20 transition-all duration-300 rounded-2xl border border-white/20">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                  <PieChart className="w-4 h-4 text-white" />
                </div>
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Kiadások kategóriái</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={110}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value.toLocaleString()} Ft`, 'Összeg']}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alsó rész - 3 oszlop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Legutóbbi tranzakciók */}
          <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-xl hover:shadow-purple-500/20 transition-all duration-300 rounded-2xl border border-white/20">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                  <CreditCard size={18} className="text-white" />
                </div>
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Legutóbbi tranzakciók</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentTransactions.map((transaction, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center shadow-sm">
                      {transaction.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{transaction.name}</p>
                      <p className="text-sm text-gray-500 font-medium">{transaction.date} • {transaction.category}</p>
                    </div>
                  </div>
                  <span className={`font-bold tabular-nums ${transaction.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()} Ft
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Közelgő számlák */}
          <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-xl hover:shadow-yellow-500/20 transition-all duration-300 rounded-2xl border border-white/20">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl">
                  <CalendarDays size={18} className="text-white" />
                </div>
                <span className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">Közelgő számlák</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingBills.map((bill, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      {bill.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{bill.name}</p>
                      <p className="text-sm text-orange-700 font-medium">Esedékes: {bill.dueDate}</p>
                    </div>
                  </div>
                  <span className="font-bold text-red-600 tabular-nums">
                    {bill.amount.toLocaleString()} Ft
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Gyors műveletek */}
          <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-xl hover:shadow-emerald-500/20 transition-all duration-300 rounded-2xl border border-white/20">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                  <Settings size={18} className="text-white" />
                </div>
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Gyors műveletek</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action, index) => (
                <Button key={index} variant="outline" className="w-full justify-start gap-3 h-14 border-2 border-gray-200 hover:border-emerald-400 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 transition-all duration-200 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] font-semibold">
                  <div className={`w-10 h-10 ${action.color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                    {action.icon}
                  </div>
                  {action.name}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
