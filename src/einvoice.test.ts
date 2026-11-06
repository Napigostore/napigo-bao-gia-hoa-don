// Run: node --test src/einvoice.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amountInWordsEn } from './calc.ts';
import { buildEInvoiceXml, eInvoiceFileName, eInvoiceSequence, splitSymbol, validateEInvoice } from './einvoice.ts';
import type { Doc } from './storage.ts';
import type { Seller } from './config/seller.ts';

const seller: Seller = {
  name: 'Công ty TNHH Napigo', taxCode: '0312345678', address: '1 Lê Lợi, Q1, TP.HCM', logoUri: '', signatureUri: '', signerName: '',
  bankCode: '', bankAccount: '', bankHolder: '', eInvoiceSymbol: '1C26TAA', eInvoiceProvider: '',
};

const doc: Doc = {
  id: 'd1', kind: 'INV', no: 'INV-0012', client: 'Nguyễn A & Con', clientTaxCode: '0101234567', clientEmail: 'a@example.com',
  note: '', items: [{ name: 'Dịch vụ <tư vấn>', qty: 2, price: 500000, discountPct: 0 }],
  discountPct: 0, taxPct: 10, status: 'draft', templateId: 'inv-vat', createdAt: '2026-11-06T03:00:00.000Z',
};

test('splitSymbol: first character is the form number', () => {
  assert.deepEqual(splitSymbol('1C26TAA'), { form: '1', series: 'C26TAA' });
});

test('eInvoiceSequence reads digits of the document number', () => {
  assert.equal(eInvoiceSequence('INV-0012'), 12);
  assert.equal(eInvoiceSequence('abc'), 0);
});

test('validate: complete invoice passes', () => {
  assert.deepEqual(validateEInvoice(doc, seller), []);
});

test('validate: reports every missing field at once', () => {
  const issues = validateEInvoice({ ...doc, client: '', no: 'X', items: [{ name: '', qty: 1, price: 1 }] }, { ...seller, taxCode: '123', eInvoiceSymbol: '' });
  const fields = issues.map(i => i.field);
  assert.ok(fields.includes('seller.taxCode'));
  assert.ok(fields.includes('seller.eInvoiceSymbol'));
  assert.ok(fields.includes('no'));
  assert.ok(fields.includes('client'));
  assert.ok(fields.includes('items[0].name'));
});

test('validate: buyer tax code is optional but must be 10 or 13 digits when given', () => {
  assert.deepEqual(validateEInvoice({ ...doc, clientTaxCode: '' }, seller), []);
  assert.equal(validateEInvoice({ ...doc, clientTaxCode: '12345' }, seller)[0]?.field, 'clientTaxCode');
});

test('XML: contains totals, escaped text and the VAT rate', () => {
  const xml = buildEInvoiceXml(doc, seller);
  assert.match(xml, /<KHMSHDon>1<\/KHMSHDon>/);
  assert.match(xml, /<KHHDon>C26TAA<\/KHHDon>/);
  assert.match(xml, /<SHDon>12<\/SHDon>/);
  assert.match(xml, /<NLap>2026-11-06<\/NLap>/);
  assert.match(xml, /<MST>0312345678<\/MST>/);
  assert.match(xml, /<Ten>Nguyễn A &amp; Con<\/Ten>/);
  assert.match(xml, /<THHDVu>Dịch vụ &lt;tư vấn&gt;<\/THHDVu>/);
  assert.match(xml, /<ThTien>1000000<\/ThTien>/);
  assert.match(xml, /<TSuat>10%<\/TSuat>/);
  assert.match(xml, /<TThue>100000<\/TThue>/);
  assert.match(xml, /<TgTTTBSo>1100000<\/TgTTTBSo>/);
  assert.match(xml, /<TgTTTBChu>Một triệu một trăm nghìn đồng\.<\/TgTTTBChu>/);
});

test('file name is safe for the file system', () => {
  assert.equal(eInvoiceFileName(doc, seller), 'HDDT_1C26TAA_12.xml');
});

test('amountInWordsEn: basic cases', () => {
  assert.equal(amountInWordsEn(0), 'Zero VND only.');
  assert.equal(amountInWordsEn(1250), 'One thousand two hundred fifty VND only.');
  assert.equal(amountInWordsEn(1100000, 'USD'), 'One million one hundred thousand USD only.');
});
