import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, RefreshControl 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../theme/ThemeContext';
import { Typography } from '../theme/typography';
import { useStatistics } from '../hooks/useStatistics';
import { useAccounts } from '../hooks/useAccounts';
import { useCurrency } from '../context/CurrencyContext';

import ChartCard from '../components/ChartCard';
import AccountPicker from '../components/AccountPicker';
import CategoryPicker from '../components/CategoryPicker';
import { useCategories } from '../hooks/useCategories';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

export default function StatisticsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const { 
    expenseByCategory, 
    monthlyTrend, 
    dailyTrend,
    accountBalances,
    loading, 
    refreshStats 
  } = useStatistics(currentMonth, currentYear, selectedAccountId || undefined, selectedCategoryId || undefined);

  // Focus effect for refresh
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshStats();
    });
    return unsubscribe;
  }, [navigation, refreshStats]);

  const changeMonth = (delta: number) => {
    let newMonth = currentMonth + delta;
    let newYear = currentYear;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  const formattedMonth = new Date(currentYear, currentMonth - 1).toLocaleDateString('id-ID', { 
    month: 'long', 
    year: 'numeric' 
  });

  // Prepare Data for Charts
  const pieChartData = expenseByCategory.slice(0, 5).map(cat => ({
    name: cat.category_name,
    population: cat.total,
    color: cat.category_color || colors.primary,
    legendFontColor: colors.textSecondary,
    legendFontSize: 12
  }));

  const barChartData = {
    labels: monthlyTrend.map(m => new Date(m.year, m.month - 1).toLocaleDateString('id-ID', { month: 'short' })).reverse(),
    datasets: [
      {
        data: monthlyTrend.map(m => m.income).reverse() || [0],
        color: (opacity = 1) => colors.incomeLight,
      },
      {
        data: monthlyTrend.map(m => m.expense).reverse() || [0],
        color: (opacity = 1) => colors.expenseLight,
      }
    ],
    legend: ["Masuk", "Keluar"]
  };

  const lineChartData = {
    labels: dailyTrend.length > 0 
      ? dailyTrend.filter((_, i) => i % Math.ceil(dailyTrend.length / 5) === 0).map(d => d.day) // Show max 5 labels
      : ['1', '15', '30'],
    datasets: [
      {
        data: dailyTrend.length > 0 ? dailyTrend.map(d => d.amount) : [0],
        color: (opacity = 1) => colors.expense,
        strokeWidth: 2
      }
    ],
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshStats} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Month Navigation */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.monthTitle, Typography.h3, { color: colors.text }]}>
          {formattedMonth}
        </Text>
        <TouchableOpacity 
          onPress={() => changeMonth(1)} 
          style={styles.navBtn}
          disabled={currentMonth === new Date().getMonth() + 1 && currentYear === new Date().getFullYear()}
        >
          <MaterialCommunityIcons 
            name="chevron-right" 
            size={28} 
            color={(currentMonth === new Date().getMonth() + 1 && currentYear === new Date().getFullYear()) ? colors.borderLight : colors.text} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Filters */}
        <View style={styles.accountFilterWrapper}>
           <AccountPicker
            accounts={[{ id: null, name: t('transactions.allAccounts'), type: 'cash', balance: totalBalance, icon: 'wallet-outline', color: colors.primary, is_default: 0 } as any, ...accounts]}
            selectedAccountId={selectedAccountId}
            onSelect={(acc) => setSelectedAccountId(acc.id)}
            label={t('transactions.filter')}
           />
           <CategoryPicker
            categories={[{ id: null, name: t('transactions.allCategories'), icon: 'shape-outline', color: colors.primary, type: 'expense', is_default: 0 } as any, ...categories]}
            selectedCategoryId={selectedCategoryId}
            onSelect={(cat) => setSelectedCategoryId(cat.id)}
            label={t('transactions.filter')}
           />
        </View>

        {/* Charts Section */}
        {expenseByCategory.length > 0 ? (
          <ChartCard
            title={t('statistics.expenseByCategory')}
            type="pie"
            data={pieChartData}
            formatYLabel={(y) => formatCurrency(Number(y))}
          />
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons name="chart-arc" size={48} color={colors.borderLight} />
            <Text style={{ color: colors.textSecondary, marginTop: 10 }}>{t('statistics.noData')}</Text>
          </View>
        )}

        <ChartCard
          title={t('statistics.monthlyTrend')}
          type="line"
          data={lineChartData}
          formatYLabel={(y) => {
            const val = parseInt(y);
            if (val > 1000000) return (val/1000000).toFixed(1) + 'M';
            if (val > 1000) return (val/1000).toFixed(0) + 'K';
            return val.toString();
          }}
        />

        <ChartCard
          title={t('statistics.monthlyTrend')}
          type="bar"
          data={barChartData}
          chartConfig={{
            color: (opacity = 1) => colors.textSecondary, // Base color 
            barPercentage: 0.5,
          }}
          formatYLabel={(y) => {
            const val = parseInt(y);
            if (val > 1000000) return (val/1000000).toFixed(1) + 'M';
            if (val > 1000) return (val/1000).toFixed(0) + 'K';
            return val.toString();
          }}
        />

        {/* Account Summary Cards */}
        <Text style={[styles.sectionTitle, Typography.h4, { color: colors.text }]}>{t('statistics.accountBalance')}</Text>
        <View style={styles.balancesContainer}>
          {accountBalances.map(acc => (
            <View key={acc.account_id} style={[styles.balanceCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.accIconWrapper, { backgroundColor: acc.account_color + '20' }]}>
                <MaterialCommunityIcons name={acc.account_icon as any} size={24} color={acc.account_color} />
              </View>
              <View style={styles.accDetails}>
                <Text style={[styles.accName, { color: colors.text }]}>{acc.account_name}</Text>
                <Text style={[Typography.h5, { color: colors.text }]}>{formatCurrency(acc.balance)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  navBtn: {
    padding: 8,
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  accountFilterWrapper: {
    marginBottom: 8,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 30,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    marginTop: 10,
    marginBottom: 16,
  },
  balancesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  balanceCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  accIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  accDetails: {},
  accName: {
    fontSize: 12,
    marginBottom: 4,
  },
});
