import React from "react";
import { AbsoluteFill } from "remotion";
import { loadFont as loadDisplay } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";

const { fontFamily: DISPLAY } = loadDisplay("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});
const { fontFamily: BODY } = loadBody("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const TEAL = "#0E7C86";
const INK = "#0B1F24";
const CREAM = "#F5F1E8";
const CARD = "#FFFFFF";
const MUTED = "#6B7C80";
const ACCENT = "#E8A94B";

export const Poster: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 80% at 50% 0%, #ECE6D6 0%, ${CREAM} 55%, #E8E1CE 100%)`,
        fontFamily: DISPLAY,
        color: INK,
        padding: "150px 90px 120px",
      }}
    >
      {/* Ambient bubbles */}
      <div
        style={{
          position: "absolute",
          left: -160,
          top: 240,
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: TEAL,
          opacity: 0.08,
          filter: "blur(4px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -140,
          top: 100,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: ACCENT,
          opacity: 0.14,
          filter: "blur(4px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -120,
          bottom: 260,
          width: 360,
          height: 360,
          borderRadius: "50%",
          background: TEAL,
          opacity: 0.07,
          filter: "blur(6px)",
        }}
      />

      {/* Brand badge */}
      <div
        style={{
          display: "inline-flex",
          alignSelf: "flex-start",
          alignItems: "center",
          gap: 16,
          background: TEAL,
          color: "white",
          padding: "20px 34px",
          borderRadius: 999,
          fontFamily: BODY,
          fontWeight: 700,
          fontSize: 32,
          letterSpacing: 1.5,
          boxShadow: "0 20px 40px rgba(14,124,134,0.35)",
        }}
      >
        <span style={{ width: 16, height: 16, borderRadius: 999, background: "white" }} />
        DOSEROUTINE
      </div>

      {/* Headline */}
      <div
        style={{
          marginTop: 110,
          fontSize: 176,
          lineHeight: 0.94,
          fontWeight: 700,
          letterSpacing: -6,
        }}
      >
        <div>Exact</div>
        <div style={{ color: TEAL }}>peptide</div>
        <div>dose.</div>
      </div>

      <div
        style={{
          marginTop: 44,
          fontFamily: BODY,
          fontSize: 44,
          color: MUTED,
          fontWeight: 500,
          maxWidth: 820,
          letterSpacing: -0.5,
        }}
      >
        Reconstitute, calculate, and inject —{" "}
        <span style={{ color: INK, fontWeight: 700 }}>in seconds.</span>
      </div>

      {/* Result card */}
      <div
        style={{
          marginTop: 90,
          background: TEAL,
          color: "white",
          borderRadius: 44,
          padding: "56px 60px",
          boxShadow: "0 40px 90px rgba(14,124,134,0.4)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -80,
            top: -80,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
          }}
        />
        <div
          style={{
            fontFamily: BODY,
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: "uppercase",
            opacity: 0.85,
          }}
        >
          Draw to
        </div>
        <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 24 }}>
          <div
            style={{
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: 320,
              letterSpacing: -12,
              lineHeight: 0.9,
            }}
          >
            10
          </div>
          <div style={{ fontFamily: BODY, fontSize: 56, fontWeight: 600, opacity: 0.9 }}>units</div>
        </div>
        <div
          style={{ marginTop: 20, fontFamily: BODY, fontSize: 34, opacity: 0.9, fontWeight: 500 }}
        >
          on a U-100 insulin syringe · 0.10 mL
        </div>
      </div>

      {/* Footnote badge */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 110,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 18,
            background: INK,
            color: CREAM,
            padding: "22px 40px",
            borderRadius: 999,
            fontFamily: BODY,
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: 0.5,
            boxShadow: "0 20px 50px rgba(11,31,36,0.35)",
          }}
        >
          <span style={{ width: 14, height: 14, borderRadius: 999, background: ACCENT }} />
          Reconstitution + injection guide
        </div>
      </div>
    </AbsoluteFill>
  );
};
