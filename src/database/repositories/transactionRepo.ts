import { executeSql, fetchAll, fetchOne } from '../db';
import { Transaction, TransactionType } from '../../types';
import { accountRepo } from './accountRepo';

export const transactionRepo = {
  // Get all with joins for displaying in list
  getAll: async (limit: number = 50, offset: number = 0, accountId?: number): Promise<Transaction[]> => {
    let query = `
      SELECT t.*, 
             c.name as category_name, c.icon as category_icon, c.color as category_color,
             a.name as account_name, a.icon as account_icon, a.color as account_color
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      JOIN accounts a ON t.account_id = a.id
    `;
    
    const args: any[] = [];
    
    if (accountId) {
      query += ` WHERE t.account_id = ? `;
      args.push(accountId);
    }
    
    query += ` ORDER BY t.date DESC, t.id DESC LIMIT ? OFFSET ?`;
    args.push(limit, offset);
    
    return await fetchAll<Transaction>(query, args);
  },

  getRecent: async (limit: number = 5, accountId?: number): Promise<Transaction[]> => {
    return await transactionRepo.getAll(limit, 0, accountId);
  },

  getById: async (id: number): Promise<Transaction | null> => {
    return await fetchOne<Transaction>(`
      SELECT t.*, 
             c.name as category_name, c.icon as category_icon, c.color as category_color,
             a.name as account_name, a.icon as account_icon, a.color as account_color
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      JOIN accounts a ON t.account_id = a.id
      WHERE t.id = ?
    `, [id]);
  },

  create: async (transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<number> => {
    const now = new Date().toISOString();
    
    // Begin transaction (conceptual, not actual DB transaction yet)
    
    // 1. Insert the record
    const result = await executeSql(
      'INSERT INTO transactions (type, amount, category_id, account_id, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        transaction.type, 
        transaction.amount, 
        transaction.category_id, 
        transaction.account_id,
        transaction.date, 
        transaction.note || '', 
        now
      ]
    );
    
    const insertId = result.lastInsertRowId;
    
    // 2. Update the account balance
    const amountChange = transaction.type === 'income' ? transaction.amount : -transaction.amount;
    await accountRepo.updateBalance(transaction.account_id, amountChange);
    
    return insertId;
  },

  delete: async (id: number): Promise<boolean> => {
    const tx = await transactionRepo.getById(id);
    if (!tx) return false;
    
    // 1. Reverse the account balance impact
    const amountChange = tx.type === 'income' ? -tx.amount : tx.amount;
    await accountRepo.updateBalance(tx.account_id, amountChange);
    
    // 2. Delete the record
    const result = await executeSql('DELETE FROM transactions WHERE id = ?', [id]);
    return result.changes > 0;
  },

  update: async (id: number, data: Partial<Omit<Transaction, 'id' | 'created_at'>>): Promise<boolean> => {
    const existing = await transactionRepo.getById(id);
    if (!existing) return false;

    // 1. Reverse previous balance
    const prevChange = existing.type === 'income' ? -existing.amount : existing.amount;
    await accountRepo.updateBalance(existing.account_id, prevChange);

    // 2. Prepare update data
    const updated = { ...existing, ...data };
    
    // 3. Update DB
    const result = await executeSql(
      'UPDATE transactions SET type = ?, amount = ?, category_id = ?, account_id = ?, date = ?, note = ? WHERE id = ?',
      [
        updated.type, 
        updated.amount, 
        updated.category_id, 
        updated.account_id,
        updated.date, 
        updated.note || '', 
        id
      ]
    );

    // 4. Apply new balance
    const newChange = updated.type === 'income' ? updated.amount : -updated.amount;
    await accountRepo.updateBalance(updated.account_id, newChange);

    return result.changes > 0;
  },

  // Get total by type for a specific month and year, optionally bounded by account
  getTotalByMonth: async (
    type: TransactionType, 
    month: number, 
    year: number,
    accountId?: number
  ): Promise<number> => {
    const monthStr = month.toString().padStart(2, '0');
    const datePrefix = `${year}-${monthStr}-`;
    
    let query = `
      SELECT SUM(amount) as total 
      FROM transactions 
      WHERE type = ? AND date LIKE ?
    `;
    // Gunakan wildcard persen di awal dan akhir untuk lebih robust
    const args: any[] = [type, `%${datePrefix}%`];
    
    if (accountId) {
      query += ` AND account_id = ?`;
      args.push(accountId);
    }
    
    const result = await fetchOne<{total: number}>(query, args);
    return result?.total || 0;
  },

  // Transfer between accounts (no transaction records - just balance update)
  transfer: async (
    fromAccountId: number,
    toAccountId: number,
    amount: number,
  ): Promise<boolean> => {
    // Deduct from source account
    await accountRepo.updateBalance(fromAccountId, -amount);
    // Credit to destination account
    await accountRepo.updateBalance(toAccountId, amount);
    return true;
  }
};
