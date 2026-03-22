import { executeSql, fetchOne } from './db';

// DB versioning
const DB_VERSION = 1;

export const initDb = async (): Promise<void> => {
  console.log('Initializing database...');
  
  // Create settings table
  await executeSql(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Create accounts table
  await executeSql(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      balance REAL DEFAULT 0,
      is_default INTEGER DEFAULT 0
    );
  `);

  // Create categories table
  await executeSql(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      type TEXT NOT NULL,
      is_default INTEGER DEFAULT 0
    );
  `);

  // Create transactions table
  await executeSql(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      category_id INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories (id),
      FOREIGN KEY (account_id) REFERENCES accounts (id)
    );
  `);

  // Create budgets table
  await executeSql(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories (id),
      UNIQUE(category_id, month, year)
    );
  `);

  // Create quick_buttons table
  await executeSql(`
    CREATE TABLE IF NOT EXISTS quick_buttons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (category_id) REFERENCES categories (id)
    );
  `);
  
  await runMigrations();
  await seedInitialData();
  
  console.log('Database initialized successfully');
};

const runMigrations = async (): Promise<void> => {
  // Cleanup duplicate data from previous bug (seed check was broken)
  await cleanupDuplicates();
  // Ensure that balances in accounts perfectly mirror the sums of all related transactions
  await recalculateBalances();
};

const recalculateBalances = async (): Promise<void> => {
  await executeSql(`
    UPDATE accounts 
    SET balance = (
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
      FROM transactions 
      WHERE account_id = accounts.id
    )
  `);
};

// Remove duplicate rows, keeping the one with the smallest id
const cleanupDuplicates = async (): Promise<void> => {
  // Deduplicate accounts by name+type  
  await executeSql(`
    DELETE FROM accounts 
    WHERE id NOT IN (
      SELECT MIN(id) FROM accounts GROUP BY name, type
    )
  `);
  
  // Deduplicate categories by name+type
  await executeSql(`
    DELETE FROM categories
    WHERE id NOT IN (
      SELECT MIN(id) FROM categories GROUP BY name, type
    )
  `);
};

const seedInitialData = async (): Promise<void> => {
  // Correctly check if accounts already exist using fetchOne with COUNT
  const accountCount = await fetchOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM accounts'
  );
  
  // Only seed if no accounts exist yet
  if (!accountCount || accountCount.count === 0) {
    // Seed Accounts
    await executeSql(`INSERT INTO accounts (name, type, icon, color, balance, is_default) VALUES 
      ('Tunai', 'cash', 'cash', '#10B981', 0, 1),
      ('BCA', 'bank', 'bank', '#3B82F6', 0, 0),
      ('GoPay', 'ewallet', 'wallet', '#00AED6', 0, 0)
    `);

    // Seed Categories - Income
    const incomeCategories = [
      { name: 'Gaji', icon: 'cash-multiple', color: '#00C897' },
      { name: 'Freelance', icon: 'laptop', color: '#3B82F6' },
      { name: 'Investasi', icon: 'chart-line', color: '#8B5CF6' },
      { name: 'Bonus', icon: 'gift', color: '#F59E0B' },
      { name: 'Lainnya', icon: 'dots-horizontal', color: '#6B7280' },
    ];
    
    for (const cat of incomeCategories) {
      await executeSql(
        `INSERT INTO categories (name, icon, color, type, is_default) VALUES (?, ?, ?, 'income', 1)`,
        [cat.name, cat.icon, cat.color]
      );
    }

    // Seed Categories - Expense
    const expenseCategories = [
      { name: 'Makanan', icon: 'food', color: '#FF6B6B' },
      { name: 'Transport', icon: 'car', color: '#F59E0B' },
      { name: 'Belanja', icon: 'shopping', color: '#EC4899' },
      { name: 'Tagihan', icon: 'receipt', color: '#8B5CF6' },
      { name: 'Hiburan', icon: 'gamepad-variant', color: '#3B82F6' },
      { name: 'Kesehatan', icon: 'medical-bag', color: '#10B981' },
      { name: 'Pendidikan', icon: 'school', color: '#6366F1' },
      { name: 'Lainnya', icon: 'dots-horizontal', color: '#6B7280' },
    ];

    for (const cat of expenseCategories) {
      await executeSql(
        `INSERT INTO categories (name, icon, color, type, is_default) VALUES (?, ?, ?, 'expense', 1)`,
        [cat.name, cat.icon, cat.color]
      );
    }

    // Seed Default Settings
    await executeSql(`INSERT OR REPLACE INTO settings (key, value) VALUES ('currency', 'IDR')`);
    await executeSql(`INSERT OR REPLACE INTO settings (key, value) VALUES ('theme', 'system')`);
    await executeSql(`INSERT OR REPLACE INTO settings (key, value) VALUES ('version', ?)`, [DB_VERSION.toString()]);
    
    console.log('Initial data seeded successfully');
  }
};

// Export for use in Settings reset button
export const resetAllData = async (): Promise<void> => {
  console.log('Resetting all data...');
  // Drop and recreate tables (cleanest reset)
  await executeSql('DELETE FROM quick_buttons');
  await executeSql('DELETE FROM budgets');
  await executeSql('DELETE FROM transactions');
  await executeSql('DELETE FROM categories');
  await executeSql('DELETE FROM accounts');
  await executeSql('DELETE FROM settings');
  
  // Reset auto-increment counters
  await executeSql("DELETE FROM sqlite_sequence WHERE name IN ('accounts','categories','transactions','budgets','quick_buttons')");
  
  // Re-seed fresh data
  await seedInitialData();
  console.log('App data has been reset.');
};

