// ============================================================
// DompetKu - Typography
// ============================================================

import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const Typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    fontFamily,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    fontFamily,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    fontFamily,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  h5: {
    fontSize: 16,
    fontWeight: '600' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    fontFamily,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    fontFamily,
  },
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
    fontFamily,
    letterSpacing: 0.3,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    fontFamily,
  },
  amount: {
    fontSize: 32,
    fontWeight: '700' as const,
    fontFamily,
    letterSpacing: -1,
  },
  amountSmall: {
    fontSize: 20,
    fontWeight: '700' as const,
    fontFamily,
    letterSpacing: -0.5,
  },
};
