"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Calendar, Plus, X } from "lucide-react";

export default function BerkalkulatorPage() {
  const [familyMember, setFamilyMember] = useState("János");
  const [month, setMonth] = useState(1);
  const [workDays, setWorkDays] = useState(21);
  const [freeDays, setFreeDays] = useState(0);
  const [overtimeHours, setOvertimeHours] = useState(0);
  const [holidayHours, setHolidayHours] = useState(0);
  const [grossSalary, setGrossSalary] = useState(450000);
  
  // Passiv jövedelmek
  const [passiveIncomes, setPassiveIncomes] = useState([
    { name: "Lakáskiadás", amount: 120000 }
  ]);

  // Korábbi kalkulációk
  const previousCalculations = [
    {
      name: "János",
      month: "Január",
      date: "2023.01.15",
      netSalary: 289250,
      totalIncome: 419250
    },
    {
      name: "Éva",
      month: "December", 
      date: "2022.12.20",
      netSalary: 285000,
      totalIncome: 285000
    }
  ];

  // Számítások
  const calculateNetSalary = () => {
    // Egyszerűsített számítás (a valóságban sokkal összetettebb)
    const taxRate = 0.35; // ~35% összesített adó és járulék
    return Math.round(grossSalary * (1 - taxRate));
  };

  const getTotalIncome = () => {
    const netSalary = calculateNetSalary();
    const totalPassiveIncome = passiveIncomes.reduce((sum, income) => sum + income.amount, 0);
    return netSalary + totalPassiveIncome;
  };

  const addPassiveIncome = () => {
    setPassiveIncomes([...passiveIncomes, { name: "", amount: 0 }]);
  };

  const removePassiveIncome = (index: number) => {
    setPassiveIncomes(passiveIncomes.filter((_, i) => i !== index));
  };

  const updatePassiveIncome = (index: number, field: "name" | "amount", value: string | number) => {
    const updated = [...passiveIncomes];
    updated[index] = { ...updated[index], [field]: value };
    setPassiveIncomes(updated);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-teal-500 to-green-500 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-white mb-6">
          <p className="text-lg mb-2">
            Számítsd ki a havi nettó bért és add hozzá a passzív jövedelemeket a teljes 
            jövedeli meghatározásához.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kalkulátor forma */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-lg">
              <CardContent className="p-6 space-y-6">
                {/* Családtag */}
                <div>
                  <Label htmlFor="family-member" className="text-sm font-medium text-gray-700">
                    Családtag
                  </Label>
                  <Select value={familyMember} onValueChange={setFamilyMember}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="János">János</SelectItem>
                      <SelectItem value="Éva">Éva</SelectItem>
                      <SelectItem value="Gyerek1">Gyerek 1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Hónap */}
                <div>
                  <Label htmlFor="month" className="text-sm font-medium text-gray-700">
                    Hónap
                  </Label>
                  <div className="mt-1 relative">
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      value={month}
                      onChange={(e) => setMonth(Number(e.target.value))}
                      className="pr-10"
                    />
                    <Calendar className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Munkanapok száma */}
                  <div>
                    <Label htmlFor="work-days" className="text-sm font-medium text-gray-700">
                      Munkanapok száma
                    </Label>
                    <Input
                      type="number"
                      value={workDays}
                      onChange={(e) => setWorkDays(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>

                  {/* Szabadság napok */}
                  <div>
                    <Label htmlFor="free-days" className="text-sm font-medium text-gray-700">
                      Szabadság napok
                    </Label>
                    <Input
                      type="number"
                      value={freeDays}
                      onChange={(e) => setFreeDays(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>

                  {/* Túlórák száma */}
                  <div>
                    <Label htmlFor="overtime" className="text-sm font-medium text-gray-700">
                      Túlórák száma
                    </Label>
                    <Input
                      type="number"
                      value={overtimeHours}
                      onChange={(e) => setOvertimeHours(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>

                  {/* Ünnepnapok száma */}
                  <div>
                    <Label htmlFor="holiday" className="text-sm font-medium text-gray-700">
                      Ünnepnapok száma
                    </Label>
                    <Input
                      type="number"
                      value={holidayHours}
                      onChange={(e) => setHolidayHours(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Alapbér */}
                <div>
                  <Label htmlFor="gross-salary" className="text-sm font-medium text-gray-700">
                    Alapbér
                  </Label>
                  <div className="mt-1 relative">
                    <Input
                      type="number"
                      value={grossSalary}
                      onChange={(e) => setGrossSalary(Number(e.target.value))}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-3 text-sm text-gray-500">Ft</span>
                  </div>
                </div>

                {/* Passzív jövedelem */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium text-gray-700">
                      Passzív jövedelem
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addPassiveIncome}
                      className="text-cyan-600 hover:text-cyan-700"
                    >
                      <Plus size={16} className="mr-1" />
                      Passzív jövedelem hozzáadása
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {passiveIncomes.map((income, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Jövedelem neve"
                          value={income.name}
                          onChange={(e) => updatePassiveIncome(index, "name", e.target.value)}
                          className="flex-1"
                        />
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="Összeg"
                            value={income.amount}
                            onChange={(e) => updatePassiveIncome(index, "amount", Number(e.target.value))}
                            className="w-32 pr-8"
                          />
                          <span className="absolute right-3 top-3 text-sm text-gray-500">Ft</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePassiveIncome(index)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Számítás gomb */}
                <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-3">
                  Számítás
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Eredmény és korábbi kalkulációk */}
          <div className="space-y-6">
            {/* Eredmény */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Eredmény
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Nettó havi bér</p>
                  <p className="text-2xl font-bold text-cyan-600">
                    {calculateNetSalary().toLocaleString()} Ft
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Passzív jövedelmek</p>
                  <div className="space-y-1">
                    {passiveIncomes.map((income, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-700">{income.name}</span>
                        <span className="font-medium">
                          {income.amount.toLocaleString()} Ft
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <p className="text-sm text-gray-600">Teljes havi bevétel</p>
                  <p className="text-2xl font-bold text-green-600">
                    {getTotalIncome().toLocaleString()} Ft
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Korábbi kalkulációk */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Korábbi kalkulációk
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {previousCalculations.map((calc, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {calc.name} - {calc.month}
                        </p>
                        <p className="text-xs text-gray-500">{calc.date}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Nettó bér:</span>
                        <span className="font-medium text-gray-900">
                          {calc.netSalary.toLocaleString()} Ft
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Teljes bevétel:</span>
                        <span className="font-medium text-green-600">
                          {calc.totalIncome.toLocaleString()} Ft
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
