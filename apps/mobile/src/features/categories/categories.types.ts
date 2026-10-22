import type { TransactionType } from '@/features/transactions/transactions.types';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
}
