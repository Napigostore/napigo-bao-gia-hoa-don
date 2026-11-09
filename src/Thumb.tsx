import type React from 'react';
// A picture of a finished form: the template's real layout and print design, drawn with sample text.
import { View } from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { DEFAULT_BLOCK_STYLE, defaultAlign, FONTS, type Align, type Block, type DesignKey, type FormKey, type Layout } from './layout.ts';
import { LABELS, type Lang } from './labels.ts';

const W = 160;
const H = 226; // A4 proportion
const BASE: Record<Block, number> = { logo: 24, title: 26, client: 26, items: 62, totals: 36, words: 10, qr: 30, signature: 22, footer: 12 };
const INK = '#1D1D1F';
const GREY = '#8E8E93';

const SAMPLE = {
  company: 'NAPIGO CO., LTD',
  companyAddr: '123 Sample Street, City',
  customer: { vi: 'Công ty ABC', ja: '株式会社サンプル', ko: '샘플 주식회사' } as Partial<Record<Lang, string>>,
  rows: { vi: ['Phí dịch vụ', 'Sản phẩm A'], en: ['Consulting service', 'Product A'], de: ['Beratung', 'Produkt A'], fr: ['Conseil', 'Produit A'], ja: ['サービス', '商品A'], ko: ['서비스', '상품 A'] } as Record<Lang, string[]>,
  words: { vi: 'Một triệu đồng.', en: 'One million dong only.', de: 'Eine Million Dong.', fr: 'Un million de dongs.', ja: '百万ドン', ko: '백만 동' } as Record<Lang, string>,
};

