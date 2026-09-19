/**
 * PRIMITIVES
 * ✅ LOVABLE MAY EDIT — 시각만. props 이름은 유지.
 */
import React from "react";
import { color, radius, space, type } from "../tokens/designTokens";

export const Surface: React.FC<React.PropsWithChildren<{ muted?: boolean; padded?: boolean }>> =
  ({ children, muted, padded = true }) => (
    <div className={`nuvia-surface ${muted ? "nuvia-surface--muted" : ""}`} style={{
      background: muted ? color.surfaceMuted : color.surface,
      border: `1px solid ${color.border}`,
      borderRadius: radius.lg,
      padding: padded ? space.lg : 0,
    }}>{children}</div>
  );

export const Stack: React.FC<React.PropsWithChildren<{ gap?: number; row?: boolean; wrap?: boolean; align?: string }>> =
  ({ children, gap = space.md, row, wrap, align }) => (
    <div style={{
      display: "flex", flexDirection: row ? "row" : "column", gap,
      flexWrap: wrap ? "wrap" : "nowrap", alignItems: align as any,
    }}>{children}</div>
  );

export const Text: React.FC<React.PropsWithChildren<{
  size?: keyof typeof type.scale; muted?: boolean; bold?: boolean; as?: "p" | "span" | "h2" | "h3";
}>> = ({ children, size = "base", muted, bold, as = "p" }) => {
  const Tag = as as any;
  return <Tag className={as === "h2" || as === "h3" ? "nuvia-section-title" : undefined} style={{
    margin: 0, fontSize: type.scale[size],
    color: muted ? color.textMuted : color.text,
    fontWeight: bold ? type.weight.bold : type.weight.regular,
    lineHeight: type.lineHeight.normal,
  }}>{children}</Tag>;
};

export const Button: React.FC<React.PropsWithChildren<{
  onClick?: () => void; variant?: "primary" | "secondary" | "quiet"; disabled?: boolean; testId?: string;
}>> = ({ children, onClick, variant = "secondary", disabled, testId }) => {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: color.accent, color: "#fff", border: `1px solid ${color.accent}` },
    secondary: { background: color.surface, color: color.text, border: `1px solid ${color.borderStrong}` },
    quiet: { background: "transparent", color: color.textMuted, border: "1px solid transparent" },
  };
  return (
    <button className={`nuvia-button nuvia-button--${variant}`} data-testid={testId} onClick={onClick} disabled={disabled}
      style={{
        ...styles[variant], padding: `${space.sm}px ${space.lg}px`,
        borderRadius: radius.sm, fontSize: type.scale.base, fontFamily: type.fontFamily,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
      }}>{children}</button>
  );
};

export const Badge: React.FC<React.PropsWithChildren<{ tone?: "neutral" | "accent" | "warn" }>> =
  ({ children, tone = "neutral" }) => {
    const bg = tone === "accent" ? color.accentSoft : tone === "warn" ? "#F3ECDF" : color.surfaceMuted;
    const fg = tone === "accent" ? color.accent : tone === "warn" ? color.gapLonger : color.textMuted;
    return <span className="nuvia-badge" style={{
      background: bg, color: fg, fontSize: type.scale.xs,
      padding: `2px ${space.sm}px`, borderRadius: radius.pill, whiteSpace: "nowrap",
    }}>{children}</span>;
  };
