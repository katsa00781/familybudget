// Shared constants and configuration for web and mobile apps
export const APP_CONFIG = {
  COMPANY_NAME: "Family Budget",
  DEFAULT_CURRENCY: "HUF",
  DEFAULT_LANGUAGE: "hu",
  MINIMUM_SALARY_2025: 290000,
  GUARANTEED_MINIMUM_SALARY_2025: 348000,
  APP_VERSION: "1.0.0"
} as const;

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
} as const;

export const MAIN_ROUTES = {
  HOME: "/",
  PROFILE: "/profil", 
  BUDGET: "/koltsegvetes",
  INCOME: "/bevetelek",
  SALARY_CALCULATOR: "/berkalkulator",
  SHOPPING: "/bevasarlas",
  PRODUCTS: "/termekek",
  RECIPES: "/receptek",
  REPORTS: "/jelentesek",
  LOGIN: "/login",
  REGISTER: "/register"
} as const;

export const BUDGET_CATEGORIES = [
  { id: 'food', name: 'Étel és ital', icon: 'UtensilsCrossed', color: '#00e091' },
  { id: 'bills', name: 'Számlák', icon: 'CreditCard', color: '#1cc8e3' },
  { id: 'transport', name: 'Közlekedés', icon: 'Car', color: '#ffc700' },
  { id: 'entertainment', name: 'Szórakozás', icon: 'Gamepad2', color: '#a076f2' },
  { id: 'health', name: 'Egészség', icon: 'Heart', color: '#ff6b6b' },
  { id: 'education', name: 'Oktatás', icon: 'GraduationCap', color: '#4ecdc4' },
  { id: 'shopping', name: 'Vásárlás', icon: 'ShoppingBag', color: '#45b7d1' },
  { id: 'savings', name: 'Megtakarítás', icon: 'PiggyBank', color: '#96ceb4' },
  { id: 'other', name: 'Egyéb', icon: 'MoreHorizontal', color: '#feca57' }
] as const;

export const PRODUCT_UNITS = [
  'db', 'kg', 'g', 'l', 'ml', 'csomag', 'doboz', 'üveg', 'zacskó', 'm', 'cm'
] as const;

export const STORE_TYPES = [
  'supermarket', 'grocery', 'pharmacy', 'bakery', 'butcher', 'market', 'online', 'other'
] as const;

export const SAVINGS_CATEGORIES = [
  'emergency', 'vacation', 'car', 'house', 'education', 'retirement', 'investment', 'other'
] as const;

export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20
} as const;

export const API_ENDPOINTS = {
  PROFILES: 'profiles',
  BUDGET_PLANS: 'budget_plans',
  INCOME_PLANS: 'income_plans',
  SALARY_CALCULATIONS: 'salary_calculations',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  STORES: 'stores',
  SHOPPING_LISTS: 'shopping_lists',
  RECIPES: 'recipes',
  RECIPE_INGREDIENTS: 'recipe_ingredients',
  SAVINGS_GOALS: 'savings_goals'
} as const;
