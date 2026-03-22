import React from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  TouchableWithoutFeedback, Animated
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Typography } from '../theme/typography';
import { useCurrency } from '../context/CurrencyContext';
import { Transaction } from '../types';
import { useTranslation } from 'react-i18next';

interface TransactionOptionsModalProps {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export default function TransactionOptionsModal({
  visible,
  transaction,
  onClose,
  onEdit,
  onDelete
}: TransactionOptionsModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();

  if (!transaction) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              {/* Header Details */}
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <View style={[styles.iconWrapper, { backgroundColor: (transaction.category_color || colors.primary) + '20' }]}>
                    <MaterialCommunityIcons 
                      name={(transaction.category_icon as any) || 'help-circle'} 
                      size={24} 
                      color={transaction.category_color || colors.primary} 
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.h4, { color: colors.text }]} numberOfLines={1}>
                      {transaction.category_name}
                    </Text>
                    {transaction.note ? (
                      <Text style={[Typography.bodySmall, { color: colors.textSecondary }]} numberOfLines={2}>
                        {transaction.note}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.amountRow}>
                  <Text 
                    style={[
                      Typography.h3, 
                      { color: transaction.type === 'income' ? colors.income : colors.expense, fontWeight: 'bold' }
                    ]}
                  >
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </Text>
                  
                  <View style={[styles.accountBadge, { backgroundColor: (transaction.account_color || colors.borderLight) + '20' }]}>
                    <MaterialCommunityIcons 
                      name={(transaction.account_icon as any) || 'wallet'} 
                      size={14} 
                      color={transaction.account_color || colors.textSecondary} 
                    />
                    <Text style={[styles.accountText, { color: transaction.account_color || colors.textSecondary }]}>
                      {transaction.account_name || 'Akun'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

              {/* Action Buttons */}
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.background }]}
                onPress={() => { onClose(); onEdit(transaction); }}
              >
                <MaterialCommunityIcons name="pencil" size={20} color={colors.primary} style={styles.actionIcon} />
                <Text style={[Typography.button, { color: colors.primary }]}>{t('transactions.editTransaction')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.danger + '15' }]}
                onPress={() => { onClose(); onDelete(transaction); }}
              >
                <MaterialCommunityIcons name="delete" size={20} color={colors.danger} style={styles.actionIcon} />
                <Text style={[Typography.button, { color: colors.danger }]}>{t('transactions.deleteConfirmTitle')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={onClose}
              >
                <Text style={[Typography.button, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
    padding: 20,
    paddingBottom: 30,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  header: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(150,150,150,0.05)',
    padding: 12,
    borderRadius: 12,
  },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  accountText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  actionIcon: {
    marginRight: 8,
  },
  cancelButton: {
    alignItems: 'center',
    padding: 14,
    marginTop: 4,
  },
});
