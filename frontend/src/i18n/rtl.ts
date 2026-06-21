import { rtlLanguages, type Language } from './types';

export function getDirection(lang: Language): 'ltr' | 'rtl' {
  return rtlLanguages.includes(lang) ? 'rtl' : 'ltr';
}

// 为 Mantine 设置 RTL
export function applyDirection(lang: Language) {
  const dir = getDirection(lang);
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
}