// Thumbnail of a real paper form: the form's own frame, rules and table, drawn with sample text.
function FormThumb({ form, accent, width }: { form: FormKey; accent: string; width: number }) {
  const RED = '#C00000';
  const GREEN = '#1E7B3A';
  const ORANGE = '#E67E22';
  const txt = (x: number, y: number, s: string, size = 5.5, extra: Record<string, string | number> = {}) =>
    <SvgText key={`${x}-${y}-${s}`} x={x} y={y} fontSize={size} fill={INK} fontFamily="serif" {...extra}>{s}</SvgText>;
  const dots = (y: number, x1 = 10, x2 = 150, color = INK) =>
    <Line key={`dot-${y}-${x1}`} x1={x1} x2={x2} y1={y} y2={y} stroke={color} strokeWidth={0.5} strokeDasharray="1.5 1.5" />;
  const solid = (x1: number, y1: number, x2: number, y2: number, color: string, w = 0.6) =>
    <Line key={`l-${x1}-${y1}-${x2}-${y2}`} x1={x1} x2={x2} y1={y1} y2={y2} stroke={color} strokeWidth={w} />;
  let s: React.ReactElement[] = [];
  if (form === 'form-01tt') {
    s = [
      <Rect key="g1" x={10} y={10} width={8} height={8} fill={GREEN} />, <Rect key="g2" x={19} y={10} width={8} height={8} fill="#5B8FD1" />,
      <Rect key="g3" x={10} y={19} width={8} height={8} fill={ORANGE} />, <Rect key="g4" x={19} y={19} width={8} height={8} fill="#9C9C9C" />,
      txt(32, 17, 'CÔNG TY', 6, { fill: GREEN, fontWeight: 'bold' }), txt(32, 24, 'Địa chỉ công ty', 4, { fill: GREEN }),
      txt(150, 13, 'Mẫu số 01 - TT', 5, { textAnchor: 'end', fontWeight: 'bold' }), txt(150, 19, 'Ban hành theo TT 200/2014/TT-BTC', 3.2, { textAnchor: 'end', fontStyle: 'italic' }),
      txt(80, 46, 'PHIẾU THU', 12, { textAnchor: 'middle', fontWeight: 'bold' }),
      <Rect key="p1" x={60} y={70} width={40} height={60} fill="#DFF3E4" />, <Rect key="p2" x={100} y={58} width={30} height={40} fill="#E0E7F5" />,
      txt(150, 66, 'Ngày ... tháng ... năm ...', 4.5, { textAnchor: 'end' }), txt(150, 74, 'Quyển số: ........', 4.5, { textAnchor: 'end' }), txt(150, 82, 'Số: ........', 4.5, { textAnchor: 'end' }),
      ...[92, 106, 120, 134].map(y => dots(y)),
      txt(10, 90, 'Họ và tên người nộp tiền:', 4.6), txt(10, 104, 'Địa chỉ:', 4.6), txt(10, 118, 'Lý do nộp:', 4.6), txt(10, 132, 'Số tiền:', 4.6), txt(10, 146, 'Kèm theo: ........ Chứng từ gốc.', 4.6),
      ...['Giám đốc', 'Kế toán trưởng', 'Người nộp', 'Người lập', 'Thủ quỹ'].map((n, i) => txt(16 + i * 29, 196, n, 4.2, { textAnchor: 'middle', fontWeight: 'bold' })),
    ];
  } else if (form === 'form-abit') {
    s = [
      <Rect key="f" x={3} y={3} width={W - 6} height={H - 6} fill="none" stroke="#D7262E" strokeWidth={1.2} />,
      <Rect key="g" x={10} y={10} width={9} height={9} fill="#D7262E" />,
      txt(24, 17, 'HỌC VIỆN', 5, { fill: '#D7262E', fontWeight: 'bold' }), txt(24, 23, 'Địa chỉ đơn vị', 3.5, { fill: GREY }),
      txt(150, 16, 'Quyển số: ........', 4.5, { textAnchor: 'end', fill: '#D7262E' }), txt(150, 23, 'Số: ........', 4.5, { textAnchor: 'end', fill: '#D7262E' }),
      txt(80, 46, 'PHIẾU THU', 12, { textAnchor: 'middle', fontWeight: 'bold', fill: '#D7262E' }),
      ...[64, 78, 92, 106, 120].map(y => dots(y, 10, 150, '#D7262E')),
      txt(10, 62, 'Họ tên người nộp tiền:', 4.4), txt(10, 76, 'Số điện thoại:', 4.4), txt(10, 90, 'Lớp học đăng ký:', 4.4), txt(10, 104, 'Số tiền:', 4.4), txt(10, 118, 'Viết bằng chữ:', 4.4),
      txt(150, 134, 'Ngày ... tháng ... năm ...', 4.3, { textAnchor: 'end' }),
      ...['Người nộp tiền', 'Người lập phiếu', 'Thủ quỹ'].map((n, i) => txt(30 + i * 50, 170, n, 4.4, { textAnchor: 'middle', fontWeight: 'bold' })),
      txt(10, 210, 'Chú ý: ....................................................', 3.6, { fill: '#D7262E' }),
    ];
  } else if (form === 'form-gridbill') {
    const rows = Array.from({ length: 9 }, (_, i) => 96 + i * 9);
    s = [
      <Rect key="g" x={10} y={10} width={9} height={9} fill={RED} />,
      txt(24, 17, 'TÊN CÔNG TY', 5.5, { fill: RED, fontWeight: 'bold' }), txt(24, 23, 'Địa chỉ đơn vị', 3.5, { fill: GREY }),
      txt(80, 44, 'HÓA ĐƠN BÁN HÀNG', 9, { textAnchor: 'middle', fontWeight: 'bold', fill: RED }),
      txt(150, 56, 'Ngày ... tháng ... năm ....', 4.2, { textAnchor: 'end' }),
      dots(68), dots(78), txt(10, 66, 'Tên khách hàng:', 4.4), txt(10, 76, 'Địa chỉ:', 4.4),
      <Rect key="t" x={10} y={88} width={140} height={100} fill="none" stroke={RED} strokeWidth={0.7} />,
      solid(10, 96, 150, 96, RED, 0.5), ...rows.map((y, i) => solid(10, y, 150, y, RED, 0.3)),
      ...[22, 40, 96, 118, 140].map(x => solid(x, 88, x, 188, RED, 0.3)),
      txt(108, 186, 'Tổng cộng:', 4.6, { textAnchor: 'end', fontWeight: 'bold', fill: RED }),
      txt(40, 210, 'Người bán hàng', 4.4, { textAnchor: 'middle', fontWeight: 'bold' }), txt(120, 210, 'Người mua hàng', 4.4, { textAnchor: 'middle', fontWeight: 'bold' }),
    ];
  } else {
    const rows = Array.from({ length: 10 }, (_, i) => 90 + i * 9);
    s = [
      txt(10, 14, 'Đơn vị: ................', 4.6), txt(150, 14, 'Số: ........', 4.6, { textAnchor: 'end' }),
      txt(80, 36, 'HÓA ĐƠN BÁN LẺ', 9, { textAnchor: 'middle', fontWeight: 'bold', fill: '#D35400' }),
      txt(10, 56, 'Tên khách hàng: ..............................', 4.4), txt(10, 66, 'Địa chỉ: ..................................', 4.4),
      <Rect key="t" x={10} y={78} width={140} height={112} fill="none" stroke={ORANGE} strokeWidth={0.7} />,
      solid(10, 86, 150, 86, ORANGE, 0.5), ...rows.map(y => solid(10, y, 150, y, ORANGE, 0.3)),
      ...[18, 26, 72, 88, 106, 124].map(x => solid(x, 78, x, 190, ORANGE, 0.3)),
      txt(12, 199, 'CỘNG:', 4.6, { fontWeight: 'bold', fill: '#A04000' }),
      txt(10, 206, 'Cộng thành tiền (viết bằng chữ): ............', 4), txt(150, 216, 'Ngày ... tháng ... năm 20..', 4, { textAnchor: 'end' }),
      ...['Người nhận hàng', 'Đã nhận đủ tiền', 'Người viết HĐ'].map((n, i) => txt(30 + i * 50, 226 - 2, n, 3.6, { textAnchor: 'middle', fontWeight: 'bold' })),
    ];
  }
  return (
    <View style={{ width, aspectRatio: W / H, backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 1, borderColor: '#D1D1D6', overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        {form === 'form-01tt' ? null : <Rect x={0} y={0} width={W} height={2} fill={accent} />}
        {s}
      </Svg>
    </View>
  );
}

// Draws the blocks top to bottom in the template's order, with its print design.
export function Thumb({ layout, accent, width = W }: { layout: Layout; accent: string; width?: number }) {
  if (layout.form) return <FormThumb form={layout.form} accent={accent} width={width} />;
  const lang = layout.locale;
  const L = LABELS[lang];
  const design: DesignKey = layout.design ?? 'classic';
  const receipt = design === 'receipt';
  const rows = SAMPLE.rows[lang] ?? SAMPLE.rows.en;
  const shapes: React.ReactElement[] = [];
  let y = design === 'modern' ? 0 : 10;
  const pageL = receipt ? 30 : design === 'corporate' ? 16 : 10;
  const pageR = W - (receipt ? 30 : 10);
  const pageW = pageR - pageL;

  // Corporate design: a solid stripe down the left edge.
  if (design === 'corporate') shapes.push(<Rect key="stripe" x={0} y={0} width={6} height={H} fill={INK} />);
  // Red-frame design: a thin red border around the whole page.
  if (design === 'redform') shapes.push(<Rect key="frame" x={3} y={3} width={W - 6} height={H - 6} fill="none" stroke="#D7262E" strokeWidth={1} />);

  layout.blocks.forEach((b, i) => {
    const st = { ...DEFAULT_BLOCK_STYLE, ...(layout.blockStyle?.[b] ?? {}) };
    const zoom = st.scale * (st.size / DEFAULT_BLOCK_STYLE.size);
    const h = BASE[b] * zoom;
    if (y + h > H - 10) return;
    const k = `${b}-${i}`;
    // The part's box: narrow parts (totals, QR, table, logo) move to the chosen side; text parts keep the full width and align their text.
    const al: Align = st.align ?? defaultAlign(b, design);
    const boxW = b === 'totals' ? 70 : b === 'qr' ? h + 40 : b === 'items' ? pageW * 0.85 : b === 'logo' || b === 'client' ? pageW * 0.75 : pageW;
    const left = al === 'center' ? pageL + (pageW - boxW) / 2 : al === 'right' ? pageR - boxW : pageL;
    const right = left + boxW;
    const center = (left + right) / 2;
    const textX = al === 'center' ? center : al === 'right' ? right : left;
    const textAnchor = al === 'center' ? 'middle' : al === 'right' ? 'end' : 'start';
    const fs = 5.2 * zoom;
    const css = FONTS[st.font ?? layout.font ?? 'system'].css;
    const fam = css.includes('Courier') ? 'monospace' : css.includes('erif') || css.includes('Georgia') ? 'serif' : 'sans-serif';
    const t = (x: number, yy: number, s: string, size = fs, extra: Record<string, string | number> = {}) =>
      <SvgText key={k + x + yy + s} x={x} y={yy} fontSize={size} fill={INK} fontFamily={fam} {...extra}>{s}</SvgText>;
    switch (b) {
      case 'logo':
        if (design !== 'minimal') shapes.push(<Rect key={k} x={left} y={y} width={h * 0.9} height={h * 0.9} rx={2} fill="#F2F2F7" stroke={GREY} strokeWidth={0.3} />);
        shapes.push(t(left + h * 0.45, y + h * 0.55, 'LOGO', fs * 0.8, { textAnchor: 'middle', fill: GREY }));
        shapes.push(t(left + h, y + fs * 1.2, SAMPLE.company, fs * 1.1, { fontWeight: 'bold', textAnchor: design === 'corporate' ? 'end' : 'start', ...(design === 'corporate' ? { x: right } : {}) }));
        shapes.push(t(left + h, y + fs * 2.6, SAMPLE.companyAddr, fs * 0.85, { fill: GREY }));
        break;
      case 'title': {
        const tx = textX;
        const anchor = textAnchor;
        const titleFill = design === 'modern' ? '#FFFFFF' : design === 'minimal' ? INK : accent;
        if (design === 'modern') shapes.push(<Rect key={k + 'band'} x={0} y={y} width={W} height={h + 6} fill={accent} />);
        const titleText = design === 'corporate' ? layout.title.toUpperCase().slice(0, 18) : layout.title.slice(0, 22);
        shapes.push(t(tx, y + h * 0.62, titleText, fs * (design === 'elegant' ? 1.8 : 1.7), { fontWeight: design === 'elegant' ? 'normal' : 'bold', fontStyle: design === 'elegant' ? 'italic' : 'normal', fill: titleFill, textAnchor: anchor }));
        shapes.push(t(design === 'corporate' ? right : right, y + h * 0.9, `${L.no} QUO-0001`, fs * 0.8, { textAnchor: 'end', fill: design === 'modern' ? '#FFFFFF' : GREY }));
        if (design === 'elegant') {
          shapes.push(<Line key={k + 'u1'} x1={left} x2={right} y1={y + h + 1} y2={y + h + 1} stroke={INK} strokeWidth={0.6} />);
          shapes.push(<Line key={k + 'u2'} x1={left} x2={right} y1={y + h + 3} y2={y + h + 3} stroke={INK} strokeWidth={0.6} />);
        } else if (receipt) {
          shapes.push(<Line key={k + 'u'} x1={left} x2={right} y1={y + h + 1} y2={y + h + 1} stroke={GREY} strokeWidth={0.5} strokeDasharray="2 2" />);
        } else if (design !== 'modern') {
          shapes.push(<Line key={k + 'u'} x1={left} x2={right} y1={y + h + 1} y2={y + h + 1} stroke={design === 'minimal' ? INK : accent} strokeWidth={design === 'minimal' ? 0.5 : 1.2} />);
        }
        break;
      }
      case 'client':
        if (design === 'boxed') shapes.push(<Rect key={k} x={left} y={y} width={right - left} height={h} rx={2} fill="none" stroke="#AEAEB2" strokeWidth={0.6} />);
        else if (design === 'minimal') shapes.push(<Rect key={k} x={left} y={y} width={1.4} height={h} fill={INK} />);
        else if (receipt) shapes.push(<Line key={k} x1={left} x2={right} y1={y + h} y2={y + h} stroke={GREY} strokeWidth={0.4} strokeDasharray="2 2" />);
        else shapes.push(<Rect key={k} x={left} y={y} width={right - left} height={h} rx={4} fill="#F5F5F7" />);
        shapes.push(t(left + 5, y + fs * 1.4, L.customer.toUpperCase(), fs * 0.8, { fill: GREY }));
        shapes.push(t(left + 5, y + fs * 2.9, SAMPLE.customer[lang] ?? 'Sample Customer Co.', fs * 1.1, { fontWeight: 'bold' }));
        shapes.push(t(left + 5, y + fs * 4.4, `${L.phone}: 0900 000 000`, fs * 0.85, { fill: GREY }));
        break;
      case 'items': {
        const hy = y + fs * 1.4;
        if (design === 'modern') shapes.push(<Rect key={k + 'h'} x={left} y={y} width={right - left} height={fs * 1.9} fill="#F2F2F7" />);
        else if (design === 'classic' || design === 'elegant' || design === 'corporate') shapes.push(<Rect key={k + 'h'} x={left} y={y} width={right - left} height={fs * 1.9} fill={accent} fillOpacity={0.12} />);
        if (design === 'boxed' || design === 'gridbill' || design === 'retailgrid') shapes.push(<Rect key={k + 'frame'} x={left} y={y} width={right - left} height={h} fill="none" stroke={design === 'boxed' ? '#AEAEB2' : design === 'gridbill' ? '#B3261E' : '#E67E22'} strokeWidth={0.6} />);
        if (design === 'minimal') shapes.push(<Line key={k + 'hl'} x1={left} x2={right} y1={y + fs * 1.9} y2={y + fs * 1.9} stroke={INK} strokeWidth={0.5} />);
        shapes.push(t(left + 2, hy, L.no_col, fs * 0.75, { fontWeight: 'bold' }));
        shapes.push(t(left + 14, hy, L.item, fs * 0.75, { fontWeight: 'bold' }));
        shapes.push(t(right - 62, hy, L.qty, fs * 0.75, { fontWeight: 'bold', textAnchor: 'end' }));
        shapes.push(t(right - 2, hy, L.amount, fs * 0.75, { fontWeight: 'bold', textAnchor: 'end' }));
        rows.slice(0, 2).forEach((r, ri) => {
          const ry = y + fs * 3.6 + ri * fs * 2.3;
          shapes.push(t(left + 2, ry, String(ri + 1), fs * 0.8));
          shapes.push(t(left + 14, ry, r, fs * 0.8));
          shapes.push(t(right - 62, ry, String(ri + 1), fs * 0.8, { textAnchor: 'end' }));
          shapes.push(t(right - 2, ry, '1,000,000', fs * 0.8, { textAnchor: 'end' }));
          shapes.push(<Line key={k + 'r' + ri} x1={left} x2={right} y1={ry + fs * 0.9} y2={ry + fs * 0.9} stroke={receipt ? GREY : '#D1D1D6'} strokeWidth={0.4} strokeDasharray={receipt ? '2 2' : undefined} />);
        });
        break;
      }
      case 'totals': {
        const x = left;
        shapes.push(t(x, y + fs * 1.3, `${L.subtotal}`, fs * 0.8, { fill: GREY }));
        shapes.push(t(right, y + fs * 1.3, '2,000,000', fs * 0.8, { textAnchor: 'end' }));
        shapes.push(t(x, y + fs * 2.9, L.vat(8), fs * 0.8, { fill: GREY }));
        shapes.push(t(right, y + fs * 2.9, '160,000', fs * 0.8, { textAnchor: 'end' }));
        shapes.push(<Rect key={k + 'tot'} x={x} y={y + h - fs * 2.6} width={right - x} height={fs * 2.2} rx={design === 'minimal' || design === 'elegant' ? 0 : 3} fill={receipt || design === 'corporate' ? INK : accent} />);
        shapes.push(t(x + 3, y + h - fs * 1.1, L.total, fs * 0.85, { fontWeight: 'bold', fill: '#FFFFFF' }));
        shapes.push(t(right - 3, y + h - fs * 1.1, '2,160,000', fs * 0.85, { fontWeight: 'bold', fill: '#FFFFFF', textAnchor: 'end' }));
        break;
      }
      case 'words':
        if (lang === 'vi' || lang === 'en') shapes.push(t(textX, y + fs * 1.2, `${L.inWords}: ${SAMPLE.words[lang]}`, fs * 0.8, { fontStyle: 'italic', fill: GREY, textAnchor }));
        break;
      case 'qr':
        shapes.push(<Rect key={k} x={left} y={y} width={h * 0.9} height={h * 0.9} rx={2} fill={INK} />);
        shapes.push(t(left + h * 0.45, y + h * 0.55, 'QR', fs * 0.9, { textAnchor: 'middle', fill: '#FFFFFF' }));
        shapes.push(t(left + h, y + fs * 1.4, 'VietQR', fs * 0.85, { fill: GREY }));
        break;
      case 'signature': {
        const sy = y + h - fs * 1.2;
        shapes.push(<Line key={k + 'a'} x1={left} x2={left + 58} y1={sy} y2={sy} stroke={GREY} strokeWidth={0.4} />);
        shapes.push(<Line key={k + 'b'} x1={right - 58} x2={right} y1={sy} y2={sy} stroke={GREY} strokeWidth={0.4} />);
        shapes.push(t(left + 29, sy + fs * 1.3, L.signBuyer, fs * 0.75, { textAnchor: 'middle', fill: GREY }));
        shapes.push(t(right - 29, sy + fs * 1.3, L.signSeller, fs * 0.75, { textAnchor: 'middle', fill: GREY }));
        break;
      }
      case 'footer':
        shapes.push(t(textX, y + fs * 1.4, layout.footer.slice(0, 40), fs * 0.75, { textAnchor, fill: GREY }));
        break;
    }
    y += h + 5;
  });
  return (
    <View style={{ width, aspectRatio: W / H, backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 1, borderColor: '#D1D1D6', overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        {design !== 'modern' && design !== 'corporate' && <Rect x={0} y={0} width={W} height={2.5} fill={accent} />}
        {shapes}
      </Svg>
    </View>
  );
}
