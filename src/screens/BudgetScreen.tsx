import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform, RefreshControl
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeContext';
import { Typography } from '../theme/typography';
import { useBudgets } from '../hooks/useBudgets';
import { useCategories } from '../hooks/useCategories';
import { useCurrency } from '../context/CurrencyContext';
import { Category } from '../types';
import { useTranslation } from 'react-i18next';

import BudgetProgressBar from '../components/BudgetProgressBar';
import CategoryPicker from '../components/CategoryPicker';
import CalculatorModal from '../components/CalculatorModal';

export default function BudgetScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();
  const { formatCurrency } = useCurrency();

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  const { 
    budgets, 
    totalBudget, 
    totalSpent, 
    loading: budgetsLoading,
    refreshBudgets,
    saveBudget,
    deleteBudget
  } = useBudgets(currentMonth, currentYear);
  
  // Budgets only apply to expenses
  const { categories } = useCategories('expense');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  
  // Refresh on focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshBudgets();
    });
    return unsubscribe;
  }, [navigation, refreshBudgets]);

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

  const locale = i18n.language === 'id' ? 'id-ID' : 'en-US';
  const formattedMonth = new Date(currentYear, currentMonth - 1).toLocaleDateString(locale, { 
    month: 'long', 
    year: 'numeric' 
  });

  const handleOpenAddModal = () => {
    setSelectedCategoryId(null);
    setAmountInput('');
    setModalVisible(true);
  };

  const handleOpenEditModal = (categoryId: number, currentAmount: number) => {
    setSelectedCategoryId(categoryId);
    setAmountInput(currentAmount.toString());
    setModalVisible(true);
  };

  const formatAmountInput = (text: string) => {
    const numericStr = text.replace(/[^0-9]/g, '');
    setAmountInput(numericStr);
  };

  const handleSaveBudget = async () => {
    if (!selectedCategoryId) return;
    
    setIsSubmitting(true);
    try {
      // Regardless if 0 or more, just save it for the current month!
      // This enforces history properly. Deleting history row is bad.
      await saveBudget({
        category_id: selectedCategoryId,
        amount: Number(amountInput || 0),
        month: currentMonth,
        year: currentYear
      });
      setModalVisible(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* Month Navigation */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.monthTitle, Typography.h3, { color: colors.text }]}>
          {formattedMonth}
        </Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
          <MaterialCommunityIcons name="chevron-right" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={budgetsLoading} onRefresh={refreshBudgets} />}
      >
        {/* Total Overview */}
        <View style={[styles.overviewCard, { backgroundColor: colors.surface }]}>
          <Text style={[Typography.h4, { color: colors.text, marginBottom: 16 }]}>
            {t('budget.title')}
          </Text>
          <BudgetProgressBar
            label=""
            spent={totalSpent}
            total={totalBudget}
            color={colors.primary}
          />
        </View>

        {/* Categories List */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={[Typography.h4, { color: colors.text }]}>
              {t('budget.subtitle')}
            </Text>
            <TouchableOpacity onPress={handleOpenAddModal}>
              <MaterialCommunityIcons name="plus-circle" size={28} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {budgets.length === 0 && !budgetsLoading ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="piggy-bank" size={48} color={colors.borderLight} />
              <Text style={{ color: colors.textSecondary, marginTop: 10 }}>
                {t('budget.noBudgets')}
              </Text>
            </View>
          ) : (
            budgets.map(budget => (
              <TouchableOpacity 
                key={budget.id} 
                style={[styles.budgetCard, { backgroundColor: colors.surface }]}
                onPress={() => handleOpenEditModal(budget.category_id, budget.amount)}
              >
                <View style={styles.budgetCardHeader}>
                  <View style={styles.categoryInfo}>
                    <View style={[styles.iconWrapper, { backgroundColor: (budget.category_color || colors.primary) + '20' }]}>
                      <MaterialCommunityIcons name={(budget.category_icon as any) || 'help-circle'} size={20} color={budget.category_color} />
                    </View>
                    <Text style={[Typography.body, { color: colors.text, fontWeight: '600' }]}>
                      {budget.category_name}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="pencil" size={16} color={colors.textLight} />
                </View>
                
                <BudgetProgressBar
                  label=""
                  spent={budget.spent || 0}
                  total={budget.amount}
                  color={budget.category_color}
                />
              </TouchableOpacity>
            ))
          )}
        </View>

      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setModalVisible(false)} 
          />
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeaderBorder, { borderBottomColor: colors.borderLight }]}>
              <Text style={[Typography.h4, { color: colors.text }]}>
                {selectedCategoryId ? t('budget.editBudget') : t('budget.addBudget')}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <CategoryPicker 
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onSelect={(cat) => setSelectedCategoryId(cat.id)}
                label={t('common.category')}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('common.amount')}</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground }]}>
                <Text style={[Typography.h3, { color: colors.textSecondary, marginRight: 8 }]}>Rp</Text>
                <TextInput
                  style={[Typography.h3, styles.amountInput, { color: colors.text }]}
                  value={amountInput ? new Intl.NumberFormat('id-ID').format(Number(amountInput)) : ''}
                  onChangeText={formatAmountInput}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textLight}
                />
                <TouchableOpacity 
                  style={{ padding: 8 }} 
                  onPress={() => setShowCalculator(true)}
                >
                  <MaterialCommunityIcons name="calculator" size={28} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={[Typography.caption, { color: colors.textLight, marginTop: 4 }]}>
                (Set 0 {t('budget.deleteConfirmTitle')})
              </Text>

              <TouchableOpacity 
                style={[
                  styles.saveBtn, 
                  { backgroundColor: colors.primary },
                  (!selectedCategoryId || isSubmitting) && { opacity: 0.5 }
                ]}
                onPress={handleSaveBudget}
                disabled={!selectedCategoryId || isSubmitting}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                  {isSubmitting ? '...' : t('common.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CalculatorModal 
        visible={showCalculator}
        onClose={() => setShowCalculator(false)}
        onSubmit={(val) => setAmountInput(val.toString())}
        initialValue={amountInput}
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
  scrollContent: {
    padding: 16,
  },
  overviewCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  listSection: {},
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  budgetCard: {
    padding: 16,
    paddingBottom: 20,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  budgetCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
    paddingBottom: 40,
  },
  modalHeaderBorder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  amountInput: {
    flex: 1,
  },
  saveBtn: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
});
