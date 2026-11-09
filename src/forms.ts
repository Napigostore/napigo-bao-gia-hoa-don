// Real paper-form layouts, copied from printed Vietnamese forms (phiếu thu Mẫu 01-TT, phiếu thu viền đỏ,
// hóa đơn bán hàng kẻ ô, hóa đơn bán lẻ). Each form has its own fixed layout; the document fills the blanks.
// The logo and sections can still be hidden: a hidden block leaves its part of the form empty.
import type { Doc } from './storage.ts';
import type { Seller } from './config/seller.ts';
import type { Totals } from './calc.ts';
import type { Labels } from './labels.ts';
import type { Block, FormKey, Layout } from './layout.ts';

export type FormCtx = {
  doc: Doc;
  seller: Seller;
  layout: Layout;
  t: Totals;
  L: Labels;
  has: (b: Block) => boolean;
  money: (n: number) => string;
  words: (n: number) => string;
  lineTotal: (it: Doc['items'][number]) => number;
};

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

function dateParts(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { d: '....', m: '....', y: '....' };
  return { d: String(d.getDate()).padStart(2, '0'), m: String(d.getMonth() + 1).padStart(2, '0'), y: String(d.getFullYear()) };
}

// A blank that holds a value and keeps its dotted underline.
const blank = (v?: string) => `<span class="dl">${v ? esc(v) : ''}</span>`;
const line = (label: string, value: string, tail = '') =>
  `<div class="frow"><span class="fl">${label}</span>${blank(value)}${tail ? `<span class="ft">${tail}</span>` : ''}</div>`;

const logo = (c: FormCtx) => (c.has('logo') && c.seller.logoUri ? `<img class="logo" src="${esc(c.seller.logoUri)}">` : '');
const company = (c: FormCtx, cls: string) =>
  c.has('logo') ? `<div class="${cls}">${logo(c)}<div><div class="co-name">${esc(c.seller.name)}</div><div class="co-sub">${esc(c.seller.address)}</div></div></div>` : `<div class="${cls}"></div>`;

const sign = (cols: [string, string][]) =>
  `<div class="sign">${cols.map(([name, cap]) => `<div class="sc"><b>${name}</b><small>${cap}</small></div>`).join('')}</div>`;

// ---- Mẫu số 01 - TT: phiếu thu kế toán ----
function form01tt(c: FormCtx): string {
  const { doc, t } = c;
  const d = dateParts(doc.createdAt);
  const reasons = doc.note || doc.items.map(i => i.name).filter(Boolean).join('; ');
  const rows = c.has('client')
    ? `${line('Họ và tên người nộp tiền:', doc.client)}${line('Địa chỉ:', doc.clientAddress ?? '')}${line('Lý do nộp:', reasons)}${c.has('totals') ? line('Số tiền:', c.money(t.total)) : ''}${c.has('words') ? line('(Viết bằng chữ):', c.words(t.total)) : ''}${line('Kèm theo:', '', 'Chứng từ gốc.')}`
    : '';
  return `<div class="f01">
    <div class="f01-top">${company(c, 'f01-co')}<div class="f01-ref"><b>Mẫu số 01 - TT</b><br><i>(Ban hành theo Thông tư số 200/2014/TT-BTC<br>Ngày 22/12/2014 của Bộ trưởng BTC)</i></div></div>
    <h1 class="f01-title">${esc(c.layout.title)}</h1>
    <div class="f01-side">
      <div>Ngày ${d.d} tháng ${d.m} năm ${d.y}</div>
      <div class="rf">Quyển số: ${blank('')}</div>
      <div class="rf">Số: ${blank(doc.no)}</div>
      <div class="rf">Nợ: ${blank('')}</div>
      <div class="rf">Có: ${blank('')}</div>
    </div>
    <div class="f01-body">${rows}</div>
    ${c.has('signature') ? sign([['Giám đốc', '(Ký, họ tên, đóng dấu)'], ['Kế toán trưởng', '(Ký, họ tên)'], ['Người nộp tiền', '(Ký, họ tên)'], ['Người lập', '(Ký, họ tên)'], ['Thủ quỹ', '(Ký, họ tên)']]) : ''}
    ${c.has('footer') && c.layout.footer ? `<div class="f01-foot">${esc(c.layout.footer)}</div>` : ''}
  </div>`;
}

