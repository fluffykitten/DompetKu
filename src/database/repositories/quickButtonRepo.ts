import { executeSql, fetchAll, fetchOne } from '../db';
import { QuickButton } from '../../types';

export const quickButtonRepo = {
  // Get all with category and account details
  getAll: async (): Promise<QuickButton[]> => {
    return await fetchAll<QuickButton>(`
      SELECT qb.*, c.name as category_name
      FROM quick_buttons qb
      JOIN categories c ON qb.category_id = c.id
      ORDER BY qb.sort_order ASC, qb.name ASC
    `);
  },

  getById: async (id: number): Promise<QuickButton | null> => {
    return await fetchOne<QuickButton>('SELECT * FROM quick_buttons WHERE id = ?', [id]);
  },

  create: async (button: Omit<QuickButton, 'id' | 'sort_order' | 'category_name'>): Promise<number> => {
    // Get max sort_order
    const maxSort = await fetchOne<{max: number}>('SELECT MAX(sort_order) as max FROM quick_buttons');
    const newSortOrder = (maxSort?.max || 0) + 1;

    const result = await executeSql(
      'INSERT INTO quick_buttons (name, amount, type, category_id, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [button.name, button.amount, button.type, button.category_id, button.icon, button.color, newSortOrder]
    );
    return result.lastInsertRowId;
  },

  update: async (id: number, button: Partial<Omit<QuickButton, 'id' | 'sort_order' | 'category_name'>>): Promise<boolean> => {
    const fields: string[] = [];
    const values: any[] = [];

    if (button.name !== undefined) { fields.push('name = ?'); values.push(button.name); }
    if (button.amount !== undefined) { fields.push('amount = ?'); values.push(button.amount); }
    if (button.type !== undefined) { fields.push('type = ?'); values.push(button.type); }
    if (button.category_id !== undefined) { fields.push('category_id = ?'); values.push(button.category_id); }
    if (button.icon !== undefined) { fields.push('icon = ?'); values.push(button.icon); }
    if (button.color !== undefined) { fields.push('color = ?'); values.push(button.color); }

    if (fields.length === 0) return false;

    values.push(id);
    const result = await executeSql(
      `UPDATE quick_buttons SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.changes > 0;
  },

  delete: async (id: number): Promise<boolean> => {
    const result = await executeSql('DELETE FROM quick_buttons WHERE id = ?', [id]);
    return result.changes > 0;
  },
  
  // Useful for drag and drop reordering
  updateSortOrder: async (items: {id: number, sort_order: number}[]): Promise<void> => {
    for (const item of items) {
      await executeSql('UPDATE quick_buttons SET sort_order = ? WHERE id = ?', [item.sort_order, item.id]);
    }
  }
};
