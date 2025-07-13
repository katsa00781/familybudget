"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  ShoppingCart, Home, Car, Film, Package, Plus, BarChart2, Settings, CreditCard,
  Wallet, CalendarDays
} from 'lucide-react';

export default function DashboardPage() {
  // Minta adatok a havi trendhez
  const monthlyData = [
    { name: '5', bevétel: 15000, kiadás: 12000 },
    { name: '10', bevétel: 20000, kiadás: 18000 },
    { name: '15', bevétel: 30000, kiadás: 25000 },
    { name: '20', bevétel: 40000, kiadás: 30000 },
    { name: '25', bevétel: 55000, kiadás: 40000 },
    { name: '30', bevétel: 80000, kiadás: 60000 },
  ];

  // Kategória adatok a kördiagramhoz
  const categoryData = [
    { name: 'Lakhatás', value: 31, color: '#37B8AF' },
    { name: 'Élelmiszer', value: 25, color: '#32D583' },
    { name: 'Közlekedés', value: 16, color: '#F97316' },
    { name: 'Szórakozás', value: 13, color: '#9333EA' },
    { name: 'Egyéb', value: 15, color: '#EC4899' },
  ];

  // Tranzakciók adatok
  const transactions = [
    { icon: <ShoppingCart size={16} />, name: 'Tesco', date: '2023.11.28', category: 'Élelmiszer', amount: -12500 },
    { icon: <Home size={16} />, name: 'Lakbér', date: '2023.11.27', category: 'Lakhatás', amount: -120000 },
    { icon: <Car size={16} />, name: 'Benzin', date: '2023.11.26', category: 'Közlekedés', amount: -15000 },
    { icon: <Film size={16} />, name: 'Mozi', date: '2023.11.25', category: 'Szórakozás', amount: -4500 },
    { icon: <CreditCard size={16} />, name: 'Fizetés', date: '2023.11.24', category: 'Bevétel', amount: 475000 },
  ];

  // Közelgő számlák
  const upcomingBills = [
    { icon: <Home size={16} />, name: 'Lakbér', dueDate: '2023.12.05', amount: 120000 },
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
    <div className="bg-gradient-main min-h-screen p-4 pb-12">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Szia, János!</h1>
          <p className="text-white opacity-90">A család pénzügyei rendben vannak</p>
        </div>
        
        {/* Összegzés kártyák */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white rounded-xl shadow">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Összes bevétel</p>
              <h3 className="text-xl font-bold text-green-500">475 000 Ft</h3>
            </CardContent>
          </Card>
          
          <Card className="bg-white rounded-xl shadow">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Összes kiadás</p>
              <h3 className="text-xl font-bold text-orange-500">382 650 Ft</h3>
            </CardContent>
          </Card>
          
          <Card className="bg-white rounded-xl shadow">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Egyenleg</p>
              <h3 className="text-xl font-bold text-cyan-500">92 350 Ft</h3>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Havi trend grafikon */}
          <Card className="bg-white rounded-xl shadow">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Havi trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyData}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="bevétel" 
                      stroke="#32D583" 
                      strokeWidth={2} 
                      dot={{ r: 4 }} 
                      activeDot={{ r: 6 }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="kiadás" 
                      stroke="#F97316" 
                      strokeWidth={2} 
                      dot={{ r: 4 }} 
                      activeDot={{ r: 6 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Tranzakciók listája */}
          <Card className="bg-white rounded-xl shadow">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium">Legutóbbi tranzakciók</CardTitle>
              <Button variant="link" className="text-cyan-500 p-0">Összes megtekintése</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.map((transaction, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-100 p-2 rounded-full">
                        {transaction.icon}
                      </div>
                      <div>
                        <p className="font-medium">{transaction.name}</p>
                        <p className="text-xs text-gray-500">{transaction.date} • {transaction.category}</p>
                      </div>
                    </div>
                    <p className={`font-medium ${transaction.amount > 0 ? 'text-green-500' : 'text-gray-700'}`}>
                      {transaction.amount > 0 ? `+${transaction.amount.toLocaleString()} Ft` : `${transaction.amount.toLocaleString()} Ft`}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Button className="w-full">Összes tranzakció</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Kategória összefoglaló */}
          <Card className="bg-white rounded-xl shadow">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Kiadások kategóriák szerint</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend layout="vertical" verticalAlign="middle" align="right" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Gyors műveletek */}
          <Card className="bg-white rounded-xl shadow">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Gyors műveletek</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {quickActions.map((action, index) => (
                  <Button 
                    key={index} 
                    variant="outline" 
                    className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-gray-50"
                  >
                    <div className={`${action.color} text-white p-2 rounded-full`}>
                      {action.icon}
                    </div>
                    <span className="text-sm font-medium">{action.name}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Közelgő számlák */}
          <Card className="bg-white rounded-xl shadow">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium">Közelgő számlák</CardTitle>
              <Button variant="link" className="text-cyan-500 p-0">Összes megtekintése</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingBills.map((bill, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="bg-cyan-100 p-2 rounded-full">
                        {bill.icon}
                      </div>
                      <div>
                        <p className="font-medium">{bill.name}</p>
                        <div className="flex items-center text-xs text-gray-500">
                          <CalendarDays size={12} className="mr-1" />
                          <p>Esedékes: {bill.dueDate}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <p className="font-medium text-gray-700 mr-3">{bill.amount.toLocaleString()} Ft</p>
                      <Button size="sm" className="bg-familybudget-teal">Fizetés</Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-center">
                <Button variant="outline" className="text-cyan-500 w-full">
                  Számla hozzáadása <Plus size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      
        <div className="flex justify-end">
          <Button className="bg-familybudget-teal hover:bg-familybudget-teal/90">
            <Plus size={18} />
            Új tranzakció
          </Button>
        </div>
      </div>
    </div>
  );
}
