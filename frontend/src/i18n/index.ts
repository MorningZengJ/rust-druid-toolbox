import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入所有语言包
import zhCN from './locales/zh-CN';
import enUS from './locales/en-US';
import jaJP from './locales/ja-JP';
import koKR from './locales/ko-KR';
import zhTW from './locales/zh-TW';
import deDE from './locales/de-DE';
import frFR from './locales/fr-FR';
import esES from './locales/es-ES';
import ptBR from './locales/pt-BR';
import ruRU from './locales/ru-RU';
import arSA from './locales/ar-SA';
import hiIN from './locales/hi-IN';
import thTH from './locales/th-TH';
import viVN from './locales/vi-VN';
import itIT from './locales/it-IT';
import nlNL from './locales/nl-NL';
import plPL from './locales/pl-PL';
import trTR from './locales/tr-TR';

const resources = {
  'zh-CN': zhCN,
  'en-US': enUS,
  'ja-JP': jaJP,
  'ko-KR': koKR,
  'zh-TW': zhTW,
  'de-DE': deDE,
  'fr-FR': frFR,
  'es-ES': esES,
  'pt-BR': ptBR,
  'ru-RU': ruRU,
  'ar-SA': arSA,
  'hi-IN': hiIN,
  'th-TH': thTH,
  'vi-VN': viVN,
  'it-IT': itIT,
  'nl-NL': nlNL,
  'pl-PL': plPL,
  'tr-TR': trTR,
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh-CN',
    defaultNS: 'common',
    ns: ['common', 'rename', 'asciiArt', 'videoTool', 'settings', 'errors'],
    interpolation: {
      escapeValue: false, // React 已经处理了 XSS
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
