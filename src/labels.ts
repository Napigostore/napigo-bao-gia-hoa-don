// Printed labels per language. A template picks the language; Vietnamese is the default.
export type Locale = 'vi' | 'en';

export type Labels = {
  customer: string;
  phone: string;
  address: string;
  taxCode: string;
  email: string;
  no: string;
  date: string;
  no_col: string;
  item: string;
  qty: string;
  price: string;
  discount: string;
  amount: string;
  subtotal: string;
  discountTotal: string;
  vat: (pct: number) => string;
  total: string;
  inWords: string;
  vatNote: string;
  signBuyer: string;
  signSeller: string;
  signHint: string;
  payQr: string;
  internalNote: string;
  defaultFooterQuote: string;
  defaultFooterInvoice: string;
  quoteTitle: string;
  invoiceTitle: string;
};

export const LABELS: Record<Locale, Labels> = {
  vi: {
    customer: 'Khách hàng', phone: 'SĐT', address: 'Địa chỉ', taxCode: 'MST', email: 'Email',
    no: 'Số', date: 'Ngày', no_col: 'STT', item: 'Hạng mục', qty: 'SL', price: 'Đơn giá (chưa VAT)',
    discount: 'CK', amount: 'Thành tiền', subtotal: 'Tạm tính', discountTotal: 'Chiết khấu',
    vat: pct => `Thuế VAT (${pct}%)`, total: 'Tổng thanh toán', inWords: 'Bằng chữ',
    vatNote: '* Đơn giá chưa gồm thuế VAT.',
    signBuyer: 'Người mua hàng', signSeller: 'Người bán hàng', signHint: '(Ký, ghi rõ họ tên)',
    payQr: 'Quét mã VietQR để thanh toán', internalNote: 'Chứng từ nội bộ, không thay thế hóa đơn điện tử.',
    defaultFooterQuote: 'Cảm ơn quý khách đã quan tâm.', defaultFooterInvoice: 'Cảm ơn quý khách đã tin tưởng.',
    quoteTitle: 'Báo giá', invoiceTitle: 'Phiếu thu',
  },
  en: {
    customer: 'Customer', phone: 'Phone', address: 'Address', taxCode: 'Tax ID', email: 'Email',
    no: 'No.', date: 'Date', no_col: 'No.', item: 'Description', qty: 'Qty', price: 'Unit price',
    discount: 'Disc.', amount: 'Amount', subtotal: 'Subtotal', discountTotal: 'Discount',
    vat: pct => `VAT (${pct}%)`, total: 'Total', inWords: 'Amount in words',
    vatNote: '* Unit prices exclude VAT.',
    signBuyer: 'Buyer', signSeller: 'Seller', signHint: '(Signature & name)',
    payQr: 'Scan VietQR to pay', internalNote: 'Internal document, not an electronic invoice.',
    defaultFooterQuote: 'Thank you for your interest.', defaultFooterInvoice: 'Thank you for your business.',
    quoteTitle: 'Quotation', invoiceTitle: 'Receipt',
  },
};
