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
};
