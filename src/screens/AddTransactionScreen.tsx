import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, KeyboardAvoidingView, Platform, Switch,
  ActivityIndicator, Alert
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useTheme } from '../theme/ThemeContext';
import { Typography } from '../theme/typography';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useAccounts } from '../hooks/useAccounts';
import { quickButtonRepo } from '../database/repositories/quickButtonRepo';
import { TransactionType } from '../types';
import { useTranslation } from 'react-i18next';

import CategoryPicker from '../components/CategoryPicker';
import AccountPicker from '../components/AccountPicker';
import CalculatorModal from '../components/CalculatorModal';

type AddTransactionRouteProp = RouteProp<RootStackParamList, 'AddTransaction'>;

export default function AddTransactionScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<AddTransactionRouteProp>();
  const initialTransaction = route.params?.transaction;
  const { t } = useTranslation();

  const [type, setType] = useState<TransactionType>(initialTransaction?.type || 'expense');
  const [amount, setAmount] = useState(initialTransaction?.amount?.toString() || '');
  const [categoryId, setCategoryId] = useState<number | null>(initialTransaction?.category_id || null);
  const [accountId, setAccountId] = useState<number | null>(initialTransaction?.account_id || null);
  const [date, setDate] = useState(
    initialTransaction?.date ? new Date(initialTransaction.date) : new Date()
  );
  const [note, setNote] = useState(initialTransaction?.note || '');
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [saveAsQuickButton, setSaveAsQuickButton] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{amount?: string, category?: string, account?: string}>({});

  const { addTransaction, editTransaction } = useTransactions();
  const { categories, loading: catsLoading } = useCategories(type);
  const { accounts, loading: accsLoading } = useAccounts();

  // Set default account if available and none selected
  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      const defaultAcc = accounts.find(a => a.is_default === 1);
      if (defaultAcc) {
        setAccountId(defaultAcc.id);
      } else {
        setAccountId(accounts[0].id);
      }
    }
  }, [accounts, accountId]);

  // Set dynamic header title
  useEffect(() => {
    navigation.setOptions({
      title: initialTransaction ? t('transactions.editTransaction') : (type === 'income' ? t('common.income') : t('common.expense')),
      headerStyle: {
        backgroundColor: type === 'income' ? colors.income : colors.expense,
      },
      headerTintColor: '#ffffff',
    });
  }, [type, navigation, colors]);

  const handleTypeChange = (newType: TransactionType) => {
    if (type !== newType) {
      setType(newType);
      setCategoryId(null); // Reset category when type changes
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const validate = () => {
    const newErrors: any = {};
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = 'Masukkan jumlah yang valid';
    }
    if (!categoryId) {
      newErrors.category = 'Pilih kategori transaksi';
    }
    if (!accountId) {
      newErrors.account = 'Pilih akun pembayaran';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    setIsSubmitting(true);
    try {
      const numAmount = Number(amount);
      
      if (initialTransaction?.id) {
        await editTransaction(initialTransaction.id, {
          type,
          amount: numAmount,
          category_id: categoryId!,
          account_id: accountId!,
          date: date.toISOString(),
          note: note.trim()
        });
      } else {
        // 1. Add Transaction
        await addTransaction({
          type,
          amount: numAmount,
          category_id: categoryId!,
          account_id: accountId!,
          date: date.toISOString(),
          note: note.trim()
        });
        
        // 2. Add Quick Button if checked
        if (saveAsQuickButton) {
          const cat = categories.find(c => c.id === categoryId);
          if (cat) {
            const btnName = note.trim() ? note.trim() : cat.name;
            await quickButtonRepo.create({
              name: btnName.substring(0, 15),
              amount: numAmount,
              type: type,
              category_id: categoryId!,
              icon: cat.icon,
              color: cat.color
            });
          }
        }
      }
      
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal menyimpan transaksi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAmountInput = (text: string) => {
    const numericStr = text.replace(/[^0-9]/g, '');
    setAmount(numericStr);
  };

  const displayAmount = amount ? 
    new Intl.NumberFormat('id-ID').format(Number(amount)) : '';

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
      >
        
        {/* Type Toggle */}
        <View style={[styles.typeToggleContainer, { backgroundColor: colors.surface }]}>
          <TouchableOpacity 
            style={[
              styles.typeTab, 
              type === 'expense' && { backgroundColor: colors.expense }
            ]}
            onPress={() => handleTypeChange('expense')}
          >
            <Text style={[
              styles.typeText, 
              { color: type === 'expense' ? '#fff' : colors.textSecondary }
            ]}>
              {t('common.expense')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.typeTab, 
              type === 'income' && { backgroundColor: colors.income }
            ]}
            onPress={() => handleTypeChange('income')}
          >
            <Text style={[
              styles.typeText, 
              { color: type === 'income' ? '#fff' : colors.textSecondary }
            ]}>
              {t('common.income')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <View style={[styles.amountContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.currencyLabel, { color: type === 'income' ? colors.income : colors.expense }]}>Rp</Text>
          <TextInput
            style={[
              styles.amountInput, 
              Typography.amount,
              { color: type === 'income' ? colors.income : colors.expense }
            ]}
            value={displayAmount}
            onChangeText={formatAmountInput}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.textLight}
            maxLength={13}
            autoFocus
          />
          <TouchableOpacity 
            style={styles.calcButton} 
            onPress={() => setShowCalculator(true)}
          >
            <MaterialCommunityIcons name="calculator" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {errors.amount && <Text style={[styles.errorText, { color: colors.danger }]}>{errors.amount}</Text>}

        {/* Form Fields */}
        <View style={[styles.formContainer, { backgroundColor: colors.surface }]}>
          
          <AccountPicker 
            accounts={accounts}
            selectedAccountId={accountId}
            onSelect={(account) => setAccountId(account.id)}
            error={errors.account}
          />
        
          <CategoryPicker 
            categories={categories}
            selectedCategoryId={categoryId}
            onSelect={(category) => setCategoryId(category.id)}
            error={errors.category}
          />

          {/* Date Picker */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('common.date')}</Text>
            <TouchableOpacity 
              style={[styles.inputBox, { backgroundColor: colors.inputBackground }]}
              onPress={() => setShowDatePicker(true)}
            >
              <MaterialCommunityIcons name="calendar" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <Text style={[styles.inputText, { color: colors.text }]}>
                {(() => {
                  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
                })()}
              </Text>
            </TouchableOpacity>
          </View>
          
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}

          {/* Note Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('common.note')}</Text>
            <View style={[styles.inputBox, { backgroundColor: colors.inputBackground }]}>
              <MaterialCommunityIcons name="pencil" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                value={note}
                onChangeText={setNote}
                placeholder="Tulis catatan di sini"
                placeholderTextColor={colors.textLight}
                maxLength={50}
              />
            </View>
          </View>

          {/* Quick Button Toggle - Only show if adding new */}
          {!initialTransaction?.id && (
            <View style={styles.switchGroup}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={[styles.switchTitle, { color: colors.text }]}>Simpan sebagai Akses Cepat</Text>
                <Text style={[styles.switchSubtitle, { color: colors.textSecondary }]}>
                  Muncul di Dashboard untuk kemudahan di masa depan
                </Text>
              </View>
              <Switch
                value={saveAsQuickButton}
                onValueChange={setSaveAsQuickButton}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={saveAsQuickButton ? colors.primary : '#f4f3f4'}
              />
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Save Button Fixed at Bottom */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
        <TouchableOpacity 
          style={[
            styles.saveButton, 
            { backgroundColor: type === 'income' ? colors.income : colors.expense },
            isSubmitting && { opacity: 0.7 }
          ]}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.saveButtonText, Typography.button]}>{t('common.save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <CalculatorModal 
        visible={showCalculator}
        onClose={() => setShowCalculator(false)}
        onSubmit={(val) => setAmount(val.toString())}
        initialValue={amount}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  typeToggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  typeText: {
    fontWeight: '600',
    fontSize: 14,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 16,
    marginBottom: 8,
  },
  currencyLabel: {
    fontSize: 24,
    fontWeight: '700',
    marginRight: 8,
    marginTop: 6,
  },
  amountInput: {
    minWidth: '50%',
    textAlign: 'center',
  },
  calcButton: {
    padding: 8,
    position: 'absolute',
    right: 16,
  },
  errorText: {
    marginLeft: 8,
    marginBottom: 16,
    fontSize: 12,
  },
  formContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    minHeight: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputText: {
    fontSize: 16,
    flex: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.2)',
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  switchSubtitle: {
    fontSize: 12,
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saveButtonText: {
    color: '#ffffff',
  },
});
