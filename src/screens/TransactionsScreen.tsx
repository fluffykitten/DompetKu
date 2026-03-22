import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  TextInput, Alert, RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeContext';
import { Typography } from '../theme/typography';
import { fetchAll } from '../database/db';
import { Transaction, TransactionType, Account } from '../types';
import { useAccounts } from '../hooks/useAccounts';
import { useTransactions } from '../hooks/useTransactions';

import TransactionItem from '../components/TransactionItem';
import TransactionOptionsModal from '../components/TransactionOptionsModal';
import TransactionFilterModal from '../components/TransactionFilterModal';
import { useTranslation } from 'react-i18next';

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { t } = useTranslation();
  
  const { accounts, refreshAccounts } = useAccounts();
  const { deleteTransaction } = useTransactions();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [filterAccount, setFilterAccount] = useState<number | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<number | 'all'>('all');
  
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]; // Can keep mapped since month format is usually native, or create month dictionary

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  
  const handleApplyFilter = (type: TransactionType | 'all', accountId: number | 'all', categoryId: number | 'all') => {
    setFilterType(type);
    setFilterAccount(accountId);
    setFilterCategory(categoryId);
  };

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = `
        SELECT 
          t.*, 
          c.name as category_name, c.icon as category_icon, c.color as category_color,
          a.name as account_name, a.icon as account_icon, a.color as account_color
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        JOIN accounts a ON t.account_id = a.id
        WHERE 1=1
      `;
      const args: any[] = [];
      
      const monthStr = currentMonth.toString().padStart(2, '0');
      const datePrefix = `${currentYear}-${monthStr}-`;
      query += ` AND t.date LIKE ?`;
      args.push(`${datePrefix}%`);
      
      if (filterType !== 'all') {
        query += ` AND t.type = ?`;
        args.push(filterType);
      }
      
      if (filterAccount !== 'all') {
        query += ` AND t.account_id = ?`;
        args.push(filterAccount);
      }
      
      if (filterCategory !== 'all') {
        query += ` AND t.category_id = ?`;
        args.push(filterCategory);
      }
      
      if (searchQuery.trim()) {
        query += ` AND (t.note LIKE ? OR c.name LIKE ?)`;
        args.push(`%${searchQuery}%`, `%${searchQuery}%`);
      }
      
      query += ` ORDER BY t.date DESC, t.created_at DESC LIMIT 100`; // Limit to latest 100 for perf
      
      const data = await fetchAll<Transaction>(query, args);
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterAccount, filterCategory, searchQuery, currentMonth, currentYear]);

  useEffect(() => {
    refreshAccounts();
    loadTransactions();
  }, [loadTransactions]);
  
  // Refresh on focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadTransactions();
    });
    return unsubscribe;
  }, [navigation, loadTransactions]);

  const handleTransactionPress = (transaction: Transaction) => {
    setSelectedTx(transaction);
  };

  const handleEditTx = (transaction: Transaction) => {
    (navigation as any).navigate('AddTransaction', { transaction });
  };

  const confirmDelete = (transaction: Transaction) => {
    Alert.alert(
      t('transactions.deleteConfirmTitle'),
      t('transactions.deleteConfirmDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.delete'), 
          style: 'destructive',
          onPress: async () => {
            await deleteTransaction(transaction.id);
            loadTransactions();
            refreshAccounts();
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* Month Selector */}
      <View style={[styles.monthSelector, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={prevMonth} style={styles.monthButton}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h3, { color: colors.text }]}>
          {monthNames[currentMonth - 1]} {currentYear}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={styles.monthButton}>
          <MaterialCommunityIcons name="chevron-right" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search and Filter Bar */}
      <View style={styles.searchRow}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
          <MaterialCommunityIcons name="magnify" size={24} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('transactions.searchPlaceholder')}
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={[styles.filterBtn, { backgroundColor: colors.surface }]}
          onPress={() => setIsFilterVisible(true)}
        >
          <MaterialCommunityIcons name="filter-variant" size={24} color={colors.primary} />
          {(filterType !== 'all' || filterAccount !== 'all' || filterCategory !== 'all') && (
            <View style={[styles.activeFilterBadge, { backgroundColor: colors.primary }]} />
          )}
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadTransactions} />
        }
        renderItem={({ item }) => (
          <View style={styles.itemWrapper}>
            <TransactionItem 
              transaction={item} 
              onPress={handleTransactionPress}
              showDate={true}
            />
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            {!loading && (
              <>
                <MaterialCommunityIcons name="text-search" size={64} color={colors.textLight} />
                <Text style={[styles.emptyText, Typography.h4, { color: colors.textSecondary }]}>
                  {t('transactions.emptyList')}
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textLight }]}>
                  {t('transactions.emptyListDesc')}
                </Text>
              </>
            )}
          </View>
        )}
      />

      <TransactionOptionsModal 
        visible={!!selectedTx}
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
        onEdit={handleEditTx}
        onDelete={confirmDelete}
      />

      <TransactionFilterModal
        visible={isFilterVisible}
        onClose={() => setIsFilterVisible(false)}
        currentType={filterType}
        currentAccountId={filterAccount}
        currentCategoryId={filterCategory}
        onApply={handleApplyFilter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  monthButton: {
    padding: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 12,
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  filterBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  activeFilterBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 100, // Space for Bottom Tabs
  },
  itemWrapper: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
