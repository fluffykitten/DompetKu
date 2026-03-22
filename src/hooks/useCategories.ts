import { useState, useCallback, useEffect } from 'react';
import { categoryRepo } from '../database/repositories/categoryRepo';
import { Category, TransactionType } from '../types';

export const useCategories = (type?: TransactionType) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await categoryRepo.getAll(type);
      setCategories(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch categories');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = async (category: Omit<Category, 'id' | 'is_default'>) => {
    try {
      const id = await categoryRepo.create(category);
      await fetchCategories();
      return id;
    } catch (err: any) {
      setError(err.message || 'Failed to add category');
      throw err;
    }
  };

  const updateCategory = async (id: number, category: Partial<Category>) => {
    try {
      const success = await categoryRepo.update(id, category);
      if (success) {
        await fetchCategories();
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to update category');
      throw err;
    }
  };

  const deleteCategory = async (id: number) => {
    try {
      const success = await categoryRepo.delete(id);
      if (success) {
        await fetchCategories();
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to delete category');
      throw err;
    }
  };

  return {
    categories,
    loading,
    error,
    refreshCategories: fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
  };
};
