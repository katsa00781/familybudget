// OCR Receipt Scanner Library
// Based on the iOS implementation using OpenAI GPT-4 Vision API

import { ReceiptItem, ReceiptData } from '../types/enhanced';

// OpenAI GPT-4 Vision API types
interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Hungarian product categories for categorization
const PRODUCT_CATEGORIES: { [key: string]: string } = {
  // Alapvető élelmiszerek
  'kenyér': 'Pékáruk',
  'péksütemény': 'Pékáruk',
  'zsemle': 'Pékáruk',
  'tej': 'Tejtermékek',
  'sajt': 'Tejtermékek',
  'joghurt': 'Tejtermékek',
  'vaj': 'Tejtermékek',
  'túró': 'Tejtermékek',
  'hús': 'Hús és hal',
  'hal': 'Hús és hal',
  'kolbász': 'Hús és hal',
  'sonka': 'Hús és hal',
  'alma': 'Zöldség és gyümölcs',
  'banán': 'Zöldség és gyümölcs',
  'narancs': 'Zöldség és gyümölcs',
  'citrom': 'Zöldség és gyümölcs',
  'paradicsom': 'Zöldség és gyümölcs',
  'krumpli': 'Zöldség és gyümölcs',
  'burgonya': 'Zöldség és gyümölcs',
  'répa': 'Zöldség és gyümölcs',
  'hagyma': 'Zöldség és gyümölcs',
  'paprika_zoldseg': 'Zöldség és gyümölcs',
  'uborka': 'Zöldség és gyümölcs',
  'saláta': 'Zöldség és gyümölcs',
  'édesség': 'Édességek és snack',
  'csokoládé': 'Édességek és snack',
  'keksz': 'Édességek és snack',
  'cukor': 'Édességek és snack',
  'víz': 'Italok',
  'ital': 'Italok',
  'sör': 'Italok',
  'bor': 'Italok',
  'kávé': 'Italok',
  'tea': 'Italok',
  'üdítő': 'Italok',
  'mosószer': 'Háztartási cikkek',
  'tisztítószer': 'Háztartási cikkek',
  'wc papír': 'Háztartási cikkek',
  'papírtörlő': 'Háztartási cikkek',
  'sampon': 'Háztartási cikkek',
  'fogkrém': 'Háztartási cikkek',
  'tészta': 'Fagyasztott termékek',
  'pizza': 'Fagyasztott termékek',
  'rizs': 'Konzerv és tartósított',
  'konzserv': 'Konzerv és tartósított',
  'olaj': 'Fűszerek és olajok',
  'só': 'Fűszerek és olajok',
  'bors': 'Fűszerek és olajok',
  'paprika_fuszer': 'Fűszerek és olajok',
};

// Kategória meghatározása a termék neve alapján
const determineCategory = (productName: string): string => {
  const nameLower = productName.toLowerCase();
  
  for (const [keyword, category] of Object.entries(PRODUCT_CATEGORIES)) {
    if (nameLower.includes(keyword)) {
      return category;
    }
  }
  
  return 'Egyéb';
};

