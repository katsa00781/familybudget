// Main services export index
export { AuthService } from './auth';
export { ProfileService } from './profile';
export { BudgetService } from './budget';
export { SalaryService } from './salary';
export { ProductService } from './product';
export { ShoppingListService } from './shopping';
export { IncomeService } from './income';

// Service instances (singleton pattern)
import { AuthService } from './auth';
import { ProfileService } from './profile';
import { BudgetService } from './budget';
import { SalaryService } from './salary';
import { ProductService } from './product';
import { ShoppingListService } from './shopping';
import { IncomeService } from './income';

export const authService = new AuthService();
export const profileService = new ProfileService();
export const budgetService = new BudgetService();
export const salaryService = new SalaryService();
export const productService = new ProductService();
export const shoppingListService = new ShoppingListService();
export const incomeService = new IncomeService();
