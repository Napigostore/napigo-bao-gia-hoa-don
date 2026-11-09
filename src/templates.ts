// Ready-made document templates: Vietnamese (10 + 6 from printed forms) and international (4 + 90 generated = 94).
// Pure data, no UI. Every template carries its own default layout (blocks, title, footer, currency).
import type { DocKind, LineItem } from './calc.ts';
import { DOC_TITLES, LABELS, type DocKey, type Lang, type Locale } from './labels.ts';
import { INVOICE_BLOCKS, QUOTE_BLOCKS, normalizeBlocks, type Block, type DesignKey, type FormKey, type Layout } from './layout.ts';
import type { Doc } from './storage.ts';

export type Template = {
  id: string;
  kind: DocKind;
  name: string;
  hint: string;
  accent: string; // Apple system color used for the template badge and the PDF
  locale: Locale;
  country: string; // 'VN' or an ISO 3166 code (US, GB, DE...)
  currency: string; // ISO 4217 code
  title: string; // heading printed on the PDF
  taxLabel?: string; // VAT / GST / Sales tax; default "VAT"
  taxPct: number;
  note: string;
  items: LineItem[];
  footer: string;
  blocks: Block[]; // default print order
  design?: DesignKey; // print design; default classic
  form?: FormKey; // real paper-form layout (forms.ts); overrides the block list when set
  eInvoice?: boolean; // Vietnamese VAT invoice: the app can export the e-invoice XML
};

const item = (name: string, qty: number, price: number): LineItem => ({ name, qty, price, discountPct: 0 });
const VN_QUOTE = 'Cảm ơn quý khách đã quan tâm.';
const VN_INVOICE = 'Cảm ơn quý khách đã tin tưởng.';

