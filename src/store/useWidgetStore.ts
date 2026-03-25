import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WidgetPreferences {
  showQuickActions: boolean;
  showRecentTransactions: boolean;
  showTotalBalance: boolean;
}

interface WidgetStore extends WidgetPreferences {
  setPreference: (key: keyof WidgetPreferences, value: boolean) => void;
}

export const useWidgetStore = create<WidgetStore>()(
  persist(
    (set) => ({
      showQuickActions: true,
      showRecentTransactions: true,
      showTotalBalance: true,
      setPreference: (key: keyof WidgetPreferences, value: boolean) => set((state: WidgetStore) => ({ ...state, [key]: value })),
    }),
    {
      name: 'dompetku-widget-preferences',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
