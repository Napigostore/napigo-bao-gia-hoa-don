import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, useColorScheme, useWindowDimensions, View } from 'react-native';
import { pickImageDataUri } from './src/imagePick.ts';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { amountInWords, documentTotals, formatVND, nextNumber, nextStatus, quoteToInvoice, calcDiscountPct, addCategoryToList, resolveProductPricing, type DocKind, type LineItem, type Status } from './src/calc.ts';
import { loadDb, saveDb, type CatalogItem, type Contact, type Db, type Doc, type SavedTemplate } from './src/storage.ts';
import { printDoc, shareDocPdf } from './src/pdf.ts';
import { QUOTE_BLOCKS, INVOICE_BLOCKS, type Layout } from './src/layout.ts';
import { LayoutDesigner, type Tone } from './src/LayoutDesigner.tsx';
import { Thumb } from './src/Thumb.tsx';
import { validateEInvoice } from './src/einvoice.ts';
import { shareEInvoiceXml } from './src/einvoiceShare.ts';
import PricingScreen from './src/PricingScreen.tsx';
import type { Seller } from './src/config/seller.ts';
import { docLayout, findTemplate, templateLayout, templatesFor, type Template } from './src/templates.ts';
import { getSystemFont, FONT_CONFIG_BY_LANG, type AppLanguage } from './src/typography.ts';
import { SUPPORTED_LANGUAGES, t } from './src/i18n.ts';


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

type Draft = Omit<Doc, 'createdAt'> & { createdAt?: string };

function savedLayout(t: SavedTemplate): Layout {
  if (t.layout) return t.layout;
  const base = t.baseId ? findTemplate(t.baseId) : undefined;
  if (base) return templateLayout(base);
  return { locale: 'vi', title: t.kind === 'QUO' ? 'Báo giá' : 'Phiếu thu', footer: '', blocks: [...(t.kind === 'QUO' ? QUOTE_BLOCKS : INVOICE_BLOCKS)], currency: 'VND' };
}

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

type StartTpl = Pick<Template, 'id' | 'note' | 'taxPct' | 'items'> & { layout?: Layout };

function defaultLayout(kind: DocKind, lang: AppLanguage = 'vi'): Layout {
  const isQuote = kind === 'QUO';
  const isEn = lang === 'en';
  return {
    locale: isEn ? 'en' : 'vi',
    title: isQuote ? (isEn ? 'Quotation' : 'Báo giá') : (isEn ? 'Receipt' : 'Phiếu thu'),
    footer: isQuote
      ? (isEn ? 'Thank you for your interest.' : 'Cảm ơn quý khách đã quan tâm.')
      : (isEn ? 'Thank you for your business.' : 'Cảm ơn quý khách đã tin tưởng.'),
    blocks: [...(isQuote ? QUOTE_BLOCKS : INVOICE_BLOCKS)],
    currency: isEn ? 'USD' : 'VND',
  };
}