// ---- Việt Nam: 10 mẫu ----
const VN: Template[] = [
  { id: 'quo-service', design: 'modern', kind: 'QUO', name: 'Báo giá dịch vụ', hint: 'Tư vấn, thiết kế, bảo trì', accent: '#007AFF', locale: 'vi', country: 'VN', currency: 'VND', title: 'Báo giá', taxPct: 8, note: 'Hiệu lực báo giá: 15 ngày', items: [item('Phí dịch vụ', 1, 0), item('Chi phí phát sinh', 1, 0)], footer: VN_QUOTE, blocks: QUOTE_BLOCKS },
  { id: 'quo-goods', design: 'classic', kind: 'QUO', name: 'Báo giá hàng hóa', hint: 'Bán hàng theo số lượng', accent: '#5856D6', locale: 'vi', country: 'VN', currency: 'VND', title: 'Báo giá', taxPct: 8, note: 'Giá chưa gồm phí vận chuyển', items: [item('Sản phẩm 1', 1, 0), item('Sản phẩm 2', 1, 0)], footer: VN_QUOTE, blocks: QUOTE_BLOCKS },
  { id: 'quo-construction', design: 'boxed', kind: 'QUO', name: 'Báo giá xây dựng / sửa chữa', hint: 'Vật tư và nhân công', accent: '#FF9500', locale: 'vi', country: 'VN', currency: 'VND', title: 'Báo giá', taxPct: 10, note: 'Địa điểm thi công:', items: [item('Vật tư', 1, 0), item('Nhân công', 1, 0), item('Vận chuyển', 1, 0)], footer: 'Báo giá có hiệu lực 30 ngày. Cảm ơn quý khách.', blocks: QUOTE_BLOCKS },
  { id: 'quo-project', design: 'minimal', kind: 'QUO', name: 'Báo giá dự án', hint: 'Chia giai đoạn thanh toán', accent: '#AF52DE', locale: 'vi', country: 'VN', currency: 'VND', title: 'Báo giá', taxPct: 10, note: 'Thanh toán theo giai đoạn', items: [item('Giai đoạn 1 – Tạm ứng 30%', 1, 0), item('Giai đoạn 2 – Triển khai 40%', 1, 0), item('Giai đoạn 3 – Nghiệm thu 30%', 1, 0)], footer: VN_QUOTE, blocks: QUOTE_BLOCKS },
  { id: 'inv-standard', design: 'corporate', kind: 'INV', name: 'Phiếu thu bán hàng', hint: 'Mẫu thông dụng nhất', accent: '#248A3D', locale: 'vi', country: 'VN', currency: 'VND', title: 'Phiếu thu', taxPct: 8, note: '', items: [item('Sản phẩm / dịch vụ', 1, 0)], footer: VN_INVOICE, blocks: INVOICE_BLOCKS },
  { id: 'inv-service', design: 'minimal', kind: 'INV', name: 'Phiếu thu dịch vụ', hint: 'Thu phí dịch vụ theo kỳ', accent: '#30B0C7', locale: 'vi', country: 'VN', currency: 'VND', title: 'Phiếu thu', taxPct: 8, note: 'Kỳ thanh toán:', items: [item('Phí dịch vụ', 1, 0)], footer: VN_INVOICE, blocks: INVOICE_BLOCKS },
  { id: 'inv-cash', design: 'receipt', kind: 'INV', name: 'Phiếu thu tiền mặt', hint: 'Thu tiền mặt, không thuế', accent: '#34C759', locale: 'vi', country: 'VN', currency: 'VND', title: 'Phiếu thu', taxPct: 0, note: 'Hình thức: tiền mặt', items: [item('Khoản thu', 1, 0)], footer: VN_INVOICE, blocks: ['logo', 'title', 'client', 'items', 'totals', 'words', 'signature', 'footer'] },
  { id: 'inv-deposit', design: 'elegant', kind: 'INV', name: 'Phiếu thu tạm ứng', hint: 'Thu trước một phần', accent: '#C93400', locale: 'vi', country: 'VN', currency: 'VND', title: 'Phiếu thu', taxPct: 0, note: 'Tạm ứng theo báo giá số:', items: [item('Tạm ứng', 1, 0)], footer: 'Khoản tạm ứng sẽ được trừ vào phiếu thu cuối.', blocks: INVOICE_BLOCKS },
  { id: 'inv-final', design: 'boxed', kind: 'INV', name: 'Phiếu thu quyết toán', hint: 'Thanh toán đợt cuối', accent: '#1D1D1F', locale: 'vi', country: 'VN', currency: 'VND', title: 'Phiếu thu', taxPct: 10, note: 'Quyết toán theo hợp đồng / báo giá số:', items: [item('Giá trị hợp đồng', 1, 0), item('Trừ tạm ứng', 1, 0)], footer: VN_INVOICE, blocks: INVOICE_BLOCKS },
  { id: 'inv-vat', design: 'classic', kind: 'INV', name: 'Hóa đơn GTGT (VAT)', hint: 'Hóa đơn điện tử, có XML', accent: '#0A84FF', locale: 'vi', country: 'VN', currency: 'VND', title: 'Hóa đơn giá trị gia tăng', taxPct: 8, note: '', items: [item('Hàng hóa, dịch vụ', 1, 0)], footer: 'Hóa đơn được lập theo Nghị định 123/2020/NĐ-CP.', blocks: INVOICE_BLOCKS, eInvoice: true },
];

