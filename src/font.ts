// Apple Typography system: dynamically selects native Apple fonts per language.
// Follows Apple Human Interface Guidelines: San Francisco for Latin, Hiragino for Japanese,
// Apple SD Gothic Neo for Korean, and PingFang for Chinese.

export type AppLanguage = 'vi' | 'en' | 'ja' | 'ko' | 'zh' | 'fr' | 'de';

export type LanguageConfig = {
  id: AppLanguage;
  name: string;
  nativeName: string;
  appleFont: string;
  iosFont: string;
  webFont: string;
  defaultFont?: string;
  cssFont: string;
  preview: string;
};

export const LANGUAGES: Record<AppLanguage, LanguageConfig> = {
  vi: {
    id: 'vi',
    name: 'Tiếng Việt',
    nativeName: 'Tiếng Việt',
    appleFont: 'San Francisco (SF Pro)',
    iosFont: 'System',
    webFont: "-apple-system, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Arial, sans-serif",
    defaultFont: undefined,
    cssFont: '-apple-system, "SF Pro Text", "SF Pro Display", "Segoe UI", Arial, sans-serif',
    preview: 'Báo giá & Phiếu thu chuẩn Apple HIG · 1.250.000 ₫',
  },
  en: {
    id: 'en',
    name: 'Tiếng Anh',
    nativeName: 'English',
    appleFont: 'San Francisco (SF Pro)',
    iosFont: 'System',
    webFont: "-apple-system, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Arial, sans-serif",
    defaultFont: undefined,
    cssFont: '-apple-system, "SF Pro Text", "SF Pro Display", "Segoe UI", Arial, sans-serif',
    preview: 'Invoice & Quotation Apple Style · $1,250.00',
  },
  ja: {
    id: 'ja',
    name: 'Tiếng Nhật',
    nativeName: '日本語',
    appleFont: 'Hiragino Sans',
    iosFont: 'Hiragino Sans',
    webFont: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', -apple-system, sans-serif",
    defaultFont: 'Hiragino Sans',
    cssFont: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", -apple-system, sans-serif',
    preview: '見積書・領収書システム · ¥125,000',
  },
  ko: {
    id: 'ko',
    name: 'Tiếng Hàn',
    nativeName: '한국어',
    appleFont: 'Apple SD Gothic Neo',
    iosFont: 'Apple SD Gothic Neo',
    webFont: "'Apple SD Gothic Neo', -apple-system, sans-serif",
    defaultFont: 'Apple SD Gothic Neo',
    cssFont: '"Apple SD Gothic Neo", -apple-system, sans-serif',
    preview: '견적서 및 영수증 관리 · ₩1,250,000',
  },
  zh: {
    id: 'zh',
    name: 'Tiếng Trung',
    nativeName: '简体中文',
    appleFont: 'PingFang SC',
    iosFont: 'PingFang SC',
    webFont: "'PingFang SC', 'Microsoft YaHei', -apple-system, sans-serif",
    defaultFont: 'PingFang SC',
    cssFont: '"PingFang SC", "Microsoft YaHei", -apple-system, sans-serif',
    preview: '报价单与收款收据 · ¥1,250.00',
  },
  fr: {
    id: 'fr',
    name: 'Tiếng Pháp',
    nativeName: 'Français',
    appleFont: 'San Francisco (SF Pro)',
    iosFont: 'System',
    webFont: "-apple-system, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Arial, sans-serif",
    defaultFont: undefined,
    cssFont: '-apple-system, "SF Pro Text", "SF Pro Display", "Segoe UI", Arial, sans-serif',
    preview: 'Devis & Reçu de paiement · 1 250,00 €',
  },
  de: {
    id: 'de',
    name: 'Tiếng Đức',
    nativeName: 'Deutsch',
    appleFont: 'San Francisco (SF Pro)',
    iosFont: 'System',
    webFont: "-apple-system, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Arial, sans-serif",
    defaultFont: undefined,
    cssFont: '-apple-system, "SF Pro Text", "SF Pro Display", "Segoe UI", Arial, sans-serif',
    preview: 'Kostenvoranschlag & Quittung · 1.250,00 €',
  },
};

export const SUPPORTED_LANGUAGES = Object.values(LANGUAGES);

export function getLanguageConfig(lang?: string): LanguageConfig {
  if (lang && lang in LANGUAGES) {
    return LANGUAGES[lang as AppLanguage];
  }
  return LANGUAGES.vi;
}

export function resolveAppFont(lang: AppLanguage, os?: string): string | undefined {
  const cfg = getLanguageConfig(lang);
  if (os === 'ios') return cfg.iosFont;
  if (os === 'web') return cfg.webFont;
  return cfg.defaultFont;
}

export function resolvePdfFont(lang: AppLanguage): string {
  const cfg = getLanguageConfig(lang);
  return `${cfg.cssFont}, sans-serif`;
}
