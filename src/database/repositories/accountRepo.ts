import { executeSql, fetchAll, fetchOne } from '../db';
import { Account, AccountType } from '../../types';

export const accountRepo = {
  getAll: async (type?: AccountType): Promise<Account[]> => {
    if (type) {
      return await fetchAll<Account>(
        'SELECT * FROM accounts WHERE type = ? ORDER BY is_default DESC, name ASC',
        [type]
      );
    }
    return await fetchAll<Account>('SELECT * FROM accounts ORDER BY is_default DESC, name ASC');
  },

  getById: async (id: number): Promise<Account | null> => {
    return await fetchOne<Account>('SELECT * FROM accounts WHERE id = ?', [id]);
  },

  create: async (account: Omit<Account, 'id' | 'is_default' | 'balance'> & { balance?: number }): Promise<number> => {
    const result = await executeSql(
      'INSERT INTO accounts (name, type, icon, color, balance, is_default) VALUES (?, ?, ?, ?, ?, 0)',
      [account.name, account.type, account.icon, account.color, account.balance || 0]
    );
    return result.lastInsertRowId;
  },

  update: async (id: number, account: Partial<Omit<Account, 'id' | 'is_default' | 'balance'>>): Promise<boolean> => {
    const fields: string[] = [];
    const values: any[] = [];

    if (account.name) {
      fields.push('name = ?');
      values.push(account.name);
    }
    if (account.type) {
      fields.push('type = ?');
      values.push(account.type);
    }
    if (account.icon) {
      fields.push('icon = ?');
      values.push(account.icon);
    }
    if (account.color) {
      fields.push('color = ?');
      values.push(account.color);
    }

    if (fields.length === 0) return false;

    values.push(id);
    const result = await executeSql(
      `UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.changes > 0;
  },

  updateBalance: async (id: number, amountChange: number): Promise<boolean> => {
    const result = await executeSql(
      'UPDATE accounts SET balance = balance + ? WHERE id = ?',
      [amountChange, id]
    );
    return result.changes > 0;
  },

  setDefault: async (id: number): Promise<boolean> => {
    await executeSql('UPDATE accounts SET is_default = 0');
    const result = await executeSql('UPDATE accounts SET is_default = 1 WHERE id = ?', [id]);
    return result.changes > 0;
  },

  delete: async (id: number): Promise<boolean> => {
    // Cascade-delete all transactions associated with this account first
    await executeSql('DELETE FROM transactions WHERE account_id = ?', [id]);

    const result = await executeSql('DELETE FROM accounts WHERE id = ?', [id]);
    return result.changes > 0;
  }
};
