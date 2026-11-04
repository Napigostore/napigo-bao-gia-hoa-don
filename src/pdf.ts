// Builds a printable HTML document and opens the iOS share sheet (Save to Files / Print / AirPrint).
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { documentTotals, formatVND } from './calc.ts';
import type { Doc } from './storage.ts';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export function docHtml(doc: Doc): string {
  const t = documentTotals(doc);
  const rows = doc.items.map(it => {
    const qty = Number(it.qty) || 0, price = Number(it.price) || 0;
    return `<tr><td>${esc(String(it.name ?? ''))}</td><td class="r">${qty}</td><td class="r">${formatVND(price)}</td><td class="r">${Number(it.discountPct) || 0}%</td></tr>`;
  }).join('');
  const title = doc.kind === 'QUO' ? 'BÁO GIÁ' : 'HÓA ĐƠN';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
  <style>body{font-family:-apple-system,Helvetica,sans-serif;padding:24px;color:#111}h1{font-size:22px}
  table{width:100%;border-collapse:collapse;margin-top:12px}td,th{border-bottom:1px solid #ddd;padding:6px;font-size:13px}
  .r{text-align:right}.tot{margin-top:12px;font-size:14px;text-align:right;line-height:1.8}.big{font-size:17px;font-weight:bold}</style></head>
  <body><h1>${title} ${esc(doc.no)}</h1><div>Khách hàng: ${esc(doc.client)}</div><div>${esc(doc.note)}</div>
  <table><tr><th>Hạng mục</th><th class="r">SL</th><th class="r">Đơn giá</th><th class="r">CK</th></tr>${rows}</table>
  <div class="tot">Tạm tính: ${formatVND(t.subtotal)}<br>Chiết khấu: − ${formatVND(t.discount)}<br>VAT: ${formatVND(t.tax)}<br>
  <span class="big">Tổng cộng: ${formatVND(t.total)}</span></div></body></html>`;
}

export async function shareDocPdf(doc: Doc): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html: docHtml(doc) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: doc.no });
  } else {
    await Print.printAsync({ uri });
  }
}
