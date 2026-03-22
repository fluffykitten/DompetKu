import { Platform } from 'react-native';
import { CurrencySetting } from '../context/CurrencyContext';

/** Formats a number using the full Custom Currency schema. */
export const formatCurrencyWithSetting = (
  amount: number,
  currency: CurrencySetting
): string => {
  const { symbol, position, groupSeparator } = currency;
  const sign = amount < 0 ? '-' : '';
  const numStr = Math.abs(amount).toString();
  
  // Format the integer part with the group separator
  const integerPart = numStr.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator);
  
  const formattedNum = `${sign}${integerPart}`;
  return position === 'left' ? `${symbol} ${formattedNum}` : `${formattedNum} ${symbol}`;
};

/** 
 * Legacy export for direct file usage (try not to use this, use useCurrency Hook instead). 
 * This still defaults to Rp.
 */
export const formatCurrency = (amount: number, currencyCode: string = 'IDR'): string => {
  return formatCurrencyWithSetting(amount, {
    code: currencyCode,
    symbol: currencyCode === 'IDR' ? 'Rp' : (currencyCode === 'USD' ? '$' : currencyCode),
    position: currencyCode === 'IDR' || currencyCode === 'USD' ? 'left' : 'right',
    decimalSeparator: ',',
    groupSeparator: '.',
  });
};

export const parseCurrency = (value: string): number => {
  if (!value) return 0;
  // Remove all non-numeric characters except minus sign
  const numericString = value.replace(/[^\d-]/g, '');
  const parsed = parseInt(numericString, 10);
  return isNaN(parsed) ? 0 : parsed;
};
