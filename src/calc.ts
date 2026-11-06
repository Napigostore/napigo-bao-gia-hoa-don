// App A core logic: pure functions, no UI, unit-tested with node --test.

export type LineItem = { name?: string; qty?: number | string; price?: number | string; discountPct?: number | string };
export type DocInput = { items?: LineItem[]; discountPct?: number | string; taxPct?: number | string };
export type Totals = { subtotal: number; discount: number; tax: number; total: number };
export type Status = 'draft' | 'sent' | 'paid';
export type DocKind = 'QUO' | 'INV';

export const STATUS_FLOW: Status[] = ['draft', 'sent', 'paid'];

export function round2(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function pct(v: number | string | undefined): number {
  return Math.min(Math.max(Number(v) || 0, 0), 100);
}

export function lineTotal(item: LineItem): number {
  const qty = Number(item.qty) || 0;
  const price = Number(item.price) || 0;
  return round2(qty * price * (1 - pct(item.discountPct) / 100));
}

export function documentTotals(doc: DocInput): Totals {
  const items = Array.isArray(doc.items) ? doc.items : [];
  const subtotal = round2(items.reduce((sum, it) => sum + lineTotal(it), 0));
  const afterDiscount = round2(subtotal * (1 - pct(doc.discountPct) / 100));
  const taxPct = Math.max(Number(doc.taxPct) || 0, 0);
  const tax = round2((afterDiscount * taxPct) / 100);
  return { subtotal, discount: round2(subtotal - afterDiscount), tax, total: round2(afterDiscount + tax) };
}

export function canMove(from: Status, to: Status): boolean {
  const a = STATUS_FLOW.indexOf(from);
  const b = STATUS_FLOW.indexOf(to);
  return a !== -1 && b !== -1 && b === a + 1;
}

export function nextStatus(s: Status): Status | null {
  const i = STATUS_FLOW.indexOf(s);
  return i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
}

export function nextNumber(prefix: DocKind, lastNumber: number): string {
  const n = (Number(lastNumber) || 0) + 1;
  return `${prefix}-${String(n).padStart(4, '0')}`;
}

export type ConvertibleDoc = {
  id: string; kind: DocKind; no: string; status: Status; items: LineItem[]; createdAt: string;
  templateId?: string; sourceId?: string; convertedTo?: string;
};

// A quote becomes a draft invoice with the same customer, lines, discount and VAT; null if it is not a quote or was already converted.
export function quoteToInvoice<T extends ConvertibleDoc>(quote: T, invoiceId: string, invoiceNo: string, now: string): T | null {
  if (quote.kind !== 'QUO' || quote.convertedTo) return null;
  return {
    ...quote,
    id: invoiceId,
    kind: 'INV',
    no: invoiceNo,
    status: 'draft',
    items: quote.items.map(it => ({ ...it })),
    templateId: undefined,
    sourceId: quote.id,
    convertedTo: undefined,
    createdAt: now,
  };
}

export function formatVND(n: number): string {
  const v = Math.round(Number(n) || 0);
  return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' ₫';
}

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const SCALES = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

// Reads one 0..999 group; `full` keeps the leading "không trăm" when a higher group exists.
function readGroup(n: number, full: boolean): string {
  const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), u = n % 10;
  const words: string[] = [];
  if (h > 0 || full) words.push(DIGITS[h], 'trăm');
  if (t === 0) {
    if (u > 0 && (h > 0 || full)) words.push('lẻ');
  } else {
    words.push(t === 1 ? 'mười' : `${DIGITS[t]} mươi`);
  }
  if (u > 0) words.push(u === 1 && t > 1 ? 'mốt' : u === 5 && t > 0 ? 'lăm' : DIGITS[u]);
  return words.join(' ');
}

// Amount in Vietnamese words for invoices, e.g. 1.250.000 -> "Một triệu hai trăm năm mươi nghìn đồng."
export function amountInWords(n: number): string {
  const v = Math.round(Number(n) || 0);
  if (!Number.isSafeInteger(v)) return '';
  if (v === 0) return 'Không đồng.';
  const groups: number[] = [];
  for (let rest = Math.abs(v); rest > 0; rest = Math.floor(rest / 1000)) groups.push(rest % 1000);
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue;
    parts.push(readGroup(groups[i], i < groups.length - 1), SCALES[i]);
  }
  const text = `${v < 0 ? 'âm ' : ''}${parts.filter(Boolean).join(' ')} đồng.`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
