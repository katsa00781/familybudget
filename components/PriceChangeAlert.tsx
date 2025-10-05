'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, RotateCcw } from 'lucide-react';
import { PriceChange } from '../types/enhanced';
import { getPriceChanges } from '../lib/priceHistory';

interface PriceChangeAlertProps {
  userId: string;
  className?: string;
  limit?: number;
  daysBack?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // másodpercekben
}

const PriceChangeAlert: React.FC<PriceChangeAlertProps> = ({
  userId,
  className = '',
  limit = 10,
  daysBack = 30,
  autoRefresh = true,
  refreshInterval = 300 // 5 perc
}) => {
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadPriceChanges = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const changes = await getPriceChanges(userId, daysBack);
      setPriceChanges(changes.slice(0, limit));
      setLastUpdate(new Date());
    } catch (err) {
      setError('Hiba történt az árváltozások betöltésekor: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [userId, daysBack, limit]);

  useEffect(() => {
    loadPriceChanges();
  }, [loadPriceChanges]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadPriceChanges();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadPriceChanges]);

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatPercentage = (percent: number): string => {
    return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`;
  };

  const getChangeIcon = (percent: number) => {
    if (percent > 0) {
      return <TrendingUp className="w-4 h-4 text-red-500" />;
    } else {
      return <TrendingDown className="w-4 h-4 text-green-500" />;
    }
  };

  const getChangeColor = (percent: number): string => {
    if (Math.abs(percent) > 20) {
      return percent > 0 ? 'text-red-700 bg-red-50' : 'text-green-700 bg-green-50';
    } else if (Math.abs(percent) > 10) {
      return percent > 0 ? 'text-orange-700 bg-orange-50' : 'text-blue-700 bg-blue-50';
    } else {
      return percent > 0 ? 'text-red-600 bg-red-25' : 'text-green-600 bg-green-25';
    }
  };

  const getCriticalityLabel = (percent: number): string => {
    const abs = Math.abs(percent);
    if (abs > 50) return 'Extrém változás';
    if (abs > 25) return 'Nagy változás';
    if (abs > 10) return 'Jelentős változás';
    return 'Kis változás';
  };

  if (loading && priceChanges.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900">Árváltozások</h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-900">Árváltozások</h3>
        </div>
        <div className="text-red-600 text-sm">{error}</div>
        <button
          onClick={loadPriceChanges}
          className="mt-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
        >
          Újra próbálkozás
        </button>
      </div>
    );
  }

  if (priceChanges.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Árváltozások</h3>
        </div>
        <div className="text-gray-500 text-sm text-center py-8">
          Az elmúlt {daysBack} napban nem volt jelentős árváltozás.
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900">Árváltozások</h3>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>Utolsó frissítés: {lastUpdate.toLocaleTimeString('hu-HU')}</span>
            <button
              onClick={loadPriceChanges}
              disabled={loading}
              className="p-1 hover:bg-gray-100 rounded"
              title="Frissítés"
            >
              <RotateCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Az elmúlt {daysBack} nap jelentős árváltozásai
        </p>
      </div>

      <div className="divide-y">
        {priceChanges.map((change, index) => (
          <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  {getChangeIcon(change.price_change_percent)}
                  <h4 className="font-medium text-gray-900">{change.product_name}</h4>
                  {change.product_category && (
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                      {change.product_category}
                    </span>
                  )}
                </div>
                
                <div className="mt-1 space-y-1">
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-gray-600">
                      {formatPrice(change.old_price)} → {formatPrice(change.new_price)}
                    </span>
                    <span className={`font-medium px-2 py-1 rounded-full text-xs ${getChangeColor(change.price_change_percent)}`}>
                      {formatPercentage(change.price_change_percent)}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>{change.old_date} → {change.new_date}</span>
                    {change.store_name && (
                      <span className="flex items-center">
                        📍 {change.store_name}
                      </span>
                    )}
                    <span>{change.days_between} nap alatt</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className={`text-sm font-medium ${change.price_change_percent > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {change.price_change_percent > 0 ? '+' : ''}{formatPrice(change.price_difference)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {getCriticalityLabel(change.price_change_percent)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {priceChanges.length >= limit && (
        <div className="p-3 border-t bg-gray-50 text-center">
          <span className="text-sm text-gray-600">
            {limit} árváltozásból megjelenítve • További változások lehetnek
          </span>
        </div>
      )}
    </div>
  );
};

export default PriceChangeAlert;