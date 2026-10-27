import type { Category } from '@/features/categories/categories.types';

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: string;
  currency: string;
  description: string | null;
  occurredAt: string;
  category: Category;
  // Linea del presupuesto que este gasto cubre (solo los gastos pueden estar enlazados).
  budgetEntry?: { id: string; name: string; group: { name: string; color: string } } | null;
}

export interface TransactionsPage {
  transactions: Transaction[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  color: string;
  type: TransactionType;
  total: number;
}

export interface MonthBreakdown {
  month: string;
  type: TransactionType;
  total: number;
}

export interface Summary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCategory: CategoryBreakdown[];
  byMonth: MonthBreakdown[];
}

export interface TransactionFilters {
  type?: TransactionType;
  categoryId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
}
