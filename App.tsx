import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { pickImageDataUri } from './src/imagePick.ts';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { amountInWords, documentTotals, formatVND, nextNumber, nextStatus, quoteToInvoice, type DocKind, type LineItem, type Status } from './src/calc.ts';
import { loadDb, saveDb, type Contact, type Db, type Doc, type SavedTemplate } from './src/storage.ts';
import { printDoc, shareDocPdf } from './src/pdf.ts';
import { validateEInvoice } from './src/einvoice.ts';
import { shareEInvoiceXml } from './src/einvoiceShare.ts';
import PricingScreen from './src/PricingScreen.tsx';
import type { Seller } from './src/config/seller.ts';
import { findTemplate, templatesFor, type Template } from './src/templates.ts';

const STATUS_LABEL: Record<Status, string> = { draft: 'Nháp', sent: 'Đã gửi', paid: 'Đã thu' };
const NEXT_LABEL: Record<Status, string> = { draft: 'Đánh dấu đã gửi', sent: 'Đánh dấu đã thu', paid: '' };

// Apple system colors: gray / orange / green on tinted backgrounds, one set per color scheme.
const LIGHT = {
  bg: '#F2F2F7', card: '#FFFFFF', text: '#000000', muted: '#8E8E93', accent: '#007AFF', onAccent: '#FFFFFF',
  accentSoft: '#EAF2FF', field: '#FFFFFF', segTrack: '#E5E5EA', segActive: '#FFFFFF', segText: '#3C3C43', error: '#FF3B30',
  statusFg: { draft: '#636366', sent: '#C93400', paid: '#248A3D' } as Record<Status, string>,
  statusBg: { draft: '#E5E5EA', sent: '#FFF0E0', paid: '#E3F6E8' } as Record<Status, string>,
};
type Palette = typeof LIGHT;
const DARK: Palette = {
  bg: '#000000', card: '#1C1C1E', text: '#FFFFFF', muted: '#8E8E93', accent: '#0A84FF', onAccent: '#FFFFFF',
  accentSoft: '#12263F', field: '#2C2C2E', segTrack: '#1C1C1E', segActive: '#636366', segText: '#EBEBF5', error: '#FF453A',
  statusFg: { draft: '#AEAEB2', sent: '#FF9F0A', paid: '#32D74B' },
  statusBg: { draft: '#2C2C2E', sent: '#3A2A10', paid: '#12301B' },
};

// SF on iOS; elsewhere fall back to Segoe UI, then Arial.
const FONT = Platform.select({ ios: 'System', web: "-apple-system, 'SF Pro Text', 'Segoe UI', Arial, sans-serif", default: undefined });

const FILTERS: { key: 'ALL' | DocKind; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'QUO', label: 'Báo giá' },
  { key: 'INV', label: 'Phiếu thu' },
];

type Draft = Omit<Doc, 'createdAt'> & { createdAt?: string };

