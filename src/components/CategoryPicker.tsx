import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Modal, 
  FlatList, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Typography } from '../theme/typography';
import { Category } from '../types';
import { useTranslation } from 'react-i18next';

const { height } = Dimensions.get('window');

interface CategoryPickerProps {
  categories: Category[];
  selectedCategoryId: number | null;
  onSelect: (category: Category) => void;
  label?: string;
  error?: string;
}

export default function CategoryPicker({
  categories,
  selectedCategoryId,
  onSelect,
  label,
  error
}: CategoryPickerProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  const handleSelect = (category: Category) => {
    onSelect(category);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {(label || t('common.category')) && <Text style={[styles.label, { color: colors.textSecondary }]}>{label || t('common.category')}</Text>}
      
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
        {selectedCategory ? (
          <View style={styles.selectedContent}>
            <View style={[styles.iconWrapper, { backgroundColor: selectedCategory.color + '20' }]}>
              <MaterialCommunityIcons name={selectedCategory.icon as any} size={20} color={selectedCategory.color} />
            </View>
            <Text style={[styles.selectedText, { color: colors.text }]}>{selectedCategory.name}</Text>
          </View>
        ) : (
          <Text style={[styles.placeholder, { color: colors.textLight }]}>
            {t('common.category')}
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
                {t('common.category')}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={categories}
              keyExtractor={(item) => item.id ? item.id.toString() : 'null-id'}
              numColumns={4}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.gridItem}
                  onPress={() => handleSelect(item)}
                >
                  <View style={[
                    styles.gridIconWrapper, 
                    { 
                      backgroundColor: item.color + '20',
                      borderWidth: selectedCategoryId === item.id ? 2 : 0,
                      borderColor: item.color
                    }
                  ]}>
                    <MaterialCommunityIcons name={item.icon as any} size={28} color={item.color} />
                  </View>
                  <Text 
                    style={[styles.gridItemText, { color: colors.text }]} 
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
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
    minHeight: 56,
  },
  selectedContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  selectedText: {
    fontSize: 16,
    fontWeight: '500',
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
    maxHeight: height * 0.7,
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
    padding: 16,
  },
  gridItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 20,
  },
  gridIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridItemText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
