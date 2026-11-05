import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { documentTotals, formatVND, nextNumber, nextStatus, type DocKind, type LineItem, type Status } from './src/calc.ts';
import { loadDb, saveDb, type Db, type Doc } from './src/storage.ts';
import { shareDocPdf } from './src/pdf.ts';
import PricingScreen from './src/PricingScreen.tsx';
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
  { key: 'INV', label: 'Hóa đơn' },
];

type Draft =Omit<Doc, 'createdAt'> & { createdAt?: string };

function blankDraft(db: Db, kind: DocKind, tpl?: Template): Draft {
  return {
    id: Date.now().toString(36),
    kind,
    no: nextNumber(kind, db.counters[kind]),
    client: '',
    note: tpl?.note ?? '',
    items: tpl ? tpl.items.map(it => ({ ...it })) : [{ name: '', qty: 1, price: 0, discountPct: 0 }],
    discountPct: 0,
    taxPct: tpl?.taxPct ?? 0,
    status: 'draft',
    templateId: tpl?.id,
  };
}

export default function App() {
  const [db, setDb] = useState<Db | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(true);
  const [error, setError] = useState('');
  const [showPricing, setShowPricing] = useState(false);
  const [picker, setPicker] = useState<DocKind | null>(null);
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

  function startNew(kind: DocKind, tpl?: Template) {
    if (!db) return;
    setIsNew(true);
    setError('');
    setPicker(null);
    setDraft(blankDraft(db, kind, tpl));
  }

  function openDoc(doc: Doc) {
    setIsNew(false);
    setError('');
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
    await persist({ docs, counters });
    setDraft(null);
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

  if (draft) {
    const totals = documentTotals(draft);
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="auto" />
        <ScrollView contentContainerStyle={styles.pad}>
          <Pressable onPress={() => setDraft(null)}>
            <Text style={styles.link}>← Danh sách</Text>
          </Pressable>
          <Text style={styles.h1}>
            {draft.kind === 'QUO' ? 'Báo giá' : 'Hóa đơn'} {draft.no}
          </Text>

          <Text style={styles.label}>Tên khách hàng</Text>
          <TextInput style={styles.input} value={draft.client} onChangeText={v => setDraft({ ...draft, client: v })} placeholder="VD: Anh Minh" placeholderTextColor={c.muted} />
          <Text style={styles.label}>Địa chỉ / ghi chú</Text>
          <TextInput style={styles.input} value={draft.note} onChangeText={v => setDraft({ ...draft, note: v })} />

          <Text style={styles.label}>Hạng mục</Text>
          {draft.items.map((it, i) => (
            <View key={i} style={styles.row}>
              <TextInput style={[styles.input, styles.flex]} placeholder="Tên" placeholderTextColor={c.muted} value={String(it.name ?? '')} onChangeText={v => updateItem(i, 'name', v)} />
              <TextInput style={styles.small} keyboardType="decimal-pad" placeholder="SL" placeholderTextColor={c.muted} value={String(it.qty ?? '')} onChangeText={v => updateItem(i, 'qty', v)} />
              <TextInput style={styles.mid} keyboardType="number-pad" placeholder="Đơn giá" placeholderTextColor={c.muted} value={String(it.price ?? '')} onChangeText={v => updateItem(i, 'price', v)} />
              <TextInput style={styles.small} keyboardType="decimal-pad" placeholder="CK%" placeholderTextColor={c.muted} value={String(it.discountPct ?? '')} onChangeText={v => updateItem(i, 'discountPct', v)} />
              <Pressable onPress={() => setDraft({ ...draft, items: draft.items.filter((_, idx) => idx !== i) })} style={styles.del}>
                <Text style={styles.body}>✕</Text>
              </Pressable>
            </View>
          ))}
          <Pressable style={styles.ghost} onPress={() => setDraft({ ...draft, items: [...draft.items, { name: '', qty: 1, price: 0, discountPct: 0 }] })}>
            <Text style={styles.ghostText}>+ Thêm hạng mục</Text>
          </Pressable>

          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.label}>Chiết khấu toàn bộ (%)</Text>
              <TextInput style={styles.input} keyboardType="decimal-pad" value={String(draft.discountPct)} onChangeText={v => setDraft({ ...draft, discountPct: Number(v) || 0 })} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.label}>VAT (%)</Text>
              <TextInput style={styles.input} keyboardType="decimal-pad" value={String(draft.taxPct)} onChangeText={v => setDraft({ ...draft, taxPct: Number(v) || 0 })} />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.body}>Tạm tính: {formatVND(totals.subtotal)}</Text>
            <Text style={styles.body}>Chiết khấu: − {formatVND(totals.discount)}</Text>
            <Text style={styles.body}>VAT: {formatVND(totals.tax)}</Text>
            <Text style={styles.big}>Tổng cộng: {formatVND(totals.total)}</Text>
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={styles.primary} onPress={saveDraft}>
            <Text style={styles.primaryText}>Lưu chứng từ</Text>
          </Pressable>
          {!isNew && (
            <Pressable style={styles.ghost} onPress={() => shareDocPdf({ ...draft, createdAt: draft.createdAt ?? '' }).catch(() => Alert.alert('Không xuất được PDF'))}>
              <Text style={styles.ghostText}>Xuất PDF / In</Text>
            </Pressable>
          )}
        </ScrollView>
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
          <Text style={styles.h1}>Chọn mẫu {picker === 'QUO' ? 'báo giá' : 'hóa đơn'}</Text>
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
        <Text style={styles.h1}>Báo giá & Hóa đơn</Text>
        <View style={styles.row}>
          <Pressable style={[styles.primary, styles.flex]} onPress={() => setPicker('QUO')}>
            <Text style={styles.primaryText}>+ Báo giá</Text>
          </Pressable>
          <Pressable style={[styles.primary, styles.flex]} onPress={() => setPicker('INV')}>
            <Text style={styles.primaryText}>+ Hóa đơn</Text>
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
            {outstanding > 0 && <Text style={styles.muted}>Hóa đơn chờ thu: {formatVND(outstanding)}</Text>}
          </View>
        )}
        <Pressable style={styles.ghost} onPress={() => setShowPricing(true)}>
          <Text style={styles.ghostText}>Bảng giá</Text>
        </Pressable>
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
    del: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
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
    primary: { backgroundColor: c.accent, borderRadius: 24, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
    primaryText: { fontFamily: FONT, color: c.onAccent, fontSize: 17, fontWeight: '600' },
    ghost: { backgroundColor: c.accentSoft, borderRadius: 24, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
    ghostText: { fontFamily: FONT, color: c.accent, fontSize: 17 },
  });
