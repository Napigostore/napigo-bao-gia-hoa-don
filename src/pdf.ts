// Builds a printable HTML document and opens the iOS share sheet (Save to Files / Print / AirPrint).
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { amountInWords, amountInWordsEn, documentTotals, formatVND, lineTotal } from './calc.ts';
import type { Doc } from './storage.ts';
import { findTemplate } from './templates.ts';
import { LABELS, type Locale } from './labels.ts';
import { SELLER, type Seller } from './config/seller.ts';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

// Vietnamese documents use "1.250.000 ₫"; international templates print "1,250,000 VND".
const money = (n: number, locale: Locale) => (locale === 'vi' ? formatVND(n) : `${Math.round(n).toLocaleString('en-US')} VND`);

export function docHtml(doc: Doc, seller: Seller = SELLER): string {
  const tpl = findTemplate(doc.templateId);
  const locale: Locale = tpl?.locale ?? 'vi';
  const L = LABELS[locale];
  const t = documentTotals(doc);
  const rows = doc.items.map((it, i) => {
    const qty = Number(it.qty) || 0, price = Number(it.price) || 0;
    return `<tr><td class="c">${i + 1}</td><td>${esc(String(it.name ?? ''))}</td><td class="r">${qty}</td><td class="r">${money(price, locale)}</td><td class="r">${Number(it.discountPct) || 0}%</td><td class="r b">${money(lineTotal(it), locale)}</td></tr>`;
  }).join('');
  const isQuote = doc.kind === 'QUO';
  const title = tpl?.title ?? (isQuote ? L.quoteTitle : L.invoiceTitle);
  // Template accent when set; otherwise Apple system blue for quotes, system green for invoices.
  const accent = tpl?.accent ?? (isQuote ? '#007AFF' : '#248A3D');
  const footer = tpl?.footer ?? (isQuote ? L.defaultFooterQuote : L.defaultFooterInvoice);
  const created = new Date(doc.createdAt);
  const date = isNaN(created.getTime()) ? '' : created.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US');
  const sellerLines = [
    seller.name && `<b>${esc(seller.name)}</b>`,
    seller.taxCode && `${L.taxCode}: ${esc(seller.taxCode)}`,
    seller.address && esc(seller.address),
  ].filter(Boolean).join('<br>');
  const sellerBlock = doc.showSeller !== false && (seller.logoUri || sellerLines)
    ? `<div class="seller">${seller.logoUri ? `<img src="${esc(seller.logoUri)}">` : ''}<div>${sellerLines}</div></div>`
    : '';
  const clientLines = [
    doc.clientPhone && `${L.phone}: ${esc(doc.clientPhone)}`,
    doc.clientTaxCode && `${L.taxCode}: ${esc(doc.clientTaxCode)}`,
    doc.clientEmail && `${L.email}: ${esc(doc.clientEmail)}`,
    doc.clientAddress && esc(doc.clientAddress),
    doc.note && esc(doc.note),
  ].filter(Boolean).map(l => `<div>${l}</div>`).join('');
  // VietQR image (img.vietqr.io) prefilled with the amount and document number; invoices only, needs bank details.
  const qrUrl = `https://img.vietqr.io/image/${encodeURIComponent(seller.bankCode)}-${encodeURIComponent(seller.bankAccount)}-compact2.png?amount=${Math.round(t.total)}&addInfo=${encodeURIComponent(doc.no)}&accountName=${encodeURIComponent(seller.bankHolder)}`;
  const qrBlock = !isQuote && seller.bankCode && seller.bankAccount
    ? `<div class="qr"><img src="${esc(qrUrl)}"><div>${L.payQr}<br><b>${esc(seller.bankHolder)}</b><br>${esc(seller.bankCode)} · ${esc(seller.bankAccount)}</div></div>`
    : '';
  const quoteSign = locale === 'vi' ? ['Khách hàng xác nhận', 'Người lập báo giá'] : ['Customer acceptance', 'Prepared by'];
  const signBlock = `<div class="sign"><div><b>${isQuote ? quoteSign[0] : L.signBuyer}</b><small>${L.signHint}</small></div>
  <div><b>${isQuote ? quoteSign[1] : L.signSeller}</b><small>${L.signHint}</small>${seller.signatureUri ? `<img src="${esc(seller.signatureUri)}">` : '<span class="space"></span>'}${seller.signerName ? esc(seller.signerName) : ''}</div></div>`;
  const words = locale === 'vi' ? amountInWords(t.total) : amountInWordsEn(t.total);
  // Hóa đơn GTGT has its own legal wording; the internal-document note only applies to receipts.
  const internal = !isQuote && !tpl?.eInvoice ? `<br><small>${L.internalNote}</small>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
  <style>
  body{font-family:-apple-system,"SF Pro Text",Helvetica,Arial,sans-serif;margin:0;padding:40px 36px;color:#1D1D1F;-webkit-font-smoothing:antialiased}
  .head{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:16px;border-bottom:2px solid ${accent}}
  h1{font-size:30px;font-weight:700;letter-spacing:.4px;margin:0;color:${accent}}
  .no{font-size:15px;color:#6E6E73;text-align:right;line-height:1.5}
  .seller{display:flex;align-items:center;gap:12px;margin-bottom:14px;font-size:12px;line-height:1.5;color:#6E6E73}
  .seller img{max-width:56px;max-height:56px;object-fit:contain}
  .meta{margin-top:20px;background:#F5F5F7;border-radius:14px;padding:14px 18px;font-size:14px;line-height:1.6}
  .lbl{font-size:12px;color:#8E8E93;text-transform:uppercase;letter-spacing:.5px}
  .client{font-size:17px;font-weight:600}
  table{width:100%;border-collapse:collapse;margin-top:24px}
  th{font-size:12px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:.5px;text-align:left;padding:8px 6px;border-bottom:1px solid #D2D2D7}
  td{border-bottom:1px solid #E5E5EA;padding:12px 6px;font-size:14px}
  .r{text-align:right}
  .tot{margin:20px 0 0 auto;width:280px;font-size:14px}
  .tot div{display:flex;justify-content:space-between;padding:5px 0;color:#6E6E73}
  .tot .big{margin-top:6px;padding:12px 14px;border-radius:12px;background:${accent};color:#fff;font-size:18px;font-weight:700}
  .c{text-align:center;width:28px;color:#8E8E93}
  .b{font-weight:600}
  .words{margin-top:16px;font-size:14px;font-style:italic;color:#1D1D1F}
  .qr{display:flex;align-items:center;gap:14px;margin-top:24px;font-size:12px;line-height:1.5;color:#6E6E73}
  .qr img{width:120px;height:120px;object-fit:contain}
  .sign{display:flex;justify-content:space-around;margin-top:32px;text-align:center;font-size:14px}
  .sign div{width:44%;display:flex;flex-direction:column;align-items:center}
  .sign small{font-size:11px;color:#8E8E93;margin-bottom:6px}
  .sign img{max-height:64px;max-width:160px;object-fit:contain}
  .sign .space{height:64px}
  .foot{margin-top:40px;text-align:center;font-size:12px;color:#8E8E93}
  .note-vat{margin-top:8px;font-size:12px;font-style:italic;color:#8E8E93}
  </style></head>
  <body>
  ${sellerBlock}
  <div class="head"><h1>${esc(title)}</h1><div class="no">${L.no} ${esc(doc.no)}${date ? `<br>${L.date}: ${date}` : ''}</div></div>
  <div class="meta"><div class="lbl">${L.customer}</div><div class="client">${esc(doc.client)}</div>${clientLines}</div>
  <table><tr><th class="c">${L.no_col}</th><th>${L.item}</th><th class="r">${L.qty}</th><th class="r">${L.price}</th><th class="r">${L.discount}</th><th class="r">${L.amount}</th></tr>${rows}</table>
  ${locale === 'vi' ? `<div class="note-vat">${L.vatNote}</div>` : ''}
  <div class="tot"><div><span>${L.subtotal}</span><span>${money(t.subtotal, locale)}</span></div>
  <div><span>${L.discountTotal}</span><span>− ${money(t.discount, locale)}</span></div>
  <div><span>${L.vat(Math.max(Number(doc.taxPct) || 0, 0))}</span><span>${money(t.tax, locale)}</span></div>
  <div class="big"><span>${L.total}</span><span>${money(t.total, locale)}</span></div></div>
  <div class="words">${L.inWords}: ${esc(words)}</div>
  ${qrBlock}
  ${signBlock}
  <div class="foot">${esc(footer)}${internal}</div>
  </body></html>`;
}

export async function printDoc(doc: Doc, seller: Seller = SELLER): Promise<void> {
  await Print.printAsync({ html: docHtml(doc, seller) });
}

export async function shareDocPdf(doc: Doc, seller: Seller = SELLER): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html: docHtml(doc, seller) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: doc.no });
  } else {
    await Print.printAsync({ uri });
  }
}
