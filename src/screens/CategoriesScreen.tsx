import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Typography } from '../theme/typography';
import { useCategories } from '../hooks/useCategories';
import { TransactionType } from '../types';
import { useTranslation } from 'react-i18next';

const INITIAL_COLORS = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', 
  '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50', 
  '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'
];

const COMMON_ICONS = [
  'food-fork-drink', 'bus', 'shopping', 'gamepad-variant', 'pill',
  'school', 'file-document', 'wallet-giftcard', 'bitcoin', 'piggy-bank',
  'account-cash', 'cash-multiple', 'car', 'airplane', 'home',
  'water', 'lightning-bolt', 'wifi', 't-shirt-crew', 'monitor'
];

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState<TransactionType>('expense');
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories(activeTab);

  // Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('help-circle');
  const [catColor, setCatColor] = useState(INITIAL_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAdd = () => {
    setEditId(null);
    setCatName('');
    setCatIcon('help-circle');
    setCatColor(INITIAL_COLORS[0]);
    setModalVisible(true);
  };

  const handleOpenEdit = (category: any) => {
    setEditId(category.id);
    setCatName(category.name);
    setCatIcon(category.icon);
    setCatColor(category.color);
    setModalVisible(true);
  };

  const handleDelete = (category: any) => {
    if (category.is_default === 1) {
      Alert.alert('Gagal', 'Kategori bawaan sistem tidak dapat dihapus.');
      return;
    }

    Alert.alert(
      'Hapus Kategori',
      `Yakin ingin menghapus kategori "${category.name}"? Ini tidak akan menghapus transaksi yang sudah ada, tapi mengubah kategorinya menjadi Tidak ada kategori.`,
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(category.id);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Gagal menghapus kategori');
            }
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    if (!catName.trim()) {
      Alert.alert('Peringatan', 'Nama kategori tidak boleh kosong.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editId) {
        await updateCategory(editId, {
          name: catName.trim(),
          icon: catIcon,
          color: catColor
        });
      } else {
        await addCategory({
          name: catName.trim(),
          icon: catIcon,
          color: catColor,
          type: activeTab
        });
      }
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal menyimpan kategori');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: colors.surface }]}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'expense' && { borderBottomColor: colors.expense, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('expense')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'expense' ? colors.expense : colors.textSecondary }]}>
            {t('common.expense')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'income' && { borderBottomColor: colors.income, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('income')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'income' ? colors.income : colors.textSecondary }]}>
            {t('common.income')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Categories Grid */}
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.gridItem, { backgroundColor: colors.surface }]}
            onPress={() => handleOpenEdit(item)}
            onLongPress={() => handleDelete(item)}
          >
            <View style={[styles.iconWrapper, { backgroundColor: item.color + '20' }]}>
              <MaterialCommunityIcons name={item.icon as any} size={28} color={item.color} />
            </View>
            <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
              {item.name}
            </Text>
            {item.is_default === 1 && (
              <MaterialCommunityIcons name="lock" size={12} color={colors.textLight} style={styles.lockIcon} />
            )}
          </TouchableOpacity>
        )}
      />

      {/* FAB */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleOpenAdd}
      >
        <MaterialCommunityIcons name="plus" size={30} color="#fff" />
      </TouchableOpacity>

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
                {editId ? 'Edit Kategori' : 'Tambah Kategori Baru'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Name Input */}
              <View style={[styles.inputGroup, { backgroundColor: colors.inputBackground }]}>
                <View style={[styles.previewIcon, { backgroundColor: catColor + '20' }]}>
                  <MaterialCommunityIcons name={catIcon as any} size={24} color={catColor} />
                </View>
                <TextInput
                  style={[styles.nameInput, { color: colors.text }]}
                  value={catName}
                  onChangeText={setCatName}
                  placeholder="Nama Kategori"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              {/* Icon Picker */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Pilih Ikon</Text>
              <FlatList
                data={COMMON_ICONS}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item}
                contentContainerStyle={styles.pickerList}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[
                      styles.pickerItem, 
                      catIcon === item && { backgroundColor: colors.primary + '20', borderColor: colors.primary, borderWidth: 1 }
                    ]}
                    onPress={() => setCatIcon(item)}
                  >
                    <MaterialCommunityIcons name={item as any} size={24} color={catIcon === item ? colors.primary : colors.textSecondary} />
                  </TouchableOpacity>
                )}
              />

              {/* Color Picker */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Pilih Warna</Text>
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
                      catColor === item && styles.colorPickerSelected
                    ]}
                    onPress={() => setCatColor(item)}
                  >
                    {catColor === item && <MaterialCommunityIcons name="check" size={16} color="#fff" />}
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
                  {isSubmitting ? '...' : t('common.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabText: {
    fontWeight: '600',
    fontSize: 15,
  },
  listContent: {
    padding: 12,
    paddingBottom: 100, // Make room for FAB
  },
  gridItem: {
    width: '30%',
    margin: '1.66%',
    aspectRatio: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  lockIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
    paddingBottom: 40,
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
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
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
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  pickerList: {
    paddingRight: 20,
    marginBottom: 24,
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
});
