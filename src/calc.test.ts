// Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineTotal, documentTotals, canMove, nextNumber, formatVND, nextStatus, amountInWords, quoteToInvoice, calcDiscountPct, addCategoryToList, removeCategoryFromList, resolveProductPricing, type ConvertibleDoc, type DocInput } from './calc.ts';
import { TEMPLATES, templatesFor, findTemplate } from './templates.ts';
import { PLANS, formatPlanPrices } from './config/pricing.ts';
import { APPLE_TYPOGRAPHY_SCALE, FONT_CONFIG_BY_LANG, getPdfFontFamily, getSystemFont } from './typography.ts';
import { SUPPORTED_LANGUAGES, t } from './i18n.ts';

test('pricing: Free + Pro matching App Store (Pro monthly 1.99, yearly 9.99), ads only on Free', () => {
  assert.deepEqual(PLANS.map(p => p.id), ['free', 'pro']);
  assert.deepEqual(PLANS.map(p => p.hasAds), [true, false]);
  assert.deepEqual(formatPlanPrices(PLANS[0]), ['0 USD']);
  assert.deepEqual(formatPlanPrices(PLANS[1]), ['1.99 USD/tháng', '9.99 USD/năm']);
});

test('templates: 110 total, 16 VN and 94 international, unique ids, findTemplate works', () => {
  assert.equal(TEMPLATES.length, 110);
  assert.equal(templatesFor('QUO').length, 26);
  assert.equal(templatesFor('INV').length, 84);
  assert.equal(new Set(TEMPLATES.map(t => t.id)).size, 110);
  assert.equal(TEMPLATES.filter(t => t.country === 'VN').length, 16);
  assert.equal(TEMPLATES.filter(t => t.country !== 'VN').length, 94);
  assert.equal(findTemplate('inv-final')?.kind, 'INV');
  assert.equal(findTemplate('nope'), undefined);
});