// Picks an image from the phone library, shows it, and lets the user replace or remove it.
function ImageSlot({ styles, uri, aspect, empty, onPick, onError }: {
  styles: ReturnType<typeof makeStyles>; uri: string; aspect: [number, number]; empty: string;
  onPick: (v: string) => void; onError: () => void;
}) {
  async function pick() {
    try {
      const v = await pickImageDataUri(aspect);
      if (v) onPick(v);
    } catch {
      onError();
    }
  }
  return (
    <View style={styles.card}>
      <View style={styles.listRow}>
        {uri ? <Image source={{ uri }} style={{ width: 72, height: 72, borderRadius: 8, resizeMode: 'contain' }} accessibilityLabel="Ảnh đã chọn" /> : <Text style={styles.muted}>{empty}</Text>}
        <View style={styles.flex} />
        <Pressable style={styles.ghost} onPress={pick} accessibilityRole="button">
          <Text style={styles.ghostText}>{uri ? 'Đổi ảnh' : 'Tải ảnh lên'}</Text>
        </Pressable>
        {!!uri && (
          <Pressable style={styles.ghost} onPress={() => onPick('')} accessibilityRole="button">
            <Text style={styles.ghostText}>Xóa</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// Tick-to-choose values so the common VAT / discount rates need no typing.
const VAT_CHOICES = [0, 8, 10];
const DISCOUNT_CHOICES = [0, 5, 10];
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

function blankDraft(db: Db, kind: DocKind, tpl?: Pick<Template, 'id' | 'note' | 'taxPct' | 'items'>): Draft {
  return {
    id: Date.now().toString(36),
    kind,
    no: nextNumber(kind, db.counters[kind]),
    client: '',
    clientPhone: '',
    clientAddress: '',
    showSeller: true,
    note: tpl?.note ?? '',
    items: tpl ? tpl.items.map(it => ({ ...it })) : [{ name: '', qty: 1, price: 0, discountPct: 0 }],
    discountPct: 0,
    taxPct: tpl?.taxPct ?? 0,
    status: 'draft',
    templateId: tpl?.id,
  };
}

const asDoc = (d: Draft): Doc => ({ ...d, createdAt: d.createdAt ?? new Date().toISOString() });

// Row of tappable choices (radio behaviour); a value outside the base list is appended so it stays visible.
function Chips({ styles, values, value, suffix, onPick }: {
  styles: ReturnType<typeof makeStyles>; values: number[]; value: number; suffix: string; onPick: (v: number) => void;
}) {
  const all = values.includes(value) ? values : [...values, value];
  return (
    <View style={styles.row}>
      {all.map(v => (
        <Pressable key={v} style={[styles.chip, v === value && styles.chipOn]} onPress={() => onPick(v)} accessibilityRole="radio" accessibilityState={{ selected: v === value }}>
          <Text style={[styles.chipText, v === value && styles.chipTextOn]}>{v}{suffix}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function CheckRow({ styles, label, on, onToggle }: { styles: ReturnType<typeof makeStyles>; label: string; on: boolean; onToggle: () => void }) {
  return (
    <Pressable style={styles.checkRow} onPress={onToggle} accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked: on }}>
      <View style={[styles.box, on && styles.boxOn]}>{on && <Text style={styles.boxMark}>✓</Text>}</View>
      <Text style={[styles.body, styles.flex]}>{label}</Text>
    </Pressable>
  );
}

// Button with an SF Symbol on iOS and an emoji glyph elsewhere.
function ActionButton({ styles, color, label, symbol, glyph, primary, disabled, onPress }: {
  styles: ReturnType<typeof makeStyles>; color: string; label: string; symbol: string; glyph: string; primary?: boolean; disabled?: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      style={[primary ? styles.primary : styles.ghost, styles.flex, styles.actionBtn, disabled && styles.dimmed]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
    >
      <SymbolView name={symbol as never} size={20} tintColor={color} fallback={<Text style={{ fontSize: 17 }}>{glyph}</Text>} />
      <Text style={primary ? styles.primaryText : styles.ghostText}>{label}</Text>
    </Pressable>
  );
}

export default function App() {
  const [db, setDb] = useState<Db | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(true);
  const [error, setError] = useState('');
  const [showPricing, setShowPricing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [picker, setPicker] = useState<DocKind | null>(null);
  const [showCompany, setShowCompany] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [catalogFor, setCatalogFor] = useState<number | null>(null); // line index the product drop list is filling
  const [openDiscounts, setOpenDiscounts] = useState<Record<number, boolean>>({});
  const [filter, setFilter] = useState<'ALL' | DocKind>('ALL');
  const c = useColorScheme() === 'dark' ? DARK : LIGHT;
  const styles = useMemo(() => makeStyles(c), [c]);

  useEffect(() => {
    loadDb().then(setDb);
  }, []);

  async function persist(next: Db) {
    setDb(next);
    const ok = await saveDb(next);
    if (!ok) Alert.alert('Không lưu được', 'Bộ nhớ máy đang lỗi. Thử lại sau.');
  }

  function startNew(kind: DocKind, tpl?: Pick<Template, 'id' | 'note' | 'taxPct' | 'items'>) {
    if (!db) return;
    setIsNew(true);
    setError('');
    setPicker(null);
    setOpenDiscounts({});
    setDraft(blankDraft(db, kind, tpl));
  }

  function openDoc(doc: Doc) {
    setIsNew(false);
    setError('');
    setOpenDiscounts({});
    setDraft({ ...doc });
  }

  function updateItem(i: number, field: keyof LineItem, value: string) {
    if (!draft) return;
    const items = draft.items.map((it, idx) => (idx === i ? { ...it, [field]: value } : it));
    setDraft({ ...draft, items });
  }

  async function saveDraft() {
    if (!db || !draft) return;
    if (!draft.client.trim()) {
      setError('Nhập tên khách hàng trước khi lưu.');
      return;
    }
    const doc: Doc = {
      ...draft,
      client: draft.client.trim(),
      createdAt: draft.createdAt ?? new Date().toISOString(),
    };
    const docs = isNew ? [doc, ...db.docs] : db.docs.map(d => (d.id === doc.id ? doc : d));
    const counters = isNew ? { ...db.counters, [doc.kind]: db.counters[doc.kind] + 1 } : db.counters;
    await persist({ ...db, docs, counters });
    setDraft(null);
  }

  // Keep the document's lines, VAT and note (not the customer) as a reusable template.
  async function saveAsTemplate() {
    if (!db || !draft) return;
    const first = String(draft.items[0]?.name ?? '').trim();
    const tpl: SavedTemplate = {
      id: newId(),
      kind: draft.kind,
      name: first || `Mẫu ${db.templates.length + 1}`,
      taxPct: draft.taxPct,
      note: draft.note,
      items: draft.items.map(it => ({ ...it })),
      baseId: draft.templateId,
    };
    await persist({ ...db, templates: [tpl, ...db.templates] });
    Alert.alert('Đã lưu mẫu', 'Mẫu nằm ở mục “Mẫu của tôi” khi tạo mới.');
  }

  // Checks the invoice fields first; lists every problem so the user fixes them in one pass.
  function exportEInvoice(doc: Doc, seller: Seller) {
    const issues = validateEInvoice(doc, seller);
    if (issues.length) {
      Alert.alert('Chưa đủ thông tin hóa đơn điện tử', issues.map(i => `• ${i.message}`).join('\n'));
      return;
    }
    shareEInvoiceXml(doc, seller).catch(() => Alert.alert('Không xuất được XML'));
  }

  async function removeTemplate(id: string) {
    if (!db) return;
    await persist({ ...db, templates: db.templates.filter(t => t.id !== id) });
  }

  async function saveToCatalog(i: number) {
    if (!db || !draft) return;
    const it = draft.items[i];
    const name = String(it?.name ?? '').trim();
    if (!name || db.catalog.some(p => p.name === name)) return;
    await persist({ ...db, catalog: [...db.catalog, { id: newId(), name, price: Number(it.price) || 0 }] });
  }

  async function saveContact() {
    if (!db || !draft) return;
    const name = draft.client.trim();
    if (!name || db.contacts.some(p => p.name === name)) return;
    await persist({ ...db, contacts: [...db.contacts, { id: newId(), name, phone: draft.clientPhone ?? '', address: draft.clientAddress ?? '' }] });
  }

  function pickContact(p: Contact) {
    if (!draft) return;
    setDraft({ ...draft, client: p.name, clientPhone: p.phone, clientAddress: p.address });
    setShowContacts(false);
  }

  function pickProduct(i: number, p: { name: string; price: number }) {
    if (!draft) return;
    setDraft({ ...draft, items: draft.items.map((it, idx) => (idx === i ? { ...it, name: p.name, price: p.price } : it)) });
    setCatalogFor(null);
  }

  async function convertToInvoice(quote: Doc) {
    if (!db) return;
    const inv = quoteToInvoice(quote, newId(), nextNumber('INV', db.counters.INV), new Date().toISOString());
    if (!inv) return;
    const docs = [inv, ...db.docs.map(d => (d.id === quote.id ? { ...d, convertedTo: inv.id } : d))];
    await persist({ ...db, docs, counters: { ...db.counters, INV: db.counters.INV + 1 } });
    Alert.alert('Đã tạo phiếu thu', `${inv.no} tạo từ ${quote.no}, trạng thái Nháp.`);
  }

  async function advance(doc: Doc) {
    if (!db) return;
    const next = nextStatus(doc.status);
    if (!next) return;
    await persist({ ...db, docs: db.docs.map(d => (d.id === doc.id ? { ...d, status: next } : d)) });
  }

  if (!db) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.muted}>Đang tải…</Text>
      </SafeAreaView>
    );
  }

  if (showPricing) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="auto" />
        <PricingScreen
          colors={{ text: c.text, muted: c.muted, card: c.card, accent: c.accent, onAccent: c.onAccent }}
          onBack={() => setShowPricing(false)}
        />
      </SafeAreaView>
    );
  }

  if (showCompany) {
    const s = db.seller;
    const setSeller = (patch: Partial<typeof s>) => setDb({ ...db, seller: { ...s, ...patch } });
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="auto" />
        <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => { persist(db); setShowCompany(false); }}>
            <Text style={styles.link}>← Lưu và quay lại</Text>
          </Pressable>
          <Text style={styles.h1}>Thông tin công ty</Text>
          <Text style={styles.muted}>Điền một lần, tự in trên mọi báo giá và phiếu thu.</Text>
          <Text style={styles.label}>Tên công ty / người xuất</Text>
          <TextInput style={styles.input} value={s.name} onChangeText={v => setSeller({ name: v })} />
          <Text style={styles.label}>Mã số thuế</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={s.taxCode} onChangeText={v => setSeller({ taxCode: v })} />
          <Text style={styles.label}>Địa chỉ</Text>
          <TextInput style={styles.input} value={s.address} onChangeText={v => setSeller({ address: v })} />
          <Text style={styles.label}>Logo công ty</Text>
          <ImageSlot styles={styles} uri={s.logoUri} aspect={[1, 1]} empty="Chưa có logo" onPick={v => setSeller({ logoUri: v })} onError={() => Alert.alert('Không chọn được ảnh', 'Cho phép truy cập thư viện ảnh trong Cài đặt của iPhone.')} />
          <Text style={styles.label}>Ghi chú: logo nên là ảnh vuông, nền trong suốt hoặc trắng.</Text>
          <Text style={styles.label}>Ký hiệu hóa đơn điện tử (VD: 1C26TAA)</Text>
          <TextInput style={styles.input} autoCapitalize="characters" autoCorrect={false} value={s.eInvoiceSymbol} onChangeText={v => setSeller({ eInvoiceSymbol: v.trim() })} />
          <Text style={styles.label}>Chữ ký</Text>
          <ImageSlot styles={styles} uri={s.signatureUri} aspect={[3, 1]} empty="Chưa có chữ ký" onPick={v => setSeller({ signatureUri: v })} onError={() => Alert.alert('Không chọn được ảnh', 'Cho phép truy cập thư viện ảnh trong Cài đặt của iPhone.')} />
          <Text style={styles.label}>Tên người ký</Text>
          <TextInput style={styles.input} value={s.signerName} onChangeText={v => setSeller({ signerName: v })} />
          <Text style={styles.label}>Ngân hàng nhận tiền (mã, VD: VCB) — để in VietQR trên phiếu thu</Text>
          <TextInput style={styles.input} autoCapitalize="characters" autoCorrect={false} value={s.bankCode} onChangeText={v => setSeller({ bankCode: v.trim() })} />
          <Text style={styles.label}>Số tài khoản</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={s.bankAccount} onChangeText={v => setSeller({ bankAccount: v.trim() })} />
          <Text style={styles.label}>Chủ tài khoản</Text>
          <TextInput style={styles.input} autoCapitalize="characters" value={s.bankHolder} onChangeText={v => setSeller({ bankHolder: v })} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (draft) {
    const totals = documentTotals(draft);
    const noClient = !draft.client.trim();
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="auto" />
        <ScrollView contentContainerStyle={styles.pad}>
          <Pressable onPress={() => setDraft(null)}>
            <Text style={styles.link}>← Danh sách</Text>
          </Pressable>
          <Text style={styles.h1}>
            {draft.kind === 'QUO' ? 'Báo giá' : 'Phiếu thu'} {draft.no}
          </Text>

          <Text style={styles.label}>Tên khách hàng</Text>
          <TextInput style={styles.input} value={draft.client} onChangeText={v => setDraft({ ...draft, client: v })} placeholder="VD: Anh Minh" placeholderTextColor={c.muted} />
          <View style={styles.row}>
            <Pressable style={[styles.ghost, styles.flex]} onPress={() => setShowContacts(true)} accessibilityRole="button">
              <Text style={styles.ghostText}>Chọn từ danh bạ khách</Text>
            </Pressable>
            {!noClient && !db.contacts.some(p => p.name === draft.client.trim()) && (
              <Pressable style={[styles.ghost, styles.flex]} onPress={saveContact} accessibilityRole="button">
                <Text style={styles.ghostText}>+ Lưu khách</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput style={styles.input} keyboardType="phone-pad" value={draft.clientPhone ?? ''} onChangeText={v => setDraft({ ...draft, clientPhone: v })} />
          <Text style={styles.label}>Địa chỉ</Text>
          <TextInput style={styles.input} value={draft.clientAddress ?? ''} onChangeText={v => setDraft({ ...draft, clientAddress: v })} />
          <Text style={styles.label}>MST người mua (nếu có, cho hóa đơn điện tử)</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={draft.clientTaxCode ?? ''} onChangeText={v => setDraft({ ...draft, clientTaxCode: v.trim() })} />
          <Text style={styles.label}>Email người mua</Text>
          <TextInput style={styles.input} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={draft.clientEmail ?? ''} onChangeText={v => setDraft({ ...draft, clientEmail: v.trim() })} />
          <Text style={styles.label}>Ghi chú</Text>
          <TextInput style={styles.input} value={draft.note} onChangeText={v => setDraft({ ...draft, note: v })} />

          <Text style={styles.label}>Hạng mục (đơn giá chưa gồm VAT)</Text>
          {draft.items.map((it, i) => {
            const hasLineDiscount = Boolean(openDiscounts[i] || Number(it.discountPct) > 0);
            return (
              <View key={i} style={styles.itemBox}>
                <View style={styles.row}>
                  <TextInput style={[styles.input, styles.flex]} placeholder="Tên" placeholderTextColor={c.muted} value={String(it.name ?? '')} onChangeText={v => updateItem(i, 'name', v)} />
                  <Pressable onPress={() => setCatalogFor(i)} style={styles.del} accessibilityRole="button" accessibilityLabel="Chọn sản phẩm từ danh mục">
                    <Text style={styles.link}>▾</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setDraft({ ...draft, items: draft.items.filter((_, idx) => idx !== i) });
                      setOpenDiscounts(prev => {
                        const next: Record<number, boolean> = {};
                        Object.keys(prev).forEach(k => {
                          const idx = Number(k);
                          if (idx < i) next[idx] = prev[idx];
                          else if (idx > i) next[idx - 1] = prev[idx];
                        });
                        return next;
                      });
                    }}
                    style={styles.del}
                    accessibilityRole="button"
                    accessibilityLabel="Xóa hạng mục"
                  >
                    <Text style={styles.body}>✕</Text>
                  </Pressable>
                </View>
                <View style={styles.row}>
                  <TextInput style={styles.small} keyboardType="decimal-pad" placeholder="SL" placeholderTextColor={c.muted} value={String(it.qty ?? '')} onChangeText={v => updateItem(i, 'qty', v)} />
                  <TextInput style={[styles.mid, styles.flex]} keyboardType="number-pad" placeholder="Đơn giá (chưa VAT)" placeholderTextColor={c.muted} value={String(it.price ?? '')} onChangeText={v => updateItem(i, 'price', v)} />
                  {hasLineDiscount ? (
                    <>
                      <TextInput style={styles.small} keyboardType="decimal-pad" placeholder="CK%" placeholderTextColor={c.muted} value={String(it.discountPct ?? '')} onChangeText={v => updateItem(i, 'discountPct', v)} />
                      <Pressable
                        onPress={() => {
                          updateItem(i, 'discountPct', '0');
                          setOpenDiscounts(prev => ({ ...prev, [i]: false }));
                        }}
                        style={styles.delSmall}
                        accessibilityRole="button"
                        accessibilityLabel="Bỏ chiết khấu dòng"
                      >
                        <Text style={styles.muted}>✕</Text>
                      </Pressable>
                    </>
                  ) : (
                    <Pressable
                      onPress={() => setOpenDiscounts(prev => ({ ...prev, [i]: true }))}
                      style={styles.ckBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Thêm chiết khấu dòng"
                    >
                      <Text style={styles.ckBtnText}>+ CK</Text>
                    </Pressable>
                  )}
                </View>
                {!!String(it.name ?? '').trim() && !db.catalog.some(p => p.name === String(it.name).trim()) && (
                  <Pressable onPress={() => saveToCatalog(i)} style={styles.del} accessibilityRole="button">
                    <Text style={styles.link}>+ Lưu vào danh mục sản phẩm</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
          <Pressable style={styles.ghost} onPress={() => setDraft({ ...draft, items: [...draft.items, { name: '', qty: 1, price: 0, discountPct: 0 }] })}>
            <Text style={styles.ghostText}>+ Thêm hạng mục</Text>
          </Pressable>

          <Text style={styles.label}>Chiết khấu toàn bộ</Text>
          <Chips styles={styles} values={DISCOUNT_CHOICES} value={draft.discountPct} suffix="%" onPick={v => setDraft({ ...draft, discountPct: v })} />
          <Text style={styles.label}>VAT</Text>
          <Chips styles={styles} values={VAT_CHOICES} value={draft.taxPct} suffix="%" onPick={v => setDraft({ ...draft, taxPct: v })} />
          {!!findTemplate(draft.templateId)?.eInvoice && (
            <ActionButton styles={styles} color={c.accent} label="Xuất XML hóa đơn điện tử" symbol="doc.text" glyph="</>" disabled={noClient} onPress={() => exportEInvoice(asDoc(draft), db.seller)} />
          )}
          <CheckRow styles={styles} label="In logo và thông tin công ty" on={draft.showSeller !== false} onToggle={() => setDraft({ ...draft, showSeller: draft.showSeller === false })} />

          <View style={styles.card}>
            <Text style={styles.body}>Tạm tính: {formatVND(totals.subtotal)}</Text>
            <Text style={styles.body}>Chiết khấu: − {formatVND(totals.discount)}</Text>
            <Text style={styles.body}>Thuế VAT ({Math.max(Number(draft.taxPct) || 0, 0)}%): {formatVND(totals.tax)}</Text>
            <Text style={styles.big}>Tổng thanh toán: {formatVND(totals.total)}</Text>
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.row}>
            <ActionButton styles={styles} color={c.onAccent} label="Lưu" symbol="square.and.arrow.down" glyph="💾" primary onPress={saveDraft} />
            <ActionButton styles={styles} color={c.accent} label="Xem trước" symbol="eye" glyph="👁" disabled={noClient} onPress={() => setPreview(true)} />
          </View>
          <View style={styles.row}>
            <ActionButton styles={styles} color={c.accent} label="In" symbol="printer" glyph="🖨" disabled={noClient} onPress={() => printDoc(asDoc(draft), db.seller).catch(() => Alert.alert('Không in được'))} />
            <ActionButton styles={styles} color={c.accent} label="Chia sẻ" symbol="square.and.arrow.up" glyph="⬆" disabled={noClient} onPress={() => shareDocPdf(asDoc(draft), db.seller).catch(() => Alert.alert('Không xuất được PDF'))} />
          </View>
          <Pressable style={styles.ghost} onPress={saveAsTemplate} accessibilityRole="button">
            <Text style={styles.ghostText}>Lưu làm mẫu của tôi</Text>
          </Pressable>
        </ScrollView>
        <Modal visible={showContacts} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowContacts(false)}>
          <SafeAreaView style={styles.safe}>
            <ScrollView contentContainerStyle={styles.pad}>
              <Pressable onPress={() => setShowContacts(false)}>
                <Text style={styles.link}>Đóng</Text>
              </Pressable>
              <Text style={styles.h1}>Danh bạ khách</Text>
              {db.contacts.length === 0 && <Text style={styles.muted}>Chưa có khách. Nhập tên khách rồi bấm “+ Lưu khách”.</Text>}
              {db.contacts.map(p => (
                <Pressable key={p.id} style={styles.card} onPress={() => pickContact(p)}>
                  <View style={styles.listRow}>
                    <View style={styles.flex}>
                      <Text style={styles.bold}>{p.name}</Text>
                      {!!p.phone && <Text style={styles.muted}>{p.phone}</Text>}
                    </View>
                    <Pressable onPress={() => persist({ ...db, contacts: db.contacts.filter(x => x.id !== p.id) })} style={styles.del} accessibilityRole="button" accessibilityLabel={`Xóa ${p.name}`}>
                      <Text style={styles.body}>✕</Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>
        <Modal visible={catalogFor !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCatalogFor(null)}>
          <SafeAreaView style={styles.safe}>
            <ScrollView contentContainerStyle={styles.pad}>
              <Pressable onPress={() => setCatalogFor(null)}>
                <Text style={styles.link}>Đóng</Text>
              </Pressable>
              <Text style={styles.h1}>Chọn sản phẩm</Text>
              {db.catalog.length === 0 && <Text style={styles.muted}>Chưa có sản phẩm. Nhập một hạng mục rồi bấm “Lưu vào danh mục sản phẩm”.</Text>}
              {db.catalog.map(p => (
                <Pressable key={p.id} style={styles.card} onPress={() => catalogFor !== null && pickProduct(catalogFor, p)}>
                  <View style={styles.listRow}>
                    <Text style={[styles.bold, styles.flex]}>{p.name}</Text>
                    <Text style={styles.muted}>{formatVND(p.price)}</Text>
                    <Pressable onPress={() => persist({ ...db, catalog: db.catalog.filter(x => x.id !== p.id) })} style={styles.del} accessibilityRole="button" accessibilityLabel={`Xóa ${p.name}`}>
                      <Text style={styles.body}>✕</Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>
        <Modal visible={preview} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPreview(false)}>
          <SafeAreaView style={styles.safe}>
            <ScrollView contentContainerStyle={styles.pad}>
              <Pressable onPress={() => setPreview(false)}>
                <Text style={styles.link}>Đóng</Text>
              </Pressable>
              <View style={styles.paper}>
                <Text style={styles.paperTitle}>{draft.kind === 'QUO' ? 'Báo giá' : 'Phiếu thu'}</Text>
                <Text style={styles.paperMuted}>{draft.no}</Text>
                {draft.showSeller !== false && !!db.seller.name && <Text style={styles.paperMuted}>{db.seller.name}{db.seller.taxCode ? ` · MST ${db.seller.taxCode}` : ''}</Text>}
                <Text style={styles.paperBold}>{draft.client || '—'}</Text>
                {!!draft.clientPhone && <Text style={styles.paperMuted}>SĐT: {draft.clientPhone}</Text>}
                {!!draft.clientAddress && <Text style={styles.paperMuted}>{draft.clientAddress}</Text>}
                {!!draft.note && <Text style={styles.paperMuted}>{draft.note}</Text>}
                {draft.items.map((it, i) => (
                  <View key={i} style={styles.paperRow}>
                    <Text style={[styles.paperText, styles.flex]}>{String(it.name ?? '')}</Text>
                    <Text style={styles.paperText}>
                      {Number(it.qty) || 0} × {formatVND(Number(it.price) || 0)}
                      {Number(it.discountPct) > 0 ? ` (CK ${it.discountPct}%)` : ''}
                    </Text>
                  </View>
                ))}
                <Text style={styles.paperMuted}>* Đơn giá chưa gồm thuế VAT</Text>
                <Text style={styles.paperMuted}>Tạm tính: {formatVND(totals.subtotal)}</Text>
                <Text style={styles.paperMuted}>Chiết khấu: − {formatVND(totals.discount)}</Text>
                <Text style={styles.paperMuted}>Thuế VAT (${Math.max(Number(draft.taxPct) || 0, 0)}%): {formatVND(totals.tax)}</Text>
                <Text style={styles.paperBold}>Tổng thanh toán: {formatVND(totals.total)}</Text>
                <Text style={styles.paperMuted}>Bằng chữ: {amountInWords(totals.total)}</Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    );
  }

  if (picker) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="auto" />
        <ScrollView contentContainerStyle={styles.pad}>
          <Pressable onPress={() => setPicker(null)}>
            <Text style={styles.link}>← Danh sách</Text>
          </Pressable>
          <Text style={styles.h1}>Chọn mẫu {picker === 'QUO' ? 'báo giá' : 'phiếu thu'}</Text>
          {db.templates.some(t => t.kind === picker) && <Text style={styles.label}>Mẫu của tôi</Text>}
          {db.templates.filter(t => t.kind === picker).map(t => (
            <View key={t.id} style={styles.card}>
              <View style={styles.listRow}>
                <Pressable style={[styles.flex, styles.listRow]} onPress={() => startNew(picker, { ...t, id: t.baseId ?? t.id })}>
                  <View style={styles.flex}>
                    <Text style={styles.bold}>{t.name}</Text>
                    <Text style={styles.muted}>{t.items.length} hạng mục · chỉ cần nhập khách</Text>
                  </View>
                  <Text style={styles.muted}>›</Text>
                </Pressable>
                <Pressable onPress={() => removeTemplate(t.id)} style={styles.del} accessibilityRole="button" accessibilityLabel={`Xóa mẫu ${t.name}`}>
                  <Text style={styles.body}>✕</Text>
                </Pressable>
              </View>
            </View>
          ))}
          <Text style={styles.label}>Mẫu có sẵn</Text>
          {templatesFor(picker).map(tpl => (
            <Pressable key={tpl.id} style={styles.card} onPress={() => startNew(picker, tpl)}>
              <View style={styles.listRow}>
                <View style={[styles.swatch, { backgroundColor: tpl.accent }]} />
                <View style={styles.flex}>
                  <Text style={styles.bold}>{tpl.name}</Text>
                  <Text style={styles.muted}>{tpl.hint}</Text>
                </View>
                <Text style={styles.muted}>›</Text>
              </View>
            </Pressable>
          ))}
          <Pressable style={styles.ghost} onPress={() => startNew(picker)}>
            <Text style={styles.ghostText}>Bắt đầu từ trang trống</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const shown = filter === 'ALL' ? db.docs : db.docs.filter(d => d.kind === filter);
  const count = (s: Status) => db.docs.filter(d => d.status === s).length;
  const outstanding = db.docs.filter(d => d.kind === 'INV' && d.status === 'sent').reduce((sum, d) => sum + documentTotals(d).total, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.h1}>Báo giá & Phiếu thu</Text>
        <View style={styles.row}>
          <Pressable style={[styles.primary, styles.flex]} onPress={() => setPicker('QUO')}>
            <Text style={styles.primaryText}>+ Báo giá</Text>
          </Pressable>
          <Pressable style={[styles.primary, styles.flex]} onPress={() => setPicker('INV')}>
            <Text style={styles.primaryText}>+ Phiếu thu</Text>
          </Pressable>
        </View>
        {db.docs.length > 0 && (
          <View style={styles.card}>
            <View style={styles.row}>
              {(['draft', 'sent', 'paid'] as Status[]).map(s => (
                <View key={s} style={[styles.stat, { backgroundColor: c.statusBg[s] }]}>
                  <Text style={[styles.statNum, { color: c.statusFg[s] }]}>{count(s)}</Text>
                  <Text style={[styles.pillText, { color: c.statusFg[s] }]}>{STATUS_LABEL[s]}</Text>
                </View>
              ))}
            </View>
            {outstanding > 0 && <Text style={styles.muted}>Phiếu thu chờ thu: {formatVND(outstanding)}</Text>}
          </View>
        )}
        <View style={styles.row}>
          <Pressable style={[styles.ghost, styles.flex]} onPress={() => setShowPricing(true)}>
            <Text style={styles.ghostText}>Bảng giá</Text>
          </Pressable>
          <Pressable style={[styles.ghost, styles.flex]} onPress={() => setShowCompany(true)}>
            <Text style={styles.ghostText}>Thông tin công ty</Text>
          </Pressable>
        </View>
        {db.docs.length === 0 && <Text style={styles.muted}>Chưa có chứng từ nào. Bấm “+ Báo giá” để bắt đầu.</Text>}
        {db.docs.length > 0 && (
          <View style={styles.segment}>
            {FILTERS.map(f => (
              <Pressable key={f.key} style={[styles.segItem, filter === f.key && styles.segActive]} onPress={() => setFilter(f.key)}>
                <Text style={[styles.segText, filter === f.key && styles.segTextActive]}>{f.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {db.docs.length > 0 && shown.length === 0 && <Text style={styles.muted}>Không có chứng từ nào trong mục này.</Text>}
        {shown.map(d => {
          const t = documentTotals(d);
          const next = NEXT_LABEL[d.status];
          return (
            <View key={d.id} style={styles.card}>
              <Pressable style={styles.listRow} onPress={() => openDoc(d)}>
                <View style={styles.flex}>
                  <Text style={styles.bold}>{d.no}</Text>
                  <Text style={styles.muted}>{d.client}</Text>
                  {!!findTemplate(d.templateId) && <Text style={[styles.pillText, { color: findTemplate(d.templateId)?.accent }]}>{findTemplate(d.templateId)?.name}</Text>}
                </View>
                <View style={styles.listRight}>
                  <Text style={styles.bold}>{formatVND(t.total)}</Text>
                  <View style={[styles.pill, { backgroundColor: c.statusBg[d.status] }]}>
                    <Text style={[styles.pillText, { color: c.statusFg[d.status] }]}>{STATUS_LABEL[d.status]}</Text>
                  </View>
                </View>
              </Pressable>
              {!!next && (
                <Pressable style={styles.ghost} onPress={() => advance(d)}>
                  <Text style={styles.ghostText}>{next}</Text>
                </Pressable>
              )}
              {d.kind === 'QUO' && !d.convertedTo && (
                <Pressable style={styles.ghost} onPress={() => convertToInvoice(d)}>
                  <Text style={styles.ghostText}>Chuyển thành phiếu thu</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// Spacing on an 8pt grid (4 only for the inner gutter of the segmented control), tap targets >= 44pt, fully rounded buttons.
const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    pad: { padding: 16, gap: 8 },
    h1: { fontFamily: FONT, fontSize: 34, fontWeight: '700', letterSpacing: 0.4, color: c.text, marginTop: 8, marginBottom: 8 },
    label: { fontFamily: FONT, fontSize: 13, color: c.muted, marginTop: 8, marginLeft: 8 },
    body: { fontFamily: FONT, fontSize: 17, color: c.text },
    big: { fontFamily: FONT, fontSize: 20, fontWeight: '700', color: c.text, marginTop: 8 },
    bold: { fontFamily: FONT, fontSize: 17, fontWeight: '600', color: c.text },
    muted: { fontFamily: FONT, fontSize: 15, color: c.muted },
    link: { fontFamily: FONT, color: c.accent, fontSize: 17, minHeight: 48, paddingVertical: 8, textAlignVertical: 'center' },
    error: { fontFamily: FONT, color: c.error, fontSize: 13 },
    input: { fontFamily: FONT, backgroundColor: c.field, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, fontSize: 17, color: c.text },
    row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    flex: { flex: 1 },
    small: { fontFamily: FONT, width: 64, backgroundColor: c.field, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 16, fontSize: 17, color: c.text },
    mid: { fontFamily: FONT, width: 104, backgroundColor: c.field, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 16, fontSize: 17, color: c.text },
    itemBox: { gap: 8, paddingBottom: 8 },
    chip: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.field },
    chipOn: { backgroundColor: c.accent },
    chipText: { fontFamily: FONT, fontSize: 17, color: c.text },
    chipTextOn: { color: c.onAccent, fontWeight: '600' },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 48 },
    box: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: c.muted, alignItems: 'center', justifyContent: 'center' },
    boxOn: { backgroundColor: c.accent, borderColor: c.accent },
    boxMark: { color: c.onAccent, fontSize: 17, fontWeight: '700' },
    del: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
    delSmall: { minWidth: 36, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
    ckBtn: { minHeight: 48, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
    ckBtnText: { fontFamily: FONT, fontSize: 15, fontWeight: '600', color: c.accent },
    card: { backgroundColor: c.card, borderRadius: 16, padding: 16, gap: 8 },
    listRow: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 48 },
    listRight: { alignItems: 'flex-end', gap: 8 },
    swatch: { width: 8, alignSelf: 'stretch', borderRadius: 4, minHeight: 40 },
    stat: { flex: 1, borderRadius: 16, paddingVertical: 8, alignItems: 'center' },
    statNum: { fontFamily: FONT, fontSize: 28, fontWeight: '700' },
    pill: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 4 },
    pillText: { fontFamily: FONT, fontSize: 13, fontWeight: '600' },
    segment: { flexDirection: 'row', backgroundColor: c.segTrack, borderRadius: 24, padding: 4 },
    segItem: { flex: 1, minHeight: 44, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    segActive: { backgroundColor: c.segActive },
    segText: { fontFamily: FONT, fontSize: 15, color: c.segText },
    segTextActive: { fontWeight: '600', color: c.text },
    primary: { backgroundColor: c.accent, borderRadius: 12, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
    primaryText: { fontFamily: FONT, color: c.onAccent, fontSize: 17, fontWeight: '600' },
    ghost: { backgroundColor: c.accentSoft, borderRadius: 12, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
    ghostText: { fontFamily: FONT, color: c.accent, fontSize: 17 },
    actionBtn: { flexDirection: 'row', gap: 8 },
    dimmed: { opacity: 0.4 },
    paper: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, gap: 8 },
    paperTitle: { fontFamily: FONT, fontSize: 34, fontWeight: '700', color: c.accent },
    paperText: { fontFamily: FONT, fontSize: 15, color: '#1D1D1F' },
    paperBold: { fontFamily: FONT, fontSize: 17, fontWeight: '600', color: '#1D1D1F' },
    paperMuted: { fontFamily: FONT, fontSize: 15, color: '#6E6E73' },
    paperRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  });
