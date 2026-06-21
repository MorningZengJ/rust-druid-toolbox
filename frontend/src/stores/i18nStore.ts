import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '@/i18n';
import { applyDirection } from '@/i18n/rtl';
import type { Language } from '@/i18n/types';

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      language: (i18n.language as Language) || 'zh-CN',
      setLanguage: (lang) => {
        i18n.changeLanguage(lang);
        applyDirection(lang);
        set({ language: lang });
      },
    }),
    {
      name: 'i18n-storage',
      onRehydrateStorage: () => (state) => {
        // 恢复时应用方向
        if (state) {
          applyDirection(state.language);
        }
      },
    }
  )
);
