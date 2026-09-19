/**
 * DESIGN TOKENS
 * ✅ LOVABLE MAY EDIT — 시각 값만. 키 이름은 유지할 것.
 *
 * 로직은 이 파일을 import하지 않는다. Presentation Component만 사용한다.
 */
export const color = {
  bg: "#FBFBFA",
  surface: "#FFFFFF",
  surfaceMuted: "#F3F4F2",
  border: "#E3E5E1",
  borderStrong: "#C9CCC6",
  text: "#20324A",
  textMuted: "#606F81",
  accent: "#416985",
  accentSoft: "#E4EDF5",
  /** Gap 표현. 성공/실패 색이 아니다 — 방향만 나타낸다 (§9) */
  gapLonger: "#8A6A3B",
  gapShorter: "#3B6A8A",
  gapMatch: "#416985",
  /** 상태 배지 */
  fitsMe: "#416985",
  trying: "#7A7F79",
  retest: "#8A6A3B",
  focusRing: "#416985",
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 4, md: 8, lg: 12, pill: 999 } as const;

export const type = {
  fontFamily: `"Pretendard", "Apple SD Gothic Neo", system-ui, sans-serif`,
  scale: { xs: 13, sm: 14, base: 16, lg: 18, xl: 22, xxl: 28 },
  weight: { regular: 400, medium: 500, bold: 700 },
  lineHeight: { tight: 1.25, normal: 1.55 },
} as const;

/** Age별 모션 강도. RewardAnimation만 참조한다 */
export const motion = {
  none: { durationMs: 0, easing: "linear" },
  subtle: { durationMs: 140, easing: "ease-out" },
  rich: { durationMs: 280, easing: "cubic-bezier(.2,.8,.2,1)" },
} as const;

export type MotionLevel = keyof typeof motion;

export const elevation = {
  flat: "none",
  card: "0 1px 0 rgba(29,35,32,.04)",
} as const;

/** CSS 변수로 내보내기 — Lovable이 런타임 테마를 바꿀 수 있게 한다 */
export function tokensToCssVars(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(color)) vars[`--nuvia-color-${kebab(k)}`] = v;
  for (const [k, v] of Object.entries(space)) vars[`--nuvia-space-${k}`] = `${v}px`;
  for (const [k, v] of Object.entries(radius)) vars[`--nuvia-radius-${k}`] = `${v}px`;
  for (const [k, v] of Object.entries(type.scale)) vars[`--nuvia-font-${k}`] = `${v}px`;
  vars["--nuvia-font-family"] = type.fontFamily;
  return vars;
}

function kebab(s: string) { return s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`); }
