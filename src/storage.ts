// Local-only storage with AsyncStorage. Every read/write is guarded so a failure never crashes the app.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DocKind, Status, LineItem } from './calc.ts';
import { SELLER, type Seller } from './config/seller.ts';
import type { Layout } from './layout.ts';
import type { AppLanguage } from './i18n.ts';

export type Doc = {
  id: string;
  kind: DocKind;
  no: string;
  client: string;
  clientPhone?: string;
  clientAddress?: string;
  clientTaxCode?: string; // MST người mua (hóa đơn điện tử)
  clientEmail?: string;
  note: string;
  items: LineItem[];
  discountPct: number;
  taxPct: number;
  status: Status;
  templateId?: string;
  layout?: Layout; // this document's own layout (title, blocks, currency); overrides the template default
  showSeller?: boolean; // print the logo + seller block; default on
  sourceId?: string; // invoice: id of the quote it was made from
  convertedTo?: string; // quote: id of the invoice made from it
  createdAt: string;
};
// A template the user saved from a finished document: everything but the customer.
export type SavedTemplate = {
  id: string; kind: DocKind; name: string; taxPct: number; note: string; items: LineItem[];
  layout?: Layout; // personal layout: title, footer, blocks, currency
  baseId?: string; // built-in template it was saved from: keeps its language, title and e-invoice option
};
// A product/service the user sells often, picked from a drop list instead of typed.
export type CatalogItem = {
  id: string;
  name: string;
  price: number; // Đơn giá mặc định / bán
  listPrice?: number; // Giá niêm yết
  discountPrice?: number; // Giá chiết khấu
  category?: string; // Phân loại / danh mục
  image?: string; // Ảnh sản phẩm (data URI)
};
// A customer in the address book, picked instead of retyped.
export type Contact = { id: string; name: string; phone: string; address: string };
export type Db = {
  docs: Doc[];
  counters: Record<DocKind, number>;
  seller: Seller;
  templates: SavedTemplate[];
  catalog: CatalogItem[];
  categories: string[];
  contacts: Contact[];
  appLanguage?: AppLanguage;
  hasSelectedLanguage?: boolean;
};

const DEFAULT_CATEGORIES = ['Sản phẩm', 'Dịch vụ'];

const KEY = 'napigo-app-a-v1';
const EMPTY: Db = {
  docs: [],
  counters: { QUO: 0, INV: 0 },
  seller: SELLER,
  templates: [],
  catalog: [],
  categories: DEFAULT_CATEGORIES,
  contacts: [],
  appLanguage: 'vi',
  hasSelectedLanguage: false,
};

export async function loadDb(): Promise<Db> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Db>;
    const rawCategories = Array.isArray(parsed.categories) ? parsed.categories : DEFAULT_CATEGORIES;
    const catalogCategories = (parsed.catalog ?? [])
      .map(p => p.category?.trim())
      .filter((c): c is string => Boolean(c));
    const mergedCategories = Array.from(new Set([...rawCategories, ...catalogCategories]));

    return {
      docs: parsed.docs ?? [],
      counters: parsed.counters ?? { QUO: 0, INV: 0 },
      seller: { ...SELLER, ...parsed.seller },
      templates: parsed.templates ?? [],
      catalog: parsed.catalog ?? [],
      categories: mergedCategories.length > 0 ? mergedCategories : DEFAULT_CATEGORIES,
      contacts: parsed.contacts ?? [],
      appLanguage: parsed.appLanguage ?? 'vi',
      hasSelectedLanguage: parsed.hasSelectedLanguage ?? false,
    };
  } catch {
    return EMPTY;
  }
}

export async function saveDb(db: Db): Promise<boolean> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(db));
    return true;
  } catch {
    return false;
  }
}
