import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../theme/ThemeContext';
import { Typography } from '../theme/typography';
import { Account, AccountType } from '../types';
import { useAccounts } from '../hooks/useAccounts';
import { useCurrency } from '../context/CurrencyContext';
import { useTranslation } from 'react-i18next';

const INITIAL_COLORS = [
  '#4CAF50', // Cash
  '#2196F3', '#03A9F4', '#3F51B5', '#00BCD4', // Banks
  '#9C27B0', '#E91E63', '#F44336', '#FF9800', // E-Wallets
  '#009688', '#8BC34A', '#607D8B', '#795548'
];

const ACCOUNT_ICONS = [
  'wallet', 'cash', 'bank', 'credit-card', 
  'cellphone', 'integrated-circuit', 'piggy-bank'
];

export default function AccountsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  
  const { accounts, addAccount, updateAccount, deleteAccount, setDefaultAccount } = useAccounts();

  // Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<AccountType>('cash');
  const [accBalance, setAccBalance] = useState('');
  const [accIcon, setAccIcon] = useState('wallet');
  const [accColor, setAccColor] = useState(INITIAL_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [deleteCountdown, setDeleteCountdown] = useState(3);
  const [isDeleting, setIsDeleting] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer for delete confirmation
  useEffect(() => {
    if (deleteModalVisible) {
      setDeleteCountdown(3);
      countdownRef.current = setInterval(() => {
        setDeleteCountdown(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [deleteModalVisible]);

  // Group accounts by type for display
  const cashAccounts = accounts.filter(a => a.type === 'cash');
  const bankAccounts = accounts.filter(a => a.type === 'bank');
  const ewalletAccounts = accounts.filter(a => a.type === 'ewallet');

  const handleOpenAdd = (type: AccountType) => {
    setEditId(null);
    setAccName('');
    setAccType(type);
    setAccBalance('');
    
    // Set default icon/color based on type
    if (type === 'cash') {
      setAccIcon('cash');
      setAccColor('#4CAF50');
    } else if (type === 'bank') {
      setAccIcon('bank');
      setAccColor('#2196F3');
    } else {
      setAccIcon('cellphone');
      setAccColor('#9C27B0');
    }
    
    setModalVisible(true);
  };

  const handleOpenEdit = (account: Account) => {
    setEditId(account.id);
    setAccName(account.name);
    setAccType(account.type);
    setAccBalance(account.balance.toString());
    setAccIcon(account.icon);
    setAccColor(account.color);
    setModalVisible(true);
  };

  const handleDelete = (account: Account) => {
    if (accounts.length <= 1) {
      Alert.alert('Gagal', 'Anda harus memiliki setidaknya satu akun.');
      return;
    }
    setAccountToDelete(account);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!accountToDelete || deleteCountdown > 0) return;
    setIsDeleting(true);
    try {
      await deleteAccount(accountToDelete.id);
      setDeleteModalVisible(false);
      setAccountToDelete(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal menghapus akun');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetDefault = (account: Account) => {
    if (account.is_default !== 1) {
      setDefaultAccount(account.id);
    }
  };

  const formatAmountInput = (text: string) => {
    const numericStr = text.replace(/[^0-9]/g, '');
    setAccBalance(numericStr);
  };

  const handleSave = async () => {
    if (!accName.trim()) {
      Alert.alert('Peringatan', 'Nama akun tidak boleh kosong.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editId) {
        // Warning: changing balance of existing account doesn't update history
        // but it's simpler for this logic to allow it in settings
        await updateAccount(editId, {
          name: accName.trim(),
          type: accType,
          icon: accIcon,
          color: accColor,
        });
        
        // Update balance is currently not directly supported by our generic updater 
        // to prevent data inconsistency, so we skip it for edits
      } else {
        await addAccount({
          name: accName.trim(),
          type: accType,
          balance: Number(accBalance) || 0,
          icon: accIcon,
          color: accColor
        });
      }
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal menyimpan akun');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAccountGroup = (title: string, data: Account[], type: AccountType) => {
    return (
      <View style={styles.groupContainer}>
        <View style={styles.groupHeader}>
          <Text style={[Typography.h4, { color: colors.text }]}>{title}</Text>
          <TouchableOpacity onPress={() => handleOpenAdd(type)}>
            <MaterialCommunityIcons name="plus-circle" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {data.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textLight }]}>Belum ada akun</Text>
        ) : (
          data.map(account => (
            <TouchableOpacity 
              key={account.id} 
              style={[styles.accountCard, { backgroundColor: colors.surface }]}
              onPress={() => handleOpenEdit(account)}
              onLongPress={() => handleSetDefault(account)}
            >
              <View style={[styles.accIconWrapper, { backgroundColor: account.color + '20' }]}>
                <MaterialCommunityIcons name={account.icon as any} size={28} color={account.color} />
              </View>
              
              <View style={styles.accDetails}>
                <View style={styles.accNameRow}>
                  <Text style={[styles.accName, { color: colors.text }]} numberOfLines={1}>
                    {account.name}
                  </Text>
                  {account.is_default === 1 && (
                    <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>Utama</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.accBalance, Typography.h4, { color: colors.text }]}>
                  {formatCurrency(account.balance)}
                </Text>
              </View>
              
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(account)}>
                <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </View>
    );
  };

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={[styles.infoCard, { backgroundColor: colors.primary + '15' }]}>
          <MaterialCommunityIcons name="information" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Tekan dan tahan (long press) pada akun untuk menjadikannya akun utama.
          </Text>
        </View>

        {renderAccountGroup('Tunai', cashAccounts, 'cash')}
        {renderAccountGroup('Bank', bankAccounts, 'bank')}
        {renderAccountGroup('Dompet Digital', ewalletAccounts, 'ewallet')}
        
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
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
              <Text style={[Typography.h4, { color: colors.text }]}>
                {editId ? 'Edit Akun' : 'Tambah Akun Baru'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {/* Type selector if Adding */}
              {!editId && (
                <View style={styles.typeSelectorRow}>
                  {['cash', 'bank', 'ewallet'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeChip,
                        { borderColor: colors.borderLight },
                        accType === type && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                      onPress={() => setAccType(type as AccountType)}
                    >
                      <Text style={[
                        styles.typeChipText,
                        { color: accType === type ? '#fff' : colors.textSecondary }
                      ]}>
                        {type === 'cash' ? 'Tunai' : type === 'bank' ? 'Bank' : 'E-Wallet'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Name Input */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Nama Akun</Text>
              <View style={[styles.inputGroup, { backgroundColor: colors.inputBackground }]}>
                <View style={[styles.previewIcon, { backgroundColor: accColor + '20' }]}>
                  <MaterialCommunityIcons name={accIcon as any} size={24} color={accColor} />
                </View>
                <TextInput
                  style={[styles.nameInput, { color: colors.text }]}
                  value={accName}
                  onChangeText={setAccName}
                  placeholder="Misal: BCA, GoPay, Tunai"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              {/* Balance Input (Only for new accounts to prevent messing up history) */}
              {!editId && (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Saldo Awal</Text>
                  <View style={[styles.inputGroup, { backgroundColor: colors.inputBackground }]}>
                    <Text style={[Typography.h4, { color: colors.textSecondary, marginRight: 8, paddingLeft: 10 }]}>Rp</Text>
                    <TextInput
                      style={[styles.nameInput, { color: colors.text }]}
                      value={accBalance ? new Intl.NumberFormat('id-ID').format(Number(accBalance)) : ''}
                      onChangeText={formatAmountInput}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                </>
              )}

              {/* Icon Picker */}
              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 8 }]}>Ikon</Text>
              <FlatList
                data={ACCOUNT_ICONS}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item}
                contentContainerStyle={styles.pickerList}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[
                      styles.pickerItem, 
                      accIcon === item && { backgroundColor: colors.primary + '20', borderColor: colors.primary, borderWidth: 1 }
                    ]}
                    onPress={() => setAccIcon(item)}
                  >
                    <MaterialCommunityIcons name={item as any} size={24} color={accIcon === item ? colors.primary : colors.textSecondary} />
                  </TouchableOpacity>
                )}
              />

              {/* Color Picker */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Warna</Text>
              <FlatList
                data={INITIAL_COLORS}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item}
                contentContainerStyle={styles.pickerList}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[
                      styles.colorPickerItem, 
                      { backgroundColor: item },
                      accColor === item && styles.colorPickerSelected
                    ]}
                    onPress={() => setAccColor(item)}
                  >
                    {accColor === item && <MaterialCommunityIcons name="check" size={16} color="#fff" />}
                  </TouchableOpacity>
                )}
              />

              <TouchableOpacity 
                style={[
                  styles.saveBtn, 
                  { backgroundColor: colors.primary },
                  isSubmitting && { opacity: 0.5 }
                ]}
                onPress={handleSave}
                disabled={isSubmitting}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                  {isSubmitting ? '...' : editId ? t('common.save') : t('common.save')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal with Countdown */}
      <Modal
        visible={deleteModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => { if (!isDeleting) { setDeleteModalVisible(false); setAccountToDelete(null); } }}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={[styles.deleteModalContent, { backgroundColor: colors.surface }]}>
            {/* Warning Icon */}
            <View style={[styles.deleteWarningIcon, { backgroundColor: (colors.danger || '#F44336') + '15' }]}>
              <MaterialCommunityIcons name="alert-circle" size={48} color={colors.danger || '#F44336'} />
            </View>

            <Text style={[Typography.h4, { color: colors.text, textAlign: 'center', marginBottom: 8 }]}>
              {t('common.delete')} {accountToDelete?.name || ''}
            </Text>

            <Text style={[{ color: colors.textSecondary, textAlign: 'center', marginBottom: 20, fontSize: 14, lineHeight: 20 }]}>
              Tindakan ini akan menghapus akun beserta{' '}
              <Text style={{ fontWeight: 'bold', color: colors.danger || '#F44336' }}>SEMUA transaksi</Text>
              {' '}yang terkait. Tindakan ini tidak dapat dibatalkan.
            </Text>

            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={[styles.deleteModalBtn, { backgroundColor: colors.chipBackground || colors.border }]}
                onPress={() => { setDeleteModalVisible(false); setAccountToDelete(null); }}
                disabled={isDeleting}
              >
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>{t('common.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.deleteModalBtn,
                  { backgroundColor: colors.danger || '#F44336' },
                  (deleteCountdown > 0 || isDeleting) && { opacity: 0.5 }
                ]}
                onPress={handleConfirmDelete}
                disabled={deleteCountdown > 0 || isDeleting}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>
                  {isDeleting ? '...' : deleteCountdown > 0 ? `${t('common.delete')} (${deleteCountdown}s)` : t('common.delete')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 13,
  },
  groupContainer: {
    marginBottom: 24,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    padding: 8,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  accIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  accDetails: {
    flex: 1,
  },
  accNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  accName: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  accBalance: {},
  deleteBtn: {
    padding: 8,
  },

  // Modal
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
    maxHeight: '85%',
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
  modalBody: {
    padding: 20,
    paddingBottom: 40,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
  },
  pickerList: {
    paddingRight: 20,
    marginBottom: 16,
  },
  pickerItem: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  colorPickerItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPickerSelected: {
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  saveBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  // Delete Modal
  deleteModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 24,
  },
  deleteModalContent: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  deleteWarningIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
});
