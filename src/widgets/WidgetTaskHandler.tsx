import React from 'react';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { DompetKuWidget, WidgetLabels } from './DompetKuWidget';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { transactionRepo } from '../database/repositories/transactionRepo';
import { accountRepo } from '../database/repositories/accountRepo';
import { formatCurrencyWithSetting } from '../utils/formatCurrency';
import { CurrencySetting, defaultCurrency } from '../context/CurrencyContext';

// Storage keys (harus konsisten dengan yang dipakai di app)
const CURRENCY_STORAGE_KEY = '@dompetku_currency_setting';
const LANGUAGE_KEY = '@dompetku_language';
const THEME_KEY = '@dompetku_theme_mode';
const WIDGET_PREFS_KEY = 'dompetku-widget-preferences';

// Label widget per bahasa
const WIDGET_LABELS: Record<string, WidgetLabels> = {
  id: {
    appName: 'DompetKu',
    open: 'Buka',
    totalBalance: 'Total Saldo',
    income: 'Pemasukan',
    expense: 'Pengeluaran',
    transfer: 'Transfer',
    recentTransactions: 'Transaksi Terakhir',
    noTransactions: 'Tidak ada transaksi',
    transactionFallback: 'Transaksi',
  },
  en: {
    appName: 'DompetKu',
    open: 'Open',
    totalBalance: 'Total Balance',
    income: 'Income',
    expense: 'Expense',
    transfer: 'Transfer',
    recentTransactions: 'Recent Transactions',
    noTransactions: 'No transactions',
    transactionFallback: 'Transaction',
  },
};

async function loadCurrencySetting(): Promise<CurrencySetting> {
  try {
    const saved = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return defaultCurrency;
}

async function loadLanguage(): Promise<string> {
  try {
    const lang = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (lang && WIDGET_LABELS[lang]) return lang;
  } catch (e) {}
  return 'id';
}

async function loadIsDarkMode(): Promise<boolean> {
  try {
    const mode = await AsyncStorage.getItem(THEME_KEY);
    return mode === 'dark';
  } catch (e) {}
  return false;
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      try {
        // Parallel fetch semua data & konfigurasi
        const [recentTx, accounts, currencySetting, lang, isDarkMode] = await Promise.all([
          transactionRepo.getRecent(3),
          accountRepo.getAll(),
          loadCurrencySetting(),
          loadLanguage(),
          loadIsDarkMode(),
        ]);

        let total = 0;
        accounts.forEach((acc: any) => { total += (acc.balance || 0); });

        const formattedBalance = formatCurrencyWithSetting(total, currencySetting);
        const formattedAmounts = (recentTx || []).map(tx => 
          formatCurrencyWithSetting(tx.amount, currencySetting)
        );

        // Preferensi tampilan widget
        let prefs = {
          showQuickActions: true,
          showRecentTransactions: true,
          showTotalBalance: true,
        };
        const prefsStr = await AsyncStorage.getItem(WIDGET_PREFS_KEY);
        if (prefsStr) {
          try {
            const parsed = JSON.parse(prefsStr);
            if (parsed.state) prefs = { ...prefs, ...parsed.state };
          } catch (e) {}
        }

        const labels = WIDGET_LABELS[lang] || WIDGET_LABELS['id'];

        props.renderWidget(
          <DompetKuWidget 
            transactions={recentTx || []} 
            totalBalance={total}
            formattedBalance={formattedBalance}
            formattedAmounts={formattedAmounts}
            showQuickActions={prefs.showQuickActions}
            showRecentTransactions={prefs.showRecentTransactions}
            showTotalBalance={prefs.showTotalBalance}
            isDarkMode={isDarkMode}
            labels={labels}
          />
        );
      } catch (err) {
        console.error('Widget render error:', err);
        props.renderWidget(
          <DompetKuWidget 
            transactions={[]} 
            totalBalance={0} 
            formattedBalance="–"
            formattedAmounts={[]}
            labels={WIDGET_LABELS['id']}
          />
        );
      }
      break;

    case 'WIDGET_DELETED':
      break;

    case 'WIDGET_CLICK':
      if (props.clickAction === 'OPEN_INCOME') {
        Linking.openURL('dompetkufk://add-transaction?type=income');
      } else if (props.clickAction === 'OPEN_EXPENSE') {
        Linking.openURL('dompetkufk://add-transaction?type=expense');
      } else if (props.clickAction === 'OPEN_TRANSFER') {
        Linking.openURL('dompetkufk://transfer');
      } else if (props.clickAction === 'OPEN_APP') {
        Linking.openURL('dompetkufk://dashboard');
      }
      break;

    default:
      break;
  }
}
