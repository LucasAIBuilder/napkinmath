import { useState } from "react";
import {
  SCHEME_INFO,
  type SchemeName,
  type SchemeColors,
  type ThemeMode,
} from "../lib/theme";

type Props = {
  currentScheme: SchemeName;
  currentMode: ThemeMode;
  onSelect: (scheme: SchemeName, mode: ThemeMode) => void;
  showIntro?: boolean;
};

const PREVIEW_LINES = [
  { gutter: "1", code: "rent", op: " = ", num: "1500", result: "" },
  { gutter: "2", code: "tax", op: " = ", num: "200", result: "" },
  { gutter: "3", code: "", op: "", num: "", result: "", comment: "# Total" },
  { gutter: "4", code: "rent", op: " + ", num: "tax", result: "1,700", isExpr: true },
];

function MiniPreview({ colors, isDark }: { colors: SchemeColors; isDark: boolean }) {
  const c = colors;
  return (
    <div
      style={{
        background: c.card,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
        overflow: "hidden",
        width: "100%",
      }}
    >
      {/* Mini header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderBottom: `1px solid ${c.border}`,
          background: c.card,
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: 3,
            background: c.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 8,
            fontWeight: 700,
            color: "#fff",
            fontFamily: "'Playfair Display', serif",
            lineHeight: 1,
          }}
        >
          N
        </div>
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: c.text,
            fontFamily: "'Playfair Display', serif",
            letterSpacing: "-0.01em",
          }}
        >
          NapkinMath
        </span>
      </div>

      {/* Mini editor lines */}
      <div style={{ padding: "6px 0" }}>
        {PREVIEW_LINES.map((line, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "22px 1fr 48px",
              alignItems: "center",
              height: 16,
              fontSize: 9,
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: "16px",
              background: i === 3 ? (isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)") : undefined,
            }}
          >
            <span
              style={{
                color: c.muted,
                textAlign: "right",
                paddingRight: 6,
                fontSize: 8,
                opacity: 0.6,
              }}
            >
              {line.gutter}
            </span>
            <span style={{ paddingLeft: 4 }}>
              {line.comment ? (
                <span style={{ color: c.comment }}>{line.comment}</span>
              ) : (
                <>
                  <span style={{ color: line.isExpr ? c.variable : c.text }}>{line.code}</span>
                  <span style={{ color: c.muted }}>{line.op}</span>
                  <span style={{ color: line.isExpr ? c.variable : c.keyword }}>{line.num}</span>
                </>
              )}
            </span>
            <span
              style={{
                color: c.result,
                textAlign: "right",
                paddingRight: 8,
                fontWeight: 500,
                fontSize: 9,
              }}
            >
              {line.result}
            </span>
          </div>
        ))}
      </div>

      {/* Mini footer */}
      <div
        style={{
          padding: "4px 10px",
          borderTop: `1px solid ${c.border}`,
          background: c.bg,
        }}
      >
        <span style={{ fontSize: 7, color: c.muted, opacity: 0.5 }}>4 lines</span>
      </div>
    </div>
  );
}

const introCode = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 13,
  color: "#e8e4e0",
  background: "#1f1c1a",
  borderRadius: 4,
  padding: "1px 5px",
  whiteSpace: "nowrap",
} as const;

/* ── Sun icon ── */
function SunIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

