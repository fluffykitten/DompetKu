import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  RefreshControl, Dimensions, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeContext';
import { Typography } from '../theme/typography';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTransactions } from '../hooks/useTransactions';
import { useAccounts } from '../hooks/useAccounts';
import { fetchAll } from '../database/db';
import { QuickButton, Transaction } from '../types';
import { formatCurrency as legacyFormatCurrency } from '../utils/formatCurrency';
import { useCurrency } from '../context/CurrencyContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

import BalanceCard from '../components/BalanceCard';
import QuickActionButton from '../components/QuickActionButton';
import TransactionItem from '../components/TransactionItem';
import BudgetProgressBar from '../components/BudgetProgressBar';
import TransactionOptionsModal from '../components/TransactionOptionsModal';
import { useBudgets } from '../hooks/useBudgets';
import { useTranslation } from 'react-i18next';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { t, i18n } = useTranslation();
  const { formatCurrency } = useCurrency();
  
  const { accounts, refreshAccounts } = useAccounts();
  const { recentTransactions, refreshTransactions, getMonthlyTotal, deleteTransaction } = useTransactions();
  
  const [refreshing, setRefreshing] = useState(false);
  const [quickButtons, setQuickButtons] = useState<QuickButton[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [profileName, setProfileName] = useState('User');
  const [greeting, setGreeting] = useState('');

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { budgets, totalBudget, totalSpent, refreshBudgets } = useBudgets(currentMonth, currentYear);

  const loadData = async () => {
    // Load monthly summaries
    const income = await getMonthlyTotal('income', currentMonth, currentYear);
    const expense = await getMonthlyTotal('expense', currentMonth, currentYear);
    setMonthlyIncome(income);
    setMonthlyExpense(expense);
    
    // Load quick buttons
    const buttons = await fetchAll<QuickButton>(`
      SELECT qb.*, c.name as category_name 
      FROM quick_buttons qb 
      JOIN categories c ON qb.category_id = c.id 
      ORDER BY qb.sort_order ASC
    `);
    setQuickButtons(buttons);
  };

  const locale = i18n.language === 'id' ? 'id-ID' : 'en-US';
  const currentMonthName = new Date().toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  const loadProfile = async () => {
    try {
      const name = await AsyncStorage.getItem('@dompetku_profile_name');
      if (name) setProfileName(name);
      
      const hour = new Date().getHours();
      if (hour < 11) setGreeting(i18n.language === 'id' ? 'Selamat Pagi,' : 'Good Morning,');
      else if (hour < 15) setGreeting(i18n.language === 'id' ? 'Selamat Siang,' : 'Good Afternoon,');
      else if (hour < 18) setGreeting(i18n.language === 'id' ? 'Selamat Sore,' : 'Good Evening,');
      else setGreeting(i18n.language === 'id' ? 'Selamat Malam,' : 'Good Night,');
    } catch (e) {}
  };

  useEffect(() => {
    // Initial load
    refreshAccounts();
    refreshTransactions();
    loadData();
    loadProfile();
    
    // Add focus listener to refresh data when returning to tab
    const unsubscribe = navigation.addListener('focus', () => {
      refreshAccounts();
      refreshTransactions();
      refreshBudgets();
      loadData();
      loadProfile();
    });
    
    return unsubscribe;
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refreshAccounts(),
      refreshTransactions(),
      refreshBudgets(),
      loadData()
    ]);
    setRefreshing(false);
  };

  const navigateAddTransaction = (type: 'income' | 'expense') => {
    navigation.navigate('AddTransaction', { 
      transaction: { type } as any // Pass partial to pre-fill type
    });
  };

  const handleQuickAction = (button: QuickButton) => {
    navigation.navigate('AddTransaction', {
      transaction: {
        type: button.type,
        amount: button.amount,
        category_id: button.category_id,
        // Let the form handle auto-selection of default account
      } as any
    });
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
            refreshAccounts();
            refreshTransactions();
            refreshBudgets();
            loadData();
          }
        }
      ]
    );
  };

  const handleTransactionPress = (transaction: Transaction) => {
    setSelectedTx(transaction);
  };

  const handleEditTx = (transaction: Transaction) => {
    (navigation as any).navigate('AddTransaction', { transaction });
  };

  // Group quick buttons for horizontal scroll logic (max 2 rows per col, col-major order)
  const quickButtonColumns: QuickButton[][] = [];
  if (quickButtons.length <= 4) {
    if (quickButtons.length > 0) quickButtonColumns.push([quickButtons[0], quickButtons[2]].filter(Boolean) as QuickButton[]);
    if (quickButtons.length > 1) quickButtonColumns.push([quickButtons[1], quickButtons[3]].filter(Boolean) as QuickButton[]);
  } else {
    quickButtonColumns.push([quickButtons[0], quickButtons[2]].filter(Boolean) as QuickButton[]);
    quickButtonColumns.push([quickButtons[1], quickButtons[3]].filter(Boolean) as QuickButton[]);
    for (let i = 4; i < quickButtons.length; i += 2) {
      quickButtonColumns.push([quickButtons[i], quickButtons[i+1]].filter(Boolean) as QuickButton[]);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.greeting, Typography.bodySmall, { color: colors.textSecondary }]}>
              {greeting} <Text style={{ color: colors.text, fontWeight: 'bold' }}>{profileName}</Text>
            </Text>
            <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.monthText, Typography.h2, { color: colors.text }]}>
              {currentMonthName}
            </Text>
          </View>
          <View style={[styles.appNameContainer, { backgroundColor: colors.primary + '15' }]}>
            <MaterialCommunityIcons name="wallet-bifold" size={20} color={colors.primary} />
            <Text style={[styles.appName, { color: colors.primary }]}>
              DompetKu
            </Text>
          </View>
        </View>

        <BalanceCard 
          totalBalance={totalBalance}
          monthlyIncome={monthlyIncome}
          monthlyExpense={monthlyExpense}
        />

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.mainActionBtn, { backgroundColor: colors.incomeLight }]}
            onPress={() => navigateAddTransaction('income')}
          >
            <View style={[styles.actionIconWrapper, { backgroundColor: colors.income }]}>
              <MaterialCommunityIcons name="arrow-down" size={20} color="#fff" />
            </View>
            <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.actionText, { color: colors.income }]}>{t('common.income')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.mainActionBtn, { backgroundColor: colors.expenseLight }]}
            onPress={() => navigateAddTransaction('expense')}
          >
            <View style={[styles.actionIconWrapper, { backgroundColor: colors.expense }]}>
              <MaterialCommunityIcons name="arrow-up" size={20} color="#fff" />
            </View>
            <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.actionText, { color: colors.expense }]}>{t('common.expense')}</Text>
          </TouchableOpacity>
        </View>

        {/* Account Strip Summary */}
        <View style={styles.accountsSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountsList}>
            {accounts.map(acc => (
              <View key={acc.id} style={[styles.accountBadge, { backgroundColor: acc.color + '15' }]}>
                <Text style={[styles.accountBadgeName, { color: colors.text }]}>{acc.name}</Text>
                <Text style={[styles.accountBadgeBalance, { color: acc.color, fontWeight: 'bold' }]}>
                  {formatCurrency(acc.balance)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Quick Actions Grid */}
        {quickButtons.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, Typography.h4, { color: colors.text }]}>
                {t('dashboard.quickActions')}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
              {quickButtonColumns.map((col, colIndex) => (
                <View key={colIndex} style={{ width: Dimensions.get('window').width * 0.42, marginRight: 12 }}>
                  {col.map(btn => (
                    <QuickActionButton 
                      key={btn.id} 
                      button={btn} 
                      onPress={handleQuickAction} 
                    />
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Budget per Category */}
        {budgets.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, Typography.h4, { color: colors.text }]}>
                {t('navigation.budgets')}
              </Text>
              <TouchableOpacity onPress={() => (navigation as any).navigate('BudgetTab')}>
                <Text style={{ color: colors.primary, fontWeight: '500' }}>{t('dashboard.seeAll')}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.listContainer, { backgroundColor: colors.surface, paddingHorizontal: 16, paddingTop: 16 }]}>
              {budgets.slice(0, 3).map((budget, index) => (
                <TouchableOpacity 
                  key={budget.id} 
                  style={{ marginBottom: 16 }}
                  onPress={() => (navigation as any).navigate('BudgetTab')}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.budgetCategoryIcon, { backgroundColor: (budget.category_color || colors.primary) + '20' }]}>
                        <MaterialCommunityIcons name={(budget.category_icon as any) || 'help-circle'} size={18} color={budget.category_color} />
                      </View>
                      <Text style={[Typography.body, { color: colors.text, fontWeight: '600' }]}>
                        {budget.category_name}
                      </Text>
                    </View>
                  </View>
                  
                  <BudgetProgressBar
                    label=""
                    spent={budget.spent || 0}
                    total={budget.amount}
                    color={budget.category_color}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, Typography.h4, { color: colors.text }]}>
              {t('dashboard.recentTransactions')}
            </Text>
            <TouchableOpacity onPress={() => (navigation as any).navigate('Transactions')}>
              <Text style={{ color: colors.primary, fontWeight: '500' }}>{t('dashboard.seeAll')}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.listContainer, { backgroundColor: colors.surface }]}>
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx, index) => (
                <View key={tx.id}>
                  <TransactionItem 
                    transaction={tx} 
                    showDate={true}
                    onPress={handleTransactionPress}
                  />
                  {index < recentTransactions.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="receipt" size={48} color={colors.textLight} />
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  {t('dashboard.noTransactions')}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>

      <TransactionOptionsModal 
        visible={!!selectedTx}
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
        onEdit={handleEditTx}
        onDelete={confirmDelete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  greeting: {
    marginBottom: 4,
  },
  monthText: {},
  appNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  appName: {
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  mainActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 5,
  },
  actionIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  actionText: {
    fontWeight: '600',
    fontSize: 15,
  },
  accountsSection: {
    marginBottom: 24,
  },
  accountsList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  accountBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
  },
  accountBadgeName: {
    fontSize: 12,
    marginBottom: 2,
  },
  accountBadgeBalance: {
    fontSize: 15,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {},
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  listContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  divider: {
    height: 1,
    marginLeft: 64, // Align with text
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    marginTop: 10,
    fontSize: 14,
  },
  budgetWidget: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  budgetCategoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
});
