import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions, KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../theme/ThemeContext';
import { Typography } from '../theme/typography';
import { useCurrency, CurrencySetting, CurrencyPosition } from '../context/CurrencyContext';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { RootStackParamList } from '../navigation/AppNavigator';
import { transactionRepo } from '../database/repositories/transactionRepo';
import CalculatorModal from '../components/CalculatorModal';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

const PRESET_CURRENCIES = [
  { code: 'IDR', symbol: 'Rp', position: 'left' as CurrencyPosition, decimalSeparator: ',', groupSeparator: '.' },
  { code: 'USD', symbol: '$', position: 'left' as CurrencyPosition, decimalSeparator: '.', groupSeparator: ',' },
  { code: 'EUR', symbol: '€', position: 'right' as CurrencyPosition, decimalSeparator: ',', groupSeparator: '.' },
  { code: 'SGD', symbol: 'S$', position: 'left' as CurrencyPosition, decimalSeparator: '.', groupSeparator: ',' },
  { code: 'JPY', symbol: '¥', position: 'left' as CurrencyPosition, decimalSeparator: '.', groupSeparator: ',' },
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { t, i18n } = useTranslation();
  const { setCurrency } = useCurrency();
  
  const { accounts, updateAccount, deleteAccount } = useAccounts();
  const { categories, deleteCategory } = useCategories();

  const [step, setStep] = useState(1);

  // Form states
  const [profileName, setProfileName] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencySetting>(PRESET_CURRENCIES[0]);
  
  // Local state to store initial balances before saving
  const [balances, setBalances] = useState<{ [id: number]: string }>({});
  const [calcAccountId, setCalcAccountId] = useState<number | null>(null);

  useEffect(() => {
    // initialize balances to "0"
    if (accounts.length > 0 && Object.keys(balances).length === 0) {
      const init: any = {};
      accounts.forEach(a => init[a.id] = '');
      setBalances(init);
    }
  }, [accounts]);

  const handleLanguageSelect = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const handleNext = async () => {
    if (step === 1) {
      // Step 1: Language & Currency
      await AsyncStorage.setItem('@dompetku_language', i18n.language);
      await setCurrency(selectedCurrency);
      setStep(2);
    } else if (step === 2) {
      // Step 2: Name
      if (!profileName.trim()) return;
      await AsyncStorage.setItem('@dompetku_profile_name', profileName.trim());
      setStep(3);
    } else if (step === 3) {
      // Step 3: Balances
      const incomeCat = categories.find(c => c.type === 'income');
      if (incomeCat) {
        for (const acc of accounts) {
          const balStr = balances[acc.id] || '0';
          const balNum = parseFloat(balStr.replace(/[^\d.-]/g, ''));
          if (!isNaN(balNum) && balNum > 0) {
            await transactionRepo.create({
              account_id: acc.id,
              category_id: incomeCat.id,
              amount: balNum,
              type: 'income',
              note: i18n.language === 'id' ? 'Saldo Awal' : 'Starting Balance',
              date: new Date().toISOString(),
            });
          }
        }
      }
      setStep(4);
    } else if (step === 4) {
      // Step 4: Finish
      await AsyncStorage.setItem('@dompetku_has_onboarded', 'true');
      navigation.replace('MainTabs');
    }
  };

  const renderStepIndicator = () => {
    return (
      <View style={styles.indicatorContainer}>
        {[1, 2, 3, 4].map(i => (
          <View 
            key={i} 
            style={[
              styles.dot, 
              { backgroundColor: i <= step ? colors.primary : colors.border }
            ]} 
          />
        ))}
      </View>
    );
  };

  const isId = i18n.language === 'id';

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <MaterialCommunityIcons name="earth" size={64} color={colors.primary} style={{ marginBottom: 20 }} />
      <Text style={[Typography.h3, { color: colors.text, marginBottom: 8, textAlign: 'center' }]}>
        {isId ? 'Bahasa & Mata Uang' : 'Language & Currency'}
      </Text>
      <Text style={[Typography.body, { color: colors.textSecondary, marginBottom: 32, textAlign: 'center' }]}>
        {isId 
          ? 'Pilih bahasa dan mata uang utama yang akan kamu gunakan di DompetKu.'
          : 'Choose the language and primary currency you will use in DompetKu.'}
      </Text>

      <Text style={[Typography.label, { color: colors.textSecondary, alignSelf: 'flex-start', marginBottom: 8 }]}>
        {isId ? 'BAHASA' : 'LANGUAGE'}
      </Text>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24, width: '100%' }}>
        <TouchableOpacity 
          style={[styles.choiceBtn, { borderColor: isId ? colors.primary : colors.border, backgroundColor: isId ? colors.primary + '15' : colors.surface }]}
          onPress={() => handleLanguageSelect('id')}
        >
          <Text style={{ fontSize: 24, marginBottom: 4 }}>🇮🇩</Text>
          <Text style={{ color: colors.text, fontWeight: isId ? 'bold' : 'normal' }}>Indonesia</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.choiceBtn, { borderColor: !isId ? colors.primary : colors.border, backgroundColor: !isId ? colors.primary + '15' : colors.surface }]}
          onPress={() => handleLanguageSelect('en')}
        >
          <Text style={{ fontSize: 24, marginBottom: 4 }}>🇺🇸</Text>
          <Text style={{ color: colors.text, fontWeight: !isId ? 'bold' : 'normal' }}>English</Text>
        </TouchableOpacity>
      </View>

      <Text style={[Typography.label, { color: colors.textSecondary, alignSelf: 'flex-start', marginBottom: 8 }]}>
        {isId ? 'MATA UANG UTAMA' : 'PRIMARY CURRENCY'}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: '100%', maxHeight: 90 }}>
        {PRESET_CURRENCIES.map(c => {
          const isSelected = selectedCurrency.code === c.code;
          return (
            <TouchableOpacity 
              key={c.code}
              style={[styles.choiceBtn, { width: 100, marginRight: 12, borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.primary + '15' : colors.surface }]}
              onPress={() => setSelectedCurrency(c as CurrencySetting)}
            >
              <Text style={{ fontSize: 20, marginBottom: 4, color: isSelected ? colors.primary : colors.text }}>{c.symbol}</Text>
              <Text style={{ color: colors.text, fontWeight: isSelected ? 'bold' : 'normal' }}>{c.code}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
      <Text style={{ color: colors.textLight, fontSize: 12, marginTop: 12, textAlign: 'center' }}>
        {isId 
          ? '*Anda bisa mengatur Custom Currency nanti di menu Pengaturan.'
          : '*You can configure Custom Currency later in the Settings menu.'}
      </Text>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <MaterialCommunityIcons name="hand-wave" size={64} color={colors.primary} style={{ marginBottom: 20 }} />
      <Text style={[Typography.h2, { color: colors.text, marginBottom: 8, textAlign: 'center' }]}>
        {isId ? 'Selamat Datang!' : 'Welcome!'}
      </Text>
      <Text style={[Typography.body, { color: colors.textSecondary, marginBottom: 32, textAlign: 'center' }]}>
        {isId 
          ? 'Mari kenalan dulu. Siapa nama panggilanmu?' 
          : 'Let\'s get to know each other. What\'s your nickname?'}
      </Text>
      
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
        value={profileName}
        onChangeText={setProfileName}
        placeholder={isId ? 'Nama Kamu' : 'Your Name'}
        placeholderTextColor={colors.textLight}
        autoFocus
        maxLength={30}
      />
    </View>
  );

  const renderStep3 = () => (
    <View style={[styles.stepContent, { justifyContent: 'flex-start', paddingTop: 20 }]}>
      <Text style={[Typography.h3, { color: colors.text, marginBottom: 8, textAlign: 'center' }]}>
        {isId ? 'Akun Keuangan' : 'Financial Accounts'}
      </Text>
      <Text style={[Typography.body, { color: colors.textSecondary, marginBottom: 24, textAlign: 'center' }]}>
        {isId 
          ? 'Masukkan saldo awal kamu saat ini, atau hapus akun yang tidak kamu miliki.'
          : 'Enter your current starting balance, or delete accounts you don\'t own.'}
      </Text>

      <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
        {accounts.map(acc => (
          <View key={acc.id} style={[styles.accountCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={[styles.iconWrapper, { backgroundColor: acc.color + '20' }]}>
                <MaterialCommunityIcons name={acc.icon as any} size={20} color={acc.color} />
              </View>
              <Text style={[Typography.body, { color: colors.text, flex: 1, fontWeight: 'bold' }]}>{acc.name}</Text>
              <TouchableOpacity onPress={() => deleteAccount(acc.id)}>
                <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 6 }}>
                {isId ? 'Saldo Awal' : 'Starting Balance'} ({selectedCurrency.symbol})
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, height: 44, marginBottom: 0 }]}
                  value={balances[acc.id] || ''}
                  onChangeText={v => setBalances(p => ({ ...p, [acc.id]: v }))}
                  placeholder="0"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                />
                <TouchableOpacity 
                  style={{ padding: 8, marginLeft: 8, marginBottom: 40 }} 
                  onPress={() => setCalcAccountId(acc.id)}
                >
                  <MaterialCommunityIcons name="calculator" size={28} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderStep4 = () => (
    <View style={[styles.stepContent, { justifyContent: 'flex-start', paddingTop: 20 }]}>
      <Text style={[Typography.h3, { color: colors.text, marginBottom: 8, textAlign: 'center' }]}>
        {isId ? 'Kategori Transaksi' : 'Transaction Categories'}
      </Text>
      <Text style={[Typography.body, { color: colors.textSecondary, marginBottom: 24, textAlign: 'center' }]}>
        {isId 
          ? 'Kami telah menyiapkan beberapa kategori standar. Anda dapat menghapus yang tidak diperlukan.'
          : 'We have prepared some standard categories. You can remove the ones you don\'t need.'}
      </Text>

      <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
        <Text style={[Typography.label, { color: colors.textSecondary, marginBottom: 12 }]}>
          {isId ? 'PENGELUARAN (EXPENSE)' : 'EXPENSES'}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
          {categories.filter(c => c.type === 'expense').map(cat => (
            <View key={cat.id} style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <MaterialCommunityIcons name={cat.icon as any} size={16} color={cat.color} style={{ marginRight: 6 }} />
              <Text style={{ color: colors.text, fontSize: 13, marginRight: 8 }}>{cat.name}</Text>
              <TouchableOpacity onPress={() => deleteCategory(cat.id)}>
                <MaterialCommunityIcons name="close-circle" size={16} color={colors.textLight} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <Text style={[Typography.label, { color: colors.textSecondary, marginBottom: 12 }]}>
          {isId ? 'PEMASUKAN (INCOME)' : 'INCOME'}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 40 }}>
          {categories.filter(c => c.type === 'income').map(cat => (
            <View key={cat.id} style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <MaterialCommunityIcons name={cat.icon as any} size={16} color={cat.color} style={{ marginRight: 6 }} />
              <Text style={{ color: colors.text, fontSize: 13, marginRight: 8 }}>{cat.name}</Text>
              <TouchableOpacity onPress={() => deleteCategory(cat.id)}>
                <MaterialCommunityIcons name="close-circle" size={16} color={colors.textLight} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const isNextDisabled = step === 2 && !profileName.trim();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          {step > 1 && (
            <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          {renderStepIndicator()}
        </View>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.nextButton, { backgroundColor: isNextDisabled ? colors.border : colors.primary }]}
            onPress={handleNext}
            disabled={isNextDisabled}
          >
            <Text style={[Typography.button, { color: '#fff' }]}>
              {step === 4 
                ? (isId ? 'Mulai DompetKu' : 'Start DompetKu') 
                : (isId ? 'Lanjut' : 'Next')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <CalculatorModal 
        visible={calcAccountId !== null}
        onClose={() => setCalcAccountId(null)}
        onSubmit={(val) => {
          if (calcAccountId !== null) {
            setBalances(p => ({ ...p, [calcAccountId]: val.toString() }));
          }
        }}
        initialValue={calcAccountId !== null ? balances[calcAccountId] : ''}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 56,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  indicatorContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 24,
    height: 6,
    borderRadius: 3,
  },
  stepContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  input: {
    width: '100%',
    height: 56,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 18,
    marginBottom: 40,
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
  },
  nextButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  choiceBtn: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 20,
  }
});
