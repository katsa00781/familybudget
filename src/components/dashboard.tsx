"use client";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-familybudget-teal rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-familybudget-blue">FamilyBudget</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CalendarDays size={16} />
            <span>November 2023</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Összesítő kártyák */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-familybudget-blue to-familybudget-teal text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Egyenleg</p>
                  <p className="text-2xl font-bold">385,000 Ft</p>
                </div>
                <Wallet className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Havi bevétel</p>
                  <p className="text-2xl font-bold text-familybudget-green">475,000 Ft</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-lg">↗</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Havi kiadás</p>
                  <p className="text-2xl font-bold text-red-600">215,000 Ft</p>
                </div>
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 text-lg">↘</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Megtakarítás</p>
                  <p className="text-2xl font-bold text-familybudget-blue">260,000 Ft</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-lg">💰</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Diagramok */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Havi trend */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-familybudget-blue">Havi trend</CardTitle>
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
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-familybudget-blue">Kiadások kategóriái</CardTitle>
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
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-familybudget-blue">Legutóbbi tranzakciók</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentTransactions.map((transaction, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      {transaction.icon}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.name}</p>
                      <p className="text-sm text-gray-500">{transaction.date} • {transaction.category}</p>
                    </div>
                  </div>
                  <span className={`font-semibold ${transaction.amount > 0 ? 'text-familybudget-green' : 'text-red-600'}`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()} Ft
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Közelgő számlák */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-familybudget-blue">Közelgő számlák</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingBills.map((bill, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      {bill.icon}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{bill.name}</p>
                      <p className="text-sm text-yellow-700">Esedékes: {bill.dueDate}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-red-600">
                    {bill.amount.toLocaleString()} Ft
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Gyors műveletek */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-familybudget-blue">Gyors műveletek</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action, index) => (
                <Button key={index} variant="outline" className="w-full justify-start gap-3 h-12">
                  <div className={`w-8 h-8 ${action.color} rounded-lg flex items-center justify-center text-white`}>
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
