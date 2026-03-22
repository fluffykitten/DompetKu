import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  ScrollView, TouchableWithoutFeedback 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeContext';
import { Typography } from '../theme/typography';
import { useCategories } from '../hooks/useCategories';
import { useAccounts } from '../hooks/useAccounts';
import { TransactionType } from '../types';
import { useTranslation } from 'react-i18next';

interface Props {
  visible: boolean;
  onClose: () => void;
  currentType: TransactionType | 'all';
  currentAccountId: number | 'all';
  currentCategoryId: number | 'all';
  onApply: (type: TransactionType | 'all', accountId: number | 'all', categoryId: number | 'all') => void;
}

export default function TransactionFilterModal({
  visible, onClose, currentType, currentAccountId, currentCategoryId, onApply
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  
  const [tempType, setTempType] = useState(currentType);
  const [tempAccountId, setTempAccountId] = useState(currentAccountId);
  const [tempCategoryId, setTempCategoryId] = useState(currentCategoryId);

  // Sync temp state when modal opens
  useEffect(() => {
    if (visible) {
      setTempType(currentType);
      setTempAccountId(currentAccountId);
      setTempCategoryId(currentCategoryId);
    }
  }, [visible, currentType, currentAccountId, currentCategoryId]);

  const { categories } = useCategories(tempType === 'all' ? undefined : tempType);
  const { accounts } = useAccounts();

  const handleTypeChange = (type: TransactionType | 'all') => {
    setTempType(type);
    setTempCategoryId('all'); // Reset category when type changes
  };

  const handleApply = () => {
    onApply(tempType, tempAccountId, tempCategoryId);
    onClose();
  };

  const handleReset = () => {
    setTempType('all');
    setTempAccountId('all');
    setTempCategoryId('all');
  };

  if (!visible) return null;

  const renderChip = (
    label: string, 
    isSelected: boolean, 
    onPress: () => void,
    colorOverride?: string
  ) => {
    return (
      <TouchableOpacity
        style={[
          styles.chip,
          { 
            backgroundColor: isSelected ? (colorOverride || colors.primary) : colors.background,
            borderColor: isSelected ? (colorOverride || colors.primary) : colors.borderLight
          }
        ]}
        onPress={onPress}
      >
        <Text style={[
          styles.chipText,
          { color: isSelected ? '#fff' : colors.textSecondary }
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <Text style={[Typography.h3, { color: colors.text }]}>{t('transactions.filter')}</Text>
            <TouchableOpacity onPress={handleReset}>
              <Text style={[Typography.body, { color: colors.primary, fontWeight: 'bold' }]}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* TIPE TRANSAKSI */}
            <Text style={[Typography.body, styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('common.type')}
            </Text>
            <View style={styles.chipContainer}>
              {renderChip(t('common.all', {defaultValue: 'All'}), tempType === 'all', () => handleTypeChange('all'))}
              {renderChip(t('common.income'), tempType === 'income', () => handleTypeChange('income'), colors.income)}
              {renderChip(t('common.expense'), tempType === 'expense', () => handleTypeChange('expense'), colors.expense)}
            </View>

            {/* AKUN KEUANGAN */}
            <Text style={[Typography.body, styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('common.account')}
            </Text>
            <View style={styles.chipContainer}>
              {renderChip(t('transactions.allAccounts'), tempAccountId === 'all', () => setTempAccountId('all'))}
              {accounts.map(acc => (
                <React.Fragment key={acc.id}>
                  {renderChip(acc.name, tempAccountId === acc.id, () => setTempAccountId(acc.id))}
                </React.Fragment>
              ))}
            </View>

            {/* KATEGORI */}
            <Text style={[Typography.body, styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('common.category')}
            </Text>
            <View style={styles.chipContainer}>
              {renderChip(t('transactions.allCategories'), tempCategoryId === 'all', () => setTempCategoryId('all'))}
              {categories.map(cat => (
                <React.Fragment key={cat.id}>
                  {renderChip(cat.name, tempCategoryId === cat.id, () => setTempCategoryId(cat.id))}
                </React.Fragment>
              ))}
            </View>
            
            <View style={{ height: 20 }} />
          </ScrollView>

          {/* ACTION BUTTONS */}
          <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
            <TouchableOpacity 
              style={[styles.applyButton, { backgroundColor: colors.primary }]}
              onPress={handleApply}
            >
              <Text style={[Typography.button, { color: '#fff' }]}>{t('transactions.filter')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 4,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  applyButton: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
});
