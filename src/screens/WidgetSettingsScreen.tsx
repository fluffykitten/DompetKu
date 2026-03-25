import React from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { Typography } from '../theme/typography';
import { useWidgetStore } from '../store/useWidgetStore';

export const WidgetSettingsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { showQuickActions, showRecentTransactions, showTotalBalance, setPreference } = useWidgetStore();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[Typography.h2, { color: colors.text }]}>{t('widget.settingsTitle')}</Text>
        <Text style={[Typography.body, { color: colors.textSecondary }]}>{t('widget.settingsDesc')}</Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <View style={[styles.settingRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
          <View style={styles.settingText}>
            <Text style={[Typography.body, { color: colors.text }]}>{t('widget.showQuickActions')}</Text>
            <Text style={[Typography.caption, { color: colors.textSecondary }]}>{t('widget.showQuickActionsDesc')}</Text>
          </View>
          <Switch
            value={showQuickActions}
            onValueChange={(val) => setPreference('showQuickActions', val)}
            trackColor={{ false: colors.border, true: colors.primary + '80' }}
            thumbColor={showQuickActions ? colors.primary : colors.textSecondary}
          />
        </View>

        <View style={[styles.settingRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
          <View style={styles.settingText}>
            <Text style={[Typography.body, { color: colors.text }]}>{t('widget.showBalance')}</Text>
            <Text style={[Typography.caption, { color: colors.textSecondary }]}>{t('widget.showBalanceDesc')}</Text>
          </View>
          <Switch
            value={showTotalBalance}
            onValueChange={(val) => setPreference('showTotalBalance', val)}
            trackColor={{ false: colors.border, true: colors.primary + '80' }}
            thumbColor={showTotalBalance ? colors.primary : colors.textSecondary}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingText}>
            <Text style={[Typography.body, { color: colors.text }]}>{t('widget.showRecentTx')}</Text>
            <Text style={[Typography.caption, { color: colors.textSecondary }]}>{t('widget.showRecentTxDesc')}</Text>
          </View>
          <Switch
            value={showRecentTransactions}
            onValueChange={(val) => setPreference('showRecentTransactions', val)}
            trackColor={{ false: colors.border, true: colors.primary + '80' }}
            thumbColor={showRecentTransactions ? colors.primary : colors.textSecondary}
          />
        </View>
      </View>
      
      <View style={styles.infoBox}>
        <Text style={[Typography.bodySmall, { color: colors.textSecondary }]}>
          {t('widget.note')}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  section: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  settingText: {
    flex: 1,
    paddingRight: 16,
  },
  infoBox: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  }
});
