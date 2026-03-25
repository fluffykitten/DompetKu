import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { Transaction } from '../types';

interface DompetKuWidgetProps {
  transactions: Transaction[];
  totalBalance: number;
  formattedBalance: string;
  formattedAmounts: string[];
  showQuickActions?: boolean;
  showRecentTransactions?: boolean;
  showTotalBalance?: boolean;
  // i18n & dark mode
  isDarkMode?: boolean;
  labels: WidgetLabels;
}

export interface WidgetLabels {
  appName: string;
  open: string;
  totalBalance: string;
  income: string;
  expense: string;
  transfer: string;
  recentTransactions: string;
  noTransactions: string;
  transactionFallback: string;
}

// Palet warna light & dark yang konsisten dengan colors.ts
const PALETTE = {
  light: {
    background: '#F8F9FE' as const,
    surface: '#FFFFFF' as const,
    text: '#1A1A2E' as const,
    textSecondary: '#6B7280' as const,
    textLight: '#9CA3AF' as const,
    income: '#00C897' as const,
    expense: '#FF6B6B' as const,
    primary: '#6C63FF' as const,
    border: '#E5E7EB' as const,
  },
  dark: {
    background: '#0F0F1A' as const,
    surface: '#1A1A2E' as const,
    text: '#F8F9FE' as const,
    textSecondary: '#9CA3AF' as const,
    textLight: '#6B7280' as const,
    income: '#00E5A8' as const,
    expense: '#FF8585' as const,
    primary: '#8B85FF' as const,
    border: '#2D2D4A' as const,
  },
};

export function DompetKuWidget({ 
  transactions = [], 
  totalBalance = 0,
  formattedBalance = '',
  formattedAmounts = [],
  showQuickActions = true,
  showRecentTransactions = true,
  showTotalBalance = true,
  isDarkMode = false,
  labels,
}: DompetKuWidgetProps) {
  const c = isDarkMode ? PALETTE.dark : PALETTE.light;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: c.surface,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <TextWidget
          text={labels.appName}
          style={{ fontSize: 16, color: c.text, fontWeight: 'bold' }}
        />
        <FlexWidget 
          clickAction="OPEN_APP"
          style={{ backgroundColor: c.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}
        >
          <TextWidget text={labels.open} style={{ fontSize: 11, color: '#FFFFFF', fontWeight: 'bold' }} />
        </FlexWidget>
      </FlexWidget>

      {/* Total Saldo */}
      {showTotalBalance && (
        <FlexWidget style={{ marginBottom: 16 }}>
          <TextWidget text={labels.totalBalance} style={{ fontSize: 12, color: c.textSecondary }} />
          <TextWidget text={formattedBalance} style={{ fontSize: 22, color: c.text, fontWeight: 'bold' }} />
        </FlexWidget>
      )}
      
      {/* Tombol Aksi Cepat */}
      {showQuickActions && (
        <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
          <FlexWidget
            style={{ backgroundColor: c.income, padding: 12, borderRadius: 12, flex: 1, marginRight: 4, alignItems: 'center' }}
            clickAction="OPEN_INCOME"
          >
            <TextWidget text="＋" style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }} />
            <TextWidget text={labels.income} style={{ color: '#FFFFFF', fontSize: 11, textAlign: 'center', fontWeight: 'bold' }} />
          </FlexWidget>
          <FlexWidget
            style={{ backgroundColor: c.expense, padding: 12, borderRadius: 12, flex: 1, marginHorizontal: 4, alignItems: 'center' }}
            clickAction="OPEN_EXPENSE"
          >
            <TextWidget text="－" style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }} />
            <TextWidget text={labels.expense} style={{ color: '#FFFFFF', fontSize: 11, textAlign: 'center', fontWeight: 'bold' }} />
          </FlexWidget>
          <FlexWidget
            style={{ backgroundColor: c.primary, padding: 12, borderRadius: 12, flex: 1, marginLeft: 4, alignItems: 'center' }}
            clickAction="OPEN_TRANSFER"
          >
            <TextWidget text="⇄" style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }} />
            <TextWidget text={labels.transfer} style={{ color: '#FFFFFF', fontSize: 11, textAlign: 'center', fontWeight: 'bold' }} />
          </FlexWidget>
        </FlexWidget>
      )}

      {/* Transaksi Terakhir */}
      {showRecentTransactions && (
        <>
          <TextWidget
            text={labels.recentTransactions}
            style={{ fontSize: 13, color: c.textSecondary, fontWeight: 'bold', marginBottom: 8 }}
          />
          
          {transactions.length === 0 ? (
            <TextWidget text={labels.noTransactions} style={{ fontSize: 12, color: c.textLight }} />
          ) : (
            <FlexWidget style={{ flexDirection: 'column' }}>
              {transactions.slice(0, 3).map((tx, idx) => (
                 <FlexWidget key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                   <FlexWidget style={{ flex: 1, marginRight: 8 }}>
                     <TextWidget 
                        text={tx.note || tx.category_name || labels.transactionFallback} 
                        maxLines={1}
                        truncate="END"
                        style={{ fontSize: 12, color: c.text }} 
                     />
                   </FlexWidget>
                   <TextWidget 
                      text={(tx.type === 'income' ? '+ ' : '- ') + (formattedAmounts[idx] || String(tx.amount))} 
                      style={{ fontSize: 12, color: tx.type === 'income' ? c.income : c.expense, fontWeight: 'bold' }} 
                   />
                 </FlexWidget>
              ))}
            </FlexWidget>
          )}
        </>
      )}
    </FlexWidget>
  );
}