// ---- Việt Nam: 6 mẫu theo biểu mẫu thực tế (phiếu thu kế toán, phiếu thu viền đỏ, hóa đơn bán hàng kẻ ô, bán lẻ, báo giá kẻ ô) ----
// Modeled on printed forms: phiếu thu Mẫu số 01-TT, phiếu thu có viền đỏ, hóa đơn bán hàng và hóa đơn bán lẻ kẻ ô.
const VN_REF: Template[] = [
  { id: 'inv-ledger-01tt', design: 'ledger', form: 'form-01tt', kind: 'INV', name: 'Phiếu thu mẫu 01-TT', hint: 'Mẫu kế toán: phiếu thu có quyển số, nợ, có', accent: '#1E7B3A', locale: 'vi', country: 'VN', currency: 'VND', title: 'Phiếu thu', taxPct: 0, note: '', items: [item('Lý do nộp tiền', 1, 0)], footer: '', blocks: ['logo', 'title', 'client', 'items', 'totals', 'words', 'signature'] },
  { id: 'inv-redform-receipt', design: 'redform', form: 'form-abit', kind: 'INV', name: 'Phiếu thu viền đỏ', hint: 'Khung đỏ, phiếu thu học phí và khoản thu', accent: '#D7262E', locale: 'vi', country: 'VN', currency: 'VND', title: 'Phiếu thu', taxPct: 0, note: '', items: [item('Học phí / khoản thu', 1, 0)], footer: 'Phiếu thu có giá trị khi có chữ ký của thủ quỹ.', blocks: ['logo', 'title', 'client', 'items', 'totals', 'words', 'signature', 'footer'] },
  { id: 'inv-gridbill-sale', design: 'gridbill', form: 'form-gridbill', kind: 'INV', name: 'Hóa đơn bán hàng (kẻ ô)', hint: 'Bảng kẻ ô đỏ như hóa đơn in sẵn, có tổng cộng', accent: '#B3261E', locale: 'vi', country: 'VN', currency: 'VND', title: 'Hóa đơn bán hàng', taxPct: 0, note: '', items: [item('Mục khô', 1, 0), item('Cá chỉ', 1, 0), item('Lạc', 1, 0), item('Nem chua', 1, 0)], footer: 'Xin cảm ơn và hẹn gặp lại quý khách!', blocks: ['logo', 'title', 'client', 'items', 'totals', 'words', 'signature', 'footer'] },
  { id: 'inv-retail-bill', design: 'retailgrid', form: 'form-retail', kind: 'INV', name: 'Hóa đơn bán lẻ', hint: 'Bảng kẻ ô cam có cột ĐVT, cộng bằng chữ', accent: '#E67E22', locale: 'vi', country: 'VN', currency: 'VND', title: 'Hóa đơn bán lẻ', taxPct: 0, note: '', items: [item('Hàng hóa 1', 1, 0), item('Hàng hóa 2', 1, 0)], footer: '', blocks: ['logo', 'title', 'client', 'items', 'totals', 'words', 'signature'] },
  { id: 'quo-gridbill', design: 'gridbill', form: 'form-gridbill', kind: 'QUO', name: 'Báo giá kẻ ô', hint: 'Bảng kẻ ô đỏ, dùng cho báo giá hàng hóa', accent: '#B3261E', locale: 'vi', country: 'VN', currency: 'VND', title: 'Báo giá', taxPct: 8, note: '', items: [item('Hàng hóa 1', 1, 0), item('Hàng hóa 2', 1, 0), item('Hàng hóa 3', 1, 0)], footer: VN_QUOTE, blocks: QUOTE_BLOCKS },
  { id: 'quo-ledger', design: 'ledger', kind: 'QUO', name: 'Báo giá mẫu kế toán', hint: 'Tiêu đề căn giữa, dòng kẻ chấm', accent: '#1D3A8A', locale: 'vi', country: 'VN', currency: 'VND', title: 'Báo giá', taxPct: 8, note: '', items: [item('Hạng mục 1', 1, 0)], footer: VN_QUOTE, blocks: QUOTE_BLOCKS },
];

