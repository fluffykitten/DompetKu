import { useState, useCallback, useEffect } from 'react';
import { accountRepo } from '../database/repositories/accountRepo';
import { Account, AccountType } from '../types';

export const useAccounts = (type?: AccountType) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await accountRepo.getAll(type);
      setAccounts(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch accounts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const addAccount = async (account: Omit<Account, 'id' | 'is_default' | 'balance'> & { balance?: number }) => {
    try {
      const id = await accountRepo.create(account);
      await fetchAccounts();
      return id;
    } catch (err: any) {
      setError(err.message || 'Failed to add account');
      throw err;
    }
  };

  const updateAccount = async (id: number, account: Partial<Omit<Account, 'id' | 'is_default' | 'balance'>>) => {
    try {
      const success = await accountRepo.update(id, account);
      if (success) {
        await fetchAccounts();
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to update account');
      throw err;
    }
  };

  const setDefaultAccount = async (id: number) => {
    try {
      const success = await accountRepo.setDefault(id);
      if (success) {
        await fetchAccounts();
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to set default account');
      throw err;
    }
  };

  const deleteAccount = async (id: number) => {
    try {
      const success = await accountRepo.delete(id);
      if (success) {
        await fetchAccounts();
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to delete account');
      throw err;
    }
  };

  return {
    accounts,
    loading,
    error,
    refreshAccounts: fetchAccounts,
    addAccount,
    updateAccount,
    setDefaultAccount,
    deleteAccount,
  };
};