test('decimal discount, qty and VAT, dot or comma', () => {
  assert.equal(lineTotal({ qty: '1,5', price: 100000, discountPct: '12,5' }), 131250);
  assert.equal(lineTotal({ qty: '1.5', price: 100000, discountPct: '12.5' }), 131250);
  const t = documentTotals({ items: [{ qty: 1, price: 1000000 }], discountPct: '2,5', taxPct: '8,5' });
  assert.deepEqual(t, { subtotal: 1000000, discount: 25000, tax: 82875, total: 1057875 });
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
test('quoteToInvoice: copies lines/discount/VAT into a new draft invoice, once, quotes only', () => {
  const quote: ConvertibleDoc & DocInput = { id: 'q1', kind: 'QUO', no: 'QUO-0001', status: 'sent', createdAt: 'a', templateId: 'quo-goods',
    items: [{ name: 'A', qty: 2, price: 500000 }], discountPct: 10, taxPct: 8 };
  const inv = quoteToInvoice(quote, 'i1', 'INV-0001', 'b');
  assert.ok(inv);
  assert.equal(inv.kind, 'INV');
  assert.equal(inv.no, 'INV-0001');
  assert.equal(inv.status, 'draft');
  assert.equal(inv.sourceId, 'q1');
  assert.equal(inv.templateId, undefined);
  assert.deepEqual(documentTotals(inv), documentTotals(quote));
  assert.notEqual(inv.items[0], quote.items[0]);
  assert.equal(quoteToInvoice({ ...quote, convertedTo: 'i1' }, 'i2', 'INV-0002', 'c'), null);
  assert.equal(quoteToInvoice({ ...quote, kind: 'INV' }, 'i2', 'INV-0002', 'c'), null);
});
test('amountInWords: Vietnamese reading rules', () => {
  assert.equal(amountInWords(0), 'Không đồng.');
  assert.equal(amountInWords(15), 'Mười lăm đồng.');
  assert.equal(amountInWords(21), 'Hai mươi mốt đồng.');
  assert.equal(amountInWords(105), 'Một trăm lẻ năm đồng.');
  assert.equal(amountInWords(1250000), 'Một triệu hai trăm năm mươi nghìn đồng.');
  assert.equal(amountInWords(1005000), 'Một triệu không trăm lẻ năm nghìn đồng.');
  assert.equal(amountInWords(2000000000), 'Hai tỷ đồng.');
  assert.equal(amountInWords(-500), 'Âm năm trăm đồng.');
});

test('typography: Apple typography scale and font configuration by language', () => {
  assert.equal(APPLE_TYPOGRAPHY_SCALE.largeTitle.fontSize, 34);
  assert.equal(APPLE_TYPOGRAPHY_SCALE.largeTitle.fontWeight, '700');
  assert.equal(APPLE_TYPOGRAPHY_SCALE.body.fontSize, 17);
  assert.equal(APPLE_TYPOGRAPHY_SCALE.footnote.fontSize, 13);

  // iOS system font maps to 'System' for both languages
  assert.equal(getSystemFont('vi', 'ios'), 'System');
  assert.equal(getSystemFont('en', 'ios'), 'System');

  // Web fallback includes SF Pro and standard fallbacks
  assert.ok(getSystemFont('vi', 'web')?.includes('SF Pro'));
  assert.ok(getSystemFont('en', 'web')?.includes('SF Pro'));

  // Vietnamese has higher line height factor for diacritical clearance
  assert.ok(FONT_CONFIG_BY_LANG.vi.lineHeightFactor >= 1.3);
  assert.ok(FONT_CONFIG_BY_LANG.en.lineHeightFactor >= 1.2);

  // PDF CSS font stacks contain SF Pro Text
  assert.ok(getPdfFontFamily('vi').includes('SF Pro'));
  assert.ok(getPdfFontFamily('en').includes('SF Pro'));
});

test('i18n: supported languages and translations for settings and startup', () => {
  assert.deepEqual(SUPPORTED_LANGUAGES.map(l => l.code), ['vi', 'en']);
  assert.equal(t('appTitle', 'vi'), 'Báo giá & Phiếu thu');
  assert.equal(t('appTitle', 'en'), 'Quotes & Receipts');
  assert.equal(t('settingsTitle', 'vi'), 'Cài đặt');
  assert.equal(t('settingsTitle', 'en'), 'Settings');
  assert.equal(t('welcomeTitle', 'vi'), 'Chào mừng bạn');
  assert.equal(t('welcomeTitle', 'en'), 'Welcome');
});

test('product catalog & categories: pricing, discount rate, category list management', () => {
  // calcDiscountPct
  assert.equal(calcDiscountPct(100000, 80000), 20);
  assert.equal(calcDiscountPct(200000, 150000), 25);
  assert.equal(calcDiscountPct(100000, 100000), 0);
  assert.equal(calcDiscountPct(100000, 120000), 0);
  assert.equal(calcDiscountPct(0, 50000), 0);
  assert.equal(calcDiscountPct(100000, 0), 0);

  // addCategoryToList
  const initialCats = ['Sản phẩm', 'Dịch vụ'];
  const withNew = addCategoryToList(initialCats, 'Thiết bị');
  assert.deepEqual(withNew, ['Sản phẩm', 'Dịch vụ', 'Thiết bị']);

  // Duplicate (case-insensitive) should not be added
  assert.deepEqual(addCategoryToList(withNew, 'thiết bị'), withNew);
  assert.deepEqual(addCategoryToList(withNew, '   '), withNew);

  // removeCategoryFromList
  const withoutCat = removeCategoryFromList(withNew, 'Thiết bị');
  assert.deepEqual(withoutCat, ['Sản phẩm', 'Dịch vụ']);

  // resolveProductPricing
  // When both listPrice and discountPrice are present and discountPrice < listPrice:
  const p1 = resolveProductPricing(100000, 80000);
  assert.equal(p1.effectivePrice, 100000);
  assert.equal(p1.discountPct, 20);

  // When only discountPrice
  const p2 = resolveProductPricing(0, 75000);
  assert.equal(p2.effectivePrice, 75000);
  assert.equal(p2.discountPct, 0);

  // When only listPrice
  const p3 = resolveProductPricing(120000, 0);
  assert.equal(p3.effectivePrice, 120000);
  assert.equal(p3.discountPct, 0);

  // When only legacy price
  const p4 = resolveProductPricing(0, 0, 50000);
  assert.equal(p4.effectivePrice, 50000);
  assert.equal(p4.discountPct, 0);
});


