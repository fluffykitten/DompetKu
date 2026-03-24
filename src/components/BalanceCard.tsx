import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Typography } from '../theme/typography';
import { useCurrency } from '../context/CurrencyContext';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

interface BalanceCardProps {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  currencyCode?: string;
}

export default function BalanceCard({ 
  totalBalance, 
  monthlyIncome, 
  monthlyExpense,
  currencyCode = 'IDR'
}: BalanceCardProps) {
  const { colors, mode } = useTheme();
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        {
          shadowColor: colors.primary,
        }
      ]}
    >
      <View style={styles.topSection}>
        <View>
          <Text style={[styles.label, { color: 'rgba(255,255,255,0.8)' }]}>
            {t('dashboard.totalBalance', {defaultValue: 'Total Saldo'})}
          </Text>
          <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.balance, Typography.amount, { color: '#ffffff' }]}>
            {formatCurrency(totalBalance)}
          </Text>
        </View>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="wallet" size={24} color={colors.primary} />
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomSection}>
        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <View style={[styles.bullet, { backgroundColor: '#00E5A8' }]} />
            <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.statLabel, { color: 'rgba(255,255,255,0.8)', flex: 1 }]}>
              {t('common.income')}
            </Text>
          </View>
          <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.statAmount, Typography.h4, { color: '#ffffff' }]}>
            {formatCurrency(monthlyIncome)}
          </Text>
        </View>

        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <View style={[styles.bullet, { backgroundColor: '#FF8585' }]} />
            <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.statLabel, { color: 'rgba(255,255,255,0.8)', flex: 1 }]}>
              {t('common.expense')}
            </Text>
          </View>
          <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.statAmount, Typography.h4, { color: '#ffffff' }]}>
            {formatCurrency(monthlyExpense)}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    width: width - 40,
    alignSelf: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 20,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  balance: {
    // defined by Typography
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 20,
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statLabel: {
    fontSize: 12,
  },
  statAmount: {
    // defined by Typography
  },
});
