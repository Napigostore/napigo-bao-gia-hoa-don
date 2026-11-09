// Application Internationalization and Localization for Vietnamese and English.
// Built according to Apple Human Interface Guidelines.
import type { AppLanguage } from './typography.ts';

export type { AppLanguage };

export type LanguageItem = {
  code: AppLanguage;
  name: string;
  englishName: string;
  flag: string;
  subtitle: string;
};

export const SUPPORTED_LANGUAGES: LanguageItem[] = [
  {
    code: 'vi',
    name: 'Tiếng Việt',
    englishName: 'Vietnamese',
    flag: '🇻🇳',
    subtitle: 'Font Apple SF Pro · Tối ưu dấu thanh tiếng Việt',
  },
  {
    code: 'en',
    name: 'English',
    englishName: 'English',
    flag: '🇺🇸',
    subtitle: 'Apple SF Pro Typography · Latin tracking',
  },
];

export const UI_STRINGS = {
  vi: {
    appTitle: 'Báo giá & Phiếu thu',
    newQuote: '+ Báo giá',
    newInvoice: '+ Phiếu thu',
    settings: 'Cài đặt',
    pricing: 'Bảng giá',
    companyInfo: 'Thông tin công ty',
    filterAll: 'Tất cả',
    filterQuo: 'Báo giá',
    filterInv: 'Phiếu thu',
    pendingReceipts: 'Phiếu thu chờ thu:',
    noDocs: 'Chưa có chứng từ nào. Bấm “+ Báo giá” để bắt đầu.',
    noDocsFilter: 'Không có chứng từ nào trong mục này.',
    statusDraft: 'Nháp',
    statusSent: 'Đã gửi',
    statusPaid: 'Đã thu',
    markSent: 'Đánh dấu đã gửi',
    markPaid: 'Đánh dấu đã thu',
    convertToInvoice: 'Chuyển thành phiếu thu',
    save: 'Lưu',
    preview: 'Xem trước',
    print: 'In',
    share: 'Chia sẻ',
    back: '← Danh sách',
    close: 'Đóng',
    done: '← Xong',
    // Settings screen
    settingsTitle: 'Cài đặt',
    settingsSubtitle: 'Ngôn ngữ hiển thị và cấu hình font chữ Apple',
    sectionLanguage: 'NGÔN NGỮ & FONT CHỮ',
    sectionManagement: 'QUẢN LÝ DOANH NGHIỆP',
    sectionAbout: 'CHUẨN THIẾT KẾ APPLE',
    fontConfigTitle: 'Font hệ thống Apple SF Pro',
    fontConfigDesc: 'Tự động áp dụng font San Francisco (SF Pro) chuẩn Human Interface Guidelines, tối ưu hóa độ cao dòng cho dấu tiếng Việt và chuẩn Latin cho tiếng Anh.',
    companyButton: 'Thông tin công ty',
    companyButtonHint: 'Tên, MST, địa chỉ, logo, chữ ký, VietQR',
    catalogButton: 'Sản phẩm & Dịch vụ',
    catalogButtonHint: 'Quản lý danh mục, giá niêm yết & chiết khấu',
    catalogTitle: 'Sản phẩm & Dịch vụ',
    newProduct: '+ Tạo sản phẩm',
    editProduct: 'Sửa sản phẩm',
    productName: 'Tên sản phẩm / dịch vụ',
    productCategory: 'Phân loại / Danh mục',
    listPrice: 'Giá niêm yết',
    discountPrice: 'Giá chiết khấu',
    saveProduct: 'Lưu sản phẩm',
    productImage: 'Ảnh sản phẩm',
    allCategories: 'Tất cả',
    noProducts: 'Chưa có sản phẩm nào.',
    pricingButton: 'Bảng giá dịch vụ',
    pricingButtonHint: 'Gói Free, Pro, Business',
    aboutAppleDesc: 'Thiết kế theo chuẩn Apple Human Interface Guidelines: font hệ thống SF Pro, lưới 8pt, vùng chạm tối thiểu 44pt, hỗ trợ Chế độ Sáng / Tối.',
    // Startup language modal
    welcomeTitle: 'Chào mừng bạn',
    welcomeSubtitle: 'Chọn ngôn ngữ sử dụng cho ứng dụng. Hệ thống sẽ tự động cấu hình font chữ Apple tối ưu.',
    getStarted: 'Bắt đầu sử dụng',
  },
  en: {
    appTitle: 'Quotes & Receipts',
    newQuote: '+ New Quote',
    newInvoice: '+ New Receipt',
    settings: 'Settings',
    pricing: 'Pricing',
    companyInfo: 'Company Info',
    filterAll: 'All',
    filterQuo: 'Quotes',
    filterInv: 'Receipts',
    pendingReceipts: 'Pending receipts:',
    noDocs: 'No documents yet. Tap “+ New Quote” to start.',
    noDocsFilter: 'No documents in this view.',
    statusDraft: 'Draft',
    statusSent: 'Sent',
    statusPaid: 'Paid',
    markSent: 'Mark as sent',
    markPaid: 'Mark as paid',
    convertToInvoice: 'Convert to Receipt',
    save: 'Save',
    preview: 'Preview',
    print: 'Print',
    share: 'Share',
    back: '← List',
    close: 'Close',
    done: '← Done',
    // Settings screen
    settingsTitle: 'Settings',
    settingsSubtitle: 'Display language and Apple typography configuration',
    sectionLanguage: 'LANGUAGE & TYPOGRAPHY',
    sectionManagement: 'BUSINESS MANAGEMENT',
    sectionAbout: 'APPLE DESIGN GUIDELINES',
    fontConfigTitle: 'Apple SF Pro System Typography',
    fontConfigDesc: 'Automatically applies San Francisco (SF Pro) adhering to Human Interface Guidelines, optimized for Vietnamese diacritics and English Latin typography.',
    companyButton: 'Company Profile',
    companyButtonHint: 'Name, Tax ID, address, logo, signature, QR',
    catalogButton: 'Products & Services',
    catalogButtonHint: 'Manage categories, list prices & discounts',
    catalogTitle: 'Products & Services',
    newProduct: '+ New Product',
    editProduct: 'Edit Product',
    productName: 'Product / service name',
    productCategory: 'Category / Classification',
    listPrice: 'List price',
    discountPrice: 'Discounted price',
    saveProduct: 'Save product',
    productImage: 'Product image',
    allCategories: 'All',
    noProducts: 'No products yet.',
    pricingButton: 'Pricing & Plans',
    pricingButtonHint: 'Free, Pro, Business plans',
    aboutAppleDesc: 'Designed per Apple Human Interface Guidelines: SF Pro system typography, 8pt grid, >=44pt tap targets, Light & Dark mode support.',
    // Startup language modal
    welcomeTitle: 'Welcome',
    welcomeSubtitle: 'Select your preferred language. The app will automatically configure optimized Apple typography.',
    getStarted: 'Get Started',
  },
} as const;

export type StringKey = keyof typeof UI_STRINGS.vi;

export function t(key: StringKey, lang: AppLanguage = 'vi'): string {
  const table = UI_STRINGS[lang] ?? UI_STRINGS.vi;
  return table[key] ?? UI_STRINGS.vi[key] ?? key;
}
