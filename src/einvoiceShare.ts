// Writes the e-invoice XML to the cache folder and opens the iOS share sheet (Save to Files / mail to the provider).
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Doc } from './storage.ts';
import type { Seller } from './config/seller.ts';
import { buildEInvoiceXml, eInvoiceFileName } from './einvoice.ts';

export async function shareEInvoiceXml(doc: Doc, seller: Seller): Promise<void> {
  const file = new File(Paths.cache, eInvoiceFileName(doc, seller));
  if (file.exists) file.delete();
  file.create();
  file.write(buildEInvoiceXml(doc, seller));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/xml', UTI: 'public.xml', dialogTitle: file.name });
}
