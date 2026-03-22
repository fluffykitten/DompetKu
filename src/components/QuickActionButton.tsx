import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Typography } from '../theme/typography';
import { useCurrency } from '../context/CurrencyContext';
import { QuickButton } from '../types';

interface QuickActionButtonProps {
  button: QuickButton;
  onPress: (button: QuickButton) => void;
  onLongPress?: (button: QuickButton) => void;
}

export default function QuickActionButton({
  button,
  onPress,
  onLongPress
}: QuickActionButtonProps) {
  const { colors } = useTheme();
  const { formatCurrency } = useCurrency();

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={() => onPress(button)}
      onLongPress={() => onLongPress && onLongPress(button)}
      activeOpacity={0.7}
      delayLongPress={500}
    >
      <View style={[styles.iconContainer, { backgroundColor: button.color + '20' }]}>
        <MaterialCommunityIcons name={button.icon as any} size={24} color={button.color} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.name, Typography.bodySmall, { color: colors.text }]} numberOfLines={1}>
          {button.name}
        </Text>
        <Text 
          style={[
            styles.amount, 
            Typography.caption, 
            { color: button.type === 'income' ? colors.income : colors.expense }
          ]}
          numberOfLines={1}
        >
          {button.type === 'income' ? '+' : '-'}{formatCurrency(button.amount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minWidth: '48%', // For grid layout of 2 columns
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontWeight: '500',
    marginBottom: 2,
  },
  amount: {
    fontWeight: '600',
  },
});
