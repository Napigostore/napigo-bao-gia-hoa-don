// Printed labels per language. Each market template prints in the language of its country.
export type Lang = 'vi' | 'en' | 'de' | 'fr' | 'ja' | 'ko';
export type Locale = Lang; // kept for existing imports

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
  internalNote: string;
  defaultFooterQuote: string;
  defaultFooterInvoice: string;
  quoteTitle: string;
  invoiceTitle: string;
};

export type DocKey = 'commercial' | 'proforma' | 'quotation' | 'receipt' | 'tax' | 'credit' | 'deposit' | 'delivery' | 'packing' | 'payment';

export const LABELS: Record<Lang, Labels> = {
  vi: {
    customer: 'Khách hàng', phone: 'SĐT', address: 'Địa chỉ', taxCode: 'MST', email: 'Email',
    no: 'Số', date: 'Ngày', no_col: 'STT', item: 'Hạng mục', qty: 'SL', price: 'Đơn giá (chưa VAT)',
    discount: 'CK', amount: 'Thành tiền', subtotal: 'Tạm tính', discountTotal: 'Chiết khấu',
    vat: pct => `Thuế VAT (${pct}%)`, total: 'Tổng thanh toán', inWords: 'Bằng chữ',
    vatNote: '* Đơn giá chưa gồm thuế VAT.',
    signBuyer: 'Người mua hàng', signSeller: 'Người bán hàng', signHint: '(Ký, ghi rõ họ tên)',
    internalNote: 'Chứng từ nội bộ, không thay thế hóa đơn điện tử.',
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
    internalNote: 'Internal document, not an electronic invoice.',
    defaultFooterQuote: 'Thank you for your interest.', defaultFooterInvoice: 'Thank you for your business.',
    quoteTitle: 'Quotation', invoiceTitle: 'Receipt',
  },
  de: {
    customer: 'Kunde', phone: 'Telefon', address: 'Adresse', taxCode: 'USt-IdNr.', email: 'E-Mail',
    no: 'Nr.', date: 'Datum', no_col: 'Pos.', item: 'Bezeichnung', qty: 'Menge', price: 'Einzelpreis',
    discount: 'Rabatt', amount: 'Betrag', subtotal: 'Zwischensumme', discountTotal: 'Rabatt gesamt',
    vat: pct => `MwSt. (${pct}%)`, total: 'Gesamtbetrag', inWords: '',
    vatNote: '* Alle Preise netto zzgl. gesetzlicher MwSt.',
    signBuyer: 'Käufer', signSeller: 'Verkäufer', signHint: '(Unterschrift, Name)',
    internalNote: 'Internes Dokument, keine elektronische Rechnung.',
    defaultFooterQuote: 'Vielen Dank für Ihr Interesse.', defaultFooterInvoice: 'Vielen Dank für Ihren Auftrag.',
    quoteTitle: 'Angebot', invoiceTitle: 'Quittung',
  },
  fr: {
    customer: 'Client', phone: 'Téléphone', address: 'Adresse', taxCode: 'N° TVA', email: 'E-mail',
    no: 'N°', date: 'Date', no_col: 'N°', item: 'Désignation', qty: 'Qté', price: 'Prix unitaire HT',
    discount: 'Remise', amount: 'Montant HT', subtotal: 'Total HT', discountTotal: 'Remise totale',
    vat: pct => `TVA (${pct}%)`, total: 'Total TTC', inWords: '',
    vatNote: '* Prix hors taxes.',
    signBuyer: 'Acheteur', signSeller: 'Vendeur', signHint: '(Signature et nom)',
    internalNote: 'Document interne, ne remplace pas une facture électronique.',
    defaultFooterQuote: 'Merci de votre intérêt.', defaultFooterInvoice: 'Merci pour votre confiance.',
    quoteTitle: 'Devis', invoiceTitle: 'Reçu',
  },
  ja: {
    customer: '請求先', phone: '電話', address: '住所', taxCode: '登録番号', email: 'メール',
    no: '番号', date: '日付', no_col: 'No.', item: '品目', qty: '数量', price: '単価',
    discount: '割引', amount: '金額', subtotal: '小計', discountTotal: '値引き',
    vat: pct => `消費税 (${pct}%)`, total: '合計', inWords: '',
    vatNote: '※ 単価は税抜きです。',
    signBuyer: '買主', signSeller: '売主', signHint: '(署名・氏名)',
    internalNote: '社内用の書類です。',
    defaultFooterQuote: 'お問い合わせありがとうございます。', defaultFooterInvoice: 'ご利用ありがとうございます。',
    quoteTitle: '見積書', invoiceTitle: '領収書',
  },
  ko: {
    customer: '고객명', phone: '연락처', address: '주소', taxCode: '사업자등록번호', email: '이메일',
    no: '번호', date: '날짜', no_col: 'No.', item: '품목', qty: '수량', price: '단가',
    discount: '할인', amount: '금액', subtotal: '공급가액', discountTotal: '할인',
    vat: pct => `부가세 (${pct}%)`, total: '합계', inWords: '',
    vatNote: '* 단가는 부가세 별도입니다.',
    signBuyer: '구매자', signSeller: '판매자', signHint: '(서명 또는 인)',
    internalNote: '내부 문서이며 전자세금계산서가 아닙니다.',
    defaultFooterQuote: '관심 가져주셔서 감사합니다.', defaultFooterInvoice: '거래해 주셔서 감사합니다.',
    quoteTitle: '견적서', invoiceTitle: '영수증',
  },
};

