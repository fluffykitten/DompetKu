import { useState, useCallback, useEffect } from 'react';
import { transactionRepo } from '../database/repositories/transactionRepo';
import { Transaction, TransactionType } from '../types';

export const useTransactions = (accountId?: number) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await transactionRepo.getAll(50, 0, accountId);
      setTransactions(data);
      
      const recent = await transactionRepo.getRecent(5, accountId);
      setRecentTransactions(recent);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transactions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'created_at'>) => {
    try {
      const id = await transactionRepo.create(transaction);
      await fetchTransactions(); // Refresh list
      return id;
    } catch (err: any) {
      setError(err.message || 'Failed to add transaction');
      console.error(err);
      throw err;
    }
  };

  const deleteTransaction = async (id: number) => {
    try {
      const success = await transactionRepo.delete(id);
      if (success) {
        await fetchTransactions(); // Refresh list
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to delete transaction');
      console.error(err);
      throw err;
    }
  };

  const editTransaction = async (id: number, transaction: Partial<Omit<Transaction, 'id' | 'created_at'>>) => {
    try {
      const success = await transactionRepo.update(id, transaction);
      if (success) {
        await fetchTransactions(); // Refresh list
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to edit transaction');
      console.error(err);
      throw err;
    }
  };

  const getMonthlyTotal = async (type: TransactionType, month: number, year: number, accId?: number) => {
    return await transactionRepo.getTotalByMonth(type, month, year, accId);
  };

  return {
    transactions,
    recentTransactions,
    loading,
    error,
    refreshTransactions: fetchTransactions,
    addTransaction,
    editTransaction,
    deleteTransaction,
    getMonthlyTotal,
  };
};