function blankDraft(db: Db, kind: DocKind, tpl?: StartTpl): Draft {
  const lang = db.appLanguage ?? 'vi';
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
    layout: tpl?.layout ?? (tpl ? undefined : defaultLayout(kind, lang)),
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
  const [showCatalog, setShowCatalog] = useState(false);
  const [selectedCatFilter, setSelectedCatFilter] = useState('ALL');
  const [productEditor, setProductEditor] = useState<{
    id?: string;
    name: string;
    category: string;
    image?: string;
    listPrice: string;
    discountPrice: string;
  } | null>(null);
  const [catalogFor, setCatalogFor] = useState<number | null>(null); // line index the product drop list is filling
  const [openDiscounts, setOpenDiscounts] = useState<Record<number, boolean>>({});
  const [filter, setFilter] = useState<'ALL' | DocKind>('ALL');
  const [showLayout, setShowLayout] = useState(false); // layout editor for the open document
  const [tplEditor, setTplEditor] = useState<{ id?: string; kind: DocKind; name: string; layout: Layout } | null>(null);
  const [market, setMarket] = useState('ALL');
  const [showSettings, setShowSettings] = useState(false);
  const c = useColorScheme() === 'dark' ? DARK : LIGHT;
  const lang: AppLanguage = db?.appLanguage ?? 'vi';
  const styles = useMemo(() => makeStyles(c, lang), [c, lang]);
  const { width: winW } = useWindowDimensions();
  const tone: Tone = { accent: c.accent, card: c.card, ink: c.text, muted: c.muted, line: c.segTrack, bg: c.bg };

  useEffect(() => {
    loadDb().then(setDb);
  }, []);

  async function persist(next: Db) {
    setDb(next);
    const ok = await saveDb(next);
    if (!ok) Alert.alert('Không lưu được', 'Bộ nhớ máy đang lỗi. Thử lại sau.');
  }

  function startNew(kind: DocKind, tpl?: StartTpl) {
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
      layout: docLayout(asDoc(draft)),
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

  async function saveTplEditor() {
    if (!db || !tplEditor) return;
    const name = tplEditor.name.trim() || `Mẫu ${db.templates.length + 1}`;
    const id = tplEditor.id;
    const templates = id
      ? db.templates.map(t => (t.id === id ? { ...t, name, layout: tplEditor.layout } : t))
      : [{ id: newId(), kind: tplEditor.kind, name, taxPct: 0, note: '', items: [{ name: '', qty: 1, price: 0, discountPct: 0 }], layout: tplEditor.layout }, ...db.templates];
    await persist({ ...db, templates });
    setTplEditor(null);
  }

  async function removeTemplate(id: string) {
    if (!db) return;
    await persist({ ...db, templates: db.templates.filter(t => t.id !== id) });
  }

  function openSaveToCatalog(i: number) {
    if (!db || !draft) return;
    const it = draft.items[i];
    if (!it) return;
    const name = String(it.name ?? '').trim();
    const priceVal = Number(it.price) || 0;
    const discPct = Number(it.discountPct) || 0;
    let listPrice = priceVal;
    let discountPrice = 0;
    if (discPct > 0 && priceVal > 0) {
      discountPrice = Math.round(priceVal * (1 - discPct / 100));
    }
    setProductEditor({
      name,
      category: db.categories[0] ?? 'Sản phẩm',
      image: '',
      listPrice: listPrice > 0 ? String(listPrice) : '',
      discountPrice: discountPrice > 0 ? String(discountPrice) : '',
    });
  }

  async function saveProductFromEditor() {
    if (!db || !productEditor) return;
    const name = productEditor.name.trim();
    if (!name) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên sản phẩm.');
      return;
    }
    const listPrice = Number(productEditor.listPrice) || 0;
    const discountPrice = Number(productEditor.discountPrice) || 0;
    const effectivePrice = discountPrice > 0 ? discountPrice : listPrice;
    const cat = productEditor.category.trim();

    const nextCategories = cat ? addCategoryToList(db.categories, cat) : db.categories;

    const item: CatalogItem = {
      id: productEditor.id ?? newId(),
      name,
      price: effectivePrice,
      listPrice: listPrice > 0 ? listPrice : undefined,
      discountPrice: discountPrice > 0 ? discountPrice : undefined,
      category: cat || undefined,
      image: productEditor.image || undefined,
    };

    const nextCatalog = productEditor.id
      ? db.catalog.map(x => (x.id === productEditor.id ? item : x))
      : [...db.catalog, item];

    await persist({
      ...db,
      catalog: nextCatalog,
      categories: nextCategories,
    });

    setProductEditor(null);
  }

  async function removeProduct(id: string) {
    if (!db) return;
    await persist({ ...db, catalog: db.catalog.filter(x => x.id !== id) });
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

  function pickProduct(i: number, p: CatalogItem) {
    if (!draft) return;
    const pricing = resolveProductPricing(p.listPrice, p.discountPrice, p.price);
    setDraft({
      ...draft,
      items: draft.items.map((it, idx) =>
        idx === i
          ? {
              ...it,
              name: p.name,
              price: pricing.effectivePrice,
              discountPct: pricing.discountPct > 0 ? pricing.discountPct : (it.discountPct ?? 0),
            }
          : it
      ),
    });
    if (pricing.discountPct > 0) {
      setOpenDiscounts(prev => ({ ...prev, [i]: true }));
    }
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

  const displayedCatalog = db
    ? db.catalog.filter(p => {
        if (selectedCatFilter === 'ALL') return true;
        return (p.category ?? '').trim().toLowerCase() === selectedCatFilter.trim().toLowerCase();
      })
    : [];

  function renderProductCard(p: CatalogItem, onPressCard: () => void) {
    const hasDiscount = Boolean(p.discountPrice && p.discountPrice > 0 && p.listPrice && p.listPrice > p.discountPrice);
    return (
      <Pressable
        key={p.id}
        style={styles.card}
        onPress={onPressCard}
        accessibilityRole="button"
        accessibilityLabel={p.name}
      >
        <View style={styles.listRow}>
          {p.image ? (
            <Image source={{ uri: p.image }} style={styles.productThumb} accessibilityLabel={p.name} />
          ) : (
            <View style={styles.productThumbPlaceholder}>
              <Text style={{ fontSize: 20 }}>📦</Text>
            </View>
          )}
          <View style={[styles.flex, { gap: 4 }]}>
            <Text style={styles.bold}>{p.name}</Text>
            {!!p.category && (
              <View style={styles.catBadge}>
                <Text style={styles.catBadgeText}>{p.category}</Text>
              </View>
            )}
            <View style={styles.row}>
              {hasDiscount ? (
                <View style={[styles.row, { flexWrap: 'wrap', gap: 6 }]}>
                  <Text style={[styles.muted, { textDecorationLine: 'line-through', fontSize: 13 }]}>
                    {formatVND(p.listPrice!)}
                  </Text>
                  <Text style={[styles.bold, { color: c.accent }]}>
                    {formatVND(p.discountPrice!)}
                  </Text>
                  <View style={[styles.pill, { backgroundColor: c.accentSoft }]}>
                    <Text style={[styles.pillText, { color: c.accent, fontSize: 11 }]}>
                      -{calcDiscountPct(p.listPrice!, p.discountPrice!)}%
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.bold}>
                  {formatVND(p.discountPrice || p.listPrice || p.price)}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.row}>
            <Pressable
              onPress={() => {
                setProductEditor({
                  id: p.id,
                  name: p.name,
                  category: p.category ?? '',
                  image: p.image ?? '',
                  listPrice: p.listPrice ? String(p.listPrice) : (p.price ? String(p.price) : ''),
                  discountPrice: p.discountPrice ? String(p.discountPrice) : '',
                });
              }}
              style={styles.delSmall}
              accessibilityRole="button"
              accessibilityLabel={`Sửa ${p.name}`}
            >
              <Text style={styles.link}>✎</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Alert.alert('Xóa sản phẩm', `Bạn có chắc muốn xóa "${p.name}"?`, [
                  { text: 'Hủy', style: 'cancel' },
                  {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: () => removeProduct(p.id),
                  },
                ]);
              }}
              style={styles.delSmall}
              accessibilityRole="button"
              accessibilityLabel={`Xóa ${p.name}`}
            >
              <Text style={styles.muted}>✕</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  }

  function renderProductEditorModal() {
    if (!db || !productEditor) return null;
    return (
      <Modal visible={productEditor !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setProductEditor(null)}>
        <SafeAreaView style={styles.safe}>
          <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => setProductEditor(null)}>
              <Text style={styles.link}>← Hủy</Text>
            </Pressable>
            <Text style={styles.h1}>{productEditor.id ? t('editProduct', lang) : t('newProduct', lang)}</Text>
            <Text style={styles.muted}>Điền thông tin sản phẩm và phân loại để lưu vào danh mục dùng lại.</Text>

            {/* Ảnh sản phẩm */}
            <Text style={styles.label}>{t('productImage', lang)}</Text>
            <View style={styles.card}>
              <View style={styles.listRow}>
                {productEditor.image ? (
                  <Image source={{ uri: productEditor.image }} style={{ width: 72, height: 72, borderRadius: 12, resizeMode: 'cover' }} accessibilityLabel="Ảnh sản phẩm" />
                ) : (
                  <View style={[styles.productThumbPlaceholder, { width: 72, height: 72, borderRadius: 12 }]}>
                    <Text style={{ fontSize: 32 }}>📷</Text>
                  </View>
                )}
                <View style={[styles.flex, { gap: 8 }]}>
                  <Pressable
                    style={styles.ghost}
                    onPress={async () => {
                      try {
                        const uri = await pickImageDataUri([1, 1]);
                        if (uri) setProductEditor(prev => (prev ? { ...prev, image: uri } : null));
                      } catch {
                        Alert.alert('Không chọn được ảnh', 'Vui lòng kiểm tra quyền truy cập thư viện ảnh.');
                      }
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.ghostText}>{productEditor.image ? 'Đổi ảnh' : 'Chọn ảnh sản phẩm'}</Text>
                  </Pressable>
                  {!!productEditor.image && (
                    <Pressable
                      style={styles.ghost}
                      onPress={() => setProductEditor(prev => (prev ? { ...prev, image: '' } : null))}
                      accessibilityRole="button"
                    >
                      <Text style={styles.ghostText}>Xóa ảnh</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>

            {/* Tên sản phẩm */}
            <Text style={styles.label}>{t('productName', lang)} *</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: Cửa nhôm Xingfa hệ 55"
              placeholderTextColor={c.muted}
              value={productEditor.name}
              onChangeText={v => setProductEditor(prev => (prev ? { ...prev, name: v } : null))}
            />

            {/* Phân loại / Danh mục */}
            <Text style={styles.label}>{t('productCategory', lang)}</Text>
            <Text style={styles.footnote}>Chạm để chọn nhanh danh mục có sẵn:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
              <View style={styles.row}>
                {db.categories.map(cat => {
                  const isSel = (productEditor.category ?? '').trim().toLowerCase() === cat.trim().toLowerCase();
                  return (
                    <Pressable
                      key={cat}
                      style={[styles.catChip, isSel && styles.catChipActive]}
                      onPress={() => setProductEditor(prev => (prev ? { ...prev, category: cat } : null))}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.catChipText, isSel && styles.catChipTextActive]}>{cat}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <Text style={styles.footnote}>Hoặc nhập tay danh mục mới:</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.flex]}
                placeholder="Nhập tên phân loại / danh mục..."
                placeholderTextColor={c.muted}
                value={productEditor.category}
                onChangeText={v => setProductEditor(prev => (prev ? { ...prev, category: v } : null))}
              />
              {!!productEditor.category.trim() &&
                !db.categories.some(c => c.trim().toLowerCase() === productEditor.category.trim().toLowerCase()) && (
                  <Pressable
                    style={styles.ghost}
                    onPress={() => {
                      const updated = addCategoryToList(db.categories, productEditor.category);
                      persist({ ...db, categories: updated });
                      Alert.alert('Đã lưu danh mục', `Đã lưu danh mục "${productEditor.category.trim()}" để chọn lại.`);
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.ghostText}>+ Lưu DM</Text>
                  </Pressable>
                )}
            </View>

            {/* Giá niêm yết */}
            <Text style={styles.label}>{t('listPrice', lang)} (VNĐ) *</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="VD: 500000"
              placeholderTextColor={c.muted}
              value={productEditor.listPrice}
              onChangeText={v => setProductEditor(prev => (prev ? { ...prev, listPrice: v } : null))}
            />
            {Number(productEditor.listPrice) > 0 && (
              <Text style={styles.footnote}>Định dạng: {formatVND(Number(productEditor.listPrice))}</Text>
            )}

            {/* Giá chiết khấu */}
            <Text style={styles.label}>{t('discountPrice', lang)} (VNĐ)</Text>
            <Text style={styles.footnote}>Giá bán ưu đãi sau giảm giá (để trống nếu bán theo giá niêm yết)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="VD: 450000"
              placeholderTextColor={c.muted}
              value={productEditor.discountPrice}
              onChangeText={v => setProductEditor(prev => (prev ? { ...prev, discountPrice: v } : null))}
            />
            {Number(productEditor.discountPrice) > 0 && Number(productEditor.listPrice) > 0 && (
              <Text style={[styles.footnote, { color: c.accent, fontWeight: '600' }]}>
                {Number(productEditor.discountPrice) < Number(productEditor.listPrice)
                  ? `Ưu đãi: ${formatVND(Number(productEditor.discountPrice))} (Giảm ${calcDiscountPct(
                      Number(productEditor.listPrice),
                      Number(productEditor.discountPrice)
                    )}%)`
                  : `Giá bán: ${formatVND(Number(productEditor.discountPrice))}`}
              </Text>
            )}

            {/* Nút lưu */}
            <View style={{ marginTop: 16, gap: 8 }}>
              <ActionButton
                styles={styles}
                color={c.onAccent}
                label={t('saveProduct', lang)}
                symbol="square.and.arrow.down"
                glyph="💾"
                primary
                onPress={saveProductFromEditor}
              />
              <Pressable style={styles.ghost} onPress={() => setProductEditor(null)} accessibilityRole="button">
                <Text style={styles.ghostText}>Hủy bỏ</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }

  if (showCatalog) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="auto" />
        <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => { setShowCatalog(false); setSelectedCatFilter('ALL'); }}>
            <Text style={styles.link}>← Quay lại</Text>
          </Pressable>
          <View style={styles.headerRow}>
            <Text style={styles.h1}>{t('catalogTitle', lang)}</Text>
            <Pressable
              style={styles.ghost}
              onPress={() =>
                setProductEditor({
                  name: '',
                  category: selectedCatFilter !== 'ALL' ? selectedCatFilter : (db.categories[0] ?? 'Sản phẩm'),
                  image: '',
                  listPrice: '',
                  discountPrice: '',
                })
              }
              accessibilityRole="button"
            >
              <Text style={styles.ghostText}>{t('newProduct', lang)}</Text>
            </Pressable>
          </View>
          <Text style={styles.muted}>Quản lý sản phẩm, phân loại danh mục, giá niêm yết và giá chiết khấu.</Text>

          {/* Category Chips Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
            <View style={styles.row}>
              <Pressable
                style={[styles.catChip, selectedCatFilter === 'ALL' && styles.catChipActive]}
                onPress={() => setSelectedCatFilter('ALL')}
                accessibilityRole="button"
              >
                <Text style={[styles.catChipText, selectedCatFilter === 'ALL' && styles.catChipTextActive]}>
                  {t('allCategories', lang)} ({db.catalog.length})
                </Text>
              </Pressable>
              {db.categories.map(cat => {
                const count = db.catalog.filter(p => (p.category ?? '').trim().toLowerCase() === cat.trim().toLowerCase()).length;
                const isSel = selectedCatFilter.trim().toLowerCase() === cat.trim().toLowerCase();
                return (
                  <Pressable
                    key={cat}
                    style={[styles.catChip, isSel && styles.catChipActive]}
                    onPress={() => setSelectedCatFilter(cat)}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.catChipText, isSel && styles.catChipTextActive]}>
                      {cat} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Product List */}
          {db.catalog.length === 0 && (
            <View style={[styles.card, { alignItems: 'center', paddingVertical: 32 }]}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>📦</Text>
              <Text style={styles.bold}>{t('noProducts', lang)}</Text>
              <Text style={[styles.muted, { textAlign: 'center', marginTop: 4 }]}>
                Tạo sản phẩm để chọn nhanh khi xuất báo giá hoặc phiếu thu.
              </Text>
              <Pressable
                style={[styles.primary, { marginTop: 16, paddingHorizontal: 20 }]}
                onPress={() =>
                  setProductEditor({
                    name: '',
                    category: db.categories[0] ?? 'Sản phẩm',
                    image: '',
                    listPrice: '',
                    discountPrice: '',
                  })
                }
              >
                <Text style={styles.primaryText}>+ Tạo sản phẩm đầu tiên</Text>
              </Pressable>
            </View>
          )}

          {db.catalog.length > 0 && displayedCatalog.length === 0 && (
            <Text style={styles.muted}>Không có sản phẩm nào trong danh mục “{selectedCatFilter}”.</Text>
          )}

          {displayedCatalog.map(p =>
            renderProductCard(p, () =>
              setProductEditor({
                id: p.id,
                name: p.name,
                category: p.category ?? '',
                image: p.image ?? '',
                listPrice: p.listPrice ? String(p.listPrice) : (p.price ? String(p.price) : ''),
                discountPrice: p.discountPrice ? String(p.discountPrice) : '',
              })
            )
          )}
        </ScrollView>
        {renderProductEditorModal()}
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
          <TextInput style={styles.input} autoCapitalize="characters" value={s.bankHolder} onChangeText={v => setSeller({ bankHolder: v })} placeholder="Viết hoa không dấu" placeholderTextColor={c.muted} />
          <Text style={styles.label}>Mã QR ngân hàng (ảnh tải từ điện thoại, ưu tiên hơn VietQR tự tạo)</Text>
          <ImageSlot styles={styles} uri={s.bankQrUri} aspect={[1, 1]} empty="Chưa có ảnh mã QR" onPick={v => setSeller({ bankQrUri: v })} onError={() => Alert.alert('Không chọn được ảnh', 'Cho phép truy cập thư viện ảnh trong Cài đặt của iPhone.')} />
          <Text style={styles.muted}>Hoặc nhập số tài khoản ở trên để in mã VietQR tự động (chỉ cho ngân hàng Việt Nam).</Text>
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
                  <Pressable onPress={() => openSaveToCatalog(i)} style={styles.del} accessibilityRole="button">
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
          <Pressable style={styles.ghost} onPress={() => setShowLayout(true)} accessibilityRole="button">
            <Text style={styles.ghostText}>Sửa tiêu đề, phần in và tiền tệ</Text>
          </Pressable>
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
        <Modal visible={showLayout} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowLayout(false)}>
          <SafeAreaView style={styles.safe}>
            <ScrollView contentContainerStyle={styles.pad}>
              <Pressable onPress={() => setShowLayout(false)}>
                <Text style={styles.link}>← Xong</Text>
              </Pressable>
              <Text style={styles.h1}>Bố cục chứng từ</Text>
              <Text style={styles.muted}>Thay đổi chỉ áp dụng cho chứng từ này. Muốn dùng lại, bấm “Lưu làm mẫu của tôi”.</Text>
              <LayoutDesigner tone={tone} layout={docLayout(asDoc(draft))} onChange={l => setDraft({ ...draft, layout: l })} />
            </ScrollView>
          </SafeAreaView>
        </Modal>
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
        <Modal
          visible={catalogFor !== null}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => { setCatalogFor(null); setSelectedCatFilter('ALL'); }}
        >
          <SafeAreaView style={styles.safe}>
            <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
              <View style={styles.headerRow}>
                <Pressable onPress={() => { setCatalogFor(null); setSelectedCatFilter('ALL'); }}>
                  <Text style={styles.link}>Đóng</Text>
                </Pressable>
                <Pressable
                  style={styles.ghost}
                  onPress={() =>
                    setProductEditor({
                      name: '',
                      category: selectedCatFilter !== 'ALL' ? selectedCatFilter : (db.categories[0] ?? 'Sản phẩm'),
                      image: '',
                      listPrice: '',
                      discountPrice: '',
                    })
                  }
                  accessibilityRole="button"
                >
                  <Text style={styles.ghostText}>{t('newProduct', lang)}</Text>
                </Pressable>
              </View>
              <Text style={styles.h1}>Chọn sản phẩm</Text>
              <Text style={styles.muted}>Chạm vào sản phẩm để thêm vào dòng hạng mục.</Text>

              {/* Category Filter Chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                <View style={styles.row}>
                  <Pressable
                    style={[styles.catChip, selectedCatFilter === 'ALL' && styles.catChipActive]}
                    onPress={() => setSelectedCatFilter('ALL')}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.catChipText, selectedCatFilter === 'ALL' && styles.catChipTextActive]}>
                      {t('allCategories', lang)} ({db.catalog.length})
                    </Text>
                  </Pressable>
                  {db.categories.map(cat => {
                    const count = db.catalog.filter(p => (p.category ?? '').trim().toLowerCase() === cat.trim().toLowerCase()).length;
                    const isSel = selectedCatFilter.trim().toLowerCase() === cat.trim().toLowerCase();
                    return (
                      <Pressable
                        key={cat}
                        style={[styles.catChip, isSel && styles.catChipActive]}
                        onPress={() => setSelectedCatFilter(cat)}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.catChipText, isSel && styles.catChipTextActive]}>
                          {cat} ({count})
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              {db.catalog.length === 0 && (
                <View style={[styles.card, { alignItems: 'center', paddingVertical: 24 }]}>
                  <Text style={styles.muted}>
                    Chưa có sản phẩm. Nhập hạng mục rồi bấm “+ Lưu vào danh mục” hoặc bấm “{t('newProduct', lang)}” ở trên.
                  </Text>
                </View>
              )}

              {db.catalog.length > 0 && displayedCatalog.length === 0 && (
                <Text style={styles.muted}>Không có sản phẩm nào trong danh mục “{selectedCatFilter}”.</Text>
              )}

              {displayedCatalog.map(p =>
                renderProductCard(p, () => {
                  if (catalogFor !== null) pickProduct(catalogFor, p);
                })
              )}
            </ScrollView>
            {renderProductEditorModal()}
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
    // Only templates in the app's language; each one is drawn as a picture of the finished form.
    const langTemplates = templatesFor(picker).filter(tpl => tpl.locale === lang);
    const countries = ['ALL', ...Array.from(new Set(langTemplates.map(tpl => tpl.country)))];
    const activeMarket = countries.includes(market) ? market : 'ALL';
    const builtIn = langTemplates.filter(tpl => activeMarket === 'ALL' || tpl.country === activeMarket);
    const savedOfKind = db.templates.filter(tpl => tpl.kind === picker && savedLayout(tpl).locale === lang);
    const cardWidth = Math.floor((winW - 32 - 12) / 2);
    const gridStyle = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 12 };
    const cardStyle = { width: cardWidth, backgroundColor: c.card, borderRadius: 14, padding: 8, gap: 6 };
    const chipLabel = (m: string) => (m === 'ALL' ? t('filterAll', lang) : m === 'VN' ? 'Việt Nam' : m);
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="auto" />
        <ScrollView contentContainerStyle={styles.pad}>
          <Pressable onPress={() => setPicker(null)}>
            <Text style={styles.link}>← Danh sách</Text>
          </Pressable>
          <Text style={styles.h1}>{picker === 'QUO' ? t('filterQuo', lang) : t('filterInv', lang)}</Text>
          <Text style={styles.muted}>Chạm vào hình để chọn. Hình là mẫu đã điền thử với dữ liệu mẫu.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
            <View style={styles.row}>
              {countries.map(m => (
                <Pressable key={m} onPress={() => setMarket(m)} style={[styles.ghost, activeMarket === m && { backgroundColor: c.accent }]} accessibilityRole="button">
                  <Text style={[styles.ghostText, activeMarket === m && { color: c.onAccent }]}>{chipLabel(m)}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {savedOfKind.length > 0 && <Text style={styles.label}>Mẫu của tôi</Text>}
          <View style={gridStyle}>
            {savedOfKind.map(tpl => (
              <Pressable key={tpl.id} style={cardStyle} onPress={() => startNew(picker, { ...tpl, id: tpl.baseId ?? tpl.id })} accessibilityRole="button" accessibilityLabel={`Chọn mẫu ${tpl.name}`}>
                <Thumb layout={savedLayout(tpl)} accent={findTemplate(tpl.baseId)?.accent ?? c.accent} width={cardWidth - 16} />
                <Text style={[styles.bold, { fontSize: 13 }]} numberOfLines={2}>{tpl.name}</Text>
                <View style={styles.listRow}>
                  <Pressable onPress={() => setTplEditor({ id: tpl.id, kind: tpl.kind, name: tpl.name, layout: savedLayout(tpl) })} accessibilityRole="button">
                    <Text style={styles.link}>Sửa ✎</Text>
                  </Pressable>
                  <Pressable onPress={() => removeTemplate(tpl.id)} accessibilityRole="button" accessibilityLabel={`Xóa mẫu ${tpl.name}`}>
                    <Text style={styles.muted}>Xóa</Text>
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </View>

          {builtIn.length > 0 && <Text style={styles.label}>Mẫu có sẵn ({builtIn.length})</Text>}
          <View style={gridStyle}>
            {builtIn.map(tpl => (
              <Pressable key={tpl.id} style={cardStyle} onPress={() => startNew(picker, { ...tpl, layout: templateLayout(tpl) })} accessibilityRole="button" accessibilityLabel={`Chọn mẫu ${tpl.name}`}>
                <Thumb layout={templateLayout(tpl)} accent={tpl.accent} width={cardWidth - 16} />
                <Text style={[styles.bold, { fontSize: 13 }]} numberOfLines={2}>{tpl.title}</Text>
                <Text style={[styles.muted, { fontSize: 11 }]} numberOfLines={2}>{tpl.hint}</Text>
              </Pressable>
            ))}
          </View>
          {savedOfKind.length + builtIn.length === 0 && (
            <Text style={styles.muted}>Chưa có mẫu cho ngôn ngữ này. Tạo mẫu mới hoặc bắt đầu từ trang trống.</Text>
          )}

          <Pressable style={styles.ghost} onPress={() => setTplEditor({ kind: picker, name: '', layout: defaultLayout(picker, lang) })} accessibilityRole="button">
            <Text style={styles.ghostText}>+ Tạo mẫu mới (sắp xếp phần in)</Text>
          </Pressable>
          <Pressable style={styles.ghost} onPress={() => startNew(picker)}>
            <Text style={styles.ghostText}>Bắt đầu từ trang trống</Text>
          </Pressable>
        </ScrollView>
        <Modal visible={tplEditor !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setTplEditor(null)}>
          {tplEditor && (
            <SafeAreaView style={styles.safe}>
              <ScrollView contentContainerStyle={styles.pad}>
                <Pressable onPress={() => setTplEditor(null)}>
                  <Text style={styles.link}>← Hủy</Text>
                </Pressable>
                <Text style={styles.h1}>{tplEditor.id ? 'Sửa mẫu' : 'Tạo mẫu mới'}</Text>
                <LayoutDesigner tone={tone} layout={tplEditor.layout} onChange={l => setTplEditor({ ...tplEditor, layout: l })} name={tplEditor.name} onName={v => setTplEditor({ ...tplEditor, name: v })} />
                <ActionButton styles={styles} color={c.onAccent} label="Lưu mẫu" symbol="square.and.arrow.down" glyph="💾" primary onPress={saveTplEditor} />
              </ScrollView>
            </SafeAreaView>
          )}
        </Modal>
      </SafeAreaView>
    );
  }

  const shown = filter === 'ALL' ? db.docs : db.docs.filter(d => d.kind === filter);
  const count = (s: Status) => db.docs.filter(d => d.status === s).length;
  const outstanding = db.docs.filter(d => d.kind === 'INV' && d.status === 'sent').reduce((sum, d) => sum + documentTotals(d).total, 0);

  const pendingQuotes = db.docs
    .filter(d => d.kind === 'QUO' && d.status === 'sent' && !d.convertedTo)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const statusLabel = (s: Status) => {
    if (s === 'draft') return t('statusDraft', lang);
    if (s === 'sent') return t('statusSent', lang);
    return t('statusPaid', lang);
  };
  const nextLabel = (s: Status) => {
    if (s === 'draft') return t('markSent', lang);
    if (s === 'sent') return t('markPaid', lang);
    return '';
  };
  const filters: { key: 'ALL' | DocKind; label: string }[] = [
    { key: 'ALL', label: t('filterAll', lang) },
    { key: 'QUO', label: t('filterQuo', lang) },
    { key: 'INV', label: t('filterInv', lang) },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.pad}>
        <View style={styles.headerRow}>
          <Text style={styles.h1}>{t('appTitle', lang)}</Text>
          <Pressable
            style={styles.iconBtn}
            onPress={() => setShowSettings(true)}
            accessibilityRole="button"
            accessibilityLabel={t('settings', lang)}
          >
            <SymbolView name="gearshape" size={22} tintColor={c.accent} fallback={<Text style={{ fontSize: 22 }}>⚙️</Text>} />
          </Pressable>
        </View>

        {/* Napi Chốt: báo giá đã gửi mà khách chưa chốt, báo giá nào gửi lâu nhất xếp đầu, chốt xong là ra phiếu thu ngay. */}
        <View style={styles.card}>
          <Text style={styles.bold}>{lang === 'en' ? 'Quotes to close' : 'Báo giá cần chốt'}</Text>
          {pendingQuotes.length === 0 && (
            <Text style={styles.muted}>
              {lang === 'en' ? 'Quotes you mark as sent show up here, oldest first, so none is forgotten.' : 'Báo giá đã gửi mà khách chưa chốt sẽ hiện ở đây, cũ nhất lên đầu, để không bỏ sót khách.'}
            </Text>
          )}
          {pendingQuotes.slice(0, 3).map(q => {
            const days = Math.max(0, Math.floor((new Date().getTime() - new Date(q.createdAt).getTime()) / 86400000));
            return (
              <View key={q.id} style={styles.listRow}>
                <Pressable style={styles.flex} onPress={() => openDoc(q)} accessibilityRole="button">
                  <Text style={styles.bold}>{q.client}</Text>
                  <Text style={styles.muted}>{q.no} · {formatVND(documentTotals(q).total)} · {lang === 'en' ? `${days} days ago` : `${days} ngày trước`}</Text>
                </Pressable>
                <Pressable style={styles.ghost} onPress={() => convertToInvoice(q)} accessibilityRole="button">
                  <Text style={styles.ghostText}>{lang === 'en' ? 'Close deal' : 'Chốt đơn'}</Text>
                </Pressable>
              </View>
            );
          })}
          {pendingQuotes.length > 3 && <Text style={styles.muted}>{lang === 'en' ? `+${pendingQuotes.length - 3} more quotes` : `+${pendingQuotes.length - 3} báo giá nữa`}</Text>}
        </View>

        <View style={styles.row}>
          <Pressable style={[styles.primary, styles.flex]} onPress={() => setPicker('QUO')}>
            <Text style={styles.primaryText}>{t('newQuote', lang)}</Text>
          </Pressable>
          <Pressable style={[styles.primary, styles.flex]} onPress={() => setPicker('INV')}>
            <Text style={styles.primaryText}>{t('newInvoice', lang)}</Text>
          </Pressable>
        </View>

        {db.docs.length > 0 && (
          <View style={styles.card}>
            <View style={styles.row}>
              {(['draft', 'sent', 'paid'] as Status[]).map(s => (
                <View key={s} style={[styles.stat, { backgroundColor: c.statusBg[s] }]}>
                  <Text style={[styles.statNum, { color: c.statusFg[s] }]}>{count(s)}</Text>
                  <Text style={[styles.pillText, { color: c.statusFg[s] }]}>{statusLabel(s)}</Text>
                </View>
              ))}
            </View>
            {outstanding > 0 && <Text style={styles.muted}>{t('pendingReceipts', lang)} {formatVND(outstanding)}</Text>}
          </View>
        )}

        <View style={styles.row}>
          <Pressable style={[styles.ghost, styles.flex]} onPress={() => setShowSettings(true)}>
            <Text style={styles.ghostText}>{t('settings', lang)}</Text>
          </Pressable>
          <Pressable style={[styles.ghost, styles.flex]} onPress={() => setShowCatalog(true)}>
            <Text style={styles.ghostText}>{t('catalogButton', lang)}</Text>
          </Pressable>
          <Pressable style={[styles.ghost, styles.flex]} onPress={() => setShowCompany(true)}>
            <Text style={styles.ghostText}>{t('companyInfo', lang)}</Text>
          </Pressable>
        </View>

        {db.docs.length === 0 && <Text style={styles.muted}>{t('noDocs', lang)}</Text>}

        {db.docs.length > 0 && (
          <View style={styles.segment}>
            {filters.map(f => (
              <Pressable key={f.key} style={[styles.segItem, filter === f.key && styles.segActive]} onPress={() => setFilter(f.key)}>
                <Text style={[styles.segText, filter === f.key && styles.segTextActive]}>{f.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {db.docs.length > 0 && shown.length === 0 && <Text style={styles.muted}>{t('noDocsFilter', lang)}</Text>}

        {shown.map(d => {
          const totals = documentTotals(d);
          const next = nextLabel(d.status);
          return (
            <View key={d.id} style={styles.card}>
              <Pressable style={styles.listRow} onPress={() => openDoc(d)}>
                <View style={styles.flex}>
                  <Text style={styles.bold}>{d.no}</Text>
                  <Text style={styles.muted}>{d.client}</Text>
                  {!!findTemplate(d.templateId) && <Text style={[styles.pillText, { color: findTemplate(d.templateId)?.accent }]}>{findTemplate(d.templateId)?.name}</Text>}
                </View>
                <View style={styles.listRight}>
                  <Text style={styles.bold}>{formatVND(totals.total)}</Text>
                  <View style={[styles.pill, { backgroundColor: c.statusBg[d.status] }]}>
                    <Text style={[styles.pillText, { color: c.statusFg[d.status] }]}>{statusLabel(d.status)}</Text>
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
                  <Text style={styles.ghostText}>{t('convertToInvoice', lang)}</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSettings(false)}>
        <SafeAreaView style={styles.safe}>
          <ScrollView contentContainerStyle={styles.pad}>
            <Pressable onPress={() => setShowSettings(false)}>
              <Text style={styles.link}>{t('done', lang)}</Text>
            </Pressable>
            <Text style={styles.h1}>{t('settingsTitle', lang)}</Text>
            <Text style={styles.muted}>{t('settingsSubtitle', lang)}</Text>

            <View style={styles.settingsSection}>
              <Text style={styles.sectionHeader}>{t('sectionLanguage', lang)}</Text>
              <View style={styles.settingsCard}>
                {SUPPORTED_LANGUAGES.map((item, idx) => {
                  const isSelected = item.code === lang;
                  return (
                    <View key={item.code}>
                      {idx > 0 && <View style={styles.settingsDivider} />}
                      <Pressable
                        style={[styles.settingsRow, isSelected && styles.settingsRowSelected]}
                        onPress={() => persist({ ...db, appLanguage: item.code })}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Text style={{ fontSize: 24 }}>{item.flag}</Text>
                        <View style={styles.flex}>
                          <Text style={styles.bold}>{item.name}</Text>
                          <Text style={styles.muted}>{item.subtitle}</Text>
                        </View>
                        {isSelected && <Text style={{ color: c.accent, fontSize: 18, fontWeight: '700' }}>✓</Text>}
                      </Pressable>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.footnote}>{t('fontConfigDesc', lang)}</Text>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.sectionHeader}>{t('sectionManagement', lang)}</Text>
              <View style={styles.settingsCard}>
                <Pressable
                  style={styles.settingsRow}
                  onPress={() => { setShowSettings(false); setShowCompany(true); }}
                  accessibilityRole="button"
                >
                  <SymbolView name="building.2" size={22} tintColor={c.accent} fallback={<Text style={{ fontSize: 20 }}>🏢</Text>} />
                  <View style={styles.flex}>
                    <Text style={styles.bold}>{t('companyButton', lang)}</Text>
                    <Text style={styles.muted}>{t('companyButtonHint', lang)}</Text>
                  </View>
                  <Text style={styles.muted}>›</Text>
                </Pressable>
                <View style={styles.settingsDivider} />
                <Pressable
                  style={styles.settingsRow}
                  onPress={() => { setShowSettings(false); setShowCatalog(true); }}
                  accessibilityRole="button"
                >
                  <SymbolView name="cube.box" size={22} tintColor={c.accent} fallback={<Text style={{ fontSize: 20 }}>📦</Text>} />
                  <View style={styles.flex}>
                    <Text style={styles.bold}>{t('catalogButton', lang)}</Text>
                    <Text style={styles.muted}>{t('catalogButtonHint', lang)}</Text>
                  </View>
                  <Text style={styles.muted}>›</Text>
                </Pressable>
                <View style={styles.settingsDivider} />
                <Pressable
                  style={styles.settingsRow}
                  onPress={() => { setShowSettings(false); setShowPricing(true); }}
                  accessibilityRole="button"
                >
                  <SymbolView name="creditcard" size={22} tintColor={c.accent} fallback={<Text style={{ fontSize: 20 }}>💳</Text>} />
                  <View style={styles.flex}>
                    <Text style={styles.bold}>{t('pricingButton', lang)}</Text>
                    <Text style={styles.muted}>{t('pricingButtonHint', lang)}</Text>
                  </View>
                  <Text style={styles.muted}>›</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.sectionHeader}>{t('sectionAbout', lang)}</Text>
              <View style={styles.card}>
                <Text style={styles.body}>{t('aboutAppleDesc', lang)}</Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Startup Language Selection Modal */}
      <Modal visible={!db.hasSelectedLanguage} animationType="fade" transparent={false}>
        <SafeAreaView style={styles.safe}>
          <ScrollView contentContainerStyle={[styles.pad, { justifyContent: 'center', minHeight: '100%' }]}>
            <View style={styles.welcomeModal}>
              <View style={styles.welcomeBadge}>
                <SymbolView name="globe" size={32} tintColor={c.accent} fallback={<Text style={{ fontSize: 32 }}>🌐</Text>} />
              </View>
              <Text style={[styles.h1, { textAlign: 'center' }]}>{t('welcomeTitle', lang)}</Text>
              <Text style={[styles.muted, { textAlign: 'center', marginBottom: 16 }]}>{t('welcomeSubtitle', lang)}</Text>

              <View style={[styles.settingsCard, { width: '100%', marginBottom: 16 }]}>
                {SUPPORTED_LANGUAGES.map((item, idx) => {
                  const isSelected = item.code === lang;
                  return (
                    <View key={item.code}>
                      {idx > 0 && <View style={styles.settingsDivider} />}
                      <Pressable
                        style={[styles.settingsRow, isSelected && styles.settingsRowSelected]}
                        onPress={() => persist({ ...db, appLanguage: item.code })}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Text style={{ fontSize: 24 }}>{item.flag}</Text>
                        <View style={styles.flex}>
                          <Text style={styles.bold}>{item.name}</Text>
                          <Text style={styles.muted}>{item.subtitle}</Text>
                        </View>
                        {isSelected && <Text style={{ color: c.accent, fontSize: 18, fontWeight: '700' }}>✓</Text>}
                      </Pressable>
                    </View>
                  );
                })}
              </View>

              <Pressable
                style={[styles.primary, { width: '100%' }]}
                onPress={() => persist({ ...db, hasSelectedLanguage: true })}
                accessibilityRole="button"
              >
                <Text style={styles.primaryText}>{t('getStarted', lang)}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// Spacing on an 8pt grid (4 only for the inner gutter of the segmented control), tap targets >= 44pt, fully rounded buttons.
const makeStyles = (c: Palette, lang: AppLanguage = 'vi') => {
  const font = getSystemFont(lang, Platform.OS);
  const cfg = FONT_CONFIG_BY_LANG[lang] ?? FONT_CONFIG_BY_LANG.vi;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    pad: { padding: 16, gap: 8 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    iconBtn: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
    h1: { fontFamily: font, fontSize: 34, fontWeight: '700', letterSpacing: 0.37, color: c.text, marginTop: 8, marginBottom: 8 },
    label: { fontFamily: font, fontSize: 13, color: c.muted, marginTop: 8, marginLeft: 8 },
    body: { fontFamily: font, fontSize: 17, color: c.text, lineHeight: Math.round(17 * cfg.lineHeightFactor) },
    big: { fontFamily: font, fontSize: 20, fontWeight: '700', color: c.text, marginTop: 8 },
    bold: { fontFamily: font, fontSize: 17, fontWeight: '600', color: c.text, lineHeight: Math.round(17 * cfg.lineHeightFactor) },
    muted: { fontFamily: font, fontSize: 15, color: c.muted, lineHeight: Math.round(15 * cfg.lineHeightFactor) },
    link: { fontFamily: font, color: c.accent, fontSize: 17, minHeight: 48, paddingVertical: 8, textAlignVertical: 'center' },
    error: { fontFamily: font, color: c.error, fontSize: 13 },
    input: { fontFamily: font, backgroundColor: c.field, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, fontSize: 17, color: c.text },
    row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    flex: { flex: 1 },
    small: { fontFamily: font, width: 64, backgroundColor: c.field, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 16, fontSize: 17, color: c.text },
    mid: { fontFamily: font, width: 104, backgroundColor: c.field, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 16, fontSize: 17, color: c.text },
    itemBox: { gap: 8, paddingBottom: 8 },
    chip: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.field },
    chipOn: { backgroundColor: c.accent },
    chipText: { fontFamily: font, fontSize: 17, color: c.text },
    chipTextOn: { color: c.onAccent, fontWeight: '600' },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 48 },
    box: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: c.muted, alignItems: 'center', justifyContent: 'center' },
    boxOn: { backgroundColor: c.accent, borderColor: c.accent },
    boxMark: { color: c.onAccent, fontSize: 17, fontWeight: '700' },
    del: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
    delSmall: { minWidth: 36, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
    ckBtn: { minHeight: 48, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
    ckBtnText: { fontFamily: font, fontSize: 15, fontWeight: '600', color: c.accent },
    card: { backgroundColor: c.card, borderRadius: 16, padding: 16, gap: 8 },
    listRow: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 48 },
    listRight: { alignItems: 'flex-end', gap: 8 },
    swatch: { width: 8, alignSelf: 'stretch', borderRadius: 4, minHeight: 40 },
    stat: { flex: 1, borderRadius: 16, paddingVertical: 8, alignItems: 'center' },
    statNum: { fontFamily: font, fontSize: 28, fontWeight: '700' },
    pill: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 4 },
    pillText: { fontFamily: font, fontSize: 13, fontWeight: '600' },
    segment: { flexDirection: 'row', backgroundColor: c.segTrack, borderRadius: 24, padding: 4 },
    segItem: { flex: 1, minHeight: 44, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    segActive: { backgroundColor: c.segActive },
    segText: { fontFamily: font, fontSize: 15, color: c.segText },
    segTextActive: { fontWeight: '600', color: c.text },
    primary: { backgroundColor: c.accent, borderRadius: 12, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
    primaryText: { fontFamily: font, color: c.onAccent, fontSize: 17, fontWeight: '600' },
    ghost: { backgroundColor: c.accentSoft, borderRadius: 12, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
    ghostText: { fontFamily: font, color: c.accent, fontSize: 17 },
    actionBtn: { flexDirection: 'row', gap: 8 },
    dimmed: { opacity: 0.4 },
    paper: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, gap: 8 },
    paperTitle: { fontFamily: font, fontSize: 34, fontWeight: '700', color: c.accent },
    paperText: { fontFamily: font, fontSize: 15, color: '#1D1D1F' },
    paperBold: { fontFamily: font, fontSize: 17, fontWeight: '600', color: '#1D1D1F' },
    paperMuted: { fontFamily: font, fontSize: 15, color: '#6E6E73' },
    paperRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
    settingsSection: { marginTop: 12, gap: 6 },
    sectionHeader: { fontFamily: font, fontSize: 13, fontWeight: '600', color: c.muted, marginLeft: 8, textTransform: 'uppercase', letterSpacing: 0.2 },
    settingsCard: { backgroundColor: c.card, borderRadius: 16, overflow: 'hidden' },
    settingsRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
    settingsRowSelected: { backgroundColor: c.accentSoft },
    settingsDivider: { height: StyleSheet.hairlineWidth, backgroundColor: c.segTrack, marginLeft: 52 },
    footnote: { fontFamily: font, fontSize: 13, color: c.muted, marginHorizontal: 8, marginTop: 4, lineHeight: 18 },
    catBadge: { alignSelf: 'flex-start', backgroundColor: c.segTrack, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    catBadgeText: { fontFamily: font, fontSize: 12, color: c.muted, fontWeight: '500' },
    catChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: c.field, minHeight: 36, justifyContent: 'center', alignItems: 'center' },
    catChipActive: { backgroundColor: c.accent },
    catChipText: { fontFamily: font, fontSize: 14, color: c.text },
    catChipTextActive: { color: c.onAccent, fontWeight: '600' },
    productThumb: { width: 48, height: 48, borderRadius: 8, resizeMode: 'cover' },
    productThumbPlaceholder: { width: 48, height: 48, borderRadius: 8, backgroundColor: c.segTrack, alignItems: 'center', justifyContent: 'center' },
    welcomeModal: { padding: 24, alignItems: 'center', gap: 16 },
    welcomeBadge: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.accentSoft, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  });
};
