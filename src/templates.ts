// 8 ready-made document templates (4 quotes, 4 invoices). Pure data, no UI.
import type { DocKind, LineItem } from './calc.ts';

export type Template = {
  id: string;
  kind: DocKind;
  name: string;
  hint: string;
  accent: string; // Apple system color used for the template badge and the PDF
  taxPct: number;
  note: string;
  items: LineItem[];
  footer: string;
};

const item = (name: string, qty: number, price: number): LineItem => ({ name, qty, price, discountPct: 0 });

export const TEMPLATES: Template[] = [
  {
    id: 'quo-service', kind: 'QUO', name: 'Báo giá dịch vụ', hint: 'Tư vấn, thiết kế, bảo trì', accent: '#007AFF', taxPct: 8, note: 'Hiệu lực báo giá: 15 ngày',
    items: [item('Phí dịch vụ', 1, 0), item('Chi phí phát sinh', 1, 0)],
    footer: 'Cảm ơn quý khách đã quan tâm.',
  },
  {
    id: 'quo-goods', kind: 'QUO', name: 'Báo giá hàng hóa', hint: 'Bán hàng theo số lượng', accent: '#5856D6', taxPct: 8, note: 'Giá chưa gồm phí vận chuyển',
    items: [item('Sản phẩm 1', 1, 0), item('Sản phẩm 2', 1, 0)],
    footer: 'Cảm ơn quý khách đã quan tâm.',
  },
  {
    id: 'quo-construction', kind: 'QUO', name: 'Báo giá xây dựng / sửa chữa', hint: 'Vật tư và nhân công', accent: '#FF9500', taxPct: 10, note: 'Địa điểm thi công:',
    items: [item('Vật tư', 1, 0), item('Nhân công', 1, 0), item('Vận chuyển', 1, 0)],
    footer: 'Báo giá có hiệu lực 30 ngày. Cảm ơn quý khách.',
  },
  {
    id: 'quo-project', kind: 'QUO', name: 'Báo giá dự án', hint: 'Chia giai đoạn thanh toán', accent: '#AF52DE', taxPct: 10, note: 'Thanh toán theo giai đoạn',
    items: [item('Giai đoạn 1 – Tạm ứng 30%', 1, 0), item('Giai đoạn 2 – Triển khai 40%', 1, 0), item('Giai đoạn 3 – Nghiệm thu 30%', 1, 0)],
    footer: 'Cảm ơn quý khách đã quan tâm.',
  },
  {
    id: 'inv-standard', kind: 'INV', name: 'Phiếu thu bán hàng', hint: 'Mẫu thông dụng nhất', accent: '#248A3D', taxPct: 8, note: '',
    items: [item('Sản phẩm / dịch vụ', 1, 0)],
    footer: 'Cảm ơn quý khách đã tin tưởng.',
  },
  {
    id: 'inv-service', kind: 'INV', name: 'Phiếu thu dịch vụ', hint: 'Thu phí dịch vụ theo kỳ', accent: '#30B0C7', taxPct: 8, note: 'Kỳ thanh toán:',
    items: [item('Phí dịch vụ', 1, 0)],
    footer: 'Cảm ơn quý khách đã tin tưởng.',
  },
  {
    id: 'inv-deposit', kind: 'INV', name: 'Phiếu thu tạm ứng', hint: 'Thu trước một phần', accent: '#C93400', taxPct: 0, note: 'Tạm ứng theo báo giá số:',
    items: [item('Tạm ứng', 1, 0)],
    footer: 'Khoản tạm ứng sẽ được trừ vào phiếu thu cuối.',
  },
  {
    id: 'inv-final', kind: 'INV', name: 'Phiếu thu quyết toán', hint: 'Thanh toán đợt cuối', accent: '#1D1D1F', taxPct: 10, note: 'Quyết toán theo hợp đồng / báo giá số:',
    items: [item('Giá trị hợp đồng', 1, 0), item('Trừ tạm ứng', 1, 0)],
    footer: 'Cảm ơn quý khách đã tin tưởng.',
  },
];

export function templatesFor(kind: DocKind): Template[] {
  return TEMPLATES.filter(t => t.kind === kind);
}

export function findTemplate(id: string | undefined): Template | undefined {
  return TEMPLATES.find(t => t.id === id);
}
