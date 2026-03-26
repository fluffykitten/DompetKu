import React, { useEffect, useState, useMemo } from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { Transaction } from '../types';

import DashboardScreen from '../screens/DashboardScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import BudgetScreen from '../screens/BudgetScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import AccountsScreen from '../screens/AccountsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import AccountTransferScreen from '../screens/AccountTransferScreen';
import { WidgetSettingsScreen } from '../screens/WidgetSettingsScreen';

// Navigation parameter types
export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  AddTransaction: { transaction?: Transaction };
  Categories: undefined;
  Accounts: undefined;
  AccountTransfer: undefined;
  WidgetSettings: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  BudgetTab: undefined;
  Statistics: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function TabNavigator() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof MaterialCommunityIcons.glyphMap = 'home';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Transactions') {
            iconName = focused ? 'swap-horizontal' : 'swap-horizontal'; // swap-horizontal-outline doesn't exist
          } else if (route.name === 'BudgetTab') {
            iconName = focused ? 'bullseye' : 'bullseye-arrow';
          } else if (route.name === 'Statistics') {
            iconName = focused ? 'chart-bar' : 'chart-bar-stacked';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'cog' : 'cog-outline';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          elevation: 8,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          paddingTop: 5,
          height: 60 + Math.max(insets.bottom, 0),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: colors.surface,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        // We handle custom header for Dashboard
        headerShown: route.name !== 'Dashboard', 
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ title: t('navigation.dashboard') }}
      />
      <Tab.Screen 
        name="Transactions" 
        component={TransactionsScreen} 
        options={{ title: t('navigation.transactions') }}
      />
      <Tab.Screen 
        name="BudgetTab" 
        component={BudgetScreen} 
        options={{ title: t('navigation.budgets') }}
      />
      <Tab.Screen 
        name="Statistics" 
        component={StatisticsScreen} 
        options={{ title: t('navigation.statistics') }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ title: t('navigation.settings') }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { colors, mode } = useTheme();
  const { t } = useTranslation();
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const onboarded = await AsyncStorage.getItem('@dompetku_has_onboarded');
        setInitialRoute(onboarded === 'true' ? 'MainTabs' : 'Onboarding');
      } catch (e) {
        setInitialRoute('MainTabs');
      }
    }
    checkOnboarding();
  }, []);

  // Deep link configuration untuk widget OS
  // NOTE: useMemo must be called BEFORE any conditional return to comply with React's Rules of Hooks
  const linking: LinkingOptions<RootStackParamList> = useMemo(() => ({
    prefixes: ['dompetkufk://'],
    config: {
      screens: {
        MainTabs: {
          screens: {
            Dashboard: 'dashboard',
          },
        },
        AddTransaction: {
          path: 'add-transaction',
          parse: {
            transaction: (_: string) => undefined, // handled below
          },
        },
        AccountTransfer: 'transfer',
      },
    },
    // Custom getStateFromPath to properly map ?type= to transaction param
    getStateFromPath: (path, config) => {
      // Handle add-transaction?type=income|expense
      if (path.startsWith('add-transaction')) {
        const url = new URL(`dompetkufk://${path}`);
        const type = url.searchParams.get('type') as 'income' | 'expense' | null;
        return {
          routes: [
            { name: 'MainTabs' },
            { 
              name: 'AddTransaction', 
              params: { 
                transaction: { type: type || 'expense' } as any 
              } 
            },
          ],
        };
      }
      // Handle transfer
      if (path === 'transfer') {
        return {
          routes: [
            { name: 'MainTabs' },
            { name: 'AccountTransfer' },
          ],
        };
      }
      // Default: dashboard
      return {
        routes: [{ name: 'MainTabs' }],
      };
    },
  }), []);

  if (!initialRoute) return null;

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background }
        }}
      >
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="MainTabs" 
          component={TabNavigator} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="AddTransaction" 
          component={AddTransactionScreen} 
          options={{ 
            title: t('navigation.addTransaction'),
            presentation: 'modal' 
          }}
        />
        <Stack.Screen 
          name="Categories" 
          component={CategoriesScreen} 
          options={{ title: t('navigation.categories') }}
        />
        <Stack.Screen 
          name="Accounts" 
          component={AccountsScreen} 
          options={{ title: t('navigation.accounts') }}
        />
        <Stack.Screen 
          name="AccountTransfer" 
          component={AccountTransferScreen} 
          options={{ 
            title: t('transfer.title'),
            presentation: 'modal' 
          }}
        />
        <Stack.Screen 
          name="WidgetSettings" 
          component={WidgetSettingsScreen} 
          options={{ title: t('widget.settingsTitle') }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
