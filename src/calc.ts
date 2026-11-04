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

export function formatVND(n: number): string {
  const v = Math.round(Number(n) || 0);
  return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' ₫';
}
