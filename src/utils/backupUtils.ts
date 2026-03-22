import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import i18n from '../i18n';

import { fetchAll, executeSql } from '../database/db';
import { initDb } from '../database/migrations';

// ============================================================
// Backup & Restore Utilities
// ============================================================

interface BackupData {
  version: number;
  createdAt: string;
  app: string;
  tables: {
    accounts: any[];
    categories: any[];
    transactions: any[];
    budgets: any[];
    quick_buttons: any[];
    settings: any[];
  };
}

const BACKUP_VERSION = 1;

/**
 * Export seluruh data database ke file JSON dan share
 */
export const backupData = async (): Promise<boolean> => {
  try {
    // Query semua data dari setiap tabel
    const accounts = await fetchAll('SELECT * FROM accounts');
    const categories = await fetchAll('SELECT * FROM categories');
    const transactions = await fetchAll('SELECT * FROM transactions');
    const budgets = await fetchAll('SELECT * FROM budgets');
    const quickButtons = await fetchAll('SELECT * FROM quick_buttons');
    const settings = await fetchAll('SELECT * FROM settings');

    const backup: BackupData = {
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      app: 'DompetKu',
      tables: {
        accounts,
        categories,
        transactions,
        budgets,
        quick_buttons: quickButtons,
        settings,
      },
    };

    const jsonStr = JSON.stringify(backup, null, 2);

    // Tulis file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `DompetKu_Backup_${timestamp}.json`;
    const file = new File(Paths.cache, fileName);
    file.write(jsonStr);

    // Share
    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (isSharingAvailable) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: i18n.t('settings.backupData', {defaultValue: 'Simpan Backup DompetKu'}),
      });
    } else {
      Alert.alert(i18n.t('common.success'), i18n.t('settings.backupDataDesc', {defaultValue: 'File backup berhasil dibuat.'}));
    }

    return true;
  } catch (error) {
    console.error('Backup Error:', error);
    Alert.alert(i18n.t('common.error'), i18n.t('settings.backupDataDesc') + ': ' + String(error));
    return false;
  }
};

/**
 * Restore data dari file JSON backup
 */
export const restoreData = async (): Promise<boolean> => {
  try {
    // Buka file picker
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return false;
    }

    const asset = result.assets[0];
    
    // Baca file
    const file = new File(asset.uri);
    const jsonStr = await file.text();

    // Parse & validasi
    let backup: BackupData;
    try {
      backup = JSON.parse(jsonStr);
    } catch {
      Alert.alert(i18n.t('common.error'), i18n.t('common.error'));
      return false;
    }

    // Validasi struktur
    if (!backup.app || backup.app !== 'DompetKu' || !backup.tables) {
      Alert.alert(i18n.t('common.error'), i18n.t('common.error'));
      return false;
    }

    if (!backup.tables.accounts || !backup.tables.categories || !backup.tables.transactions) {
      Alert.alert(i18n.t('common.error'), i18n.t('common.error'));
      return false;
    }

    // Konfirmasi user
    return new Promise((resolve) => {
      const backupDate = backup.createdAt
        ? new Date(backup.createdAt).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })
        : 'tidak diketahui';

      const totalTx = backup.tables.transactions?.length || 0;
      const totalAcc = backup.tables.accounts?.length || 0;

      Alert.alert(
        i18n.t('settings.restoreData'),
        `Backup dari: ${backupDate}\n\n` +
        `• ${totalAcc} ${i18n.t('common.account')}\n` +
        `• ${totalTx} ${i18n.t('transactions.title', {defaultValue: 'Transaksi'})}\n\n` +
        `⚠️ ${i18n.t('settings.resetConfirmWarning')}`,
        [
          { text: i18n.t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
          {
            text: i18n.t('common.yes', {defaultValue: 'Ya'}),
            style: 'destructive',
            onPress: async () => {
              try {
                await performRestore(backup);
                Alert.alert(i18n.t('common.success'), i18n.t('common.success'));
                resolve(true);
              } catch (err) {
                console.error('Restore Error:', err);
                Alert.alert(i18n.t('common.error'), String(err));
                resolve(false);
              }
            },
          },
        ]
      );
    });
  } catch (error) {
    console.error('Restore Error:', error);
    Alert.alert(i18n.t('common.error'), String(error));
    return false;
  }
};

/**
 * Lakukan restore data dari backup object (internal)
 */
const performRestore = async (backup: BackupData): Promise<void> => {
  // 1. Hapus semua data lama
  await executeSql('DELETE FROM quick_buttons');
  await executeSql('DELETE FROM budgets');
  await executeSql('DELETE FROM transactions');
  await executeSql('DELETE FROM categories');
  await executeSql('DELETE FROM accounts');
  await executeSql('DELETE FROM settings');

  // Reset auto-increment
  await executeSql("DELETE FROM sqlite_sequence WHERE name IN ('accounts','categories','transactions','budgets','quick_buttons')");

  // 2. Insert data dari backup
  // Accounts
  for (const acc of backup.tables.accounts) {
    await executeSql(
      `INSERT INTO accounts (id, name, type, icon, color, balance, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [acc.id, acc.name, acc.type, acc.icon, acc.color, acc.balance, acc.is_default]
    );
  }

  // Categories
  for (const cat of backup.tables.categories) {
    await executeSql(
      `INSERT INTO categories (id, name, icon, color, type, is_default) VALUES (?, ?, ?, ?, ?, ?)`,
      [cat.id, cat.name, cat.icon, cat.color, cat.type, cat.is_default]
    );
  }

  // Transactions
  for (const tx of backup.tables.transactions) {
    await executeSql(
      `INSERT INTO transactions (id, type, amount, category_id, account_id, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [tx.id, tx.type, tx.amount, tx.category_id, tx.account_id, tx.date, tx.note, tx.created_at]
    );
  }

  // Budgets
  if (backup.tables.budgets) {
    for (const b of backup.tables.budgets) {
      await executeSql(
        `INSERT INTO budgets (id, category_id, amount, month, year) VALUES (?, ?, ?, ?, ?)`,
        [b.id, b.category_id, b.amount, b.month, b.year]
      );
    }
  }

  // Quick buttons
  if (backup.tables.quick_buttons) {
    for (const qb of backup.tables.quick_buttons) {
      await executeSql(
        `INSERT INTO quick_buttons (id, name, amount, type, category_id, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [qb.id, qb.name, qb.amount, qb.type, qb.category_id, qb.icon, qb.color, qb.sort_order]
      );
    }
  }

  // Settings
  if (backup.tables.settings) {
    for (const s of backup.tables.settings) {
      await executeSql(
        `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
        [s.key, s.value]
      );
    }
  }
};
