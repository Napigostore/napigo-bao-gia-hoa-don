import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PLANS, formatPlanPrices } from './config/pricing.ts';

// Subset of the App palette (light or dark) used by this screen.
type Colors = { text: string; muted: string; card: string; accent: string; onAccent: string };

export default function PricingScreen({ onBack, colors, font }: { onBack: () => void; colors: Colors; font?: string }) {
  const styles = makePricingStyles(font);
  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Pressable onPress={onBack}>
        <Text style={[styles.link, { color: colors.accent }]}>← Danh sách</Text>
      </Pressable>
      <Text style={[styles.h1, { color: colors.text }]}>Bảng giá</Text>
      {PLANS.map(plan => (
        <View key={plan.id} style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.name, { color: colors.text }]}>{plan.name}</Text>
          {formatPlanPrices(plan).map(line => (
            <Text key={line} style={[styles.price, { color: colors.text }]}>{line}</Text>
          ))}
          <Text style={[styles.muted, { color: colors.muted }]}>{plan.hasAds ? 'Có quảng cáo' : 'Không quảng cáo'}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const makePricingStyles = (font?: string) =>
  StyleSheet.create({
    pad: { padding: 16, gap: 12 },
    h1: { fontFamily: font, fontSize: 34, fontWeight: '700', letterSpacing: 0.4, marginTop: 8, marginBottom: 4 },
    link: { fontFamily: font, fontSize: 17, minHeight: 44, paddingVertical: 10 },
    card: { borderRadius: 14, padding: 16, gap: 10 },
    name: { fontFamily: font, fontSize: 17, fontWeight: '600' },
    price: { fontFamily: font, fontSize: 20, fontWeight: '700' },
    muted: { fontFamily: font, fontSize: 15 },
  });
