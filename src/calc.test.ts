// Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineTotal, documentTotals, canMove, nextNumber, formatVND, nextStatus } from './calc.ts';
import { TEMPLATES, templatesFor, findTemplate } from './templates.ts';
import { PLANS, formatUsdPerYear } from './config/pricing.ts';

test('pricing: 3 plans Free/Pro/Business with CEO prices, ads only on Free', () => {
  assert.deepEqual(PLANS.map(p => p.id), ['free', 'pro', 'business']);
  assert.deepEqual(PLANS.map(p => p.priceUsdPerYear), [0, 1.99, 4.99]);
  assert.deepEqual(PLANS.map(p => p.hasAds), [true, false, false]);
  assert.equal(formatUsdPerYear(PLANS[0]), '0 USD');
  assert.equal(formatUsdPerYear(PLANS[1]), '1.99 USD/năm');
  assert.equal(formatUsdPerYear(PLANS[2]), '4.99 USD/năm');
});

test('templates: 8 total, 4 per kind, unique ids, findTemplate works', () => {
  assert.equal(TEMPLATES.length, 8);
  assert.equal(templatesFor('QUO').length, 4);
  assert.equal(templatesFor('INV').length, 4);
  assert.equal(new Set(TEMPLATES.map(t => t.id)).size, 8);
  assert.equal(findTemplate('inv-final')?.kind, 'INV');
  assert.equal(findTemplate('nope'), undefined);
});

test('lineTotal basic and with discount', () => {
  assert.equal(lineTotal({ qty: 2, price: 150000 }), 300000);
  assert.equal(lineTotal({ qty: 2, price: 150000, discountPct: 10 }), 270000);
});
test('lineTotal clamps discount and treats bad input as 0', () => {
  assert.equal(lineTotal({ qty: 1, price: 100, discountPct: 150 }), 0);
  assert.equal(lineTotal({ qty: 1, price: 100, discountPct: -5 }), 100);
  assert.equal(lineTotal({}), 0);
  assert.equal(lineTotal({ qty: 'abc', price: 50 }), 0);
});
test('lineTotal rounds to 2 decimals', () => {
  assert.equal(lineTotal({ qty: 3, price: 0.1 }), 0.3);
});
test('documentTotals with line discount, doc discount and VAT', () => {
  const t = documentTotals({
    items: [{ qty: 2, price: 500000 }, { qty: 1, price: 200000, discountPct: 50 }],
    discountPct: 10, taxPct: 8,
  });
  assert.deepEqual(t, { subtotal: 1100000, discount: 110000, tax: 79200, total: 1069200 });
});
test('documentTotals of empty document is zero', () => {
  assert.deepEqual(documentTotals({}), { subtotal: 0, discount: 0, tax: 0, total: 0 });
});
test('status moves forward one step only', () => {
  assert.equal(canMove('draft', 'sent'), true);
  assert.equal(canMove('sent', 'paid'), true);
  assert.equal(canMove('draft', 'paid'), false);
  assert.equal(canMove('paid', 'draft'), false);
  assert.equal(nextStatus('paid'), null);
});
test('nextNumber pads and increments', () => {
  assert.equal(nextNumber('INV', 0), 'INV-0001');
  assert.equal(nextNumber('QUO', 41), 'QUO-0042');
});
test('formatVND groups thousands with dots', () => {
  assert.equal(formatVND(1500000), '1.500.000 ₫');
  assert.equal(formatVND(0), '0 ₫');
});
