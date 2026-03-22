import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';
import { CurrencySetting, defaultCurrency } from '../context/CurrencyContext';

import { transactionRepo } from '../database/repositories/transactionRepo';
import { accountRepo } from '../database/repositories/accountRepo';
import { budgetRepo } from '../database/repositories/budgetRepo';
import { fetchAll, fetchOne } from '../database/db';

// ============================================================
// Helpers
// ============================================================

const PCT_FMT = '0.0%';

const getCurrencySetting = async (): Promise<CurrencySetting> => {
  try {
    const saved = await AsyncStorage.getItem('@dompetku_currency_setting');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return defaultCurrency;
};

/** Apply Rupiah/Custom Currency format to a column range (0-indexed col) */
const formatColumnCurrency = (sheet: XLSX.WorkSheet, col: number, startRow: number, endRow: number, fmt: string) => {
  for (let R = startRow; R <= endRow; R++) {
    const ref = XLSX.utils.encode_cell({ c: col, r: R });
    if (sheet[ref]) sheet[ref].z = fmt;
  }
};

/** Apply percentage format to a column range */
const formatColumnPercent = (sheet: XLSX.WorkSheet, col: number, startRow: number, endRow: number) => {
  for (let R = startRow; R <= endRow; R++) {
    const ref = XLSX.utils.encode_cell({ c: col, r: R });
    if (sheet[ref]) sheet[ref].z = PCT_FMT;
  }
};

// ============================================================
// Main Export Function
// ============================================================

export const exportToExcel = async () => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const t = i18n.t.bind(i18n); // alias for shorter calls
    const locale = i18n.language === 'id' ? 'id-ID' : 'en-US';

    const currency = await getCurrencySetting();
    const sym = `"${currency.symbol}"* `;
    const CURRENCY_FMT = `${sym}#,##0;[Red]${sym}-#,##0;${sym}0;@`;

    // Formatted current month name
    const currentMonthName = new Date(currentYear, currentMonth - 1).toLocaleDateString(locale, { month: 'long' });

    // ── Fetch all data ──
    const transactions = await transactionRepo.getAll(100000, 0);
    const accounts = await accountRepo.getAll();
    const budgets = await budgetRepo.getByMonth(currentMonth, currentYear);

    // Filter transactions for current month
    const monthStr = currentMonth.toString().padStart(2, '0');
    const datePrefix = `${currentYear}-${monthStr}-`;
    const monthTx = transactions.filter(tx => tx.date.includes(datePrefix));

    const totalIncome = monthTx.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
    const totalExpense = monthTx.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

    // Category breakdowns for current month
    const expenseByCat = await fetchAll<{
      category_name: string; total: number;
    }>(`
      SELECT c.name as category_name, SUM(t.amount) as total
      FROM transactions t JOIN categories c ON t.category_id = c.id
      WHERE t.type = 'expense' AND t.date LIKE ?
      GROUP BY c.id ORDER BY total DESC
    `, [`%${datePrefix}%`]);

    const incomeByCat = await fetchAll<{
      category_name: string; total: number;
    }>(`
      SELECT c.name as category_name, SUM(t.amount) as total
      FROM transactions t JOIN categories c ON t.category_id = c.id
      WHERE t.type = 'income' AND t.date LIKE ?
      GROUP BY c.id ORDER BY total DESC
    `, [`%${datePrefix}%`]);

    // Monthly trend (6 months)
    const trendData: { bulan: string; pemasukan: number; pengeluaran: number; selisih: number }[] = [];
    let iterMonth = currentMonth;
    let iterYear = currentYear;
    for (let i = 0; i < 6; i++) {
      const mStr = iterMonth.toString().padStart(2, '0');
      const prefix = `${iterYear}-${mStr}-`;
      const res = await fetchOne<{ income: number; expense: number }>(`
        SELECT
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
        FROM transactions WHERE date LIKE ?
      `, [`%${prefix}%`]);
      const inc = res?.income || 0;
      const exp = res?.expense || 0;
      const paramMonthStr = new Date(iterYear, iterMonth - 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
      trendData.unshift({
        bulan: paramMonthStr,
        pemasukan: inc,
        pengeluaran: exp,
        selisih: inc - exp,
      });
      iterMonth--;
      if (iterMonth === 0) { iterMonth = 12; iterYear--; }
    }

    const wb = XLSX.utils.book_new();

    // ==========================================
    // SHEET 1: 📊 DASHBOARD
    // ==========================================
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const daysPassed = currentMonth === now.getMonth() + 1 && currentYear === now.getFullYear()
      ? now.getDate() : daysInMonth;
    const avgExpensePerDay = daysPassed > 0 ? totalExpense / daysPassed : 0;
    const topExpenseCat = expenseByCat.length > 0 ? expenseByCat[0].category_name : '-';
    const topAccount = accounts.length > 0
      ? accounts.reduce((a, b) => a.balance > b.balance ? a : b).name : '-';

    const dashData = [
      [t('export.reportTitle')],
      [`${t('export.period')} ${currentMonthName} ${currentYear}`],
      [`${t('export.createdAt')} ${now.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`],
      [],
      [t('export.financialSummary')],
      [t('export.metric'), t('export.value')],
      [`${t('common.total')} ${t('common.income')}`, totalIncome],
      [`${t('common.total')} ${t('common.expense')}`, totalExpense],
      [t('export.netBalanceRaw'), totalIncome - totalExpense],
      [t('dashboard.totalBalance'), totalBalance],
      [],
      [t('navigation.statistics').toUpperCase()],
      [t('export.metric'), t('export.value')],
      [t('export.txCount'), monthTx.length],
      [t('export.avgExpense'), avgExpensePerDay],
      [t('export.highestExpenseCat'), topExpenseCat],
      [t('export.highestBalanceAccount'), topAccount],
      [],
      [t('export.accountBalances')],
      [t('common.account'), t('common.type'), t('common.balance')],
    ];
    for (const acc of accounts) {
      const tipe = acc.type === 'cash' ? t('export.cash') : acc.type === 'bank' ? t('export.bank') : t('export.ewallet');
      dashData.push([acc.name, tipe, acc.balance as any]);
    }

    const dashSheet = XLSX.utils.aoa_to_sheet(dashData);
    dashSheet['!cols'] = [{ wch: 40 }, { wch: 25 }, { wch: 20 }];

    // Format Rupiah cells
    const rupiahDashCells = [
      'B7', 'B8', 'B9', 'B10', // ringkasan
      'B15', // rata-rata
    ];
    for (const ref of rupiahDashCells) {
      if (dashSheet[ref]) dashSheet[ref].z = CURRENCY_FMT;
    }
    // Format saldo akun column C
    for (let i = 0; i < accounts.length; i++) {
      const ref = XLSX.utils.encode_cell({ c: 2, r: 20 + i }); // row 20 = index 0
      if (dashSheet[ref]) dashSheet[ref].z = CURRENCY_FMT;
    }

    dashSheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, // title
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }, // periode
      { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } }, // dibuat
      { s: { r: 4, c: 0 }, e: { r: 4, c: 2 } }, // ringkasan header
      { s: { r: 11, c: 0 }, e: { r: 11, c: 2 } }, // statistik header
      { s: { r: 18, c: 0 }, e: { r: 18, c: 2 } }, // saldo header
    ];

    XLSX.utils.book_append_sheet(wb, dashSheet, t('export.sheetDashboard'));

    // ==========================================
    // SHEET 2: 📋 RIWAYAT TRANSAKSI
    // ==========================================
    const txRows = transactions.map((tx, idx) => {
      const d = new Date(tx.date);
      return {
        [t('export.no')]: idx + 1,
        [t('common.date')]: d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }),
        [t('export.day')]: d.toLocaleDateString(locale, { weekday: 'long' }),
        [t('common.type')]: tx.type === 'income' ? t('common.income') : t('common.expense'),
        [t('common.account')]: tx.account_name,
        [t('common.category')]: tx.category_name,
        [t('common.amount')]: tx.type === 'income' ? tx.amount : -tx.amount,
        [t('common.note')]: tx.note || '-',
      };
    });

    // Add summary rows
    const allIncome = transactions.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
    const allExpense = transactions.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
    txRows.push(
      { [t('export.no')]: '' as any, [t('common.date')]: '', [t('export.day')]: '', [t('common.type')]: '', [t('common.account')]: '', [t('common.category')]: '', [t('common.amount')]: '' as any, [t('common.note')]: '' },
      { [t('export.no')]: '' as any, [t('common.date')]: '', [t('export.day')]: '', [t('common.type')]: '', [t('common.account')]: '', [t('common.category')]: `${t('common.total')} ${t('common.income')}`, [t('common.amount')]: allIncome, [t('common.note')]: '' },
      { [t('export.no')]: '' as any, [t('common.date')]: '', [t('export.day')]: '', [t('common.type')]: '', [t('common.account')]: '', [t('common.category')]: `${t('common.total')} ${t('common.expense')}`, [t('common.amount')]: -allExpense, [t('common.note')]: '' },
      { [t('export.no')]: '' as any, [t('common.date')]: '', [t('export.day')]: '', [t('common.type')]: '', [t('common.account')]: '', [t('common.category')]: t('export.netBalance'), [t('common.amount')]: allIncome - allExpense, [t('common.note')]: '' },
    );

    const txSheet = XLSX.utils.json_to_sheet(txRows);
    txSheet['!cols'] = [
      { wch: 6 }, { wch: 22 }, { wch: 10 }, { wch: 13 },
      { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 35 }
    ];

    // Format Nominal column (col index 6, 0-based)
    const txRange = XLSX.utils.decode_range(txSheet['!ref'] || 'A1');
    formatColumnCurrency(txSheet, 6, 1, txRange.e.r, CURRENCY_FMT);

    XLSX.utils.book_append_sheet(wb, txSheet, t('export.sheetTransactions'));

    // ==========================================
    // SHEET 3: 📈 RINGKASAN KATEGORI
    // ==========================================
    const catSheetData: any[][] = [];

    // Expense breakdown
    catSheetData.push([t('export.expenseByCategory')]);
    catSheetData.push([`${t('export.period')} ${currentMonthName} ${currentYear}`]);
    catSheetData.push([]);
    catSheetData.push([t('common.category'), t('common.total'), t('export.percentage')]);

    const totalExpAll = expenseByCat.reduce((s, c) => s + c.total, 0);
    for (const cat of expenseByCat) {
      const pct = totalExpAll > 0 ? cat.total / totalExpAll : 0;
      catSheetData.push([cat.category_name, cat.total, pct]);
    }
    if (expenseByCat.length > 0) {
      catSheetData.push([t('common.total').toUpperCase(), totalExpAll, 1]);
    }

    catSheetData.push([]);
    catSheetData.push([]);

    // Income breakdown
    const incStartRow = catSheetData.length;
    catSheetData.push([t('export.incomeByCategory')]);
    catSheetData.push([`${t('export.period')} ${currentMonthName} ${currentYear}`]);
    catSheetData.push([]);
    catSheetData.push([t('common.category'), t('common.total'), t('export.percentage')]);

    const totalIncAll = incomeByCat.reduce((s, c) => s + c.total, 0);
    for (const cat of incomeByCat) {
      const pct = totalIncAll > 0 ? cat.total / totalIncAll : 0;
      catSheetData.push([cat.category_name, cat.total, pct]);
    }
    if (incomeByCat.length > 0) {
      catSheetData.push([t('common.total').toUpperCase(), totalIncAll, 1]);
    }

    const catSheet = XLSX.utils.aoa_to_sheet(catSheetData);
    catSheet['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 14 }];

    // Merge title rows
    catSheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
      { s: { r: incStartRow, c: 0 }, e: { r: incStartRow, c: 2 } },
      { s: { r: incStartRow + 1, c: 0 }, e: { r: incStartRow + 1, c: 2 } },
    ];

    const expDataStart = 4;
    const expDataEnd = expDataStart + expenseByCat.length; 
    formatColumnCurrency(catSheet, 1, expDataStart, expDataEnd, CURRENCY_FMT);
    formatColumnPercent(catSheet, 2, expDataStart, expDataEnd);

    const incDataStart = incStartRow + 3;
    const incDataEnd = incDataStart + incomeByCat.length;
    formatColumnCurrency(catSheet, 1, incDataStart, incDataEnd, CURRENCY_FMT);
    formatColumnPercent(catSheet, 2, incDataStart, incDataEnd);

    XLSX.utils.book_append_sheet(wb, catSheet, t('export.sheetCategories'));

    // ==========================================
    // SHEET 4: 📅 TREN BULANAN
    // ==========================================
    const trendRows = [
      [t('export.financialTrend')],
      [],
      [t('export.month'), t('common.income'), t('common.expense'), t('export.difference')],
    ];

    for (const data of trendData) {
      trendRows.push([data.bulan, data.pemasukan as any, data.pengeluaran as any, data.selisih as any]);
    }

    const trendSheet = XLSX.utils.aoa_to_sheet(trendRows);
    trendSheet['!cols'] = [{ wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
    trendSheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    ];

    for (let col = 1; col <= 3; col++) {
      formatColumnCurrency(trendSheet, col, 3, 3 + trendData.length - 1, CURRENCY_FMT);
    }

    XLSX.utils.book_append_sheet(wb, trendSheet, t('export.sheetTrends'));

    // ==========================================
    // SHEET 5: 💰 ANGGARAN VS REALISASI
    // ==========================================
    const budgetRows: any[][] = [
      [t('export.budgetVsActual')],
      [`${t('export.period')} ${currentMonthName} ${currentYear}`],
      [],
      [t('common.category'), t('export.budget'), t('export.actual'), t('export.remaining'), t('export.used')],
    ];

    let budgetTotal = 0;
    let spentTotal = 0;

    for (const b of budgets) {
      const spent = b.spent || 0;
      const sisa = b.amount - spent;
      const pct = b.amount > 0 ? spent / b.amount : 0;
      budgetTotal += b.amount;
      spentTotal += spent;
      budgetRows.push([b.category_name, b.amount, spent, sisa, pct]);
    }

    if (budgets.length > 0) {
      const totalSisa = budgetTotal - spentTotal;
      const totalPct = budgetTotal > 0 ? spentTotal / budgetTotal : 0;
      budgetRows.push([t('common.total').toUpperCase(), budgetTotal, spentTotal, totalSisa, totalPct]);
    } else {
      budgetRows.push([t('export.noBudgetStr'), '', '', '', '']);
    }

    const budgetSheet = XLSX.utils.aoa_to_sheet(budgetRows);
    budgetSheet['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 }];
    budgetSheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    ];

    const budgetDataStart = 4;
    const budgetDataEnd = budgetDataStart + budgets.length;
    for (let col = 1; col <= 3; col++) {
      formatColumnCurrency(budgetSheet, col, budgetDataStart, budgetDataEnd, CURRENCY_FMT);
    }
    formatColumnPercent(budgetSheet, 4, budgetDataStart, budgetDataEnd);

    XLSX.utils.book_append_sheet(wb, budgetSheet, t('export.sheetBudgets'));

    // ==========================================
    // WRITE & SHARE
    // ==========================================
    const wboutBase64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    const timestamp = `${currentMonthName}_${currentYear}`;
    const file = new File(Paths.document, `${t('export.fileName')}${timestamp}.xlsx`);
    file.write(wboutBase64, { encoding: 'base64' });

    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (isSharingAvailable) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: i18n.t('settings.exportData'),
        UTI: 'com.microsoft.excel.xls'
      });
    } else {
      Alert.alert(i18n.t('common.success'), i18n.t('common.success'));
    }

  } catch (error) {
    console.error('Export Error:', error);
    Alert.alert(i18n.t('common.error'), String(error));
  }
};
