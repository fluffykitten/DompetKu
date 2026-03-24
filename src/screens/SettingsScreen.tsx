import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Switch, Alert, ActivityIndicator, Modal, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '../theme/ThemeContext';
import { Typography } from '../theme/typography';
import { RootStackParamList } from '../navigation/AppNavigator';
import { resetAllData } from '../database/migrations';
import { exportToExcel } from '../utils/exportUtils';
import { backupData, restoreData } from '../utils/backupUtils';
import { useTranslation } from 'react-i18next';
import { useCurrency, CurrencySetting, defaultCurrency } from '../context/CurrencyContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { SECURITY_STORAGE_KEY } from '../components/SecurityWrapper';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Storage keys
const PROFILE_NAME_KEY = '@dompetku_profile_name';
const LANGUAGE_KEY = '@dompetku_language';
const AVATAR_COLOR_KEY = '@dompetku_avatar_color';

const AVATAR_COLORS = [
  '#F44336', // Red
  '#E91E63', // Pink
  '#9C27B0', // Purple
  '#3F51B5', // Indigo
  '#2196F3', // Blue
  '#00BCD4', // Cyan
  '#009688', // Teal
  '#4CAF50', // Green
  '#FF9800', // Orange
  '#795548', // Brown
];

const LANGUAGES = [
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
];

const PRESET_CURRENCIES = [
  { code: 'IDR', symbol: 'Rp', position: 'left', decimalSeparator: ',', groupSeparator: '.' },
  { code: 'USD', symbol: '$', position: 'left', decimalSeparator: '.', groupSeparator: ',' },
  { code: 'EUR', symbol: '€', position: 'right', decimalSeparator: ',', groupSeparator: '.' },
  { code: 'SGD', symbol: 'S$', position: 'left', decimalSeparator: '.', groupSeparator: ',' },
  { code: 'JPY', symbol: '¥', position: 'left', decimalSeparator: '.', groupSeparator: ',' },
];

