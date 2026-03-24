import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../theme/ThemeContext';
import { Typography } from '../theme/typography';
import { useAccounts } from '../hooks/useAccounts';
import { transactionRepo } from '../database/repositories/transactionRepo';
import { useCurrency } from '../context/CurrencyContext';
import { Account } from '../types';
import CalculatorModal from '../components/CalculatorModal';

export default function AccountTransferScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { accounts, refreshAccounts } = useAccounts();
  const { formatCurrency } = useCurrency();

  const [fromAccountId, setFromAccountId] = useState<number | null>(null);
  const [toAccountId, setToAccountId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  const displayAmount = amount ? 
    new Intl.NumberFormat('id-ID').format(Number(amount)) : '';

  const fromAccount = accounts.find(a => a.id === fromAccountId) || null;
  const toAccount = accounts.find(a => a.id === toAccountId) || null;

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'cash': return 'cash';
      case 'bank': return 'bank';
      case 'ewallet': return 'cellphone';
      default: return 'wallet';
    }
  };

  const handleTransfer = async () => {
    if (!fromAccountId || !toAccountId) {
      Alert.alert(t('common.error'), !fromAccountId ? t('transfer.selectFromAccount') : t('transfer.selectToAccount'));
      return;
    }
    if (fromAccountId === toAccountId) {
      Alert.alert(t('common.error'), t('transfer.sameAccountError'));
      return;
    }
    const numAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!numAmount || numAmount <= 0) {
      Alert.alert(t('common.error'), t('transfer.enterAmount'));
      return;
    }
    if (fromAccount && numAmount > fromAccount.balance) {
      Alert.alert(t('common.error'), t('transfer.insufficientBalance'));
      return;
    }

    setIsTransferring(true);
    try {
      await transactionRepo.transfer(fromAccountId, toAccountId, numAmount);
      await refreshAccounts();
      Alert.alert(t('common.success'), t('transfer.success'), [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('common.error'));
    } finally {
      setIsTransferring(false);
    }
  };

  const AccountSelector = ({
    label,
    selectedId,
    onSelect,
    excludeId,
  }: {
    label: string;
    selectedId: number | null;
    onSelect: (id: number) => void;
    excludeId?: number | null;
  }) => {
    const filtered = excludeId ? accounts.filter(a => a.id !== excludeId) : accounts;
    return (
      <View style={{ marginBottom: 20 }}>
        <Text style={[Typography.label, { color: colors.textSecondary, marginBottom: 10 }]}>
          {label}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {filtered.map(acc => {
            const isSelected = acc.id === selectedId;
            return (
              <TouchableOpacity
                key={acc.id}
                style={[
                  styles.accountCard,
                  {
                    backgroundColor: isSelected ? acc.color + '20' : colors.surface,
                    borderColor: isSelected ? acc.color : colors.borderLight,
                    borderWidth: isSelected ? 2 : 1,
                  }
                ]}
                onPress={() => onSelect(acc.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.accountIconWrap, { backgroundColor: acc.color + '20' }]}>
                  <MaterialCommunityIcons
                    name={getAccountIcon(acc.type) as any}
                    size={22}
                    color={acc.color}
                  />
                </View>
                <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>
                  {acc.name}
                </Text>
                <Text style={[styles.accountBalance, { color: acc.color }]}>
                  {formatCurrency(acc.balance)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >

          {/* Transfer Illustration */}
          <View style={styles.illustrationRow}>
            <View style={[styles.illustrationCircle, { backgroundColor: fromAccount ? fromAccount.color + '20' : colors.chipBackground }]}>
              <MaterialCommunityIcons
                name={fromAccount ? getAccountIcon(fromAccount.type) as any : 'wallet-outline'}
                size={28}
                color={fromAccount ? fromAccount.color : colors.textLight}
              />
            </View>
            <View style={styles.arrowContainer}>
              <MaterialCommunityIcons name="arrow-right" size={28} color={colors.primary} />
            </View>
            <View style={[styles.illustrationCircle, { backgroundColor: toAccount ? toAccount.color + '20' : colors.chipBackground }]}>
              <MaterialCommunityIcons
                name={toAccount ? getAccountIcon(toAccount.type) as any : 'wallet-outline'}
                size={28}
                color={toAccount ? toAccount.color : colors.textLight}
              />
            </View>
          </View>

          {/* From Account */}
          <AccountSelector
            label={t('transfer.fromAccount')}
            selectedId={fromAccountId}
            onSelect={setFromAccountId}
          />

          {/* Available Balance Info */}
          {fromAccount && (
            <View style={[styles.balanceInfo, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                {t('transfer.availableBalance')}:
              </Text>
              <Text style={{ color: fromAccount.color, fontWeight: 'bold', fontSize: 15 }}>
                {formatCurrency(fromAccount.balance)}
              </Text>
            </View>
          )}

          {/* To Account */}
          <AccountSelector
            label={t('transfer.toAccount')}
            selectedId={toAccountId}
            onSelect={setToAccountId}
            excludeId={fromAccountId}
          />

          {/* Amount Input */}
          <View style={{ marginBottom: 24 }}>
            <Text style={[Typography.label, { color: colors.textSecondary, marginBottom: 8 }]}>
              {t('transfer.amount')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 20 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: colors.primary, marginRight: 8, marginTop: 4 }}>Rp</Text>
              <TextInput
                style={[styles.amountInput, {
                  color: colors.primary,
                }]}
                value={displayAmount}
                onChangeText={(val) => setAmount(val.replace(/[^0-9]/g, ''))}
                placeholder="0"
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
                maxLength={13}
              />
              <TouchableOpacity 
                style={styles.calcButton} 
                onPress={() => setShowCalculator(true)}
              >
                <MaterialCommunityIcons name="calculator" size={28} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Transfer Button */}
          <TouchableOpacity
            style={[
              styles.transferBtn,
              { backgroundColor: colors.primary },
              isTransferring && { opacity: 0.6 },
            ]}
            onPress={handleTransfer}
            disabled={isTransferring}
            activeOpacity={0.8}
          >
            {isTransferring ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="swap-horizontal" size={22} color="#fff" style={{ marginRight: 8 }} />
                <Text style={[Typography.button, { color: '#fff', fontSize: 16 }]}>
                  {t('transfer.confirm')}
                </Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      <CalculatorModal 
        visible={showCalculator}
        onClose={() => setShowCalculator(false)}
        onSubmit={(val) => setAmount(val.toString())}
        initialValue={amount}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  illustrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    marginTop: 8,
  },
  illustrationCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowContainer: {
    marginHorizontal: 20,
  },
  accountCard: {
    width: 120,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  accountIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  accountName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  accountBalance: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  balanceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
    marginTop: -8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 24,
    fontWeight: 'bold',
  },
  calcButton: {
    padding: 8,
  },
  transferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
});
