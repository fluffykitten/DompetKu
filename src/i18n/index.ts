import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import idTrans from './locales/id.json';
import enTrans from './locales/en.json';

export const LANGUAGE_KEY = '@dompetku_language';

const resources = {
  id: { translation: idTrans },
  en: { translation: enTrans },
};

const initI18n = async () => {
  let savedLanguage = 'id'; // default
  try {
    const lang = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (lang) {
      savedLanguage = lang;
    }
  } catch (e) {
    console.error('Failed to load language from storage', e);
  }

  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: savedLanguage,
      fallbackLng: 'id',
      interpolation: {
        escapeValue: false, // react already safes from xss
      },
      compatibilityJSON: 'v4',
    });
};

initI18n();

export default i18n;
