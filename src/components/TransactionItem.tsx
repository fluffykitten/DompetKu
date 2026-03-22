import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Typography } from '../theme/typography';
import { useCurrency } from '../context/CurrencyContext';
import { Transaction } from '../types';
import { formatDate } from '../utils/dateUtils';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: (transaction: Transaction) => void;
  showDate?: boolean;
}

export default function TransactionItem({ 
  transaction, 
  onPress,
  showDate = false
}: TransactionItemProps) {
  const { colors } = useTheme();
  const { formatCurrency } = useCurrency();

  const isIncome = transaction.type === 'income';

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={() => onPress && onPress(transaction)}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: (transaction.category_color || colors.primary) + '20' }]}>
        <MaterialCommunityIcons 
          name={(transaction.category_icon as any) || 'help-circle'} 
          size={24} 
          color={transaction.category_color || colors.primary} 
        />
      </View>
      
      <View style={styles.detailsContainer}>
        <View style={styles.topRow}>
          <Text style={[styles.categoryName, Typography.body, { color: colors.text }]} numberOfLines={1}>
            {transaction.category_name || 'Tidak ada kategori'}
          </Text>
          <Text 
            style={[
              styles.amount, 
              Typography.body, 
              { color: transaction.type === 'income' ? colors.income : colors.expense }
            ]}
          >
            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
          </Text>
        </View>
        
        <View style={styles.bottomRow}>
          <View style={styles.infoRow}>
            {transaction.note ? (
              <Text style={[styles.note, Typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                {transaction.note}
              </Text>
            ) : null}
            
            {showDate && (
              <>
                {transaction.note && <Text style={[styles.dot, { color: colors.textLight }]}>•</Text>}
                <Text style={[styles.date, Typography.caption, { color: colors.textSecondary }]}>
                  {formatDate(transaction.date)}
                </Text>
              </>
            )}
          </View>
          
          <View style={[styles.accountBadge, { backgroundColor: (transaction.account_color || colors.borderLight) + '20' }]}>
            <MaterialCommunityIcons 
              name={(transaction.account_icon as any) || 'wallet'} 
              size={12} 
              color={transaction.account_color || colors.textSecondary} 
            />
            <Text style={[styles.accountText, { color: transaction.account_color || colors.textSecondary }]}>
              {transaction.account_name || 'Akun'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailsContainer: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryName: {
    flex: 1,
    fontWeight: '600',
    marginRight: 8,
  },
  amount: {
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  note: {
    flexShrink: 1,
  },
  dot: {
    marginHorizontal: 4,
    fontSize: 10,
  },
  date: {
    fontWeight: '500',
  },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  accountText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
});