/* ── Moon icon ── */
function MoonIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function ThemePicker({ currentScheme, currentMode, onSelect, showIntro = false }: Props) {
  const [tab, setTab] = useState<ThemeMode>(currentMode);

  return (
    <div
      style={{
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        background: "#141414",
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 32,
          animation: "nm-picker-fade-in 0.5s ease-out both",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "linear-gradient(135deg, #c8956c 0%, #b86880 100%)",
            marginBottom: 20,
          }}
        >
          <span
            style={{
              color: "#fff",
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: 26,
              lineHeight: 1,
            }}
          >
            N
          </span>
        </div>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 28,
            fontWeight: 600,
            color: "#e8e4e0",
            letterSpacing: "-0.02em",
            margin: "0 0 8px",
          }}
        >
          NapkinMath
        </h1>
        {showIntro && (
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              maxWidth: 440,
              margin: "0 auto 28px",
              lineHeight: 1.55,
              // Even out line lengths so a paragraph never ends on a single word.
              textWrap: "balance",
            }}
          >
            <p style={{ fontSize: 15, color: "#b8b2ac", margin: "0 0 10px" }}>
              A calculator you write in. Type one line at a time, like <code style={introCode}>rent = $1,500</code> or{" "}
              <code style={introCode}>20% of 80</code>, and the answer appears on the right.
            </p>
            <p style={{ fontSize: 13, color: "#8a857f", margin: 0 }}>
              Your sheets are saved only in this browser, so clearing its site data deletes them. What you type never
              leaves your device; we only count anonymous usage (visits, sheets created, lines calculated), with no
              cookies.
            </p>
          </div>
        )}
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
            color: "#c8956c",
            margin: 0,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          Choose a color scheme
        </p>
      </div>

      {/* Light / Dark tab switcher */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: 4,
          borderRadius: 10,
          background: "#1a1816",
          border: "1px solid #252220",
          marginBottom: 32,
          animation: "nm-picker-fade-in 0.5s ease-out 0.1s both",
        }}
      >
        {(["light", "dark"] as const).map((mode) => {
          const isActive = tab === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setTab(mode)}
              style={{
                all: "unset",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 20px",
                borderRadius: 7,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "0.01em",
                color: isActive ? "#e8e4e0" : "#686460",
                background: isActive ? "#2a2826" : "transparent",
                transition: "all 0.2s ease",
                boxSizing: "border-box",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = "#a8a4a0";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = "#686460";
              }}
            >
              {mode === "light" ? <SunIcon size={14} /> : <MoonIcon size={14} />}
              {mode === "light" ? "Light" : "Dark"}
            </button>
          );
        })}
      </div>

      {/* Cards grid */}
      <div
        key={tab}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          maxWidth: 1120,
          width: "100%",
          animation: "nm-picker-tab-slide 0.3s ease-out both",
        }}
      >
        {SCHEME_INFO.map((info, i) => {
          const colors = info[tab];
          const isActive = info.id === currentScheme && tab === currentMode;
          const isDark = tab === "dark";
          return (
            <button
              key={info.id}
              type="button"
              onClick={() => onSelect(info.id, tab)}
              style={{
                all: "unset",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: 16,
                borderRadius: 14,
                border: isActive
                  ? `2px solid ${colors.accent}`
                  : "2px solid #252220",
                background: isActive ? "#1e1c1a" : "#1a1816",
                transition: "all 0.2s ease",
                animation: `nm-picker-card-in 0.4s ease-out ${80 * i}ms both`,
                boxSizing: "border-box",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "#3a3632";
                  e.currentTarget.style.background = "#1e1c1a";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "#252220";
                  e.currentTarget.style.background = "#1a1816";
                }
              }}
            >
              <MiniPreview colors={colors} isDark={isDark} />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#e0dcd8",
                      marginBottom: 2,
                    }}
                  >
                    {info.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 11,
                      color: "#686460",
                    }}
                  >
                    {info.subtitle}
                  </div>
                </div>

                {/* Color dots */}
                <div style={{ display: "flex", gap: 4 }}>
                  {[colors.accent, colors.variable, colors.result].map(
                    (color, ci) => (
                      <div
                        key={ci}
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: color,
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      />
                    ),
                  )}
                </div>
              </div>

              {isActive && (
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 10,
                    fontWeight: 500,
                    color: colors.accent,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Active
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Hint */}
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          color: "#4a4644",
          marginTop: 36,
          animation: "nm-picker-fade-in 0.5s ease-out 0.4s both",
        }}
      >
        Click a scheme to start, or press{" "}
        <kbd
          style={{
            display: "inline-block",
            padding: "1px 6px",
            borderRadius: 4,
            border: "1px solid #2a2826",
            background: "#1a1816",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
          }}
        >
          Esc
        </kbd>{" "}
        in the editor to return here
      </p>
    </div>
  );
}