// ---- Phiếu thu viền đỏ: khung đỏ, tiêu đề đỏ in hoa, học phí ----
function formAbit(c: FormCtx): string {
  const { doc, t } = c;
  const d = dateParts(doc.createdAt);
  const content = doc.note || doc.items.map(i => i.name).filter(Boolean).join('; ');
  const rows = c.has('client')
    ? `${line('Họ tên người nộp tiền:', doc.client)}${line('Số điện thoại:', doc.clientPhone ?? '')}${line('Email:', doc.clientEmail ?? '')}${line('Nội dung thu:', content)}${c.has('totals') ? line('Số tiền:', c.money(t.total)) : ''}${c.has('words') ? line('Viết bằng chữ:', c.words(t.total)) : ''}`
    : '';
  return `<div class="fa">
    <div class="fa-head">${company(c, 'fa-co')}<div class="fa-no">Quyển số: ${blank('')}<br>Số: ${blank(doc.no)}</div></div>
    <h1 class="fa-title">${esc(c.layout.title).toUpperCase()}</h1>
    <div class="fa-body">${rows}</div>
    <div class="fa-date">Ngày ${d.d} tháng ${d.m} năm ${d.y}</div>
    ${c.has('signature') ? sign([['Người nộp tiền', '(Ký, họ tên)'], ['Người lập phiếu', '(Ký, họ tên)'], ['Thủ quỹ', '(Ký, họ tên)']]) : ''}
    ${c.has('footer') && c.layout.footer ? `<div class="fa-foot"><b>Chú ý:</b> ${esc(c.layout.footer)}</div>` : ''}
  </div>`;
}

// ---- Hóa đơn bán hàng kẻ ô: bảng kẻ ô đỏ, tối thiểu 12 dòng như mẫu in sẵn ----
function formGridbill(c: FormCtx): string {
  const { doc, t } = c;
  const d = dateParts(doc.createdAt);
  const body: string[] = doc.items.map((it, i) => {
    const qty = Number(it.qty) || 0, price = Number(it.price) || 0;
    return `<tr><td class="c">${i + 1}</td><td>${esc(String(it.name ?? ''))}</td><td class="r">${qty}</td><td class="r">${c.money(price)}</td><td class="r">${c.money(c.lineTotal(it))}</td></tr>`;
  });
  for (let i = doc.items.length; i < 12; i++) body.push(`<tr><td class="c">${i + 1}</td><td></td><td></td><td></td><td></td></tr>`);
  const table = c.has('items')
    ? `<table><tr><th class="c">STT</th><th>Tên sản phẩm</th><th class="r">SL</th><th class="r">Đơn giá</th><th class="r">Thành tiền</th></tr>${body.join('')}${c.has('totals') ? `<tr class="sum"><td colspan="4" class="r">Tổng cộng:</td><td class="r">${c.money(t.total)}</td></tr>` : ''}</table>`
    : '';
  return `<div class="fg">
    ${company(c, 'fg-co')}
    <h1 class="fg-title">${esc(c.layout.title)}</h1>
    <div class="fg-date">Ngày ${d.d} tháng ${d.m} năm ${d.y}</div>
    ${c.has('client') ? `${line('Tên khách hàng:', doc.client)}${line('Địa chỉ:', doc.clientAddress ?? '')}${line('Điện thoại:', doc.clientPhone ?? '')}` : ''}
    ${table}
    ${c.has('words') ? `<div class="fg-words">Bằng chữ: ${esc(c.words(t.total))}</div>` : ''}
    ${c.has('signature') ? sign([['Người bán hàng', '(Ký, ghi rõ họ tên)'], ['Người mua hàng', '(Ký, ghi rõ họ tên)']]) : ''}
    ${c.has('footer') && c.layout.footer ? `<div class="fg-foot">${esc(c.layout.footer)}</div>` : ''}
  </div>`;
}

