import { executeSql, fetchAll, fetchOne } from '../db';
import { Category, TransactionType } from '../../types';

export const categoryRepo = {
  getAll: async (type?: TransactionType): Promise<Category[]> => {
    if (type) {
      return await fetchAll<Category>(
        'SELECT * FROM categories WHERE type = ? ORDER BY name ASC',
        [type]
      );
    }
    return await fetchAll<Category>('SELECT * FROM categories ORDER BY name ASC');
  },

  getById: async (id: number): Promise<Category | null> => {
    return await fetchOne<Category>('SELECT * FROM categories WHERE id = ?', [id]);
  },

  create: async (category: Omit<Category, 'id' | 'is_default'>): Promise<number> => {
    const result = await executeSql(
      'INSERT INTO categories (name, icon, color, type, is_default) VALUES (?, ?, ?, ?, 0)',
      [category.name, category.icon, category.color, category.type]
    );
    return result.lastInsertRowId;
  },

  update: async (id: number, category: Partial<Category>): Promise<boolean> => {
    const fields: string[] = [];
    const values: any[] = [];

    if (category.name) {
      fields.push('name = ?');
      values.push(category.name);
    }
    if (category.icon) {
      fields.push('icon = ?');
      values.push(category.icon);
    }
    if (category.color) {
      fields.push('color = ?');
      values.push(category.color);
    }

    if (fields.length === 0) return false;

    values.push(id);
    const result = await executeSql(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = ? AND is_default = 0`,
      values
    );
    return result.changes > 0;
  },

  delete: async (id: number): Promise<boolean> => {
    // Check if it's used in transactions
    const countResult = await fetchOne<{count: number}>(
      'SELECT count(*) as count FROM transactions WHERE category_id = ?', 
      [id]
    );
    
    if (countResult && countResult.count > 0) {
      throw new Error('Cannot delete category: it is used in existing transactions');
    }

    const result = await executeSql('DELETE FROM categories WHERE id = ? AND is_default = 0', [id]);
    return result.changes > 0;
  }
};
