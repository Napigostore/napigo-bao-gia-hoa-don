// Builds a printable HTML document and opens the iOS share sheet (Save to Files / Print / AirPrint).
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { documentTotals, formatVND } from './calc.ts';
import type { Doc } from './storage.ts';
import { findTemplate } from './templates.ts';
import { SELLER } from './config/seller.ts';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export function docHtml(doc: Doc): string {
  const t = documentTotals(doc);
  const rows = doc.items.map(it => {
    const qty = Number(it.qty) || 0, price = Number(it.price) || 0;
    return `<tr><td>${esc(String(it.name ?? ''))}</td><td class="r">${qty}</td><td class="r">${formatVND(price)}</td><td class="r">${Number(it.discountPct) || 0}%</td></tr>`;
  }).join('');
  const isQuote = doc.kind === 'QUO';
  const title = isQuote ? 'Báo giá' : 'Hóa đơn';
  const tpl = findTemplate(doc.templateId);
  // Template accent when set; otherwise Apple system blue for quotes, system green for invoices.
  const accent = tpl?.accent ?? (isQuote ? '#007AFF' : '#248A3D');
  const footer = tpl?.footer ?? (isQuote ? 'Cảm ơn quý khách đã quan tâm.' : 'Cảm ơn quý khách đã tin tưởng.');
  const created = new Date(doc.createdAt);
  const date = isNaN(created.getTime()) ? '' : created.toLocaleDateString('vi-VN');
  const sellerLines = [
    SELLER.name && `<b>${esc(SELLER.name)}</b>`,
    SELLER.taxCode && `MST: ${esc(SELLER.taxCode)}`,
    SELLER.address && esc(SELLER.address),
  ].filter(Boolean).join('<br>');
  const seller = SELLER.logoUri || sellerLines
    ? `<div class="seller">${SELLER.logoUri ? `<img src="${esc(SELLER.logoUri)}">` : ''}<div>${sellerLines}</div></div>`
    : '';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
  <style>
  body{font-family:-apple-system,"SF Pro Text",Helvetica,Arial,sans-serif;margin:0;padding:40px 36px;color:#1D1D1F;-webkit-font-smoothing:antialiased}
  .head{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:16px;border-bottom:2px solid ${accent}}
  h1{font-size:34px;font-weight:700;letter-spacing:.4px;margin:0;color:${accent}}
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
  .foot{margin-top:40px;text-align:center;font-size:12px;color:#8E8E93}
  </style></head>
  <body>
  ${seller}
  <div class="head"><h1>${title}</h1><div class="no">${esc(doc.no)}${date ? `<br>${date}` : ''}</div></div>
  <div class="meta"><div class="lbl">Khách hàng</div><div class="client">${esc(doc.client)}</div>${doc.note ? `<div>${esc(doc.note)}</div>` : ''}</div>
  <table><tr><th>Hạng mục</th><th class="r">SL</th><th class="r">Đơn giá</th><th class="r">CK</th></tr>${rows}</table>
  <div class="tot"><div><span>Tạm tính</span><span>${formatVND(t.subtotal)}</span></div>
  <div><span>Chiết khấu</span><span>− ${formatVND(t.discount)}</span></div>
  <div><span>VAT ${Math.max(Number(doc.taxPct) || 0, 0)}%</span><span>${formatVND(t.tax)}</span></div>
  <div class="big"><span>Tổng cộng</span><span>${formatVND(t.total)}</span></div></div>
  <div class="foot">${esc(footer)}</div>
  </body></html>`;
}

export async function shareDocPdf(doc: Doc): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html: docHtml(doc) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: doc.no });
  } else {
    await Print.printAsync({ uri });
  }
}
