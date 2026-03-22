import { executeSql, fetchAll, fetchOne } from '../db';
import { Budget } from '../../types';

export const budgetRepo = {
  // Get all budgets for a specific month with actual spent amounts
  getByMonth: async (month: number, year: number): Promise<Budget[]> => {
    const monthStr = month.toString().padStart(2, '0');
    const datePrefix = `${year}-${monthStr}-`;
    const targetVal = year * 12 + month;
    
    // This query joins budgets with categories and calculates the spent amount
    // SQLite's MAX inside a GROUP BY ensures returning columns belonging to the max row
    const query = `
      SELECT 
        b.id, b.category_id, b.amount, b.month, b.year,
        c.name as category_name, c.icon as category_icon, c.color as category_color,
        COALESCE(
          (SELECT SUM(amount) 
           FROM transactions t 
           WHERE t.category_id = b.category_id 
             AND t.date LIKE ?), 
          0
        ) as spent,
        MAX(b.year * 12 + b.month) as max_val
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE (b.year * 12 + b.month) <= ?
      GROUP BY b.category_id
      ORDER BY spent DESC, b.amount DESC
    `;
    
    return await fetchAll<Budget>(query, [`%${datePrefix}%`, targetVal]);
  },

  getById: async (id: number): Promise<Budget | null> => {
    return await fetchOne<Budget>('SELECT * FROM budgets WHERE id = ?', [id]);
  },

  createOrUpdate: async (budget: Omit<Budget, 'id' | 'spent' | 'category_name' | 'category_icon' | 'category_color'>): Promise<boolean> => {
    // Check if it exists
    const existing = await fetchOne<Budget>(
      'SELECT id FROM budgets WHERE category_id = ? AND month = ? AND year = ?',
      [budget.category_id, budget.month, budget.year]
    );

    if (existing) {
      // Update
      const result = await executeSql(
        'UPDATE budgets SET amount = ? WHERE id = ?',
        [budget.amount, existing.id]
      );
      return result.changes > 0;
    } else {
      // Insert
      const result = await executeSql(
        'INSERT INTO budgets (category_id, amount, month, year) VALUES (?, ?, ?, ?)',
        [budget.category_id, budget.amount, budget.month, budget.year]
      );
      return result.changes > 0;
    }
  },

  delete: async (id: number): Promise<boolean> => {
    const result = await executeSql('DELETE FROM budgets WHERE id = ?', [id]);
    return result.changes > 0;
  }
};
