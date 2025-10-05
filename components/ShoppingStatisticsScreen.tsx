'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, PieChart, TrendingUp, Calendar, Package2, Target, DollarSign, ShoppingCart } from 'lucide-react';
import { InflationData } from '../types/enhanced';
import { getInflationData } from '../lib/priceHistory';
import { getShoppingStatistics, SpendingStatistics } from '@/lib/shoppingStatistics';


interface ShoppingStatisticsScreenProps {
  userId: string;
  className?: string;
}


const ShoppingStatisticsScreen: React.FC<ShoppingStatisticsScreenProps> = ({
  userId,
  className = ''
}) => {
  const [statistics, setStatistics] = useState<SpendingStatistics | null>(null);
  const [inflationData, setInflationData] = useState<InflationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('6months');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const monthsBack = selectedPeriod === '3months' ? 3 : selectedPeriod === '6months' ? 6 : 12;
        
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - monthsBack);
        
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        const [statsData, inflationInfo] = await Promise.all([
          getShoppingStatistics(userId, startDateStr, endDateStr),
          getInflationData(userId, monthsBack)
        ]);
        
        setStatistics(statsData);
        setInflationData(inflationInfo);
      } catch (err) {
        setError('Hiba történt az adatok betöltésekor: ' + (err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId, selectedPeriod]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (percent: number): string => {
    return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`;
  };

  const currentStats = statistics;

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (!currentStats || currentStats.total_spent === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="text-center text-gray-500">
          Még nincsenek elérhető statisztikák ehhez az időszakhoz.
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header és időszak választó */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Vásárlási Statisztikák</h1>
              <p className="text-gray-600">Elemzés és trendek a vásárlási szokásaidról</p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            {[
              { value: '3months', label: '3 hónap' },
              { value: '6months', label: '6 hónap' },
              { value: '12months', label: '1 év' }
            ].map((period) => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  selectedPeriod === period.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Főbb mutatók */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3">
            <DollarSign className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Összes költés</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(currentStats.total_spent)}</p>
              <p className="text-sm text-gray-600">
                {currentStats.date_range.start} - {currentStats.date_range.end}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3">
            <Package2 className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Termékek száma</p>
              <p className="text-2xl font-bold text-gray-900">{currentStats.total_items}</p>
              <p className="text-sm text-gray-600">
                {currentStats.by_category.length} kategória
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3">
            <ShoppingCart className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Vásárlások száma</p>
              <p className="text-2xl font-bold text-gray-900">{currentStats.total_shoppings}</p>
              <p className="text-sm text-gray-600">
                Átlag: {formatCurrency(currentStats.avg_per_shopping)}/vásárlás
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3">
            <Target className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-sm text-gray-600">Üzletek száma</p>
              <p className="text-2xl font-bold text-gray-900">{currentStats.by_store.length}</p>
              <p className="text-sm text-gray-600">
                Top: {currentStats.by_store[0]?.store_name || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Kategóriák szerinti bontás */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <PieChart className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Kategóriák szerinti költés</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {currentStats.by_category.slice(0, 5).map((category) => (
              <div key={category.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{category.category}</span>
                    <span className="text-sm text-gray-600">{category.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1 text-sm text-gray-600">
                    <span>{formatCurrency(category.total_spent)}</span>
                    <span>{category.item_count} termék</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Üzletek szerinti bontás</h3>
            {currentStats.by_store.slice(0, 5).map((store) => (
              <div key={store.store_name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{store.store_name}</span>
                    <span className="text-sm text-gray-600">{((store.total_spent / currentStats.total_spent) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${(store.total_spent / currentStats.total_spent) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1 text-sm text-gray-600">
                    <span>{formatCurrency(store.total_spent)}</span>
                    <span>{store.shopping_count} látogatás</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inflációs adatok */}
      {inflationData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-2 mb-6">
            <TrendingUp className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">Személyes inflációs adatok</h2>
          </div>
          
          <div className="space-y-4">
            {inflationData.slice(-6).map((data) => (
              <div key={data.period} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-900">
                    {new Date(data.period + '-01').toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' })}
                  </span>
                  <span className={`font-bold ${
                    data.avg_price_change_percent > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatPercentage(data.avg_price_change_percent)}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {Object.entries(data.categories).map(([category, categoryData]) => (
                    <div key={category} className="text-center">
                      <div className="font-medium text-gray-700">{category}</div>
                      <div className={`text-lg font-bold ${
                        categoryData.avg_price_change > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatPercentage(categoryData.avg_price_change)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {categoryData.item_count} termék
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Időalapú trendek */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Calendar className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">Időalapú trendek</h2>
        </div>
        
        <div className="space-y-4">
          {currentStats.by_time.map((timeData, index) => (
            <div key={timeData.period} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="font-medium text-gray-900">
                  {timeData.period}
                </div>
                <div className="text-sm text-gray-600">
                  {timeData.shopping_count} vásárlás • {timeData.item_count} termék
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-bold text-gray-900">{formatCurrency(timeData.total_amount)}</div>
                {index > 0 && currentStats.by_time[index - 1] && (
                  <div className={`text-sm ${
                    timeData.total_amount > currentStats.by_time[index - 1].total_amount ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatPercentage(((timeData.total_amount - currentStats.by_time[index - 1].total_amount) / currentStats.by_time[index - 1].total_amount) * 100)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShoppingStatisticsScreen;