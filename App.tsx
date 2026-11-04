import { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { documentTotals, formatVND, nextNumber, nextStatus, type DocKind, type LineItem, type Status } from './src/calc.ts';
import { loadDb, saveDb, type Db, type Doc } from './src/storage.ts';
import { shareDocPdf } from './src/pdf.ts';

const STATUS_LABEL: Record<Status, string> = { draft: 'Nháp', sent: 'Đã gửi', paid: 'Đã thu' };
const NEXT_LABEL: Record<Status, string> = { draft: 'Đánh dấu đã gửi', sent: 'Đánh dấu đã thu', paid: '' };

type Draft = Omit<Doc, 'createdAt'> & { createdAt?: string };

function blankDraft(db: Db, kind: DocKind): Draft {
  return {
    id: Date.now().toString(36),
    kind,
    no: nextNumber(kind, db.counters[kind]),
    client: '',
    note: '',
    items: [{ name: '', qty: 1, price: 0, discountPct: 0 }],
    discountPct: 0,
    taxPct: 0,
    status: 'draft',
  };
}

export default function App() {
  const [db, setDb] = useState<Db | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDb().then(setDb);
  }, []);

  async function persist(next: Db) {
    setDb(next);
    const ok = await saveDb(next);
    if (!ok) Alert.alert('Không lưu được', 'Bộ nhớ máy đang lỗi. Thử lại sau.');
  }

  function startNew(kind: DocKind) {
    if (!db) return;
    setIsNew(true);
    setError('');
    setDraft(blankDraft(db, kind));
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
          <TextInput style={styles.input} value={draft.client} onChangeText={v => setDraft({ ...draft, client: v })} placeholder="VD: Anh Minh" />
          <Text style={styles.label}>Địa chỉ / ghi chú</Text>
          <TextInput style={styles.input} value={draft.note} onChangeText={v => setDraft({ ...draft, note: v })} />

          <Text style={styles.label}>Hạng mục</Text>
          {draft.items.map((it, i) => (
            <View key={i} style={styles.row}>
              <TextInput style={[styles.input, styles.flex]} placeholder="Tên" value={String(it.name ?? '')} onChangeText={v => updateItem(i, 'name', v)} />
              <TextInput style={styles.small} keyboardType="decimal-pad" placeholder="SL" value={String(it.qty ?? '')} onChangeText={v => updateItem(i, 'qty', v)} />
              <TextInput style={styles.mid} keyboardType="number-pad" placeholder="Đơn giá" value={String(it.price ?? '')} onChangeText={v => updateItem(i, 'price', v)} />
              <TextInput style={styles.small} keyboardType="decimal-pad" placeholder="CK%" value={String(it.discountPct ?? '')} onChangeText={v => updateItem(i, 'discountPct', v)} />
              <Pressable onPress={() => setDraft({ ...draft, items: draft.items.filter((_, idx) => idx !== i) })} style={styles.del}>
                <Text>✕</Text>
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

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.h1}>Báo giá & Hóa đơn</Text>
        <View style={styles.row}>
          <Pressable style={[styles.primary, styles.flex]} onPress={() => startNew('QUO')}>
            <Text style={styles.primaryText}>+ Báo giá</Text>
          </Pressable>
          <Pressable style={[styles.primary, styles.flex]} onPress={() => startNew('INV')}>
            <Text style={styles.primaryText}>+ Hóa đơn</Text>
          </Pressable>
        </View>
        {db.docs.length === 0 && <Text style={styles.muted}>Chưa có chứng từ nào. Bấm “+ Báo giá” để bắt đầu.</Text>}
        {db.docs.map(d => {
          const t = documentTotals(d);
          const next = NEXT_LABEL[d.status];
          return (
            <View key={d.id} style={styles.card}>
              <Pressable onPress={() => openDoc(d)}>
                <Text style={styles.body}>
                  <Text style={styles.bold}>{d.no}</Text> · {d.client}
                </Text>
                <Text style={styles.muted}>
                  {STATUS_LABEL[d.status]} · {formatVND(t.total)}
                </Text>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f6f8' },
  pad: { padding: 16, gap: 10 },
  h1: { fontSize: 20, fontWeight: '700', color: '#1d2330', marginVertical: 6 },
  label: { fontSize: 13, color: '#6b7280', marginTop: 6 },
  body: { fontSize: 15, color: '#1d2330' },
  big: { fontSize: 17, fontWeight: '700', color: '#1d2330', marginTop: 4 },
  bold: { fontWeight: '700' },
  muted: { fontSize: 13, color: '#6b7280' },
  link: { color: '#2f6fed', fontSize: 15 },
  error: { color: '#d64545', fontSize: 13 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dfe3ea', borderRadius: 8, padding: 10, fontSize: 15, color: '#1d2330' },
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  flex: { flex: 1 },
  small: { width: 60, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dfe3ea', borderRadius: 8, padding: 10, fontSize: 15 },
  mid: { width: 100, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dfe3ea', borderRadius: 8, padding: 10, fontSize: 15 },
  del: { padding: 10 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dfe3ea', borderRadius: 12, padding: 12, gap: 6 },
  primary: { backgroundColor: '#2f6fed', borderRadius: 10, padding: 13, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  ghost: { borderWidth: 1, borderColor: '#2f6fed', borderRadius: 10, padding: 10, alignItems: 'center' },
  ghostText: { color: '#2f6fed', fontSize: 14 },
});
