// Seller (người bán) block printed on invoices/quotes. Values must come from the CEO and the customer-care
// team; left empty on purpose until they confirm. An empty field is not printed.

export type Seller = {
  name: string;
  taxCode: string; // mã số thuế
  address: string;
  logoUri: string; // data: URI or https URL of a square logo; empty = no logo
};

export const SELLER: Seller = {
  name: '',
  taxCode: '',
  address: '',
  logoUri: '',
};
