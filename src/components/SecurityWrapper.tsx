import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, AppState, Text, TouchableOpacity } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Typography } from '../theme/typography';
import { useTranslation } from 'react-i18next';

export const SECURITY_STORAGE_KEY = '@dompetku_app_locked';

export const SecurityWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  // Bug Fix #1: Default isLocked ke true agar konten tidak flash sebelum pengecekan selesai
  const [isLocked, setIsLocked] = useState(true);
  const [isSecurityEnabled, setIsSecurityEnabled] = useState(false);
  // Bug Fix #3: Track jika device tidak punya biometrik agar tidak silent unlock
  const [noBiometric, setNoBiometric] = useState(false);
  const { colors } = useTheme();
  const { t } = useTranslation();
  const appState = useRef(AppState.currentState);
  const backgroundTimestamp = useRef<number | null>(null);

  // Mencegah multiple prompt saat dialog biometrik muncul (karena bisa mengubah AppState)
  const isPrompting = useRef(false);
  // Bug Fix #4: Gunakan ref untuk isLocked agar tidak stale di AppState listener
  const isLockedRef = useRef(true);

  // Sync ref setiap kali state berubah
  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  useEffect(() => {
    checkInitialSecurity();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        checkSecurityOnResume();
      } else if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        backgroundTimestamp.current = Date.now();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const checkInitialSecurity = async () => {
    try {
      const lockedStr = await AsyncStorage.getItem(SECURITY_STORAGE_KEY);
      const securityOn = lockedStr === 'true';
      setIsSecurityEnabled(securityOn);

      if (securityOn) {
        setIsLocked(true);
        isLockedRef.current = true;
        authenticate();
      } else {
        // Keamanan tidak aktif, langsung buka
        setIsLocked(false);
        isLockedRef.current = false;
      }
    } catch (e) {
      console.error(e);
      // Kalau error baca storage, tetap locked untuk keamanan
      setIsLocked(true);
      isLockedRef.current = true;
    } finally {
      setIsChecking(false);
    }
  };

  const checkSecurityOnResume = async () => {
    if (isPrompting.current) return;

    // Check grace period (1 minute)
    const GRACE_PERIOD_MS = 60 * 1000;
    if (backgroundTimestamp.current && !isLockedRef.current) {
      const timeElapsed = Date.now() - backgroundTimestamp.current;
      if (timeElapsed < GRACE_PERIOD_MS) {
        backgroundTimestamp.current = null;
        return;
      }
    }
    backgroundTimestamp.current = null;

    try {
      const lockedStr = await AsyncStorage.getItem(SECURITY_STORAGE_KEY);
      // Bug Fix #4: Gunakan isLockedRef.current, bukan isLocked (stale closure)
      if (lockedStr === 'true' && !isLockedRef.current) {
        setIsLocked(true);
        isLockedRef.current = true;
        authenticate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const authenticate = useCallback(async () => {
    if (isPrompting.current) return;
    try {
      isPrompting.current = true;
      setNoBiometric(false);

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      // Bug Fix #3: Jangan silent unlock jika tidak ada biometrik — tetap locked
      if (!hasHardware || !isEnrolled) {
        setNoBiometric(true);
        isPrompting.current = false;
        // TETAP locked — user harus setup biometrik/PIN di pengaturan HP
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('security.promptMessage'),
        fallbackLabel: t('security.fallbackLabel'),
        cancelLabel: t('common.cancel'),
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsLocked(false);
        isLockedRef.current = false;
      }
    } catch (error) {
      console.error('Authentication Error:', error);
    } finally {
      // Delay resetting the prompting flag to allow AppState to settle
      setTimeout(() => {
        isPrompting.current = false;
      }, 500);
    }
  }, []);

  // Saat masih checking, tampilkan layar kosong (match background color)
  if (isChecking) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  // Bug Fix #2: JANGAN render children saat locked — gunakan conditional rendering, bukan Modal overlay
  if (isLocked) {
    return (
      <View style={[styles.lockedContainer, { backgroundColor: colors.background }]}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="shield-lock-outline" size={80} color={colors.primary} />
        </View>
        <Text style={[Typography.h2, { color: colors.text, marginBottom: 8 }]}>{t('security.lockedTitle')}</Text>
        <Text style={[Typography.body, { color: colors.textSecondary, marginBottom: 40, textAlign: 'center' }]}>
          {t('security.lockedDesc')}
        </Text>

        {/* Bug Fix #3: Pesan jika device tidak punya biometrik */}
        {noBiometric && (
          <View style={[styles.warningBox, { backgroundColor: colors.surface, borderColor: colors.warning || '#FFA500' }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.warning || '#FFA500'} style={{ marginRight: 8 }} />
            <Text style={[Typography.caption, { color: colors.textSecondary, flex: 1 }]}>
              {t('security.noBiometric')}
            </Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={[styles.unlockButton, { backgroundColor: colors.primary }]}
          onPress={authenticate}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="fingerprint" size={24} color="#fff" style={{ marginRight: 8 }} />
          <Text style={[Typography.button, { color: '#fff' }]}>{t('security.unlock')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Keamanan tidak aktif atau sudah terautentikasi — render children
  return <>{children}</>;
};

const styles = StyleSheet.create({
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    marginHorizontal: 8,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  }
});
