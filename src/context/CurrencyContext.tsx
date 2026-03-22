import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatCurrencyWithSetting } from '../utils/formatCurrency';

export type CurrencyPosition = 'left' | 'right';

export interface CurrencySetting {
  code: string;
  symbol: string;
  position: CurrencyPosition;
  decimalSeparator: string;
  groupSeparator: string;
}

export const defaultCurrency: CurrencySetting = {
  code: 'IDR',
  symbol: 'Rp',
  position: 'left',
  decimalSeparator: ',',
  groupSeparator: '.',
};

type CurrencyContextType = {
  currency: CurrencySetting;
  setCurrency: (c: CurrencySetting) => Promise<void>;
  formatCurrency: (amount: number) => string;
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const CURRENCY_STORAGE_KEY = '@dompetku_currency_setting';

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<CurrencySetting>(defaultCurrency);

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const saved = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
        if (saved) {
          setCurrencyState(JSON.parse(saved));
        }
      } catch (e) {
        console.warn('Failed to load currency setting', e);
      }
    };
    loadCurrency();
  }, []);

  const setCurrency = async (c: CurrencySetting) => {
    try {
      await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify(c));
      setCurrencyState(c);
    } catch (e) {
      console.warn('Failed to save currency setting', e);
    }
  };

  const formatCurrency = useCallback(
    (amount: number) => {
      return formatCurrencyWithSetting(amount, currency);
    },
    [currency]
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
