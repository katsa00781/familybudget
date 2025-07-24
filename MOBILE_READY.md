# Mobile App Shared Configuration

A mobil alkalmazáshoz szükséges konfigurációk és utilities, amelyeket megoszthatunk a web és mobil verzió között.

## 🎯 Ready for Mobile App

### ✅ Már elkészült:
1. **Típusdefiníciók** (`/src/types/`)
   - `auth.ts` - Autentikáció típusok
   - `budget.ts` - Költségvetés típusok  
   - `salary.ts` - Bérkalkulátor típusok
   - `products.ts` - Termékkezelés típusok
   - `common.ts` - Közös API típusok
   - `index.ts` - Központi export

2. **Backend szolgáltatások** (`/src/services/`)
   - `auth.ts` - Autentikáció service
   - `profile.ts` - Profil kezelés service
   - `budget.ts` - Költségvetés service
   - `salary.ts` - Bérkalkulátor service
   - `product.ts` - Termékkezelés service
   - `shopping.ts` - Bevásárlólista service
   - `income.ts` - Bevételek service
   - `database.ts` - Általános DB utilities
   - `index.ts` - Központi export

3. **Hooks** (`/src/hooks/`)
   - `useUserProfile.ts` - Felhasználói profil hook

4. **Utils** (`/src/lib/utils/`)
   - Supabase kliensek (client, server, middleware)
   - Utility függvények

## 📱 ÁTMOZGATÁS KÉSZ! 

### ✅ Sikeresen átmozgatott fájlok a `familybudget-mobile` mappába:

1. **Típusdefiníciók** → `/familybudget-mobile/src/types/`
   - `auth.ts`, `budget.ts`, `salary.ts`, `products.ts`, `common.ts`, `index.ts`

2. **Backend szolgáltatások** → `/familybudget-mobile/src/services/`
   - `auth.ts`, `profile.ts`, `budget.ts`, `salary.ts`, `product.ts`, `shopping.ts`, `income.ts`, `database.ts`, `index.ts`

3. **Konfigurációk** → `/familybudget-mobile/src/config/`
   - `constants.ts` - Színek, útvonalak, konstansok

4. **Validációk** → `/familybudget-mobile/src/lib/`
   - `validation.ts` - Zod sémák minden formhoz

5. **Utility függvények** → `/familybudget-mobile/src/lib/utils/`
   - `helpers.ts` - Formázás, dátum kezelés, validációk
   - `supabase/client.ts` - Mobil-specifikus Supabase kliens

6. **React Hooks** → `/familybudget-mobile/src/hooks/`
   - `useUserProfile.ts` - Felhasználói profil hook

7. **Példa komponens** → `/familybudget-mobile/examples/`
   - `BudgetExample.tsx` - React Native komponens példa

### 🚀 Mobil app használatra kész!

```bash
cd familybudget-mobile
npm install
npm start
```

### 🔧 További mobil-specifikus konfigurációk:

## Environment Variables Template
```env
# Supabase Configuration (same for web and mobile)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Mobile App Specific (optional)
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Constants for Mobile App
```typescript
// Can be shared between web and mobile
export const APP_CONFIG = {
  COMPANY_NAME: "Family Budget",
  DEFAULT_CURRENCY: "HUF",
  DEFAULT_LANGUAGE: "hu",
  MINIMUM_SALARY_2025: 290000,
  GUARANTEED_MINIMUM_SALARY_2025: 348000
};

export const COLORS = {
  familybudget: {
    blue: "#2044b2",
    teal: "#1cc8e3", 
    green: "#35e094",
    food: "#00e091",
    bill: "#1cc8e3",
    transport: "#ffc700",
    entertainment: "#a076f2"
  }
};
```

## Navigation Structure (for mobile routing)
```typescript
export const MAIN_ROUTES = {
  HOME: "/",
  PROFILE: "/profil", 
  BUDGET: "/koltsegvetes",
  INCOME: "/bevetelek",
  SALARY_CALCULATOR: "/berkalkulator",
  SHOPPING: "/bevasarlas",
  PRODUCTS: "/termekek",
  RECIPES: "/receptek",
  REPORTS: "/jelentesek"
};
```

## Validation Schemas (for forms)
Based on the current forms, we could extract Zod schemas for validation.

## UI Components Architecture
The current shadcn/ui components are web-specific, but the logic and structure can be adapted for React Native.

---

## 📱 Next Steps for Mobile App:

1. **React Native/Expo Setup**: 
   - Initialize new Expo project
   - Install Supabase dependencies
   - Copy shared types and services

2. **UI Layer**: 
   - Choose React Native UI library (NativeBase, React Native Elements, Tamagui)
   - Adapt component logic from current shadcn components

3. **Navigation**: 
   - Setup React Navigation
   - Use shared route constants

4. **State Management**: 
   - Use same services and hooks
   - Add React Query/SWR for cache management

5. **Platform-specific features**:
   - Camera for barcode scanning
   - Push notifications
   - Offline support

---

## 💡 Benefits of Current Architecture:

- **100% Code Reuse**: Összes service és típus újrafelhasználható
- **Consistent API**: Ugyanazok a backend hívások
- **Type Safety**: Teljes TypeScript támogatás
- **Maintainable**: Egy helyen a business logic
- **Scalable**: Könnyen bővíthető új funkciókkal