// ---- Quốc tế: 4 mẫu gốc (giữ id cũ để đơn cũ vẫn hiển thị đúng) ----
const EN_BASE: Template[] = [
  { id: 'quo-en-quotation', design: 'elegant', kind: 'QUO', name: 'Quotation', hint: 'Standard quotation, English', accent: '#3A86FF', locale: 'en', country: 'US', currency: 'USD', title: 'Quotation', taxPct: 0, note: 'Valid for 15 days', items: [item('Service / product 1', 1, 0), item('Service / product 2', 1, 0)], footer: 'Thank you for your interest.', blocks: QUOTE_BLOCKS },
  { id: 'quo-en-proforma', design: 'corporate', kind: 'QUO', name: 'Proforma Invoice', hint: 'Advance payment before shipping', accent: '#6D28D9', locale: 'en', country: 'US', currency: 'USD', title: 'Proforma Invoice', taxPct: 0, note: 'Payment terms: 50% advance, balance before shipment', items: [item('Goods', 1, 0)], footer: 'This proforma is not a tax invoice.', blocks: QUOTE_BLOCKS },
  { id: 'inv-en-commercial', design: 'boxed', kind: 'INV', name: 'Commercial Invoice', hint: 'Export shipments, customs', accent: '#0F766E', locale: 'en', country: 'US', currency: 'USD', title: 'Commercial Invoice', taxPct: 0, note: 'Incoterms: FOB · Country of origin: Vietnam', items: [item('Goods (HS code: ____)', 1, 0)], footer: 'We certify that this invoice is true and correct.', blocks: INVOICE_BLOCKS },
  { id: 'inv-en-receipt', design: 'receipt', kind: 'INV', name: 'Receipt', hint: 'Payment received, English', accent: '#16A34A', locale: 'en', country: 'US', currency: 'USD', title: 'Receipt', taxPct: 0, note: 'Payment method:', items: [item('Item / service', 1, 0)], footer: 'Thank you for your payment.', blocks: INVOICE_BLOCKS },
];

// ---- Quốc tế: 9 thị trường × 10 loại chứng từ = 90 mẫu ----
// Each market prints in its own language and currency. Tax names and rates were checked against public
// tables (2026): DE 19%, FR 20%, GB 20%, JP 10%, KR 10%, SG 9%, AU 10%, CA 5% federal GST (provinces add more).
// US has no national VAT: sales tax is set per state, so 0% is a placeholder. Always confirm with a local accountant.
const MARKETS: { code: string; name: string; lang: Lang; currency: string; taxPct: number; taxLabel?: string; note: string }[] = [
  { code: 'US', name: 'Hoa Kỳ', lang: 'en', currency: 'USD', taxPct: 0, taxLabel: 'Sales tax', note: 'Sales tax depends on the state' },
  { code: 'GB', name: 'Anh', lang: 'en', currency: 'GBP', taxPct: 20, note: 'VAT 20%' },
  { code: 'DE', name: 'Đức', lang: 'de', currency: 'EUR', taxPct: 19, note: 'MwSt. 19%' },
  { code: 'FR', name: 'Pháp', lang: 'fr', currency: 'EUR', taxPct: 20, note: 'TVA 20%' },
  { code: 'JP', name: 'Nhật Bản', lang: 'ja', currency: 'JPY', taxPct: 10, note: 'Consumption tax 10%' },
  { code: 'KR', name: 'Hàn Quốc', lang: 'ko', currency: 'KRW', taxPct: 10, note: 'VAT 10%' },
  { code: 'SG', name: 'Singapore', lang: 'en', currency: 'SGD', taxPct: 9, taxLabel: 'GST', note: 'GST 9%' },
  { code: 'AU', name: 'Úc', lang: 'en', currency: 'AUD', taxPct: 10, taxLabel: 'GST', note: 'GST 10%' },
  { code: 'CA', name: 'Canada', lang: 'en', currency: 'CAD', taxPct: 5, taxLabel: 'GST/HST', note: 'GST 5% federal, provinces differ' },
];
const DOC_TYPES: { key: DocKey; name: string; kind: DocKind; blocks: Block[] }[] = [
  { key: 'commercial', name: 'Commercial Invoice', kind: 'INV', blocks: INVOICE_BLOCKS },
  { key: 'proforma', name: 'Proforma Invoice', kind: 'QUO', blocks: QUOTE_BLOCKS },
  { key: 'quotation', name: 'Quotation', kind: 'QUO', blocks: QUOTE_BLOCKS },
  { key: 'receipt', name: 'Receipt', kind: 'INV', blocks: INVOICE_BLOCKS },
  { key: 'tax', name: 'Tax Invoice', kind: 'INV', blocks: INVOICE_BLOCKS },
  { key: 'credit', name: 'Credit Note', kind: 'INV', blocks: INVOICE_BLOCKS },
  { key: 'deposit', name: 'Deposit Invoice', kind: 'INV', blocks: INVOICE_BLOCKS },
  { key: 'delivery', name: 'Delivery Note', kind: 'INV', blocks: ['logo', 'title', 'client', 'items', 'signature', 'footer'] },
  { key: 'packing', name: 'Packing List', kind: 'INV', blocks: ['logo', 'title', 'client', 'items', 'footer'] },
  { key: 'payment', name: 'Payment Voucher', kind: 'INV', blocks: ['logo', 'title', 'client', 'totals', 'signature', 'footer'] },
];
const PALETTE = ['#0A84FF', '#5E5CE6', '#30B0C7', '#34C759', '#FF9F0A', '#FF375F', '#AC8E68', '#64D2FF', '#BF5AF2', '#8E8E93'];

