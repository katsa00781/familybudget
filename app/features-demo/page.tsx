'use client';

import React, { useState } from 'react';
import { ShoppingCart, TrendingUp, Users, Camera, BarChart3 } from 'lucide-react';
import OCRReceiptScanner from '../../components/OCRReceiptScanner';
import PriceChangeAlert from '../../components/PriceChangeAlert';
import ShoppingStatisticsScreen from '../../components/ShoppingStatisticsScreen';
import FamilyManagement from '../../components/FamilyManagement';
import { ReceiptData } from '../../types/enhanced';

// Mock user ID - valós alkalmazásban ez a Supabase auth-ból jönne
const MOCK_USER_ID = 'user-123';

type ActiveTab = 'scanner' | 'price-alerts' | 'statistics' | 'family';

const FeaturesDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('scanner');

  const handleReceiptProcessed = (receiptData: ReceiptData) => {
    console.log('Receipt processed:', receiptData);
    // Itt lehetne automatikusan átváltani a statisztikák tabra
    // setActiveTab('statistics');
  };

  const tabs = [
    {
      id: 'scanner' as ActiveTab,
      name: 'Nyugta beolvasás',
      icon: Camera,
      description: 'AI-alapú OCR termékfelismerés'
    },
    {
      id: 'price-alerts' as ActiveTab,
      name: 'Árváltozások',
      icon: TrendingUp,
      description: 'Termékek árváltozásainak követése'
    },
    {
      id: 'statistics' as ActiveTab,
      name: 'Statisztikák',
      icon: BarChart3,
      description: 'Vásárlási szokások elemzése'
    },
    {
      id: 'family' as ActiveTab,
      name: 'Család kezelése',
      icon: Users,
      description: 'Családtagok meghívása és kezelése'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <ShoppingCart className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Family Budget</h1>
                <p className="text-sm text-gray-600">Új funkciók demó</p>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              iOS alkalmazásból portolt funkciók
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Description */}
      <div className="bg-blue-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <p className="text-sm text-blue-700">
            {tabs.find(tab => tab.id === activeTab)?.description}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'scanner' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                🎯 OCR Nyugta Scanner
              </h2>
              <p className="text-gray-600 mb-4">
                Az iOS alkalmazásból portolt funkció, amely OpenAI GPT-4 Vision API-t használ a nyugták feldolgozására.
                Automatikusan felismeri a termékeket, árakat és kategorizálja őket.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>Figyelem:</strong> Az OCR funkció működéséhez be kell állítani a NEXT_PUBLIC_OPENAI_API_KEY 
                  környezeti változót. Jelenleg mock adatokkal működik.
                </p>
              </div>
            </div>

            <OCRReceiptScanner 
              userId={MOCK_USER_ID}
              onReceiptProcessed={handleReceiptProcessed}
            />
          </div>
        )}

        {activeTab === 'price-alerts' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                📈 Árváltozás követés
              </h2>
              <p className="text-gray-600 mb-4">
                Automatikusan nyomon követi a termékek árváltozásait és riasztást küld jelentős változások esetén.
                Az iOS alkalmazásban ez segít a vásárlók tájékozódásában az inflációról.
              </p>
            </div>

            <PriceChangeAlert 
              userId={MOCK_USER_ID}
              daysBack={30}
              limit={10}
            />
          </div>
        )}

        {activeTab === 'statistics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                📊 Vásárlási Statisztikák
              </h2>
              <p className="text-gray-600 mb-4">
                Részletes elemzés a vásárlási szokásokról, kategóriák szerinti bontásban, 
                személyes inflációs adatokkal és trendekkel.
              </p>
            </div>

            <ShoppingStatisticsScreen 
              userId={MOCK_USER_ID}
            />
          </div>
        )}

        {activeTab === 'family' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                👨‍👩‍👧‍👦 Család kezelése
              </h2>
              <p className="text-gray-600 mb-4">
                Családtagok meghívása és jogosultságok kezelése. A családtagok megoszthatják 
                egymással a vásárlási listákat és költségvetéseket.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Fejlesztői megjegyzés:</strong> A family_members tábla még nem lett létrehozva a Supabase-ben. 
                  Futtasd le a migrációs scripteket a teljes funkcionalitáshoz.
                </p>
              </div>
            </div>

            <FamilyManagement 
              userId={MOCK_USER_ID}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <h3 className="text-lg font-semibold mb-3">🚀 Implementált iOS funkciók</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="font-medium text-green-800 mb-2">✅ OCR Receipt Scanner</div>
                <p className="text-green-700">OpenAI GPT-4 Vision API integráció magyar termékfelismeréssel</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="font-medium text-green-800 mb-2">✅ Price History Tracking</div>
                <p className="text-green-700">Termékek árváltozásainak nyomon követése és elemzése</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="font-medium text-green-800 mb-2">✅ Shopping Statistics</div>
                <p className="text-green-700">Részletes vásárlási statisztikák és személyes infláció</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="font-medium text-green-800 mb-2">✅ Family Management</div>
                <p className="text-green-700">Családtagok meghívása és jogosultságok kezelése</p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">🛠 Következő lépések</h4>
              <p className="text-blue-700 text-sm">
                1. Migrációs scriptek futtatása Supabase-ben (product_price_history, family_members, shopping_statistics)<br/>
                2. OpenAI API kulcs beállítása környezeti változóban<br/>
                3. UI komponensek integrálása a meglévő alkalmazásba<br/>
                4. Felhasználói jogosultságok és RLS políciák finomhangolása
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturesDemo;