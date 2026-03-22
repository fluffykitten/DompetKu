import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Modal, 
  FlatList, Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Typography } from '../theme/typography';
import { Account, AccountType } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { useTranslation } from 'react-i18next';

const { height } = Dimensions.get('window');

interface AccountPickerProps {
  accounts: Account[];
  selectedAccountId: number | null;
  onSelect: (account: Account) => void;
  label?: string;
  error?: string;
}

export default function AccountPicker({
  accounts,
  selectedAccountId,
  onSelect,
  label,
  error
}: AccountPickerProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const { formatCurrency } = useCurrency();

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const handleSelect = (account: Account) => {
    onSelect(account);
    setModalVisible(false);
  };

  const getAccountTypeLabel = (type: AccountType) => {
    switch (type) {
      case 'cash': return t('accounts.cash', {defaultValue: 'Cash'});
      case 'bank': return t('accounts.bank', {defaultValue: 'Bank'});
      case 'ewallet': return t('accounts.ewallet', {defaultValue: 'E-Wallet'});
      default: return type;
    }
  };

  return (
    <View style={styles.container}>
      {(label || t('common.account')) && <Text style={[styles.label, { color: colors.textSecondary }]}>{label || t('common.account')}</Text>}
      
      <TouchableOpacity
        style={[
          styles.selector,
          { 
            backgroundColor: colors.inputBackground,
            borderColor: error ? colors.danger : 'transparent',
            borderWidth: error ? 1 : 0
          }
        ]}
        onPress={() => setModalVisible(true)}
      >
        {selectedAccount ? (
          <View style={styles.selectedContent}>
            <View style={[styles.iconWrapper, { backgroundColor: selectedAccount.color + '20' }]}>
              <MaterialCommunityIcons name={selectedAccount.icon as any} size={20} color={selectedAccount.color} />
            </View>
            <View>
              <Text style={[styles.selectedText, { color: colors.text }]}>{selectedAccount.name}</Text>
              <Text style={[styles.selectedSubtext, { color: colors.textSecondary }]}>
                {t('common.balance')}: {formatCurrency(selectedAccount.balance)}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={[styles.placeholder, { color: colors.textLight }]}>
            {t('common.account')}
          </Text>
        )}
        <MaterialCommunityIcons name="chevron-down" size={24} color={colors.textSecondary} />
      </TouchableOpacity>
      
      {error && <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setModalVisible(false)} 
          />
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.modalTitle, Typography.h4, { color: colors.text }]}>
                {t('common.account')}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={accounts}
              keyExtractor={(item) => item.id ? item.id.toString() : 'null-id'}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.listItem,
                    { 
                      borderBottomColor: colors.borderLight,
                      backgroundColor: selectedAccountId === item.id ? item.color + '10' : 'transparent'
                    }
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <View style={[styles.listIconWrapper, { backgroundColor: item.color + '20' }]}>
                    <MaterialCommunityIcons name={item.icon as any} size={24} color={item.color} />
                  </View>
                  <View style={styles.listItemTextContainer}>
                    <Text style={[styles.listItemName, { color: colors.text }]}>
                      {item.name}
                      {item.is_default === 1 && <Text style={[styles.defaultBadge, { color: colors.primary }]}>  (Utama)</Text>}
                    </Text>
                    <Text style={[styles.listItemType, { color: colors.textSecondary }]}>
                      {getAccountTypeLabel(item.type)} • {formatCurrency(item.balance)}
                    </Text>
                  </View>
                  {selectedAccountId === item.id && (
                    <MaterialCommunityIcons name="check-circle" size={24} color={item.color} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    minHeight: 64,
  },
  selectedContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  selectedSubtext: {
    fontSize: 12,
  },
  placeholder: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
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
    maxHeight: height * 0.6,
    minHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  listIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  listItemTextContainer: {
    flex: 1,
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  defaultBadge: {
    fontSize: 12,
    fontWeight: 'normal',
  },
  listItemType: {
    fontSize: 13,
  },
});
