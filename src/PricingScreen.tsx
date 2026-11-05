import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PLANS, formatUsdPerYear } from './config/pricing.ts';

// Subset of the App palette (light or dark) used by this screen.
type Colors = { text: string; muted: string; card: string; accent: string; onAccent: string };

export default function PricingScreen({ onBack, colors }: { onBack: () => void; colors: Colors }) {
  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Pressable onPress={onBack}>
        <Text style={[styles.link, { color: colors.accent }]}>← Danh sách</Text>
      </Pressable>
      <Text style={[styles.h1, { color: colors.text }]}>Bảng giá</Text>
      {PLANS.map(plan => (
        <View key={plan.id} style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.name, { color: colors.text }]}>{plan.name}</Text>
          <Text style={[styles.price, { color: colors.text }]}>{formatUsdPerYear(plan)}</Text>
          <Text style={[styles.muted, { color: colors.muted }]}>{plan.hasAds ? 'Có quảng cáo' : 'Không quảng cáo'}</Text>
          {plan.id !== 'free' && (
            <Pressable
              style={[styles.primary, { backgroundColor: colors.accent }]}
              onPress={() => Alert.alert('Sắp ra mắt', 'Thanh toán chưa được bật.')}
            >
              <Text style={[styles.primaryText, { color: colors.onAccent }]}>Nâng cấp</Text>
            </Pressable>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, gap: 12 },
  h1: { fontSize: 34, fontWeight: '700', letterSpacing: 0.4, marginTop: 8, marginBottom: 4 },
  link: { fontSize: 17, minHeight: 44, paddingVertical: 10 },
  card: { borderRadius: 14, padding: 16, gap: 10 },
  name: { fontSize: 17, fontWeight: '600' },
  price: { fontSize: 20, fontWeight: '700' },
  muted: { fontSize: 15 },
  primary: { borderRadius: 12, minHeight: 50, justifyContent: 'center', alignItems: 'center' },
  primaryText: { fontSize: 17, fontWeight: '600' },
});
