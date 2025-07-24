// Validation utilities for forms (shared between web and mobile)
import { z } from 'zod';

// User Profile Validation
export const profileSchema = z.object({
  email: z.string().email('Érvényes email címet adj meg'),
  full_name: z.string().min(2, 'A név legalább 2 karakter legyen'),
  display_name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  birth_date: z.string().optional(),
  bio: z.string().optional()
});

// Budget Plan Validation
export const budgetPlanSchema = z.object({
  name: z.string().min(1, 'A terv nevét add meg'),
  month: z.string().regex(/^\d{2}$/, 'Érvényes hónapot adj meg (01-12)'),
  year: z.number().min(2020).max(2030, 'Érvényes évet adj meg'),
  categories: z.array(z.object({
    id: z.string(),
    name: z.string(),
    planned_amount: z.number().min(0, 'Az összeg nem lehet negatív'),
    spent_amount: z.number().min(0, 'Az összeg nem lehet negatív').default(0),
    color: z.string().optional(),
    icon: z.string().optional()
  })),
  total_planned: z.number().min(0),
  total_spent: z.number().min(0).default(0)
});

// Income Plan Validation
export const incomePlanSchema = z.object({
  base_income: z.number().min(0, 'Az alapbér nem lehet negatív'),
  other_income: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, 'A jövedelem nevét add meg'),
    amount: z.number().min(0, 'Az összeg nem lehet negatív'),
    frequency: z.enum(['monthly', 'yearly', 'one-time']).optional()
  })),
  month: z.string().regex(/^\d{2}$/, 'Érvényes hónapot adj meg (01-12)'),
  year: z.number().min(2020).max(2030, 'Érvényes évet adj meg'),
  total_income: z.number().min(0)
});

// Product Validation
export const productSchema = z.object({
  name: z.string().min(1, 'A termék nevét add meg'),
  category_id: z.string().min(1, 'Válassz kategóriát'),
  price: z.number().min(0, 'Az ár nem lehet negatív'),
  unit: z.string().min(1, 'Add meg az egységet'),
  store_id: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  brand: z.string().optional(),
  package_size: z.string().optional()
});

// Shopping List Validation
export const shoppingListSchema = z.object({
  name: z.string().min(1, 'A lista nevét add meg'),
  items: z.array(z.object({
    id: z.string(),
    product_id: z.string(),
    quantity: z.number().min(0.1, 'A mennyiség legalább 0.1 legyen'),
    unit: z.string(),
    purchased: z.boolean().default(false),
    notes: z.string().optional()
  })),
  status: z.enum(['draft', 'active', 'completed']).default('draft')
});

// Recipe Validation
export const recipeSchema = z.object({
  name: z.string().min(1, 'A recept nevét add meg'),
  description: z.string().optional(),
  prep_time: z.number().min(0, 'Az előkészítési idő nem lehet negatív').optional(),
  cook_time: z.number().min(0, 'A főzési idő nem lehet negatív').optional(),
  servings: z.number().min(1, 'Az adagok száma legalább 1 legyen').optional(),
  instructions: z.string().min(10, 'Az elkészítési leírás legalább 10 karakter legyen'),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  category: z.string().optional()
});

// Salary Calculation Validation
export const salaryCalculationSchema = z.object({
  alapber: z.number().min(0, 'Az alapbér nem lehet negatív'),
  ledolgozott_napok: z.number().min(0).max(31, 'A ledolgozott napok 0-31 között lehetnek'),
  ledolgozott_orak: z.number().min(0).max(24*31, 'Érvénytelen óraszám'),
  szabadsag_napok: z.number().min(0).max(31, 'A szabadság napok 0-31 között lehetnek').default(0),
  betegszabadsag_napok: z.number().min(0).max(31, 'A betegszabadság napok 0-31 között lehetnek').default(0),
  kikuldes_napok: z.number().min(0).max(31, 'A kiküldetés napok 0-31 között lehetnek').default(0),
  gyed_mellett: z.number().min(0, 'A GYED melletti munkavégzés nem lehet negatív').default(0),
  formaruha_kompenzacio: z.number().min(0, 'A formaruha kompenzáció nem lehet negatív').default(0),
  csaladi_adokedvezmeny: z.number().min(0, 'A családi adókedvezmény nem lehet negatív').default(0)
});

// Authentication Validation
export const loginSchema = z.object({
  email: z.string().email('Érvényes email címet adj meg'),
  password: z.string().min(6, 'A jelszó legalább 6 karakter legyen')
});

export const registerSchema = z.object({
  email: z.string().email('Érvényes email címet adj meg'),
  password: z.string().min(8, 'A jelszó legalább 8 karakter legyen'),
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'A név legalább 2 karakter legyen'),
  birthDate: z.string().optional(),
  zipCode: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  terms: z.boolean().refine(val => val === true, 'El kell fogadni a felhasználási feltételeket')
}).refine(data => data.password === data.confirmPassword, {
  message: 'A jelszavak nem egyeznek',
  path: ['confirmPassword']
});

// Export all schemas as a collection
export const validationSchemas = {
  profile: profileSchema,
  budgetPlan: budgetPlanSchema,
  incomePlan: incomePlanSchema,
  product: productSchema,
  shoppingList: shoppingListSchema,
  recipe: recipeSchema,
  salaryCalculation: salaryCalculationSchema,
  login: loginSchema,
  register: registerSchema
} as const;
