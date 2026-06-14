import { StyleSheet } from 'react-native';

// ── Colour Palette ─────────────────────────────────────────────────────────
// Edit this one place to retheme the entire app
export const C = {
  bg:      '#0D1B2A',   // page background
  card:    '#162032',   // card / input background
  border:  '#243650',   // card borders
  purple:  '#7C3AED',   // primary brand colour
  purpleL: '#A78BFA',   // primary light (active borders)
  orange:  '#F97316',   // host / CTA buttons
  teal:    '#0EA5E9',   // join / secondary buttons
  green:   '#22C55E',   // correct answer highlight
  red:     '#EF4444',   // wrong answer highlight
  gold:    '#F59E0B',   // 1st place / score highlight
  white:   '#FFFFFF',
  sub:     '#94A3B8',   // secondary / muted text
  // Answer option button colours (A B C D)  — softer than pure primaries
  optA:    '#C0392B',   // deep rose-red
  optB:    '#2472B5',   // ocean blue
  optC:    '#1E8449',   // forest green
  optD:    '#CA6F1E',   // warm amber
};

// ── Gradients ──────────────────────────────────────────────────────────────
export const GRAD = {
  bg:      [C.bg, '#111827', '#0F2744'],
  correct: ['#14532D', '#166534'],
  wrong:   ['#7F1D1D', '#991B1B'],
};

// ── Type Scale ─────────────────────────────────────────────────────────────
export const F = {
  xs:   12,
  sm:   14,
  md:   16,
  lg:   20,
  xl:   26,
  xxl:  36,
  huge: 60,
};

// ── Spacing Scale ──────────────────────────────────────────────────────────
export const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 };

// ── Border Radius Scale ────────────────────────────────────────────────────
export const R = { sm: 8, md: 14, lg: 20, full: 999 };

// ── Global Shared Styles (equivalent to CSS classes) ──────────────────────
// Import `g` and spread or reference these anywhere across screens
export const g = StyleSheet.create({
  // Layout
  fill:    { flex: 1 },
  scroll:  { padding: 24, paddingBottom: 64 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  wrap:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  // Typography
  h1:      { fontSize: 36, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
  h2:      { fontSize: 26, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
  h3:      { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  label:   { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginTop: 20, marginBottom: 8 },
  muted:   { fontSize: 14, color: '#94A3B8' },
  error:   { fontSize: 14, color: '#EF4444', textAlign: 'center', marginTop: 8 },

  // Card
  card:    { backgroundColor: '#162032', borderRadius: 20, borderWidth: 1, borderColor: '#243650', padding: 16 },

  // Input
  input:   { backgroundColor: '#162032', color: '#FFFFFF', borderRadius: 14, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#243650' },

  // Buttons
  btn:     { borderRadius: 20, paddingVertical: 18, alignItems: 'center', marginTop: 16 },
  btnText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },

  // Back link
  back:    { marginBottom: 16 },
  backTxt: { color: '#94A3B8', fontSize: 16 },
});
