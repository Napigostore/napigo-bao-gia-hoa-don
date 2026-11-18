import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PLANS, formatPlanPrices } from './config/pricing.ts';
import { PRO_SKUS, buyPro, loadProOffers, restorePro, type ProOffer } from './iap.ts';
import { FREE_EXPORTS_PER_DAY } from './quota.ts';

// Subset of the App palette (light or dark) used by this screen.
type Colors = { text: string; muted: string; card: string; accent: string; onAccent: string };

export default function PricingScreen({
  onBack,
  colors,
  font,
  isPro,
  onProChange,
}: {
  onBack: () => void;
  colors: Colors;
  font?: string;
  isPro: boolean;
  onProChange: (v: boolean) => void;
}) {
  const styles = makePricingStyles(font);
  const [offers, setOffers] = useState<ProOffer[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadProOffers()
      .then(setOffers)
      .catch(() => setOffers([]));
  }, []);

  // Price text from the App Store when available, otherwise the configured price.
  const offerFor = (sku: string) => offers?.find(o => o.sku === sku);
  const pro = PLANS.find(p => p.id === 'pro');

  async function onBuy(sku: string) {
    setBusy(true);
    try {
      const ok = await buyPro(sku);
      if (ok) {
        onProChange(true);
        Alert.alert('Đã nâng cấp Pro', 'Cảm ơn bạn. Bạn có thể xuất không giới hạn và chỉnh sửa mẫu.');
      }
    } catch {
      Alert.alert('Không mua được', 'Vui lòng thử lại sau. Nếu đã mua trước đó, bấm "Khôi phục giao dịch".');
    } finally {
      setBusy(false);
    }
  }

  async function onRestore() {
    setBusy(true);
    try {
      const active = await restorePro();
      onProChange(active);
      Alert.alert(active ? 'Đã khôi phục' : 'Không có gói nào', active ? 'Gói Pro của bạn đã được khôi phục.' : 'Không tìm thấy gói Pro nào cho tài khoản App Store này.');
    } catch {
      Alert.alert('Không khôi phục được', 'Vui lòng thử lại sau.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Pressable onPress={onBack}>
        <Text style={[styles.link, { color: colors.accent }]}>← Danh sách</Text>
      </Pressable>
      <Text style={[styles.h1, { color: colors.text }]}>Bảng giá</Text>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.name, { color: colors.text }]}>Free</Text>
        <Text style={[styles.price, { color: colors.text }]}>0 USD</Text>
        <Text style={[styles.muted, { color: colors.muted }]}>
          Có quảng cáo. Tối đa {FREE_EXPORTS_PER_DAY} lượt xuất PDF, in hoặc XML mỗi ngày.
        </Text>
      </View>

      {pro && (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.name, { color: colors.text }]}>Pro</Text>
          <Text style={[styles.muted, { color: colors.muted }]}>
            Không quảng cáo. Xuất không giới hạn. Chỉnh sửa mẫu hóa đơn.
          </Text>
          {isPro ? (
            <Text style={[styles.price, { color: colors.accent }]}>Bạn đang dùng gói Pro</Text>
          ) : offers === null ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            [PRO_SKUS.monthly, PRO_SKUS.yearly].map((sku, i) => {
              const offer = offerFor(sku);
              const fallback = formatPlanPrices(pro)[i] ?? '';
              return (
                <Pressable
                  key={sku}
                  disabled={busy || !offer}
                  onPress={() => onBuy(sku)}
                  style={[styles.buy, { backgroundColor: colors.accent, opacity: busy || !offer ? 0.5 : 1 }]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.buyText, { color: colors.onAccent }]}>
                    {i === 0 ? 'Mua theo tháng' : 'Mua theo năm'} · {offer?.displayPrice ?? fallback}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      )}

      <Pressable onPress={onRestore} disabled={busy} style={styles.restore} accessibilityRole="button">
        <Text style={[styles.link, { color: colors.accent }]}>Khôi phục giao dịch</Text>
      </Pressable>
    </ScrollView>
  );
}

const makePricingStyles = (font?: string) =>
  StyleSheet.create({
    pad: { padding: 16, gap: 12 },
    h1: { fontFamily: font, fontSize: 34, fontWeight: '700', letterSpacing: 0.4, marginTop: 8, marginBottom: 4 },
    link: { fontFamily: font, fontSize: 19, minHeight: 44, paddingVertical: 10 },
    card: { borderRadius: 20, padding: 16, gap: 10 },
    name: { fontFamily: font, fontSize: 19, fontWeight: '600' },
    price: { fontFamily: font, fontSize: 22, fontWeight: '700' },
    muted: { fontFamily: font, fontSize: 17 },
    buy: { borderRadius: 16, minHeight: 52, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
    buyText: { fontFamily: font, fontSize: 19, fontWeight: '700' },
    restore: { alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  });
