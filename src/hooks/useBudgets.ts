import { useState, useCallback, useEffect } from 'react';
import { budgetRepo } from '../database/repositories/budgetRepo';
import { Budget } from '../types';

export const useBudgets = (month: number, year: number) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Calculate total overview
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);

  const fetchBudgets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await budgetRepo.getByMonth(month, year);
      
      const validBudgets = data.filter(b => b.amount > 0);
      setBudgets(validBudgets);
      
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch budgets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const saveBudget = async (budget: Omit<Budget, 'id' | 'spent' | 'category_name' | 'category_icon' | 'category_color'>) => {
    try {
      const success = await budgetRepo.createOrUpdate(budget);
      if (success) {
        await fetchBudgets();
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to save budget');
      throw err;
    }
  };

  const deleteBudget = async (id: number) => {
    try {
      const success = await budgetRepo.delete(id);
      if (success) {
        await fetchBudgets();
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to delete budget');
      throw err;
    }
  };

  return {
    budgets,
    totalBudget,
    totalSpent,
    loading,
    error,
    refreshBudgets: fetchBudgets,
    saveBudget,
    deleteBudget,
  };
};
