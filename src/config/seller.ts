// Seller (người bán) block printed on invoices/quotes. Values must come from the CEO and the customer-care
// team; left empty on purpose until they confirm. An empty field is not printed.

export type Seller = {
  name: string;
  taxCode: string; // mã số thuế
  address: string;
  logoUri: string; // data: URI or https URL of a square logo; empty = no logo
  signatureUri: string; // data: URI or https URL of the signature image; empty = blank signing space
  signerName: string; // printed under the signature
  bankCode: string; // VietQR bank short name or BIN (e.g. VCB, 970436); empty = no QR
  bankAccount: string;
  bankHolder: string;
  eInvoiceSymbol: string; // ký hiệu hóa đơn điện tử, VD 1C26TAA (mẫu số + ký hiệu); cấp bởi cơ quan thuế / nhà cung cấp
  eInvoiceProvider: string; // id nhà cung cấp hóa đơn điện tử, xem EINVOICE_PROVIDERS trong src/einvoice.ts; rỗng = chưa nối
};

export const SELLER: Seller = {
  name: '',
  taxCode: '',
  address: '',
  logoUri: '',
  signatureUri: '',
  signerName: '',
  bankCode: '',
  bankAccount: '',
  bankHolder: '',
  eInvoiceSymbol: '',
  eInvoiceProvider: '',
};
