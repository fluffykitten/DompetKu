import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Typography } from '../theme/typography';
import { useCurrency } from '../context/CurrencyContext';

interface BudgetProgressBarProps {
  label: string;
  spent: number;
  total: number;
  color?: string;
  showDetails?: boolean;
}

export default function BudgetProgressBar({ 
  label,
  spent,
  total,
  color,
  showDetails = true,
}: BudgetProgressBarProps) {
  const { colors } = useTheme();
  const { formatCurrency } = useCurrency();
  
  const percentage = total > 0 ? (spent / total) * 100 : 0;
  const isOverBudget = spent > total;
  
  // Cap percentage at 100 for visual bar
  const visualPercentage = Math.min(percentage, 100);
  
  const barColor = isOverBudget 
    ? colors.danger 
    : (color || colors.primary);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, Typography.label, { color: colors.text }]}>
          {label}
        </Text>
        <Text style={[styles.percentage, { color: isOverBudget ? colors.danger : colors.textSecondary }]}>
          {percentage.toFixed(0)}%
        </Text>
      </View>
      
      <View style={[styles.barContainer, { backgroundColor: colors.border }]}>
        <View 
          style={[
            styles.barFill, 
            { 
              width: `${visualPercentage}%`,
              backgroundColor: barColor 
            }
          ]} 
        />
      </View>
      
      {showDetails && (
        <View style={styles.detailsRow}>
          <Text style={[styles.detailsText, { color: colors.textSecondary }]}>
            Terpakai: {formatCurrency(spent)}
          </Text>
          <Text style={[styles.detailsText, { color: colors.textSecondary }]}>
            Total: {formatCurrency(total)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontWeight: '600',
  },
  percentage: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  barContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailsText: {
    fontSize: 12,
  },
});
