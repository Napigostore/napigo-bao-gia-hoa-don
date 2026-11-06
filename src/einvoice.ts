// Vietnamese e-invoice (hóa đơn điện tử) data, validation and XML builder. Pure functions, no UI, no network.
// Reference structure: Nghị định 123/2020/NĐ-CP, Thông tư 78/2021/TT-BTC, data format per QĐ 1450/QĐ-TCT.
// The exact XSD version and the digital signature come from the e-invoice provider; check them before issuing.
import type { Doc } from './storage.ts';
import type { Seller } from './config/seller.ts';
import { amountInWords, documentTotals, lineTotal, round2 } from './calc.ts';

export type EInvoiceIssue = { field: string; message: string };

// What a provider needs from the shop before the app can talk to it. Facts gathered from public docs (2026-11);
// the endpoints and auth flow must be re-checked against the contract. Nothing here calls the network.
export type ProviderInfo = {
  id: string;
  name: string;
  docsUrl: string;
  testBaseUrl: string;
  liveBaseUrl: string;
  credentials: string[]; // fields the shop enters in "Thông tin công ty"
  notes: string;
};

export const PROVIDER_CATALOG: ProviderInfo[] = [
  {
    id: 'misa-meinvoice',
    name: 'MISA meInvoice',
    docsUrl: 'https://doc.meinvoice.vn/about',
    testBaseUrl: 'https://testapi.meinvoice.vn/api/integration (test: testapp.meinvoice.vn)',
    liveBaseUrl: 'app.meinvoice.vn',
    credentials: ['Mã số thuế', 'Tên đăng nhập', 'Mật khẩu', 'AppId'],
    notes: 'Đăng ký dịch vụ trên meinvoice.vn trước. Tích hợp sâu qua API/SDK. Lấy access token rồi gọi API phát hành. Đường dẫn cần xác nhận với tài liệu chính thức (nguồn cộng đồng ghi /api/integration, nguồn khác ghi /api/v3).',
  },
  {
    id: 'viettel-sinvoice',
    name: 'Viettel S-Invoice',
    docsUrl: 'https://www.sinvoice.vn/2021/02/hdsd-danh-sach-phan-mem-tich-hop-thanh-cong-tren-hoa-don-dien-tu-viettel.html',
    testBaseUrl: 'https://demo-sinvoice.viettel.vn:8443/InvoiceAPI/',
    liveBaseUrl: 'Theo hợp đồng Viettel',
    credentials: ['Mã số thuế', 'Tài khoản Webservice', 'Mật khẩu Webservice', 'Ký hiệu hóa đơn'],
    notes: 'Dùng Webservice (InvoiceWS, InvoiceUtilsWS). Tài khoản Webservice được cấu hình riêng. Hệ thống xử lý bất đồng bộ: đợi vài giây rồi mới tải lại file hóa đơn.',
  },
];

// Connect a real provider here: submit() sends the signed XML and returns the provider's answer.
export type EInvoiceProvider = {
  id: string;
  name: string;
  submit: (xml: string) => Promise<{ ok: boolean; message: string }>;
};
// Empty until a contract is signed. Each entry must implement submit() against PROVIDER_CATALOG's docs.
export const EINVOICE_PROVIDERS: EInvoiceProvider[] = [];

export function findProvider(id: string): EInvoiceProvider | undefined {
  return EINVOICE_PROVIDERS.find(p => p.id === id);
}

const digits = (s: string) => String(s ?? '').replace(/\D/g, '');

// Invoice sequence number: the digits of the document number, e.g. "INV-0012" -> 12.
export function eInvoiceSequence(no: string): number {
  return parseInt(digits(no) || '0', 10);
}

// Symbol "1C26TAA" -> form number "1" and invoice series "C26TAA" (first character is the form number).
export function splitSymbol(symbol: string): { form: string; series: string } {
  const s = String(symbol ?? '').trim();
  return { form: s.charAt(0), series: s.slice(1) };
}

export function validateEInvoice(doc: Doc, seller: Seller): EInvoiceIssue[] {
  const issues: EInvoiceIssue[] = [];
  const sellerTax = digits(seller.taxCode);
  if (sellerTax.length !== 10 && sellerTax.length !== 13) issues.push({ field: 'seller.taxCode', message: 'MST người bán phải 10 hoặc 13 chữ số' });
  if (!seller.name.trim()) issues.push({ field: 'seller.name', message: 'Thiếu tên người bán' });
  if (!seller.address.trim()) issues.push({ field: 'seller.address', message: 'Thiếu địa chỉ người bán' });
  if (!seller.eInvoiceSymbol.trim()) issues.push({ field: 'seller.eInvoiceSymbol', message: 'Thiếu ký hiệu hóa đơn (VD: 1C26TAA)' });
  if (doc.kind !== 'INV') issues.push({ field: 'kind', message: 'Chỉ xuất hóa đơn điện tử từ phiếu thu' });
  if (eInvoiceSequence(doc.no) <= 0) issues.push({ field: 'no', message: 'Số chứng từ phải có số thứ tự' });
  if (!doc.client.trim()) issues.push({ field: 'client', message: 'Thiếu tên người mua' });
  const buyerTax = digits(doc.clientTaxCode ?? '');
  if (buyerTax && buyerTax.length !== 10 && buyerTax.length !== 13) issues.push({ field: 'clientTaxCode', message: 'MST người mua phải 10 hoặc 13 chữ số (hoặc để trống)' });
  if (!doc.items.length) issues.push({ field: 'items', message: 'Cần ít nhất một hàng hóa, dịch vụ' });
  doc.items.forEach((it, i) => {
    if (!String(it.name ?? '').trim()) issues.push({ field: `items[${i}].name`, message: `Hàng ${i + 1} thiếu tên` });
  });
  return issues;
}

