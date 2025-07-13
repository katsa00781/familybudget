"use client";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  ShoppingCart, Home as HomeIcon, Car, Plus, BarChart2, Settings,
  Wallet, Bell, TrendingUp, TrendingDown, Zap,
  ChevronDown
} from 'lucide-react';

export default function Dashboard() {
  // Minta adatok a havi trendhez
  const monthlyData = [
    { name: '5', Bevételek: 15000, Kiadások: 12000 },
    { name: '10', Bevételek: 20000, Kiadások: 15000 },
    { name: '15', Bevételek: 30000, Kiadások: 22000 },
    { name: '20', Bevételek: 40000, Kiadások: 28000 },
    { name: '25', Bevételek: 50000, Kiadások: 35000 },
    { name: '30', Bevételek: 60000, Kiadások: 45000 }
  ];

  // Kategóriák kördiagramjához
  const categoryData = [
    { name: 'Lakhatás', value: 31, color: '#1fb6ff' },
    { name: 'Élelmiszer', value: 25, color: '#00d4aa' },
    { name: 'Közlekedés', value: 16, color: '#ff9500' },
    { name: 'Szórakozás', value: 13, color: '#a855f7' },
    { name: 'Egyéb', value: 15, color: '#f43f5e' }
  ];

  // Havi összesítés adatok
  const monthlySummaryData = [
    { category: 'Bevételek', amount: 475000, color: 'bg-green-100', textColor: 'text-green-600' },
    { category: 'Kiadások', amount: 152000, color: 'bg-red-100', textColor: 'text-red-600' }
  ];

  // Kategória szerinti bontás
  const categoryBreakdown = [
    { name: 'Lakhatás', amount: 120000, percentage: '9.6%', icon: <HomeIcon size={16} /> },
    { name: 'Közlekedés', amount: 15000, percentage: '9.6%', icon: <Car size={16} /> },
    { name: 'Élelmiszer', amount: 12500, percentage: '6.2%', icon: <ShoppingCart size={16} /> }
  ];

  // Közelgő számlák
  const upcomingBills = [
    { name: 'Lakbér', amount: 120000, date: '2023.12.01', icon: <HomeIcon size={16} /> },
    { name: 'Internet', amount: 8500, date: '2023.12.10', icon: <Zap size={16} /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="w-full">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Szia, János!</h1>
              <p className="text-gray-600">A családod pénzügyi rendjében vannak</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon">
                <Bell size={20} />
              </Button>
              <Button variant="outline" size="icon">
                <Settings size={20} />
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Összesítő kártyák */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Összes bevétel</p>
                    <p className="text-2xl font-bold text-gray-900">475 000 Ft</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Összes kiadás</p>
                    <p className="text-2xl font-bold text-gray-900">382 650 Ft</p>
                  </div>
                  <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Egyenleg</p>
                    <p className="text-2xl font-bold text-gray-900">92 350 Ft</p>
                  </div>
                  <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Havi trend */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">Havi trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Bevételek" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Kiadások" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gyors műveletek */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">Gyors műveletek</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button className="h-20 flex flex-col gap-2 bg-cyan-500 hover:bg-cyan-600">
                    <Plus size={20} />
                    <span className="text-sm">Új bevétel</span>
                  </Button>
                  <Button className="h-20 flex flex-col gap-2 bg-orange-500 hover:bg-orange-600">
                    <TrendingDown size={20} />
                    <span className="text-sm">Új kiadás</span>
                  </Button>
                  <Button className="h-20 flex flex-col gap-2 bg-purple-500 hover:bg-purple-600">
                    <BarChart2 size={20} />
                    <span className="text-sm">Havi jelentés</span>
                  </Button>
                  <Button className="h-20 flex flex-col gap-2 bg-green-500 hover:bg-green-600">
                    <Wallet size={20} />
                    <span className="text-sm">Költségvetés</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Kategória összefoglaló */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-900">Kategória összefoglaló</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${value}%`, 'Arány']}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {categoryData.map((category, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: category.color }}></div>
                        <span className="text-gray-700">{category.name}</span>
                      </div>
                      <span className="font-medium text-gray-900">{category.value}%</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    <strong>Kategória elemzés</strong><br />
                    A lakhatási költségek teszik ki a legnagyobb részt (31%). 
                    Érdemes lehet megfontolni a közlekedési kiadások csökkentését (16%).
                    Az élelmiszerekre költött összeg optimális szinten van (25%-ot jelent).
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Havi összesítés */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-900">Havi összesítés</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    2023 November <ChevronDown size={12} className="ml-1" />
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {monthlySummaryData.map((item, index) => (
                  <div key={index} className={`p-4 rounded-lg ${item.color}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{item.category}</span>
                      <span className={`text-lg font-bold ${item.textColor}`}>
                        {item.amount.toLocaleString()} Ft
                      </span>
                    </div>
                  </div>
                ))}
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Egyenleg</span>
                    <span className="text-lg font-bold text-blue-600">
                      +323 000 Ft
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mt-6">
                  <h4 className="text-sm font-medium text-gray-900">Havi áttekintés</h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-xs text-gray-500">Bevétel</div>
                      <div className="text-sm font-medium text-gray-900">Havonta</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Kiadás</div>
                      <div className="text-sm font-medium text-gray-900">Havonta</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Bevételek</div>
                      <div className="text-sm font-medium text-gray-900">Összesen</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Kategória szerinti bontás */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-900">Kategória szerinti bontás</CardTitle>
                  <Badge className="bg-cyan-500 text-white text-xs">Kiadások</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {categoryBreakdown.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        {category.icon}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{category.name}</p>
                        <p className="text-xs text-gray-500">{category.percentage}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {category.amount.toLocaleString()} Ft
                    </span>
                  </div>
                ))}
                
                <div className="pt-4 space-y-3">
                  <h4 className="text-sm font-medium text-gray-900">Közelgő számlák</h4>
                  {upcomingBills.map((bill, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                          {bill.icon}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{bill.name}</p>
                          <p className="text-xs text-yellow-700">{bill.date}</p>
                        </div>
                      </div>
                      <span className="font-semibold text-red-600">
                        {bill.amount.toLocaleString()} Ft
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