// Receipts and vouchers print as narrow slips; other documents rotate through the six full-page designs, so each market shows them all.
const FULL_PAGE: DesignKey[] = ['classic', 'modern', 'minimal', 'boxed', 'corporate', 'elegant'];
function pickDesign(key: DocKey, mi: number, ti: number): DesignKey {
  if (key === 'receipt' || key === 'payment') return 'receipt';
  return FULL_PAGE[(mi + ti) % FULL_PAGE.length];
}

const GENERATED: Template[] = MARKETS.flatMap((m, mi) =>
  DOC_TYPES.map((t, ti) => {
    const L = LABELS[m.lang];
    const footer = t.kind === 'QUO' ? L.defaultFooterQuote : L.defaultFooterInvoice;
    return {
      id: `intl-${m.code}-${t.key}`,
      kind: t.kind,
      name: `${t.name} · ${m.code}`,
      hint: `${m.name} · ${m.currency} · ${m.note}`,
      accent: PALETTE[(mi + ti) % PALETTE.length],
      locale: m.lang,
      country: m.code,
      currency: m.currency,
      design: pickDesign(t.key, mi, ti),
      title: DOC_TITLES[m.lang][t.key],
      taxLabel: m.taxLabel,
      taxPct: m.taxPct,
      note: '',
      items: [item('Item description', 1, 0)],
      footer,
      blocks: t.blocks,
    };
  }),
);

export const TEMPLATES: Template[] = [...VN, ...VN_REF, ...EN_BASE, ...GENERATED];

// The default layout a template starts with; the customer may change it per document.
export function templateLayout(tpl: Template): Layout {
  return { design: tpl.design ?? 'classic', form: tpl.form, locale: tpl.locale, title: tpl.title, footer: tpl.footer, blocks: [...tpl.blocks], currency: tpl.currency, taxLabel: tpl.taxLabel };
}

export function templatesFor(kind: DocKind): Template[] {
  return TEMPLATES.filter(t => t.kind === kind);
}

export function findTemplate(id: string | undefined): Template | undefined {
  return TEMPLATES.find(t => t.id === id);
}

// The layout a document prints with: its own layout first, then its template, then the built-in default.
export function docLayout(doc: Doc): Layout {
  if (doc.layout) return { ...doc.layout, blocks: normalizeBlocks(doc.layout.blocks, doc.kind === 'QUO' ? QUOTE_BLOCKS : INVOICE_BLOCKS) };
  const tpl = findTemplate(doc.templateId);
  if (tpl) return templateLayout(tpl);
  const isQuote = doc.kind === 'QUO';
  return {
    locale: 'vi', title: isQuote ? 'Báo giá' : 'Phiếu thu', footer: isQuote ? 'Cảm ơn quý khách đã quan tâm.' : 'Cảm ơn quý khách đã tin tưởng.',
    blocks: [...(isQuote ? QUOTE_BLOCKS : INVOICE_BLOCKS)], currency: 'VND',
  };
}