const xmlEsc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c] as string));

const fmtNum = (n: number) => String(round2(n));

function isoDate(createdAt: string): string {
  const d = new Date(createdAt);
  return isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

// Builds the e-invoice data XML (DLHDon) for an invoice. Unsigned: the provider adds the signature block.
export function buildEInvoiceXml(doc: Doc, seller: Seller): string {
  const { form, series } = splitSymbol(seller.eInvoiceSymbol);
  const t = documentTotals(doc);
  const rate = Math.max(Number(doc.taxPct) || 0, 0);
  const lines = doc.items.map((it, i) => {
    const qty = Number(it.qty) || 0;
    const price = Number(it.price) || 0;
    return `        <HHDVu>
          <STT>${i + 1}</STT>
          <THHDVu>${xmlEsc(it.name)}</THHDVu>
          <SLuong>${fmtNum(qty)}</SLuong>
          <DGia>${fmtNum(price)}</DGia>
          <ThTien>${fmtNum(lineTotal(it))}</ThTien>
          <TSuat>${rate}%</TSuat>
        </HHDVu>`;
  }).join('\n');
  const taxable = round2(t.subtotal - t.discount);
  return `<?xml version="1.0" encoding="UTF-8"?>
<HDon>
  <DLHDon id="data">
    <TTChung>
      <THDon>Hóa đơn giá trị gia tăng</THDon>
      <KHMSHDon>${xmlEsc(form)}</KHMSHDon>
      <KHHDon>${xmlEsc(series)}</KHHDon>
      <SHDon>${eInvoiceSequence(doc.no)}</SHDon>
      <NLap>${isoDate(doc.createdAt)}</NLap>
      <DVTTe>VND</DVTTe>
      <TGia>1</TGia>
      <HTTToan>${doc.note ? xmlEsc(doc.note) : 'TM/CK'}</HTTToan>
    </TTChung>
    <NDHDon>
      <NBan>
        <Ten>${xmlEsc(seller.name)}</Ten>
        <MST>${xmlEsc(digits(seller.taxCode))}</MST>
        <DChi>${xmlEsc(seller.address)}</DChi>
        <STKNHang>${xmlEsc(seller.bankAccount)}</STKNHang>
      </NBan>
      <NMua>
        <Ten>${xmlEsc(doc.client)}</Ten>
        <MST>${xmlEsc(digits(doc.clientTaxCode ?? ''))}</MST>
        <DChi>${xmlEsc(doc.clientAddress ?? '')}</DChi>
        <SDT>${xmlEsc(doc.clientPhone ?? '')}</SDT>
        <Email>${xmlEsc(doc.clientEmail ?? '')}</Email>
      </NMua>
      <DSHHDVu>
${lines}
      </DSHHDVu>
      <TToan>
        <THTTLTSuat>
          <LTSuat>
            <TSuat>${rate}%</TSuat>
            <ThTien>${fmtNum(taxable)}</ThTien>
            <TThue>${fmtNum(t.tax)}</TThue>
          </LTSuat>
        </THTTLTSuat>
        <TTCKTMai>${fmtNum(t.discount)}</TTCKTMai>
        <TgTCThue>${fmtNum(taxable)}</TgTCThue>
        <TgTThue>${fmtNum(t.tax)}</TgTThue>
        <TgTTTBSo>${fmtNum(t.total)}</TgTTTBSo>
        <TgTTTBChu>${xmlEsc(amountInWords(t.total))}</TgTTTBChu>
      </TToan>
    </NDHDon>
  </DLHDon>
  <DSCKS><!-- Chữ ký số: nhà cung cấp hóa đơn điện tử ký tại đây --></DSCKS>
</HDon>
`;
}

export function eInvoiceFileName(doc: Doc, seller: Seller): string {
  const symbol = digits(seller.eInvoiceSymbol) ? seller.eInvoiceSymbol.trim() : 'HDDT';
  return `HDDT_${symbol}_${eInvoiceSequence(doc.no)}.xml`.replace(/[^A-Za-z0-9_.-]/g, '_');
}
