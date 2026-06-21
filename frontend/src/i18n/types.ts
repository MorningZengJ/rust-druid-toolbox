export type Language =
  | 'zh-CN'
  | 'en-US'
  | 'ja-JP'
  | 'ko-KR'
  | 'zh-TW'
  | 'de-DE'
  | 'fr-FR'
  | 'es-ES'
  | 'pt-BR'
  | 'ru-RU'
  | 'ar-SA'
  | 'hi-IN'
  | 'th-TH'
  | 'vi-VN'
  | 'it-IT'
  | 'nl-NL'
  | 'pl-PL'
  | 'tr-TR';

export type Namespace =
  | 'common'
  | 'rename'
  | 'asciiArt'
  | 'videoTool'
  | 'settings'
  | 'errors';

export const languageNames: Record<Language, string> = {
  'zh-CN': '简体中文',
  'en-US': 'English',
  'ja-JP': '日本語',
  'ko-KR': '한국어',
  'zh-TW': '繁體中文',
  'de-DE': 'Deutsch',
  'fr-FR': 'Français',
  'es-ES': 'Español',
  'pt-BR': 'Português',
  'ru-RU': 'Русский',
  'ar-SA': 'العربية',
  'hi-IN': 'हिन्दी',
  'th-TH': 'ไทย',
  'vi-VN': 'Tiếng Việt',
  'it-IT': 'Italiano',
  'nl-NL': 'Nederlands',
  'pl-PL': 'Polski',
  'tr-TR': 'Türkçe',
};

// RTL 语言列表
export const rtlLanguages: Language[] = ['ar-SA'];

// 是否为 RTL 语言
export function isRTL(lang: Language): boolean {
  return rtlLanguages.includes(lang);
}
