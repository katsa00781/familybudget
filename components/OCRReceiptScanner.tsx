'use client';

import React, { useState, useRef } from 'react';
import { Camera, Upload, Scan, Check, X, ShoppingCart, AlertCircle } from 'lucide-react';
import { ReceiptData, ReceiptItem } from '../types/enhanced';
import { processReceiptImage } from '../lib/receiptOCR';
import { savePriceHistory } from '../lib/priceHistory';

interface OCRReceiptScannerProps {
  userId: string;
  onReceiptProcessed?: (receiptData: ReceiptData) => void;
  className?: string;
}

const OCRReceiptScanner: React.FC<OCRReceiptScannerProps> = ({
  userId,
  onReceiptProcessed,
  className = ''
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editingItems, setEditingItems] = useState<ReceiptItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);
      setReceiptData(null);

      // Kép előnézet készítése
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(imageUrl);

      // OCR feldolgozás
      const receiptResult = await processReceiptImage(file);
      
      setReceiptData(receiptResult);
      setEditingItems([...receiptResult.items]);
      onReceiptProcessed?.(receiptResult);
    } catch (err) {
      console.error('Error processing receipt:', err);
      setError('Hiba történt a nyugta feldolgozása során: ' + (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const updateItem = (index: number, updates: Partial<ReceiptItem>) => {
    const newItems = [...editingItems];
    newItems[index] = { ...newItems[index], ...updates };
    setEditingItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = editingItems.filter((_, i) => i !== index);
    setEditingItems(newItems);
  };

  const addItem = () => {
    const newItem: ReceiptItem = {
      id: `manual-${Date.now()}`,
      name: '',
      quantity: 1,
      unit: 'db',
      price: 0,
      category: 'Egyéb',
      checked: false
    };
    setEditingItems([...editingItems, newItem]);
  };

  const saveToHistory = async () => {
    if (!receiptData || editingItems.length === 0) return;

    try {
      setIsSaving(true);
      setError(null);

      const savePromises = editingItems
        .filter(item => item.checked && item.name.trim() && item.price > 0)
        .map(item => 
          savePriceHistory(userId, item.name, item.price, {
            productCategory: item.category,
            storeName: receiptData.store,
            unit: item.unit,
            quantity: item.quantity,
            totalPrice: item.price * item.quantity,
            priceDate: receiptData.date,
            source: 'ocr'
          })
        );

      const results = await Promise.all(savePromises);
      
      const failedSaves = results.filter(r => !r.success);
      if (failedSaves.length > 0) {
        setError(`${failedSaves.length} termék mentése sikertelen volt`);
      } else {
        alert(`${results.length} termék sikeresen elmentve az ártörténetbe!`);
        // Reset form
        setReceiptData(null);
        setEditingItems([]);
        setSelectedImage(null);
      }
    } catch (err) {
      console.error('Error saving to history:', err);
      setError('Hiba történt a mentés során: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getTotalSelected = (): number => {
    return editingItems
      .filter(item => item.checked)
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="p-6 border-b">
        <div className="flex items-center space-x-3 mb-4">
          <Scan className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Nyugta beolvasás</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex flex-col items-center space-y-2">
              <Upload className="w-8 h-8 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Kép feltöltése</span>
              <span className="text-xs text-gray-500">JPG, PNG, HEIC</span>
            </div>
          </button>

          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={isProcessing}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex flex-col items-center space-y-2">
              <Camera className="w-8 h-8 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Fotó készítése</span>
              <span className="text-xs text-gray-500">Kamera megnyitása</span>
            </div>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        {isProcessing && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-blue-700">Nyugta feldolgozása AI-val...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}
      </div>

      {selectedImage && (
        <div className="p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Feltöltött kép</h3>
          <div className="max-w-md mx-auto">
            <img 
              src={selectedImage} 
              alt="Feltöltött nyugta"
              className="w-full h-auto rounded-lg border shadow-sm"
            />
          </div>
        </div>
      )}

      {receiptData && editingItems.length > 0 && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Felismert termékek</h3>
            <div className="text-sm text-gray-600">
              {receiptData.store && <span>Üzlet: {receiptData.store}</span>}
              {receiptData.date && <span className="ml-4">Dátum: {receiptData.date}</span>}
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {editingItems.map((item, index) => (
              <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => updateItem(index, { checked: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-2">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(index, { name: e.target.value })}
                    placeholder="Termék neve"
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  <div className="flex space-x-1">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 1 })}
                      min="1"
                      step="0.1"
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(index, { unit: e.target.value })}
                      className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="db">db</option>
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="l">l</option>
                      <option value="ml">ml</option>
                    </select>
                  </div>
                  
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => updateItem(index, { price: Number(e.target.value) || 0 })}
                    min="0"
                    step="0.1"
                    placeholder="Ár"
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  <select
                    value={item.category}
                    onChange={(e) => updateItem(index, { category: e.target.value })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Élelmiszer">Élelmiszer</option>
                    <option value="Háztartás">Háztartás</option>
                    <option value="Egészség">Egészség</option>
                    <option value="Ruházat">Ruházat</option>
                    <option value="Elektronika">Elektronika</option>
                    <option value="Sport">Sport</option>
                    <option value="Egyéb">Egyéb</option>
                  </select>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeItem(index)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Eltávolítás"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={addItem}
              className="px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
            >
              + Termék hozzáadása
            </button>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-600">Kiválasztott termékek összege:</div>
                <div className="text-lg font-bold text-gray-900">{formatCurrency(getTotalSelected())}</div>
              </div>
              
              <button
                onClick={saveToHistory}
                disabled={isSaving || editingItems.filter(item => item.checked).length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Mentés...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Mentés az ártörténetbe</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {receiptData && editingItems.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>Nem sikerült termékeket felismerni a nyugtából.</p>
          <p className="text-sm mt-1">Próbálkozz egy élesebb képpel vagy add meg kézzel a termékeket.</p>
          <button
            onClick={addItem}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Termék hozzáadása kézzel
          </button>
        </div>
      )}
    </div>
  );
};

export default OCRReceiptScanner;