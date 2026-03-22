import { useState, useCallback, useEffect } from 'react';
import { executeSql, fetchAll, fetchOne } from '../database/db';
import { CategoryStats, MonthlyStats, AccountStats } from '../types';

export const useStatistics = (month: number, year: number, accountId?: number, categoryId?: number) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expenseByCategory, setExpenseByCategory] = useState<CategoryStats[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyStats[]>([]);
  const [dailyTrend, setDailyTrend] = useState<{day: string, amount: number}[]>([]);
  const [accountBalances, setAccountBalances] = useState<AccountStats[]>([]);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const monthStr = month.toString().padStart(2, '0');
      const datePrefix = `${year}-${monthStr}-`;
      
      const args: any[] = [`%${datePrefix}%`];
      let accountFilter = '';
      if (accountId) {
        accountFilter = ' AND t.account_id = ?';
        args.push(accountId);
      }

      let categoryFilter = '';
      if (categoryId) {
        categoryFilter = ' AND t.category_id = ?';
        args.push(categoryId);
      }

      // 1. Fetch Expenses Breakdown by Category
      const expenseCatQuery = `
        SELECT 
          c.id as category_id, c.name as category_name, c.icon as category_icon, c.color as category_color,
          SUM(t.amount) as total
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.type = 'expense' AND t.date LIKE ? ${accountFilter} ${categoryFilter}
        GROUP BY c.id
        ORDER BY total DESC
      `;
      const catStats = await fetchAll<any>(expenseCatQuery, args);
      
      // Calculate percentages
      const totalExpense = catStats.reduce((sum, item) => sum + item.total, 0);
      const statsWithPercent: CategoryStats[] = catStats.map(item => ({
        ...item,
        percentage: totalExpense > 0 ? (item.total / totalExpense) * 100 : 0
      }));
      setExpenseByCategory(statsWithPercent);

      // 2. Fetch Last 6 Months Trend
      // Need a bit of logic to generate the last 6 months list easily in SQLite
      const trendData: MonthlyStats[] = [];
      let iterMonth = month;
      let iterYear = year;
      
      for (let i = 0; i < 6; i++) {
        const iterMonthStr = iterMonth.toString().padStart(2, '0');
        const iterPrefix = `${iterYear}-${iterMonthStr}-`;
        const trendArgs: any[] = [`%${iterPrefix}%`];
        let trendAccountFilter = accountFilter;
        let trendCategoryFilter = categoryFilter;
        if (accountId) { trendArgs.push(accountId); }
        if (categoryId) { trendArgs.push(categoryId); }

        const trendQuery = `
          SELECT 
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
          FROM transactions t
          WHERE date LIKE ? ${trendAccountFilter} ${trendCategoryFilter}
        `;
        const res = await fetchOne<{income: number, expense: number}>(trendQuery, trendArgs);
        
        trendData.unshift({
          month: iterMonth,
          year: iterYear,
          income: res?.income || 0,
          expense: res?.expense || 0
        });

        iterMonth--;
        if (iterMonth === 0) {
          iterMonth = 12;
          iterYear--;
        }
      }
      setMonthlyTrend(trendData);

      // Menggunakan fallback substr jika strftime fail (seperti di format iOS ISO string)
      let dailyQuery = `
        SELECT substr(date, 9, 2) as day, SUM(amount) as amount 
        FROM transactions 
        WHERE date LIKE ? AND type = 'expense'
      `;
      const dailyArgs: any[] = [`%${datePrefix}%`];
      
      if (accountId) {
        dailyQuery += ` AND account_id = ?`;
        dailyArgs.push(accountId);
      }
      if (categoryId) {
        dailyQuery += ` AND category_id = ?`;
        dailyArgs.push(categoryId);
      }
      dailyQuery += ` GROUP BY substr(date, 9, 2) ORDER BY day ASC`;

      const dailyRes = await fetchAll<{day: string, amount: number}>(dailyQuery, dailyArgs);
      // To make a complete line chart, we should ideally fill missing days with 0
      setDailyTrend(dailyRes);

      // 4. Fetch Account Balance Comparisons
      let categorySubFilter = '';
      const accArgs: any[] = [`%${datePrefix}%`];
      if (categoryId) {
        categorySubFilter = ' AND category_id = ?';
        accArgs.push(categoryId);
      }
      accArgs.push(`%${datePrefix}%`);
      if (categoryId) {
        accArgs.push(categoryId);
      }

      const accountQuery = `
        SELECT 
          a.id as account_id, a.name as account_name, a.type as account_type, 
          a.icon as account_icon, a.color as account_color, a.balance,
          (SELECT SUM(amount) FROM transactions WHERE account_id = a.id AND type = 'income' AND date LIKE ? ${categorySubFilter}) as income,
          (SELECT SUM(amount) FROM transactions WHERE account_id = a.id AND type = 'expense' AND date LIKE ? ${categorySubFilter}) as expense
        FROM accounts a
        ORDER BY a.balance DESC
      `;
      const accStats = await fetchAll<AccountStats>(accountQuery, accArgs);
      setAccountBalances(accStats);

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [month, year, accountId, categoryId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    expenseByCategory,
    monthlyTrend,
    dailyTrend,
    accountBalances,
    loading,
    error,
    refreshStats: fetchStats
  };
};