export default function SettingsScreen() {
  const { colors, mode, toggleTheme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { t, i18n } = useTranslation();
  const { currency, setCurrency } = useCurrency();

  const isDarkMode = mode === 'dark';
  const [isResetting, setIsResetting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isBacking, setIsBacking] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Reset confirmation modal with countdown
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(3);
  const resetCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (resetModalVisible) {
      setResetCountdown(3);
      resetCountdownRef.current = setInterval(() => {
        setResetCountdown(prev => {
          if (prev <= 1) {
            if (resetCountdownRef.current) clearInterval(resetCountdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (resetCountdownRef.current) {
        clearInterval(resetCountdownRef.current);
        resetCountdownRef.current = null;
      }
    }
    return () => {
      if (resetCountdownRef.current) {
        clearInterval(resetCountdownRef.current);
        resetCountdownRef.current = null;
      }
    };
  }, [resetModalVisible]);
  const [appLockEnabled, setAppLockEnabled] = useState(false);

  // Profile
  const [profileName, setProfileName] = useState('User DompetKu');
  const [avatarColor, setAvatarColor] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  // Language & Currency
  const [language, setLanguage] = useState('id');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customForm, setCustomForm] = useState<CurrencySetting>({
    code: 'CUST', symbol: '', position: 'left', decimalSeparator: ',', groupSeparator: '.'
  });

  // Load saved settings when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    try {
      const [lockedStr, savedName, savedLang, savedColor] = await Promise.all([
        AsyncStorage.getItem(SECURITY_STORAGE_KEY),
        AsyncStorage.getItem(PROFILE_NAME_KEY),
        AsyncStorage.getItem(LANGUAGE_KEY),
        AsyncStorage.getItem(AVATAR_COLOR_KEY),
      ]);
      setAppLockEnabled(lockedStr === 'true');
      if (savedName) setProfileName(savedName);
      if (savedLang) setLanguage(savedLang);
      if (savedColor) setAvatarColor(savedColor);
    } catch (e) {}
  };

  // ── Profile ──────────────────────────────────
  const handleSaveProfile = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      Alert.alert(t('common.error'), t('common.error')); // simplify alert
      return;
    }
    const finalColor = editColor || colors.primary;
    try {
      await Promise.all([
        AsyncStorage.setItem(PROFILE_NAME_KEY, trimmed),
        AsyncStorage.setItem(AVATAR_COLOR_KEY, finalColor),
      ]);
      setProfileName(trimmed);
      setAvatarColor(finalColor);
      setShowProfileModal(false);
    } catch (e) {
      Alert.alert(t('common.error'), t('common.error'));
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // ── Language ─────────────────────────────────
  const handleSelectLanguage = async (code: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, code);
      i18n.changeLanguage(code);
      setLanguage(code);
      setShowLanguageModal(false);
    } catch (e) {
      Alert.alert(t('common.error'), t('common.error'));
    }
  };

  const handleSelectPresetCurrency = async (preset: any) => {
    await setCurrency(preset as CurrencySetting);
    setShowCurrencyModal(false);
    setIsCustomMode(false);
  };

  const handleSaveCustomCurrency = async () => {
    if (!customForm.symbol.trim()) {
      Alert.alert(t('common.error'), t('common.error'));
      return;
    }
    await setCurrency(customForm);
    setShowCurrencyModal(false);
    setIsCustomMode(false);
  };

  // ── Security ─────────────────────────────────
  const handleToggleAppLock = async (value: boolean) => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (value && (!hasHardware || !isEnrolled)) {
        Alert.alert(t('common.error'), t('security.noBiometric'));
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('security.promptMessage'),
        disableDeviceFallback: false,
      });

      if (result.success) {
        setAppLockEnabled(value);
        await AsyncStorage.setItem(SECURITY_STORAGE_KEY, value ? 'true' : 'false');
      }
    } catch (e) {
      console.error(e);
      Alert.alert(t('common.error'), t('common.error'));
    }
  };

  // ── Data ─────────────────────────────────────
  const handleExportData = async () => {
    setIsExporting(true);
    await exportToExcel();
    setIsExporting(false);
  };

  const handleBackup = async () => {
    setIsBacking(true);
    await backupData();
    setIsBacking(false);
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    const success = await restoreData();
    setIsRestoring(false);
    if (success) {
      // Reload settings after restore
      await loadSettings();
    }
  };

  const handleResetData = () => {
    Alert.alert(
      t('settings.resetConfirmTitle'),
      t('settings.resetConfirmWarning'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('settings.resetConfirmTitle'), 
          style: 'destructive',
          onPress: () => {
            setResetModalVisible(true);
          }
        }
      ]
    );
  };

  const handleConfirmReset = async () => {
    if (resetCountdown > 0) return;
    setIsResetting(true);
    try {
      await resetAllData();
      setResetModalVisible(false);
      Alert.alert(t('common.success'), t('common.success'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('common.error'));
    } finally {
      setIsResetting(false);
    }
  };

  // ── Reusable Components ──────────────────────
  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[styles.sectionTitle, Typography.h5, { color: colors.primary }]}>
      {title}
    </Text>
  );

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    rightElement 
  }: any) => (
    <TouchableOpacity 
      style={[styles.settingItem, { borderBottomColor: colors.borderLight }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.iconWrapper, { backgroundColor: colors.surface }]}>
        <MaterialCommunityIcons name={icon} size={24} color={colors.textSecondary} />
      </View>
      <View style={styles.itemTextContainer}>
        <Text style={[styles.itemTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      {rightElement ? rightElement : (
        onPress && <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textLight} />
      )}
    </TouchableOpacity>
  );

  const currentLang = LANGUAGES.find(l => l.code === language);

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Profile Section */}
        <TouchableOpacity 
          style={styles.headerSection}
          onPress={() => { 
            setEditName(profileName); 
            setEditColor(avatarColor || colors.primary);
            setShowProfileModal(true); 
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.avatar, { backgroundColor: avatarColor || colors.primary }]}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold' }}>{getInitials(profileName)}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={[Typography.h3, { color: colors.text }]}>{profileName}</Text>
            <Text style={{ color: colors.textSecondary }}>{t('settings.tapToEdit')}</Text>
          </View>
          <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.textLight} />
        </TouchableOpacity>

        {/* General Settings */}
        <View style={styles.section}>
          <SectionHeader title={t('settings.general')} />
          
          <SettingItem 
            icon="wallet" 
            title={t('navigation.accounts')} 
            subtitle={t('settings.manageAccounts')}
            onPress={() => navigation.navigate('Accounts')}
          />
          
          <SettingItem 
            icon="shape" 
            title={t('navigation.categories')} 
            subtitle={t('settings.manageCategories')}
            onPress={() => navigation.navigate('Categories')}
          />
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <SectionHeader title={t('settings.preferences')} />
          
          <SettingItem 
            icon="theme-light-dark" 
            title={t('settings.darkMode')} 
            subtitle={t('settings.darkModeDesc')}
            rightElement={
              <Switch 
                value={isDarkMode} 
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={isDarkMode ? colors.primary : '#f4f3f4'}
              />
            }
          />

          <SettingItem 
            icon="translate" 
            title={t('settings.language')} 
            subtitle={currentLang ? `${currentLang.flag} ${currentLang.label}` : 'Bahasa Indonesia'}
            onPress={() => setShowLanguageModal(true)}
          />
          
          <SettingItem 
            icon="currency-usd" 
            title={t('settings.mainCurrency')} 
            subtitle={`${currency.code} (${currency.symbol})`}
            onPress={() => setShowCurrencyModal(true)}
          />
        </View>

        {/* Security */}
        <View style={styles.section}>
          <SectionHeader title={t('settings.security')} />
          
          <SettingItem 
            icon="shield-lock-outline" 
            title={t('settings.appLock')} 
            subtitle={t('settings.appLockDesc')}
            rightElement={
              <Switch 
                value={appLockEnabled} 
                onValueChange={handleToggleAppLock}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={appLockEnabled ? colors.primary : '#f4f3f4'}
              />
            }
          />
        </View>

        {/* Backup & Restore */}
        <View style={styles.section}>
          <SectionHeader title={t('settings.backupRestore')} />   

          <SettingItem 
            icon="cloud-upload-outline" 
            title={isBacking ? t('settings.backingUp') : t('settings.backupData')}
            subtitle={t('settings.backupDataDesc')}
            onPress={isBacking ? undefined : handleBackup}
            rightElement={isBacking ? <ActivityIndicator size="small" color={colors.primary} /> : undefined}
          />

          <SettingItem 
            icon="cloud-download-outline" 
            title={isRestoring ? t('settings.restoring') : t('settings.restoreData')}
            subtitle={t('settings.restoreDataDesc')}
            onPress={isRestoring ? undefined : handleRestore}
            rightElement={isRestoring ? <ActivityIndicator size="small" color={colors.primary} /> : undefined}
          />
        </View>

        {/* Data & Privacy */}
        <View style={styles.section}>
          <SectionHeader title={t('settings.dataPrivacy')} />
          
          <SettingItem 
            icon="export" 
            title={isExporting ? t('settings.exporting') : t('settings.exportData')}
            subtitle={t('settings.exportDesc')}
            onPress={isExporting ? undefined : handleExportData}
            rightElement={isExporting ? <ActivityIndicator size="small" color={colors.primary} /> : undefined}
          />
          
          <SettingItem 
            icon="delete-empty" 
            title={isResetting ? t('settings.resetting') : t('settings.resetAll')}
            subtitle={t('settings.resetDesc')}
            onPress={isResetting ? undefined : handleResetData}
            rightElement={isResetting ? <ActivityIndicator size="small" color={colors.danger} /> : undefined}
          />
        </View>

        {/* App Info */}
        <View style={styles.infoSection}>
          <Text style={{ color: colors.textLight, textAlign: 'center', marginBottom: 4 }}>
            DompetKu v1.0.0
          </Text>
          <Text style={{ color: colors.textLight, textAlign: 'center', fontSize: 12, marginBottom: 8 }}>
            {t('settings.aboutApp')}
          </Text>
          <Text style={{ color: colors.textLight, textAlign: 'center', fontSize: 12, fontWeight: 'bold' }}>
            Created by fluffykitten
          </Text>
        </View>

      </ScrollView>

      {/* ── Profile Edit Modal ── */}
      <Modal
        visible={showProfileModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBackground }]}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <Text style={[Typography.h4, { color: colors.text, marginBottom: 20 }]}>{t('settings.editProfile')}</Text>
            
            {/* Avatar preview */}
            <View style={[styles.modalAvatar, { backgroundColor: editColor || colors.primary }]}>
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}>
                {getInitials(editName || 'U')}
              </Text>
            </View>

            <Text style={[Typography.label, { color: colors.textSecondary, marginBottom: 6, alignSelf: 'flex-start' }]}>
              Nama
            </Text>
            <TextInput
              style={[styles.input, { 
                color: colors.text, 
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
                marginBottom: 20
              }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Masukkan nama Anda"
              placeholderTextColor={colors.textLight}
              maxLength={30}
            />

            <Text style={[Typography.label, { color: colors.textSecondary, marginBottom: 12, alignSelf: 'flex-start' }]}>
              Warna Avatar
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24, justifyContent: 'center' }}>
              {[colors.primary, ...AVATAR_COLORS.filter(c => c !== colors.primary)].slice(0, 10).map(color => (
                <TouchableOpacity
                  key={color}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: color,
                    borderWidth: 2,
                    borderColor: (editColor || colors.primary) === color ? colors.text : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => setEditColor(color)}
                >
                  {(editColor || colors.primary) === color && (
                    <MaterialCommunityIcons name="check" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.chipBackground }]}
                onPress={() => setShowProfileModal(false)}
              >
                <Text style={[Typography.button, { color: colors.text }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveProfile}
              >
                <Text style={[Typography.button, { color: '#fff' }]}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Language Selection Modal ── */}
      <Modal
        visible={showLanguageModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBackground }]}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <Text style={[Typography.h4, { color: colors.text, marginBottom: 16 }]}>{t('settings.language')}</Text>
            
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageItem,
                  { 
                    backgroundColor: lang.code === language ? colors.primaryLight + '20' : 'transparent',
                    borderColor: lang.code === language ? colors.primary : colors.borderLight,
                  }
                ]}
                onPress={() => handleSelectLanguage(lang.code)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 24, marginRight: 12 }}>{lang.flag}</Text>
                <Text style={[Typography.body, { color: colors.text, flex: 1 }]}>{lang.label}</Text>
                {lang.code === language && (
                  <MaterialCommunityIcons name="check-circle" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: colors.chipBackground, marginTop: 16, alignSelf: 'center' }]}
              onPress={() => setShowLanguageModal(false)}
            >
              <Text style={[Typography.button, { color: colors.text }]}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Currency Selection Modal ── */}
      <Modal
        visible={showCurrencyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => { setShowCurrencyModal(false); setIsCustomMode(false); }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBackground }]}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <Text style={[Typography.h4, { color: colors.text, marginBottom: 16 }]}>
              {t('settings.mainCurrency')}
            </Text>

            {!isCustomMode ? (
              <ScrollView style={{ width: '100%', maxHeight: 400 }}>
                {PRESET_CURRENCIES.map((preset) => {
                  const isSelected = currency.code === preset.code && currency.symbol === preset.symbol;
                  return (
                    <TouchableOpacity
                      key={preset.code}
                      style={[
                        styles.languageItem,
                        {
                          backgroundColor: isSelected ? colors.primaryLight + '20' : 'transparent',
                          borderColor: isSelected ? colors.primary : colors.borderLight,
                        }
                      ]}
                      onPress={() => handleSelectPresetCurrency(preset)}
                    >
                      <Text style={[Typography.body, { color: colors.text, flex: 1 }]}>
                        {preset.code} ({preset.symbol})
                      </Text>
                      {isSelected && <MaterialCommunityIcons name="check-circle" size={22} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={[styles.languageItem, { borderColor: colors.borderLight }]}
                  onPress={() => {
                    setCustomForm({ ...currency, code: 'CUST' });
                    setIsCustomMode(true);
                  }}
                >
                  <Text style={[Typography.body, { color: colors.primary, flex: 1 }]}>
                    Custom Currency...
                  </Text>
                  <MaterialCommunityIcons name="pencil" size={20} color={colors.primary} />
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <View style={{ width: '100%' }}>
                <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>Symbol</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  value={customForm.symbol}
                  onChangeText={v => setCustomForm(p => ({ ...p, symbol: v, code: v ? v.toUpperCase() : 'CUST' }))}
                  placeholder="$"
                  placeholderTextColor={colors.textLight}
                />
                
                <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>Position</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  <TouchableOpacity 
                    style={[styles.modalButton, { flex: 1, backgroundColor: customForm.position === 'left' ? colors.primary : colors.chipBackground }]}
                    onPress={() => setCustomForm(p => ({ ...p, position: 'left' }))}
                  ><Text style={{ color: customForm.position === 'left' ? '#fff' : colors.text }}>Left ({customForm.symbol} 100)</Text></TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalButton, { flex: 1, backgroundColor: customForm.position === 'right' ? colors.primary : colors.chipBackground }]}
                    onPress={() => setCustomForm(p => ({ ...p, position: 'right' }))}
                  ><Text style={{ color: customForm.position === 'right' ? '#fff' : colors.text }}>Right (100 {customForm.symbol})</Text></TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>Group Separator</Text>
                    <TextInput
                      style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                      value={customForm.groupSeparator}
                      onChangeText={v => setCustomForm(p => ({ ...p, groupSeparator: v }))}
                      maxLength={1}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>Decimal Symbol</Text>
                    <TextInput
                      style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                      value={customForm.decimalSeparator}
                      onChangeText={v => setCustomForm(p => ({ ...p, decimalSeparator: v }))}
                      maxLength={1}
                    />
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.modalButton, { backgroundColor: colors.chipBackground, flex: 1 }]}
                    onPress={() => setIsCustomMode(false)}
                  >
                    <Text style={[Typography.button, { color: colors.text }]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalButton, { backgroundColor: colors.primary, flex: 1 }]}
                    onPress={handleSaveCustomCurrency}
                  >
                    <Text style={[Typography.button, { color: '#fff' }]}>{t('common.save')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!isCustomMode && (
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.chipBackground, marginTop: 16, alignSelf: 'center', minWidth: 120 }]}
                onPress={() => setShowCurrencyModal(false)}
              >
                <Text style={[Typography.button, { color: colors.text }]}>{t('common.close')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Reset Confirmation Modal with Countdown */}
      <Modal
        visible={resetModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => { if (!isResetting) setResetModalVisible(false); }}
      >
        <View style={[styles.resetModalOverlay]}>
          <View style={[styles.resetModalContent, { backgroundColor: colors.surface }]}>
            {/* Warning Icon */}
            <View style={[styles.resetWarningIcon, { backgroundColor: (colors.danger || '#F44336') + '15' }]}>
              <MaterialCommunityIcons name="alert-octagon" size={48} color={colors.danger || '#F44336'} />
            </View>

            <Text style={[Typography.h4, { color: colors.danger || '#F44336', textAlign: 'center', marginBottom: 8 }]}>
              {t('settings.resetFinalConfirmTitle')}
            </Text>

            <Text style={[{ color: colors.textSecondary, textAlign: 'center', marginBottom: 20, fontSize: 14, lineHeight: 20 }]}>
              {t('settings.resetFinalConfirmWarning')}
            </Text>

            <View style={styles.resetModalActions}>
              <TouchableOpacity
                style={[styles.resetModalBtn, { backgroundColor: colors.chipBackground || colors.border }]}
                onPress={() => setResetModalVisible(false)}
                disabled={isResetting}
              >
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>{t('common.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.resetModalBtn,
                  { backgroundColor: colors.danger || '#F44336' },
                  (resetCountdown > 0 || isResetting) && { opacity: 0.5 }
                ]}
                onPress={handleConfirmReset}
                disabled={resetCountdown > 0 || isResetting}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>
                  {isResetting ? '...' : resetCountdown > 0 ? `${t('settings.permanentDelete')} (${resetCountdown}s)` : t('settings.permanentDelete')}
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
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    marginLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itemTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 13,
  },
  infoSection: {
    marginTop: 32,
    alignItems: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
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
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  // Reset Modal
  resetModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 24,
  },
  resetModalContent: {
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
  resetWarningIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resetModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  resetModalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 10,
    width: '100%',
  },
});
