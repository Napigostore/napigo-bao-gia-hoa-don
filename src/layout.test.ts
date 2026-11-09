// Run: node --test src/layout.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moveBlock, toggleBlock, normalizeBlocks, INVOICE_BLOCKS } from './layout.ts';
import { docLayout } from './templates.ts';

test('moveBlock swaps neighbours and stays put at the edges', () => {
  assert.deepEqual(moveBlock(['logo', 'title', 'items'], 1, -1), ['title', 'logo', 'items']);
  assert.deepEqual(moveBlock(['logo', 'title', 'items'], 0, -1), ['logo', 'title', 'items']);
  assert.deepEqual(moveBlock(['logo', 'title', 'items'], 2, 1), ['logo', 'title', 'items']);
});

test('toggleBlock removes a present block and appends a missing one', () => {
  assert.deepEqual(toggleBlock(['logo', 'items'], 'items'), ['logo']);
  assert.deepEqual(toggleBlock(['logo'], 'qr'), ['logo', 'qr']);
});

test('normalizeBlocks falls back when empty or only unknown names', () => {
  assert.deepEqual(normalizeBlocks(undefined, ['title']), ['title']);
  assert.deepEqual(normalizeBlocks([], ['title']), ['title']);
  assert.deepEqual(normalizeBlocks(['nope' as never], ['title']), ['title']);
  assert.deepEqual(normalizeBlocks(['items', 'logo'], ['title']), ['items', 'logo']);
});

test('docLayout: an old document with no layout uses its template, then the built-in default', () => {
  const doc = { id: 'x', kind: 'INV', no: 'INV-1', client: 'A', note: '', items: [], discountPct: 0, taxPct: 8, status: 'draft', templateId: 'inv-vat', createdAt: '2026-11-07T00:00:00Z' } as const;
  const l = docLayout(doc as never);
  assert.equal(l.title, 'Hóa đơn giá trị gia tăng');
  assert.equal(l.currency, 'VND');
  const plain = docLayout({ ...doc, templateId: undefined } as never);
  assert.deepEqual(plain.blocks, [...INVOICE_BLOCKS]);
  assert.equal(plain.title, 'Phiếu thu');
});

test('docLayout: a document layout overrides its template', () => {
  const doc = { id: 'x', kind: 'INV', no: 'INV-1', client: 'A', note: '', items: [], discountPct: 0, taxPct: 0, status: 'draft', templateId: 'intl-US-commercial', createdAt: '2026-11-07T00:00:00Z', layout: { locale: 'en', title: 'Custom', footer: 'f', blocks: ['title', 'items'], currency: 'EUR' } } as const;
  const l = docLayout(doc as never);
  assert.equal(l.title, 'Custom');
  assert.deepEqual(l.blocks, ['title', 'items']);
  assert.equal(l.currency, 'EUR');
});
