// Document layout: which blocks print, in what order, and the printed title, footer and currency.
// A template carries a default layout; the customer can change it per document and save it as a personal template.
import type { Lang } from './labels.ts';

export const BLOCKS = ['logo', 'title', 'client', 'items', 'totals', 'words', 'qr', 'signature', 'footer'] as const;
export type Block = (typeof BLOCKS)[number];

export const BLOCK_LABEL: Record<Block, string> = {
  logo: 'Logo và thông tin công ty',
  title: 'Tiêu đề và số chứng từ',
  client: 'Khách hàng',
  items: 'Bảng hàng hóa',
  totals: 'Tổng tiền',
  words: 'Bằng chữ',
  qr: 'Mã VietQR thanh toán',
  signature: 'Chữ ký',
  footer: 'Chân trang',
};

// Print design: the overall look of the form (structure and styling), not only colors.
export type DesignKey = 'classic' | 'modern' | 'minimal' | 'boxed' | 'corporate' | 'elegant' | 'receipt' | 'ledger' | 'redform' | 'gridbill' | 'retailgrid';
export const DESIGNS: Record<DesignKey, { label: string; hint: string }> = {
  classic: { label: 'Cổ điển', hint: 'Tiêu đề có vạch, bảng nền xám' },
  modern: { label: 'Hiện đại', hint: 'Dải màu trên cùng, bảng nổi' },
  minimal: { label: 'Tối giản', hint: 'Không nền, chỉ có đường kẻ mỏng' },
  boxed: { label: 'Khung', hint: 'Mỗi phần nằm trong khung, bảng kẻ ô' },
  corporate: { label: 'Doanh nghiệp', hint: 'Thanh màu bên trái, tiêu đề in hoa' },
  elegant: { label: 'Thanh lịch', hint: 'Chữ serif, tiêu đề căn giữa' },
  receipt: { label: 'Hóa đơn nhỏ', hint: 'Khổ hẹp kiểu máy in bill' },
  ledger: { label: 'Mẫu kế toán', hint: 'Tiêu đề căn giữa, dòng kẻ chấm để điền tay' },
  redform: { label: 'Viền đỏ', hint: 'Khung đỏ quanh trang, tiêu đề đỏ in hoa' },
  gridbill: { label: 'Bảng kẻ ô', hint: 'Bảng kẻ ô đỏ như hóa đơn bán hàng in sẵn' },
  retailgrid: { label: 'Bán lẻ', hint: 'Bảng kẻ ô cam, có cột đơn vị tính' },
};

// Real paper-form layouts (forms.ts): when set, the form's own fixed layout prints instead of the block list.
export type FormKey = 'form-01tt' | 'form-abit' | 'form-gridbill' | 'form-retail';

export type Layout = {
  design?: DesignKey;
  form?: FormKey;
  locale: Lang; // language of the printed labels
  title: string;
  footer: string;
  blocks: Block[];
  currency: string; // ISO code: VND, USD, EUR...
  taxLabel?: string; // VAT / GST / Sales tax...; empty = "VAT"
  font?: FontKey; // whole-document font; default system
  blockStyle?: Partial<Record<Block, BlockStyle>>; // per-part size, font and zoom set by pinch / sliders
};

export type FontKey = 'system' | 'helvetica' | 'serif' | 'georgia' | 'mono';
export const FONTS: Record<FontKey, { label: string; css: string }> = {
  system: { label: 'Hệ thống', css: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
  helvetica: { label: 'Helvetica', css: 'Helvetica, Arial, sans-serif' },
  serif: { label: 'Times', css: '"Times New Roman", Times, serif' },
  georgia: { label: 'Georgia', css: 'Georgia, serif' },
  mono: { label: 'Courier', css: '"Courier New", Courier, monospace' },
};

export type Align = 'left' | 'center' | 'right';
export const ALIGNS: Align[] = ['left', 'center', 'right'];
export const ALIGN_LABEL: Record<Align, string> = { left: 'Trái', center: 'Giữa', right: 'Phải' };

export type BlockStyle = {
  scale: number; // zoom of the whole part, 0.6 to 1.6
  size: number; // base font size in px, 9 to 20
  font?: FontKey;
  align?: Align; // position of the part on the page; empty = the part's default
};
export const DEFAULT_BLOCK_STYLE: BlockStyle = { scale: 1, size: 13 };

// Where a part sits when the customer has not chosen an alignment.
export function defaultAlign(b: Block, design: DesignKey = 'classic'): Align {
  const centered = design === 'elegant' || design === 'receipt' || design === 'ledger' || design === 'redform';
  if (b === 'footer') return 'center';
  if (b === 'totals') return 'right';
  if (b === 'title' || b === 'words') return centered ? 'center' : design === 'corporate' && b === 'title' ? 'right' : 'left';
  return 'left';
}
export const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);


export const INVOICE_BLOCKS: Block[] = ['logo', 'title', 'client', 'items', 'totals', 'words', 'qr', 'signature', 'footer'];
export const QUOTE_BLOCKS: Block[] = ['logo', 'title', 'client', 'items', 'totals', 'words', 'signature', 'footer'];

export function moveBlock(blocks: Block[], index: number, dir: -1 | 1): Block[] {
  const to = index + dir;
  if (to < 0 || to >= blocks.length) return blocks;
  const next = [...blocks];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

export function toggleBlock(blocks: Block[], b: Block): Block[] {
  return blocks.includes(b) ? blocks.filter(x => x !== b) : [...blocks, b];
}

// Keeps the saved order and appends any block that is missing, so an old layout still prints everything it should.
export function normalizeBlocks(blocks: Block[] | undefined, fallback: Block[]): Block[] {
  if (!blocks || !blocks.length) return [...fallback];
  const valid = blocks.filter(b => (BLOCKS as readonly string[]).includes(b));
  return valid.length ? valid : [...fallback];
}

// Moves the part at `from` to position `to`; drag can jump several rows.
export function moveTo(blocks: Block[], from: number, to: number): Block[] {
  if (from === to || from < 0 || to < 0 || from >= blocks.length || to >= blocks.length) return blocks;
  const next = [...blocks];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
