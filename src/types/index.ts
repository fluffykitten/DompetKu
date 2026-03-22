// ============================================================
// DompetKu - Type Definitions
// ============================================================

export type TransactionType = 'income' | 'expense';
export type AccountType = 'cash' | 'bank' | 'ewallet';
export type ThemeMode = 'light' | 'dark';

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  icon: string;
  color: string;
  balance: number;
  is_default: number;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  is_default: number;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  category_id: number;
  account_id: number;
  date: string;
  note: string;
  created_at: string;
  // Joined fields
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  account_name?: string;
  account_icon?: string;
  account_color?: string;
}

export interface Budget {
  id: number;
  category_id: number;
  amount: number;
  month: number;
  year: number;
  // Joined fields
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  spent?: number;
}

export interface QuickButton {
  id: number;
  name: string;
  amount: number;
  type: TransactionType;
  category_id: number;
  icon: string;
  color: string;
  sort_order: number;
  // Joined fields
  category_name?: string;
  account_id?: number;
}

export interface Setting {
  key: string;
  value: string;
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  locale: string;
  decimals: number;
}

export interface MonthlyStats {
  month: number;
  year: number;
  income: number;
  expense: number;
}

export interface CategoryStats {
  category_id: number;
  category_name: string;
  category_icon: string;
  category_color: string;
  total: number;
  percentage: number;
}

export interface AccountStats {
  account_id: number;
  account_name: string;
  account_type: AccountType;
  account_icon: string;
  account_color: string;
  balance: number;
  income: number;
  expense: number;
}
