// Builds a printable HTML document from the document's layout and opens the iOS share sheet (Save to Files / Print / AirPrint).
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { amountInWords, amountInWordsEn, documentTotals, formatVND, lineTotal, type Totals } from './calc.ts';
import type { Doc } from './storage.ts';
import { docLayout, findTemplate } from './templates.ts';
import { LABELS, type Labels } from './labels.ts';
import type { Block, Layout } from './layout.ts';
import { SELLER, type Seller } from './config/seller.ts';
import { resolvePdfFont } from './font.ts';
import { FORM_CSS, formBody } from './forms.ts';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

// Money: VND uses "1.250.000 ₫"; other currencies use the currency's own symbol and decimals.
export function money(n: number, currency: string): string {
  if (currency === 'VND') return formatVND(n);
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

function sellerBlock(seller: Seller, L: Labels, showLogo: boolean): string {
  const lines = [
    seller.name && `<b>${esc(seller.name)}</b>`,
    seller.taxCode && `${L.taxCode}: ${esc(seller.taxCode)}`,
    seller.address && esc(seller.address),
  ].filter(Boolean).join('<br>');
  if (!(seller.logoUri || lines)) return '';
  return `<div class="seller">${showLogo && seller.logoUri ? `<img src="${esc(seller.logoUri)}">` : ''}<div>${lines}</div></div>`;
}

function titleBlock(doc: Doc, title: string, L: Labels, locale: Layout['locale']): string {
  const created = new Date(doc.createdAt);
  const date = isNaN(created.getTime()) ? '' : created.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US');
  return `<div class="head"><h1>${esc(title)}</h1><div class="no">${L.no} ${esc(doc.no)}${date ? `<br>${L.date}: ${date}` : ''}</div></div>`;
}

function clientBlock(doc: Doc, L: Labels): string {
  const lines = [
    doc.clientPhone && `${L.phone}: ${esc(doc.clientPhone)}`,
    doc.clientTaxCode && `${L.taxCode}: ${esc(doc.clientTaxCode)}`,
    doc.clientEmail && `${L.email}: ${esc(doc.clientEmail)}`,
    doc.clientAddress && esc(doc.clientAddress),
    doc.note && esc(doc.note),
  ].filter(Boolean).map(l => `<div>${l}</div>`).join('');
  return `<div class="meta"><div class="lbl">${L.customer}</div><div class="client">${esc(doc.client)}</div>${lines}</div>`;
}

function itemsBlock(doc: Doc, layout: Layout, L: Labels): string {
  const rows = doc.items.map((it, i) => {
    const qty = Number(it.qty) || 0, price = Number(it.price) || 0;
    return `<tr><td class="c">${i + 1}</td><td>${esc(String(it.name ?? ''))}</td><td class="r">${qty}</td><td class="r">${money(price, layout.currency)}</td><td class="r">${Number(it.discountPct) || 0}%</td><td class="r b">${money(lineTotal(it), layout.currency)}</td></tr>`;
  }).join('');
  const table = `<table><tr><th class="c">${L.no_col}</th><th>${L.item}</th><th class="r">${L.qty}</th><th class="r">${L.price}</th><th class="r">${L.discount}</th><th class="r">${L.amount}</th></tr>${rows}</table>`;
  const vatNote = layout.locale === 'vi' ? `<div class="note-vat">${L.vatNote}</div>` : '';
  return table + vatNote;
}

function totalsBlock(doc: Doc, t: Totals, layout: Layout, L: Labels, accent: string): string {
  const pct = Math.max(Number(doc.taxPct) || 0, 0);
  const taxName = layout.taxLabel ? `${layout.taxLabel} (${pct}%)` : L.vat(pct);
  return `<div class="tot"><div><span>${L.subtotal}</span><span>${money(t.subtotal, layout.currency)}</span></div>
  <div><span>${L.discountTotal}</span><span>− ${money(t.discount, layout.currency)}</span></div>
  <div><span>${esc(taxName)}</span><span>${money(t.tax, layout.currency)}</span></div>
  <div class="big" style="background:${accent}"><span>${L.total}</span><span>${money(t.total, layout.currency)}</span></div></div>`;
}

function wordsBlock(t: Totals, layout: Layout, L: Labels): string {
  const words = layout.locale === 'vi' ? amountInWords(t.total) : amountInWordsEn(t.total, layout.currency);
  return `<div class="words">${L.inWords}: ${esc(words)}</div>`;
}

function qrBlock(doc: Doc, t: Totals, seller: Seller, layout: Layout): string {
  const who = `<b>${esc(seller.bankHolder)}</b><br>${esc(seller.bankCode)} · ${esc(seller.bankAccount)}`;
  // A QR image the shop uploaded works for any bank and any language.
  if (seller.bankQrUri) {
    return `<div class="qr"><img src="${esc(seller.bankQrUri)}"><div>${layout.locale === 'vi' ? 'Quét mã để thanh toán' : 'Scan to pay'}<br>${who}</div></div>`;
  }
  // Otherwise a VietQR image (img.vietqr.io) prefilled with the amount and document number; Vietnamese only.
  if (layout.locale !== 'vi' || !(seller.bankCode && seller.bankAccount)) return '';
  const qrUrl = `https://img.vietqr.io/image/${encodeURIComponent(seller.bankCode)}-${encodeURIComponent(seller.bankAccount)}-compact2.png?amount=${Math.round(t.total)}&addInfo=${encodeURIComponent(doc.no)}&accountName=${encodeURIComponent(seller.bankHolder)}`;
  return `<div class="qr"><img src="${esc(qrUrl)}"><div>Quét mã VietQR để thanh toán<br>${who}</div></div>`;
}

function signatureBlock(doc: Doc, seller: Seller, L: Labels, isQuote: boolean, locale: Layout['locale']): string {
  const quoteSign = locale === 'vi' ? ['Khách hàng xác nhận', 'Người lập báo giá'] : ['Customer acceptance', 'Prepared by'];
  const left = isQuote ? quoteSign[0] : L.signBuyer;
  const right = isQuote ? quoteSign[1] : L.signSeller;
  return `<div class="sign"><div><b>${left}</b><small>${L.signHint}</small></div>
  <div><b>${right}</b><small>${L.signHint}</small>${seller.signatureUri ? `<img src="${esc(seller.signatureUri)}">` : '<span class="space"></span>'}${seller.signerName ? esc(seller.signerName) : ''}</div></div>`;
}

// Each design restyles the same blocks: header, table, totals and spacing.
const DESIGN_CSS = `
  .d-modern .head{background:var(--accent,#0A84FF);color:#fff;border-bottom:none;padding:18px 20px;margin:-40px -36px 0}
  .d-modern h1,.d-modern .no{color:#fff}
  .d-modern th{background:#F2F2F7;color:#1D1D1F}
  .d-minimal .meta{background:none;border-left:3px solid #1D1D1F;border-radius:0;padding:4px 12px}
  .d-minimal .head{border-bottom:none}
  .d-minimal h1{font-weight:300;letter-spacing:4px;color:#1D1D1F}
  .d-minimal th{background:none;color:#1D1D1F;border-bottom:1px solid #1D1D1F}
  .d-minimal td{border-bottom:1px solid #E5E5EA}
  .d-boxed .part{border:1px solid #C7C7CC;border-radius:6px;padding:10px 12px}
  .d-boxed td,.d-boxed th{border:1px solid #D1D1D6}
  .d-corporate .head{flex-direction:row-reverse;border-bottom:none;border-left:8px solid #1D1D1F;padding-left:14px}
  .d-corporate h1{text-transform:uppercase;letter-spacing:2px;font-size:1.6em}
  .d-corporate .meta{background:#F5F5F7}
  .d-elegant{font-family:Georgia,"Times New Roman",serif}
  .d-elegant .head{flex-direction:column;align-items:center;border-bottom:3px double #1D1D1F}
  .d-elegant h1{font-style:italic;font-weight:400;letter-spacing:2px;text-align:center}
  .d-elegant .no{text-align:center}
  .d-elegant th{font-style:italic;text-transform:none;letter-spacing:0}
  .d-receipt{max-width:300px;margin:0 auto}
  .d-receipt body,.d-receipt{font-family:"Courier New",Courier,monospace}
  .d-receipt th,.d-receipt td{border:none;border-bottom:1px dashed #8E8E93;padding:6px 2px}
  .d-receipt .meta{background:none;border-radius:0;padding:4px 0;border-bottom:1px dashed #8E8E93}
  .d-receipt .tot .big{background:#1D1D1F !important}
  .d-ledger{font-family:"Times New Roman",Times,serif}
  .d-ledger .head{flex-direction:column;align-items:center;border-bottom:none;padding-bottom:4px}
  .d-ledger h1{font-size:26px;color:#1D1D1F;letter-spacing:1px;text-transform:uppercase}
  .d-ledger .no{text-align:center;font-style:italic}
  .d-ledger .meta{background:none;border-radius:0;padding:4px 0}
  .d-ledger .client{font-weight:400;border-bottom:1px dotted #1D1D1F;padding-bottom:2px}
  .d-ledger table{margin-top:14px}
  .d-ledger th{background:none;color:#1D1D1F;text-transform:none;font-weight:700;border-bottom:1px solid #1D1D1F}
  .d-ledger td{border-bottom:1px dotted #1D1D1F}
  .d-ledger .tot .big{background:none !important;color:#1D1D1F;border-top:1px solid #1D1D1F;border-radius:0}
  .d-redform{border:2px solid #D7262E;padding:24px 28px;min-height:calc(100vh - 128px)}
  .d-redform .head{border-bottom:none;flex-direction:column;align-items:center}
  .d-redform h1{color:#D7262E;text-transform:uppercase;letter-spacing:1px}
  .d-redform .no{color:#D7262E;text-align:center}
  .d-redform .meta{background:none;border-radius:0;padding:4px 0}
  .d-redform .client{font-weight:400;border-bottom:1px dotted #D7262E}
  .d-redform th{background:#D7262E;color:#FFFFFF}
  .d-redform td{border-bottom:1px dotted #D7262E}
  .d-redform .tot .big{background:#D7262E !important}
  .d-redform .sign b{color:#D7262E}
  .d-gridbill h1{color:#B3261E;text-transform:uppercase;font-size:24px}
  .d-gridbill .head{border-bottom:2px solid #B3261E}
  .d-gridbill .meta{background:none;border:1px solid #B3261E;border-radius:0}
  .d-gridbill table{border:1px solid #B3261E}
  .d-gridbill th,.d-gridbill td{border:1px solid #B3261E;padding:7px 6px}
  .d-gridbill th{background:#FBE9E7;color:#7A1B12;text-transform:none;letter-spacing:0}
  .d-gridbill .tot{border:1px solid #B3261E;padding:6px 10px;width:100%;margin-left:0;box-sizing:border-box}
  .d-gridbill .tot .big{background:none !important;color:#B3261E;margin-top:0}
  .d-gridbill .foot{color:#B3261E;font-style:italic}
  .d-retailgrid h1{color:#D35400;text-transform:uppercase;text-align:center;font-size:24px}
  .d-retailgrid .head{flex-direction:column;align-items:center;border-bottom:none}
  .d-retailgrid .no{text-align:center}
  .d-retailgrid .meta{background:none;border-radius:0;padding:4px 0}
  .d-retailgrid table{border:1px solid #E67E22}
  .d-retailgrid th,.d-retailgrid td{border:1px solid #E67E22;padding:6px 5px}
  .d-retailgrid th{background:#FDF2E9;color:#A04000;text-transform:none;letter-spacing:0;font-size:11px}
  .d-retailgrid .tot .big{background:#E67E22 !important}
`;

export function docHtml(doc: Doc, seller: Seller = SELLER): string {
  const layout = docLayout(doc);
  const design = layout.design ?? 'classic';
  const L = LABELS[layout.locale];
  const t = documentTotals(doc);
  const tpl = findTemplate(doc.templateId);
  const isQuote = doc.kind === 'QUO';
  // Template accent when set; otherwise Apple system blue for quotes, system green for invoices.
  const accent = tpl?.accent ?? (isQuote ? '#007AFF' : '#248A3D');
  const has = (b: Block) => layout.blocks.includes(b);
  const parts: Record<Block, string> = {
    logo: doc.showSeller !== false ? sellerBlock(seller, L, true) : '',
    title: titleBlock(doc, layout.title, L, layout.locale),
    client: clientBlock(doc, L),
    items: itemsBlock(doc, layout, L),
    totals: totalsBlock(doc, t, layout, L, accent),
    words: wordsBlock(t, layout, L),
    qr: !isQuote ? qrBlock(doc, t, seller, layout) : '',
    signature: signatureBlock(doc, seller, L, isQuote, layout.locale),
    footer: `<div class="foot">${esc(layout.footer)}${!isQuote && !tpl?.eInvoice && layout.locale === 'vi' ? `<br><small>${L.internalNote}</small>` : ''}</div>`,
  };
  // The logo block already holds the seller; title goes first in the body when the layout puts it first.
  // Each part sits in a .part wrapper; an explicit alignment chosen by the customer adds a-left / a-center / a-right.
  // A real paper form prints its own fixed layout; otherwise the block list prints in order.
  const body = layout.form
    ? formBody(layout.form, { doc, seller, layout, t, L, has, money: n => money(n, layout.currency), words: n => (layout.locale === 'vi' ? amountInWords(n) : amountInWordsEn(n, layout.currency)), lineTotal })
    : layout.blocks.filter(has).map(b => {
        const al = layout.blockStyle?.[b]?.align;
        return `<div class="part${al ? ` a-${al}` : ''}">${parts[b]}</div>`;
      }).join('\n  ');
  const pdfFont = resolvePdfFont(layout.locale === 'vi' ? 'vi' : 'en');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
  <style>
  body{font-family:${pdfFont};margin:0;padding:40px 36px;color:#1D1D1F;-webkit-font-smoothing:antialiased}
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
  .tot .big{margin-top:6px;padding:12px 14px;border-radius:12px;color:#fff;font-size:18px;font-weight:700}
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
  .a-left .tot{margin-left:0;margin-right:auto}
  .a-center{text-align:center}
  .a-center .tot{margin-left:auto;margin-right:auto}
  .a-center .qr,.a-center .seller,.a-center .head{justify-content:center}
  .a-center table{width:82%;margin-left:auto;margin-right:auto}
  .a-right{text-align:right}
  .a-right .tot{margin-left:auto;margin-right:0}
  .a-right .qr,.a-right .seller,.a-right .head{justify-content:flex-end}
  .a-right table{width:82%;margin-left:auto}
  .a-left .qr,.a-left .seller{justify-content:flex-start}
  ${layout.form ? FORM_CSS : DESIGN_CSS}
  </style></head>
  <body class="d-${design}${layout.form ? ` form ${layout.form}` : ''}" style="--accent:${accent}">
  ${body}
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
