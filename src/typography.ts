// Apple Typography and Font Configuration according to Apple Human Interface Guidelines.
// Optimized for Vietnamese (diacritics clearance) and English (Latin tracking).

export type AppLanguage = 'vi' | 'en';

export type TypographicLevel =
  | 'largeTitle'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption1'
  | 'caption2';

export type FontMetrics = {
  fontSize: number;
  fontWeight: '400' | '500' | '600' | '700';
  lineHeight: number;
  letterSpacing: number;
};

// Apple Human Interface Guidelines - Dynamic Type Scale specifications
export const APPLE_TYPOGRAPHY_SCALE: Record<TypographicLevel, FontMetrics> = {
  largeTitle: { fontSize: 34, fontWeight: '700', lineHeight: 41, letterSpacing: 0.37 },
  title1: { fontSize: 28, fontWeight: '700', lineHeight: 34, letterSpacing: 0.36 },
  title2: { fontSize: 22, fontWeight: '700', lineHeight: 28, letterSpacing: 0.35 },
  title3: { fontSize: 20, fontWeight: '600', lineHeight: 25, letterSpacing: 0.38 },
  headline: { fontSize: 17, fontWeight: '600', lineHeight: 22, letterSpacing: -0.41 },
  body: { fontSize: 17, fontWeight: '400', lineHeight: 22, letterSpacing: -0.41 },
  callout: { fontSize: 16, fontWeight: '400', lineHeight: 21, letterSpacing: -0.32 },
  subhead: { fontSize: 15, fontWeight: '400', lineHeight: 20, letterSpacing: -0.24 },
  footnote: { fontSize: 13, fontWeight: '400', lineHeight: 18, letterSpacing: -0.08 },
  caption1: { fontSize: 12, fontWeight: '400', lineHeight: 16, letterSpacing: 0 },
  caption2: { fontSize: 11, fontWeight: '400', lineHeight: 13, letterSpacing: 0.07 },
};

export type FontConfig = {
  iosFont: string;
  webFallbackFont: string;
  pdfCssFont: string;
  lineHeightFactor: number;
  label: string;
  description: string;
};

export const FONT_CONFIG_BY_LANG: Record<AppLanguage, FontConfig> = {
  vi: {
    iosFont: 'System',
    webFallbackFont: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    pdfCssFont: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    lineHeightFactor: 1.3, // Breathing room for Vietnamese diacritics (dấu ngã, hỏi, nặng, mũ, móc)
    label: 'Apple SF Pro (Tiếng Việt)',
    description: 'Font hệ thống San Francisco (SF Pro) chuẩn Apple, tối ưu hóa độ cao dòng và hiển thị dấu thanh tiếng Việt.',
  },
  en: {
    iosFont: 'System',
    webFallbackFont: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    pdfCssFont: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    lineHeightFactor: 1.25, // Standard Apple HIG line height for English
    label: 'Apple SF Pro (English)',
    description: 'Apple San Francisco (SF Pro) system typography optimized for Latin characters with native Apple tracking.',
  },
};

// Returns the appropriate font family name for React Native styles based on language and platform.
export function getSystemFont(lang: AppLanguage, os: string = 'ios'): string | undefined {
  const cfg = FONT_CONFIG_BY_LANG[lang] ?? FONT_CONFIG_BY_LANG.vi;
  if (os === 'ios') return cfg.iosFont;
  if (os === 'web') return cfg.webFallbackFont;
  return undefined;
}

// Returns the CSS font-family string for HTML / PDF rendering.
export function getPdfFontFamily(lang: AppLanguage): string {
  const cfg = FONT_CONFIG_BY_LANG[lang] ?? FONT_CONFIG_BY_LANG.vi;
  return cfg.pdfCssFont;
}