// ---- Hóa đơn bán lẻ: bảng kẻ ô cam, có cột ĐVT và dòng CỘNG ----
function formRetail(c: FormCtx): string {
  const { doc, t } = c;
  const d = dateParts(doc.createdAt);
  const body: string[] = doc.items.map((it, i) => {
    const qty = Number(it.qty) || 0, price = Number(it.price) || 0;
    return `<tr><td class="c">${i + 1}</td><td>${esc(String(it.name ?? ''))}</td><td></td><td class="r">${qty}</td><td class="r">${c.money(price)}</td><td class="r">${c.money(c.lineTotal(it))}</td></tr>`;
  });
  for (let i = doc.items.length; i < 12; i++) body.push(`<tr><td class="c">${i + 1}</td><td></td><td></td><td></td><td></td><td></td></tr>`);
  const table = c.has('items')
    ? `<table><tr><th class="c">STT</th><th>Tên hàng &amp; quy cách phẩm chất</th><th>ĐVT</th><th class="r">Số lượng</th><th class="r">Giá đơn vị</th><th class="r">Thành tiền</th></tr>${body.join('')}${c.has('totals') ? `<tr class="sum"><td colspan="5" class="r"><b>CỘNG:</b></td><td class="r"><b>${c.money(t.total)}</b></td></tr>` : ''}</table>`
    : '';
  return `<div class="fr">
    <div class="fr-top"><div>Đơn vị: ${blank(c.has('logo') ? c.seller.name : '')}</div><div>Số: ${blank(doc.no)}</div></div>
    <h1 class="fr-title">${esc(c.layout.title).toUpperCase()}</h1>
    ${c.has('client') ? `${line('Tên khách hàng:', doc.client)}${line('Địa chỉ:', doc.clientAddress ?? '')}` : ''}
    ${table}
    ${c.has('words') ? `<div class="fr-words">Cộng thành tiền (viết bằng chữ): ${esc(c.words(t.total))}</div>` : ''}
    <div class="fr-date">Ngày ${d.d} tháng ${d.m} năm ${d.y}</div>
    ${c.has('signature') ? sign([['Người nhận hàng', '(Ký, họ tên)'], ['Đã nhận đủ tiền', '(Ký, họ tên)'], ['Người viết hóa đơn', '(Ký, họ tên)']]) : ''}
  </div>`;
}

export function formBody(form: FormKey, c: FormCtx): string {
  switch (form) {
    case 'form-01tt': return form01tt(c);
    case 'form-abit': return formAbit(c);
    case 'form-gridbill': return formGridbill(c);
    case 'form-retail': return formRetail(c);
  }
}

