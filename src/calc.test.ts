// Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineTotal, documentTotals, canMove, nextNumber, formatVND, nextStatus } from './calc.ts';

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
