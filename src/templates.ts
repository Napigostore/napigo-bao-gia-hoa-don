// Ready-made document templates: 6 quotes and 7 invoices/receipts, Vietnamese and international.
// Pure data, no UI. Layout is shared; each template sets its title, language, VAT default and footer.
import type { DocKind, LineItem } from './calc.ts';
import type { Locale } from './labels.ts';

export type Template = {
  id: string;
  kind: DocKind;
  name: string;
  hint: string;
  accent: string; // Apple system color used for the template badge and the PDF
  locale: Locale;
  title: string; // heading printed on the PDF
  taxPct: number;
  note: string;
  items: LineItem[];
  footer: string;
  eInvoice?: boolean; // Vietnamese VAT invoice: the app can export the e-invoice XML
};

const item = (name: string, qty: number, price: number): LineItem => ({ name, qty, price, discountPct: 0 });

export const TEMPLATES: Template[] = [
  // ---- Việt Nam ----
  {
    id: 'quo-service', kind: 'QUO', name: 'Báo giá dịch vụ', hint: 'Tư vấn, thiết kế, bảo trì', accent: '#007AFF', locale: 'vi', title: 'Báo giá', taxPct: 8, note: 'Hiệu lực báo giá: 15 ngày',
    items: [item('Phí dịch vụ', 1, 0), item('Chi phí phát sinh', 1, 0)],
    footer: 'Cảm ơn quý khách đã quan tâm.',
  },
  {
    id: 'quo-goods', kind: 'QUO', name: 'Báo giá hàng hóa', hint: 'Bán hàng theo số lượng', accent: '#5856D6', locale: 'vi', title: 'Báo giá', taxPct: 8, note: 'Giá chưa gồm phí vận chuyển',
    items: [item('Sản phẩm 1', 1, 0), item('Sản phẩm 2', 1, 0)],
    footer: 'Cảm ơn quý khách đã quan tâm.',
  },
  {
    id: 'quo-construction', kind: 'QUO', name: 'Báo giá xây dựng / sửa chữa', hint: 'Vật tư và nhân công', accent: '#FF9500', locale: 'vi', title: 'Báo giá', taxPct: 10, note: 'Địa điểm thi công:',
    items: [item('Vật tư', 1, 0), item('Nhân công', 1, 0), item('Vận chuyển', 1, 0)],
    footer: 'Báo giá có hiệu lực 30 ngày. Cảm ơn quý khách.',
  },
  {
    id: 'quo-project', kind: 'QUO', name: 'Báo giá dự án', hint: 'Chia giai đoạn thanh toán', accent: '#AF52DE', locale: 'vi', title: 'Báo giá', taxPct: 10, note: 'Thanh toán theo giai đoạn',
    items: [item('Giai đoạn 1 – Tạm ứng 30%', 1, 0), item('Giai đoạn 2 – Triển khai 40%', 1, 0), item('Giai đoạn 3 – Nghiệm thu 30%', 1, 0)],
    footer: 'Cảm ơn quý khách đã quan tâm.',
  },
  {
    id: 'inv-standard', kind: 'INV', name: 'Phiếu thu bán hàng', hint: 'Mẫu thông dụng nhất', accent: '#248A3D', locale: 'vi', title: 'Phiếu thu', taxPct: 8, note: '',
    items: [item('Sản phẩm / dịch vụ', 1, 0)],
    footer: 'Cảm ơn quý khách đã tin tưởng.',
  },
  {
    id: 'inv-service', kind: 'INV', name: 'Phiếu thu dịch vụ', hint: 'Thu phí dịch vụ theo kỳ', accent: '#30B0C7', locale: 'vi', title: 'Phiếu thu', taxPct: 8, note: 'Kỳ thanh toán:',
    items: [item('Phí dịch vụ', 1, 0)],
    footer: 'Cảm ơn quý khách đã tin tưởng.',
  },
  {
    id: 'inv-deposit', kind: 'INV', name: 'Phiếu thu tạm ứng', hint: 'Thu trước một phần', accent: '#C93400', locale: 'vi', title: 'Phiếu thu', taxPct: 0, note: 'Tạm ứng theo báo giá số:',
    items: [item('Tạm ứng', 1, 0)],
    footer: 'Khoản tạm ứng sẽ được trừ vào phiếu thu cuối.',
  },
  {
    id: 'inv-final', kind: 'INV', name: 'Phiếu thu quyết toán', hint: 'Thanh toán đợt cuối', accent: '#1D1D1F', locale: 'vi', title: 'Phiếu thu', taxPct: 10, note: 'Quyết toán theo hợp đồng / báo giá số:',
    items: [item('Giá trị hợp đồng', 1, 0), item('Trừ tạm ứng', 1, 0)],
    footer: 'Cảm ơn quý khách đã tin tưởng.',
  },
  {
    id: 'inv-vat', kind: 'INV', name: 'Hóa đơn GTGT (VAT)', hint: 'Hóa đơn điện tử, có XML', accent: '#0A84FF', locale: 'vi', title: 'Hóa đơn giá trị gia tăng', taxPct: 8, note: '',
    items: [item('Hàng hóa, dịch vụ', 1, 0)],
    footer: 'Hóa đơn được lập theo Nghị định 123/2020/NĐ-CP.', eInvoice: true,
  },
  // ---- Quốc tế (tiếng Anh) ----
  {
    id: 'quo-en-quotation', kind: 'QUO', name: 'Quotation', hint: 'Standard quotation, English', accent: '#3A86FF', locale: 'en', title: 'Quotation', taxPct: 0, note: 'Valid for 15 days',
    items: [item('Service / product 1', 1, 0), item('Service / product 2', 1, 0)],
    footer: 'Thank you for your interest.',
  },
  {
    id: 'quo-en-proforma', kind: 'QUO', name: 'Proforma Invoice', hint: 'Advance payment before shipping', accent: '#6D28D9', locale: 'en', title: 'Proforma Invoice', taxPct: 0, note: 'Payment terms: 50% advance, balance before shipment',
    items: [item('Goods', 1, 0)],
    footer: 'This proforma is not a tax invoice.',
  },
  {
    id: 'inv-en-commercial', kind: 'INV', name: 'Commercial Invoice', hint: 'Export shipments, customs', accent: '#0F766E', locale: 'en', title: 'Commercial Invoice', taxPct: 0, note: 'Incoterms: FOB · Country of origin: Vietnam',
    items: [item('Goods (HS code: ____)', 1, 0)],
    footer: 'We certify that this invoice is true and correct.',
  },
  {
    id: 'inv-en-receipt', kind: 'INV', name: 'Receipt', hint: 'Payment received, English', accent: '#16A34A', locale: 'en', title: 'Receipt', taxPct: 0, note: 'Payment method:',
    items: [item('Item / service', 1, 0)],
    footer: 'Thank you for your payment.',
  },
];

export function templatesFor(kind: DocKind): Template[] {
  return TEMPLATES.filter(t => t.kind === kind);
}

export function findTemplate(id: string | undefined): Template | undefined {
  return TEMPLATES.find(t => t.id === id);
}
