import type { Language, LanguagePreference } from './i18n'

export type Theme = 'light' | 'dark'
export type ThemePreference = 'auto' | Theme

export const THEME_STORAGE_KEY = 'wizard-scorekeeper-theme-v1'
export const LANGUAGE_STORAGE_KEY = 'wizard-scorekeeper-language-v1'

export function readThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'auto'
  } catch {
    return 'auto'
  }
}

export function readLanguagePreference(): LanguagePreference {
  try {
    const value = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return value === 'en' || value === 'de' ? value : 'auto'
  } catch {
    return 'auto'
  }
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): Theme {
  return preference === 'auto' ? (prefersDark ? 'dark' : 'light') : preference
}

export function resolveLanguage(
  preference: LanguagePreference,
  browserLanguages: readonly string[] = navigator.languages,
): Language {
  if (preference !== 'auto') return preference

  for (const browserLanguage of browserLanguages) {
    const baseLanguage = browserLanguage.toLowerCase().split('-')[0]
    if (baseLanguage === 'de' || baseLanguage === 'en') return baseLanguage
  }

  return 'en'
}
