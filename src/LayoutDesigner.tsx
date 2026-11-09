// Layout designer: drag a part to move it, pinch it to zoom, and change its size and font.
// Uses only React Native core (PanResponder + Animated), so no native gesture or animation pods are needed.
import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, Text, TextInput, View } from 'react-native';
import { ALIGNS, ALIGN_LABEL, BLOCK_LABEL, BLOCKS, clamp, DEFAULT_BLOCK_STYLE, defaultAlign, DESIGNS, FONTS, moveTo, toggleBlock, type Block, type BlockStyle, type DesignKey, type FontKey, type Layout } from './layout.ts';
import { Thumb } from './Thumb.tsx';

export type Tone = { accent: string; card: string; ink: string; muted: string; line: string; bg: string };

const ROW = 74; // height of one part row, used to turn a drag distance into a row count
const FONT_KEYS = Object.keys(FONTS) as FontKey[];

type RowProps = {
  index: number;
  total: number;
  block: Block;
  style: BlockStyle;
  tone: Tone;
  onMove: (from: number, to: number) => void;
  onStyle: (patch: Partial<BlockStyle>) => void;
  onToggle: () => void;
};

function PartRow({ index, total, block, style, tone, onMove, onStyle, onToggle }: RowProps) {
  const [dragY] = useState(() => new Animated.Value(0));
  const [zoom] = useState(() => new Animated.Value(1));
  // Latest props for the gesture handlers, which are created once.
  const live = useRef({ index, total, style, onMove, onStyle });
  useEffect(() => { live.current = { index, total, style, onMove, onStyle }; });
  const pinchStart = useRef<number | null>(null);
  const pinchRatio = useRef(1);

  const dist = (t: readonly { pageX: number; pageY: number }[]) => Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);

  // Drag the ⋮⋮ handle up or down: the row follows the finger, then snaps to the nearest row.
  // The handlers read the latest props through a ref when a gesture ends, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [drag] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
    onPanResponderMove: (_, g) => dragY.setValue(g.dy),
    onPanResponderRelease: (_, g) => {
      const { index: i, total: n, onMove: move } = live.current;
      const to = clamp(i + Math.round(g.dy / ROW), 0, n - 1);
      Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
      if (to !== i) move(i, to);
    },
    onPanResponderTerminate: () => { Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start(); },
  }));

  // Pinch with two fingers on the name: zooms the part between 60% and 160%.
  // eslint-disable-next-line react-hooks/refs
  const [pinch] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: e => e.nativeEvent.touches.length >= 2,
    onPanResponderGrant: e => {
      const t = e.nativeEvent.touches;
      if (t.length >= 2) pinchStart.current = dist(t);
    },
    onPanResponderMove: e => {
      const t = e.nativeEvent.touches;
      if (t.length >= 2 && pinchStart.current) {
        pinchRatio.current = dist(t) / pinchStart.current;
        zoom.setValue(clamp(pinchRatio.current, 0.6, 1.6));
      }
    },
    onPanResponderRelease: () => {
      const { style: st, onStyle: apply } = live.current;
      apply({ scale: clamp(+(st.scale * pinchRatio.current).toFixed(2), 0.6, 1.6) });
      pinchStart.current = null;
      pinchRatio.current = 1;
      zoom.setValue(1);
    },
    onPanResponderTerminate: () => { pinchStart.current = null; pinchRatio.current = 1; zoom.setValue(1); },
  }));

  const fontKey = style.font ?? FONT_KEYS[0];
  const nextFont = () => onStyle({ font: FONT_KEYS[(FONT_KEYS.indexOf(fontKey) + 1) % FONT_KEYS.length] });

  return (
    <Animated.View style={{ backgroundColor: tone.card, borderRadius: 12, marginBottom: 8, padding: 10, transform: [{ translateY: dragY }] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View {...drag.panHandlers} accessibilityLabel={`Kéo để đổi vị trí: ${BLOCK_LABEL[block]}`} style={{ paddingHorizontal: 8, paddingVertical: 10 }}>
          <Text style={{ color: tone.muted, fontSize: 18 }}>⋮⋮</Text>
        </View>
        <Animated.View {...pinch.panHandlers} style={{ flex: 1, transform: [{ scale: zoom }] }}>
          <Text style={{ color: tone.ink, fontWeight: '600' }}>{index + 1}. {BLOCK_LABEL[block]}</Text>
          <Text style={{ color: tone.muted, fontSize: 12, marginTop: 2 }}>
            Thu phóng {Math.round(style.scale * 100)}% · cỡ {style.size}px · {FONTS[fontKey].label}
          </Text>
        </Animated.View>
        <Pressable onPress={onToggle} accessibilityRole="button" accessibilityLabel={`Ẩn ${BLOCK_LABEL[block]}`} style={{ padding: 8 }}>
          <Text style={{ color: tone.muted, fontSize: 16 }}>✕</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        <Chip tone={tone} label="A−" onPress={() => onStyle({ size: clamp(style.size - 1, 9, 20) })} />
        <Chip tone={tone} label="A+" onPress={() => onStyle({ size: clamp(style.size + 1, 9, 20) })} />
        <Chip tone={tone} label="−" onPress={() => onStyle({ scale: clamp(+(style.scale - 0.1).toFixed(2), 0.6, 1.6) })} />
        <Chip tone={tone} label="+" onPress={() => onStyle({ scale: clamp(+(style.scale + 0.1).toFixed(2), 0.6, 1.6) })} />
        <Chip tone={tone} label={`Font: ${FONTS[fontKey].label}`} onPress={nextFont} />
        {ALIGNS.map(a => (
          <Chip key={a} tone={tone} label={ALIGN_LABEL[a]} active={style.align === a} onPress={() => onStyle({ align: a })} />
        ))}
        <Chip tone={tone} label="↑" disabled={index === 0} onPress={() => onMove(index, index - 1)} />
        <Chip tone={tone} label="↓" disabled={index === total - 1} onPress={() => onMove(index, index + 1)} />
      </View>
    </Animated.View>
  );
}

function Chip({ tone, label, onPress, disabled, active }: { tone: Tone; label: string; onPress: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ selected: !!active }} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: active ? 2 : 1, borderColor: active ? tone.accent : tone.line, opacity: disabled ? 0.35 : 1 }}>
      <Text style={{ color: tone.accent, fontSize: 13, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}

export function LayoutDesigner({ layout, onChange, tone, name, onName }: {
  layout: Layout; onChange: (l: Layout) => void; tone: Tone; name?: string; onName?: (v: string) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const set = (patch: Partial<Layout>) => onChange({ ...layout, ...patch });
  const blocks = layout.blocks;
  const setBlockStyle = (b: Block, patch: Partial<BlockStyle>) => {
    const current = { ...DEFAULT_BLOCK_STYLE, ...(layout.blockStyle?.[b] ?? {}) };
    set({ blockStyle: { ...(layout.blockStyle ?? {}), [b]: { ...current, ...patch } } });
  };
  const input = { borderWidth: 1, borderColor: tone.line, borderRadius: 10, padding: 10, color: tone.ink, backgroundColor: tone.card, marginTop: 6 };
  const label = { color: tone.muted, fontSize: 13, marginTop: 14 };

  return (
    <View>
      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <Thumb layout={layout} accent={tone.accent} width={180} />
        <Text style={{ color: tone.muted, fontSize: 12, marginTop: 6 }}>Xem trước theo bố cục hiện tại</Text>
      </View>

      {onName && (
        <>
          <Text style={label}>Tên mẫu</Text>
          <TextInput style={input} value={name ?? ''} onChangeText={onName} placeholder="VD: Hóa đơn cho khách Nhật" placeholderTextColor={tone.muted} />
        </>
      )}
      <Text style={label}>Tiêu đề in trên chứng từ</Text>
      <TextInput style={input} value={layout.title} onChangeText={v => set({ title: v })} />
      <Text style={label}>Chân trang</Text>
      <TextInput style={input} value={layout.footer} onChangeText={v => set({ footer: v })} />
      <Text style={label}>Tiền tệ (mã ISO: VND, USD, EUR, JPY…)</Text>
      <TextInput style={input} autoCapitalize="characters" autoCorrect={false} value={layout.currency} onChangeText={v => set({ currency: v.trim().toUpperCase().slice(0, 3) })} />
      <Text style={label}>Tên thuế (để trống = theo quốc gia)</Text>
      <TextInput style={input} value={layout.taxLabel ?? ''} onChangeText={v => set({ taxLabel: v })} />
      <Text style={label}>Kiểu dáng</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {(Object.keys(DESIGNS) as DesignKey[]).map(k => (
          <Chip key={k} tone={tone} label={DESIGNS[k].label} onPress={() => set({ design: k })} />
        ))}
      </View>
      <Text style={label}>Font chung của chứng từ</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {FONT_KEYS.map(k => (
          <Chip key={k} tone={tone} label={FONTS[k].label} onPress={() => set({ font: k })} />
        ))}
      </View>

      <Text style={label}>Các phần in — kéo ⋮⋮ để đổi vị trí, chụm hai ngón để thu phóng, A+/A− để đổi cỡ chữ</Text>
      <View style={{ marginTop: 6 }}>
        {blocks.map((b, i) => (
          <PartRow
            key={b}
            index={i}
            total={blocks.length}
            block={b}
            style={{ ...DEFAULT_BLOCK_STYLE, align: defaultAlign(b, layout.design), ...(layout.blockStyle?.[b] ?? {}) }}
            tone={tone}
            onMove={(from, to) => set({ blocks: moveTo(blocks, from, to) })}
            onStyle={patch => setBlockStyle(b, patch)}
            onToggle={() => set({ blocks: toggleBlock(blocks, b) })}
          />
        ))}
      </View>

      <Pressable onPress={() => setAddOpen(o => !o)} accessibilityRole="button" style={{ marginTop: 4, paddingVertical: 8 }}>
        <Text style={{ color: tone.accent, fontWeight: '600' }}>{addOpen ? 'Đóng danh sách' : '+ Thêm phần'}</Text>
      </Pressable>
      {addOpen && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {BLOCKS.filter(b => !blocks.includes(b)).map(b => (
            <Chip key={b} tone={tone} label={BLOCK_LABEL[b]} onPress={() => set({ blocks: toggleBlock(blocks, b) })} />
          ))}
        </View>
      )}
    </View>
  );
}