// Document titles per language, keyed by document type.
export const DOC_TITLES: Record<Lang, Record<DocKey, string>> = {
  vi: { commercial: 'Hóa đơn thương mại', proforma: 'Hóa đơn chiếu lệ', quotation: 'Báo giá', receipt: 'Phiếu thu', tax: 'Hóa đơn', credit: 'Phiếu điều chỉnh', deposit: 'Phiếu thu tạm ứng', delivery: 'Phiếu giao hàng', packing: 'Phiếu đóng gói', payment: 'Phiếu chi' },
  en: { commercial: 'Commercial Invoice', proforma: 'Proforma Invoice', quotation: 'Quotation', receipt: 'Receipt', tax: 'Tax Invoice', credit: 'Credit Note', deposit: 'Deposit Invoice', delivery: 'Delivery Note', packing: 'Packing List', payment: 'Payment Voucher' },
  de: { commercial: 'Handelsrechnung', proforma: 'Proforma-Rechnung', quotation: 'Angebot', receipt: 'Quittung', tax: 'Rechnung', credit: 'Gutschrift', deposit: 'Anzahlungsrechnung', delivery: 'Lieferschein', packing: 'Packliste', payment: 'Zahlungsbeleg' },
  fr: { commercial: 'Facture commerciale', proforma: 'Facture proforma', quotation: 'Devis', receipt: 'Reçu', tax: 'Facture', credit: 'Avoir', deposit: "Facture d'acompte", delivery: 'Bon de livraison', packing: 'Bordereau de colisage', payment: 'Bon de paiement' },
  ja: { commercial: '商業送り状', proforma: '見積送り状', quotation: '見積書', receipt: '領収書', tax: '適格請求書', credit: '貸方票', deposit: '前受金請求書', delivery: '納品書', packing: '梱包明細書', payment: '支払伝票' },
  ko: { commercial: '상업송장', proforma: '견적 송장', quotation: '견적서', receipt: '영수증', tax: '세금계산서', credit: '수정 송장', deposit: '선수금 청구서', delivery: '납품서', packing: '포장명세서', payment: '지급전표' },
};

// Number formatting per language (currency symbol and decimals follow the currency).
export const INTL_TAG: Record<Lang, string> = { vi: 'vi-VN', en: 'en-US', de: 'de-DE', fr: 'fr-FR', ja: 'ja-JP', ko: 'ko-KR' };

// Languages with an amount-in-words converter. Others print the amount only.
export const WORDS_LANGS: Lang[] = ['vi', 'en'];