// Shared pieces for all four forms, plus each form's own look.
export const FORM_CSS = `
  body.form{margin:0;padding:34px 36px;color:#1D1D1F}
  .dl{display:inline-block;flex:1;min-width:30px;border-bottom:1px dotted #1D1D1F;padding:0 4px;line-height:1.5;color:#1D1D1F}
  .frow{display:flex;align-items:flex-end;gap:6px;margin-top:9px;font-size:13px}
  .fl{white-space:nowrap}
  .ft{white-space:nowrap;font-style:italic}
  .logo{width:46px;height:46px;object-fit:contain}
  .sign{display:flex;justify-content:space-between;margin-top:30px;text-align:center}
  .sign .sc{width:19%;display:flex;flex-direction:column;align-items:center;font-size:12px}
  .sc small{font-size:10px;font-style:italic;color:#333}
  .sc::after{content:"";display:block;height:58px}
  .co-name{font-weight:700;font-size:14px}
  .co-sub{font-size:11px;color:#444}
  /* 01-TT */
  .f01{font-family:"Times New Roman",Times,serif;position:relative;min-height:600px}
  .f01-top{display:flex;justify-content:space-between;align-items:flex-start}
  .f01-co{display:flex;gap:10px;align-items:center}
  .f01-co .co-name{color:#1E7B3A;font-size:15px}
  .f01-co .co-sub{color:#1E7B3A;font-size:10px}
  .f01-ref{text-align:center;font-size:11px;line-height:1.35;max-width:240px}
  .f01-title{text-align:center;font-size:24px;letter-spacing:1px;margin:14px 0 2px}
  .f01-side{text-align:right;font-size:13px;line-height:1.7;margin-top:6px}
  .f01-side .rf{margin-top:2px}
  .f01-side .rf .dl{min-width:170px;flex:none}
  .f01-body{margin-top:24px}
  .f01 .frow{font-size:14px}
  .f01 .fl{width:200px}
  .f01-foot{margin-top:30px;font-size:12px;text-align:center}
  .f01 .sign{margin-top:70px}
  /* Phiếu thu viền đỏ */
  body.form.form-abit{border:2px solid #D7262E;padding:26px 30px;font-family:Arial,Helvetica,sans-serif}
  .fa{min-height:600px}
  .fa-head{display:flex;justify-content:space-between;align-items:flex-start}
  .fa-co{display:flex;gap:10px;align-items:center}
  .fa-co .co-name{color:#D7262E;font-size:15px;text-transform:uppercase}
  .fa-no{font-size:13px;color:#D7262E;text-align:right;line-height:1.9}
  .fa-no .dl{min-width:140px;flex:none;border-color:#D7262E}
  .fa-title{text-align:center;color:#D7262E;font-size:26px;letter-spacing:1px;margin:26px 0 6px}
  .fa .frow{font-size:14px}
  .fa .fl{width:190px;font-weight:600}
  .fa .dl{border-color:#D7262E}
  .fa-date{text-align:right;font-size:13px;margin-top:18px}
  .fa .sign{margin-top:44px}
  .fa-foot{margin-top:28px;font-size:11px;color:#D7262E;font-style:italic}
  /* Hóa đơn bán hàng kẻ ô */
  body.form.form-gridbill{font-family:Arial,Helvetica,sans-serif}
  .fg-co{display:flex;gap:10px;align-items:center;margin-bottom:6px}
  .fg-co .co-name{color:#C00000;font-size:16px;text-transform:uppercase}
  .fg-title{text-align:center;color:#C00000;font-size:24px;margin:14px 0 4px;text-transform:uppercase}
  .fg-date{text-align:right;font-size:13px;margin-bottom:4px}
  .fg table{width:100%;border-collapse:collapse;margin-top:14px;font-size:12px}
  .fg th,.fg td{border:1px solid #C00000;padding:6px 6px;height:20px}
  .fg th{background:#FBE9E7;color:#7A1B12;font-weight:700}
  .fg .c{text-align:center;width:40px}
  .fg .r{text-align:right}
  .fg .sum td{font-weight:700;color:#C00000}
  .fg-words{margin-top:10px;font-size:13px;font-style:italic}
  .fg-foot{margin-top:26px;text-align:center;color:#C00000;font-style:italic;font-size:13px}
  .fg .sign{margin-top:36px}
  /* Hóa đơn bán lẻ */
  body.form.form-retail{font-family:Arial,Helvetica,sans-serif}
  .fr-top{display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px}
  .fr-top .dl{min-width:180px}
  .fr-title{text-align:center;color:#D35400;font-size:24px;margin:16px 0 6px}
  .fr table{width:100%;border-collapse:collapse;margin-top:14px;font-size:12px}
  .fr th,.fr td{border:1px solid #E67E22;padding:6px 5px;height:18px}
  .fr th{background:#FDF2E9;color:#A04000;font-size:11px}
  .fr .c{text-align:center;width:36px}
  .fr .r{text-align:right}
  .fr .sum td{color:#A04000}
  .fr-words{margin-top:12px;font-size:13px}
  .fr-date{text-align:right;font-size:13px;margin-top:10px}
  .fr .sign{margin-top:30px}
`;