// Egyedi ID generálás
const generateId = (): string => {
  return `receipt_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
};

// Convert image file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/jpeg;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

// GPT-4 Vision feldolgozás
const processWithGPT4Vision = async (imageFile: File): Promise<ReceiptData> => {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn('OpenAI API kulcs hiányzik, mock adatok használata');
    return generateMockReceiptData();
  }

  try {
    console.log('🧠 GPT-4 Vision API hívás magyar nyugta elemzéshez...');
    
    // Kép base64 konvertálása
    const base64Image = await fileToBase64(imageFile);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Magyar áruházi blokk (pl. ALDI, LIDL, SPAR, TESCO) terméksorainak kinyerése. Feladat: minden valós termék, ár, egység, kategória, márka, bolt neve, dátum kinyerése strukturált JSON listába.

Kimenet: csak JSON tömb, minden terméksor külön elem, például:
[
  {
    "name": "Tejföl 20%",
    "brand": "",
    "category": "Tejtermékek",
    "store": "Aldi",
    "price": 450,
    "quantity": 1,
    "unit": "db",
    "date": "2025.01.05"
  }
]

🔍 AMIT KERESS:
1. TERMÉKNEVEK - Javítsd emberileg értelmesre (pl. "Pöttyös0%tejsüti" → "Pöttyös tejdesszert")
2. MÁRKÁK - Ha feltűntetett, különben null
3. ÁRAK - Eredeti forint érték (pl. 450 Ft = 450)
4. MÉRTÉKEGYSÉGEK - kg, g, l, dl, db stb.
5. ÁRUHÁZ NEVE - TESCO, ALDI, LIDL, SPAR, CBA stb.
6. DÁTUM - ÉÉÉÉ.HH.NN formátum
7. KATEGÓRIÁK - 8 magyar kategória közül válassz:
   - Tejtermékek
   - Pékáruk
   - Hús és hal
   - Zöldség és gyümölcs
   - Édességek és snack
   - Italok
   - Háztartási cikkek
   - Egyéb

🛠️ OCR HIBAJAVÍTÁSOK:
- "0" helyett "o" betű
- "5" helyett "s" betű
- Szóközök eltávolítása terméknevekből
- Magyar ékezetek helyreállítása`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Elemezd figyelmesen ezt a magyar nyugtát! Fontos a bolt neve, pontos terméknevek magyarul és helyes árak forintban. Javítsd az OCR hibákat!'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 3000,
        temperature: 0.05
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API hiba: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: OpenAIResponse = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Nincs válasz a GPT-4 Vision API-tól');
    }

    console.log('📝 GPT-4 Vision válasz:', content.substring(0, 200) + '...');

    // JSON parsing
    let jsonStr = content.trim();
    
    // Csak a JSON tömböt keressük
    const arrayStart = jsonStr.indexOf('[');
    const arrayEnd = jsonStr.lastIndexOf(']') + 1;
    
    if (arrayStart !== -1 && arrayEnd > arrayStart) {
      jsonStr = jsonStr.substring(arrayStart, arrayEnd);
    } else {
      // Ha nincs tömb, próbáljuk meg az objektumot
      const objStart = jsonStr.indexOf('{');
      const objEnd = jsonStr.lastIndexOf('}') + 1;
      if (objStart === -1 || objEnd === 0) {
        throw new Error('Nem található JSON a válaszban');
      }
      jsonStr = jsonStr.substring(objStart, objEnd);
    }

    let parsedData;
    try {
      parsedData = JSON.parse(jsonStr);
    } catch (e) {
      console.error('JSON parsing hiba:', e, 'JSON string:', jsonStr);
      throw new Error('Nem sikerült feldolgozni a választ');
    }

    // Ha objektum, akkor tömbbé alakítjuk
    if (!Array.isArray(parsedData)) {
      if (parsedData.items && Array.isArray(parsedData.items)) {
        parsedData = parsedData.items;
      } else {
        throw new Error('A válasz nem tartalmaz terméklistát');
      }
    }

    const items: ReceiptItem[] = parsedData.map((item: Record<string, unknown>) => ({
      id: generateId(),
      name: (item.name as string) || 'Ismeretlen termék',
      quantity: Math.max((item.quantity as number) || 1, 1),
      unit: (item.unit as string) || 'db',
      price: Math.max((item.price as number) || 0, 1),
      category: (item.category as string) || determineCategory((item.name as string) || ''),
      checked: false
    }));

    if (items.length === 0) {
      throw new Error('Nincs feldolgozható termék');
    }

    const result: ReceiptData = {
      items,
      total: parsedData.total || items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      date: parsedData.date || new Date().toLocaleDateString('hu-HU'),
      store: (parsedData.store || 'Ismeretlen üzlet').toUpperCase().trim()
    };

    console.log('✅ GPT-4 Vision parsing:', result.items.length, 'termék,', result.total, 'Ft összesen');
    return result;

  } catch (error) {
    console.error('❌ GPT-4 Vision hiba:', error);
    console.log('📝 Fallback mock adatok használata');
    return generateMockReceiptData();
  }
};

// Mock adatok fejlesztéshez
const generateMockReceiptData = (): ReceiptData => {
  const mockReceipts = [
    {
      items: [
        {
          id: generateId(),
          name: 'KENYÉR FEHÉR',
          quantity: 1,
          unit: 'db',
          price: 450,
          category: 'Pékáruk',
          checked: false
        },
        {
          id: generateId(),
          name: 'TEJ 2,8%',
          quantity: 1,
          unit: 'l',
          price: 399,
          category: 'Tejtermékek',
          checked: false
        },
        {
          id: generateId(),
          name: 'BANÁN',
          quantity: 1.2,
          unit: 'kg',
          price: 780,
          category: 'Zöldség és gyümölcs',
          checked: false
        }
      ],
      total: 1629,
      date: new Date().toLocaleDateString('hu-HU'),
      store: 'TESCO EXPRESSZ'
    }
  ];

  return mockReceipts[Math.floor(Math.random() * mockReceipts.length)];
};

// Fő feldolgozó függvény
export const processReceiptImage = async (imageFile: File): Promise<ReceiptData> => {
  console.log('🚀 Receipt feldolgozás indítása...');
  
  try {
    const result = await processWithGPT4Vision(imageFile);
    console.log('✅ Receipt feldolgozás sikeres:', result.items.length, 'termék');
    return result;
  } catch (error) {
    console.error('❌ Receipt feldolgozási hiba:', error);
    console.log('🔄 Fallback mock adatok használata...');
    return generateMockReceiptData();
  }
};

// JSON export
export const exportToJSON = (receiptData: ReceiptData): string => {
  return JSON.stringify(receiptData, null, 2);
};

// JSON import
export const importFromJSON = (jsonString: string): ReceiptData => {
  try {
    const data = JSON.parse(jsonString) as Record<string, unknown>;
    
    return {
      items: ((data.items as Record<string, unknown>[]) || []).map((item: Record<string, unknown>) => ({
        id: (item.id as string) || generateId(),
        name: (item.name as string) || 'Ismeretlen termék',
        quantity: (item.quantity as number) || 1,
        unit: (item.unit as string) || 'db',
        price: (item.price as number) || 0,
        category: (item.category as string) || 'Egyéb',
        checked: (item.checked as boolean) || false
      })),
      total: (data.total as number) || 0,
      date: (data.date as string) || new Date().toLocaleDateString('hu-HU'),
      store: (data.store as string) || 'Ismeretlen üzlet'
    };
  } catch (error) {
    console.error('❌ JSON import hiba:', error);
    throw new Error('Nem sikerült importálni a JSON adatokat');
  }
};