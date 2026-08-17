import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { loadFont as loadDisplay } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";

const { fontFamily: DISPLAY } = loadDisplay("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});
const { fontFamily: BODY } = loadBody("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

const TEAL = "#0E7C86";
const TEAL_DARK = "#0A5B63";
const INK = "#0B1F24";
const CREAM = "#F5F1E8";
const CARD = "#FFFFFF";
const MUTED = "#6B7C80";
const ACCENT = "#E8A94B";

const BG: React.CSSProperties = {
  background: `radial-gradient(120% 80% at 50% 0%, #ECE6D6 0%, ${CREAM} 55%, #E8E1CE 100%)`,
};

const Bubble: React.FC<{ x: number; y: number; size: number; delay: number; opacity?: number }> = ({
  x,
  y,
  size,
  delay,
  opacity = 0.08,
}) => {
  const f = useCurrentFrame();
  const drift = Math.sin((f + delay) / 40) * 18;
  const scale = interpolate(f, [delay, delay + 60], [0.6, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + drift,
        width: size,
        height: size,
        borderRadius: "50%",
        background: TEAL,
        opacity,
        transform: `scale(${scale})`,
        filter: "blur(2px)",
      }}
    />
  );
};

const PersistentBG: React.FC = () => (
  <AbsoluteFill style={BG}>
    <Bubble x={-120} y={200} size={340} delay={0} />
    <Bubble x={820} y={140} size={220} delay={20} opacity={0.06} />
    <Bubble x={780} y={1550} size={300} delay={40} opacity={0.07} />
    <Bubble x={-80} y={1420} size={260} delay={60} opacity={0.05} />
  </AbsoluteFill>
);

// ---------- SCENE 1: Hook / Title ----------
const Scene1: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const badge = spring({ frame: f, fps, config: { damping: 14 } });
  const t1 = spring({ frame: f - 8, fps, config: { damping: 15, stiffness: 90 } });
  const t2 = spring({ frame: f - 20, fps, config: { damping: 15, stiffness: 90 } });
  const t3 = spring({ frame: f - 34, fps, config: { damping: 15, stiffness: 90 } });
  return (
    <AbsoluteFill style={{ padding: "260px 90px 0", fontFamily: DISPLAY, color: INK }}>
      <div
        style={{
          display: "inline-flex",
          alignSelf: "flex-start",
          alignItems: "center",
          gap: 14,
          background: TEAL,
          color: "white",
          padding: "18px 30px",
          borderRadius: 999,
          fontFamily: BODY,
          fontWeight: 600,
          fontSize: 30,
          letterSpacing: 0.5,
          transform: `translateY(${(1 - badge) * -40}px)`,
          opacity: badge,
          boxShadow: "0 20px 40px rgba(14,124,134,0.35)",
        }}
      >
        <span style={{ width: 14, height: 14, borderRadius: 999, background: "white" }} />
        DOSEROUTINE
      </div>
      <div
        style={{
          marginTop: 90,
          fontSize: 132,
          lineHeight: 1.02,
          fontWeight: 700,
          letterSpacing: -3,
        }}
      >
        <div style={{ opacity: t1, transform: `translateY(${(1 - t1) * 40}px)` }}>Peptide</div>
        <div style={{ opacity: t2, transform: `translateY(${(1 - t2) * 40}px)`, color: TEAL }}>
          reconstitution
        </div>
        <div style={{ opacity: t3, transform: `translateY(${(1 - t3) * 40}px)` }}>made simple.</div>
      </div>
      <div
        style={{
          marginTop: 60,
          fontFamily: BODY,
          fontSize: 40,
          color: MUTED,
          maxWidth: 800,
          opacity: interpolate(f, [50, 80], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        No spreadsheets. No guessing units.
      </div>
    </AbsoluteFill>
  );
};

// ---------- SCENE 2: Calculator inputs ----------
const InputRow: React.FC<{
  label: string;
  value: string;
  unit: string;
  delay: number;
  caret?: boolean;
  typed?: string;
}> = ({ label, value, unit, delay, typed }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 20, stiffness: 110 } });
  const chars = typed ?? value;
  const shown = Math.min(chars.length, Math.max(0, Math.floor((f - delay - 6) * 0.9)));
  const display = typed ? chars.slice(0, shown) : value;
  return (
    <div style={{ opacity: s, transform: `translateY(${(1 - s) * 30}px)`, marginBottom: 34 }}>
      <div
        style={{ fontFamily: BODY, fontSize: 28, color: MUTED, marginBottom: 14, fontWeight: 500 }}
      >
        {label}
      </div>
      <div
        style={{
          background: "#F4F0E4",
          border: `3px solid ${f - delay > 5 ? TEAL : "#E4DEC9"}`,
          borderRadius: 22,
          padding: "28px 36px",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          transition: "none",
        }}
      >
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 62,
            color: INK,
            letterSpacing: -1,
          }}
        >
          {display}
          {typed && shown < chars.length ? (
            <span style={{ opacity: Math.floor(f / 8) % 2, color: TEAL }}>|</span>
          ) : null}
        </div>
        <div style={{ fontFamily: BODY, fontSize: 32, color: MUTED, fontWeight: 500 }}>{unit}</div>
      </div>
    </div>
  );
};

const Scene2: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = spring({ frame: f, fps, config: { damping: 18 } });
  const chip = spring({ frame: f - 10, fps, config: { damping: 16 } });
  return (
    <AbsoluteFill style={{ padding: "220px 70px 0", fontFamily: BODY }}>
      <div
        style={{
          opacity: chip,
          transform: `translateY(${(1 - chip) * -20}px)`,
          display: "inline-flex",
          alignSelf: "flex-start",
          alignItems: "center",
          gap: 12,
          background: INK,
          color: CREAM,
          padding: "14px 24px",
          borderRadius: 999,
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        Step 1 · Enter your vial
      </div>
      <div
        style={{
          marginTop: 40,
          fontFamily: DISPLAY,
          fontSize: 78,
          fontWeight: 700,
          color: INK,
          letterSpacing: -2,
          lineHeight: 1.05,
        }}
      >
        Reconstitution
        <br />
        Calculator
      </div>
      <div
        style={{
          marginTop: 50,
          background: CARD,
          borderRadius: 40,
          padding: "56px 52px",
          boxShadow: "0 30px 80px rgba(11,31,36,0.12)",
          opacity: card,
          transform: `translateY(${(1 - card) * 40}px) scale(${0.96 + card * 0.04})`,
          transformOrigin: "top center",
        }}
      >
        <InputRow label="Peptide in vial" value="5" unit="mg" delay={24} typed="5" />
        <InputRow label="Bacteriostatic water" value="2" unit="mL" delay={54} typed="2" />
        <InputRow label="Target dose" value="250" unit="mcg" delay={90} typed="250" />
        <InputRow label="Syringe" value="U-100" unit="insulin" delay={128} />
      </div>
    </AbsoluteFill>
  );
};

// ---------- SCENE 3: Result ----------
const StatCard: React.FC<{
  label: string;
  value: string;
  unit: string;
  big?: boolean;
  delay: number;
  highlight?: boolean;
}> = ({ label, value, unit, big, delay, highlight }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 14, stiffness: 120 } });
  return (
    <div
      style={{
        background: highlight ? TEAL : CARD,
        color: highlight ? "white" : INK,
        borderRadius: 32,
        padding: big ? "48px 44px" : "36px 34px",
        boxShadow: highlight
          ? "0 30px 60px rgba(14,124,134,0.35)"
          : "0 20px 40px rgba(11,31,36,0.08)",
        opacity: s,
        transform: `translateY(${(1 - s) * 40}px) scale(${0.9 + s * 0.1})`,
        flex: 1,
      }}
    >
      <div
        style={{
          fontFamily: BODY,
          fontSize: big ? 30 : 24,
          color: highlight ? "rgba(255,255,255,0.85)" : MUTED,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: 1.5,
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 18,
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: big ? 128 : 78,
          letterSpacing: -2.5,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: BODY,
          fontSize: big ? 34 : 26,
          color: highlight ? "rgba(255,255,255,0.9)" : MUTED,
          fontWeight: 500,
        }}
      >
        {unit}
      </div>
    </div>
  );
};

const Scene3: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chip = spring({ frame: f, fps, config: { damping: 16 } });
  const title = spring({ frame: f - 6, fps, config: { damping: 16 } });
  return (
    <AbsoluteFill style={{ padding: "220px 70px 0", fontFamily: BODY }}>
      <div
        style={{
          opacity: chip,
          transform: `translateY(${(1 - chip) * -20}px)`,
          display: "inline-flex",
          alignSelf: "flex-start",
          gap: 12,
          background: ACCENT,
          color: INK,
          padding: "14px 24px",
          borderRadius: 999,
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        Step 2 · Your exact dose
      </div>
      <div
        style={{
          marginTop: 40,
          fontFamily: DISPLAY,
          fontSize: 78,
          fontWeight: 700,
          color: INK,
          letterSpacing: -2,
          lineHeight: 1.05,
          opacity: title,
          transform: `translateY(${(1 - title) * 20}px)`,
        }}
      >
        Draw <span style={{ color: TEAL }}>this many</span> units.
      </div>
      <div style={{ marginTop: 60 }}>
        <StatCard
          label="Draw to"
          value="10"
          unit="units on a U-100 syringe"
          big
          highlight
          delay={20}
        />
        <div style={{ height: 28 }} />
        <div style={{ display: "flex", gap: 24 }}>
          <StatCard label="Concentration" value="2.5" unit="mg / mL" delay={42} />
          <StatCard label="Volume" value="0.10" unit="mL per dose" delay={58} />
        </div>
        <div style={{ height: 28 }} />
        <StatCard label="Doses per vial" value="20" unit="at 250 mcg each" delay={78} />
      </div>
    </AbsoluteFill>
  );
};

// ---------- SCENE 4: Injection steps ----------
const StepItem: React.FC<{ n: number; title: string; body: string; delay: number }> = ({
  n,
  title,
  body,
  delay,
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 18, stiffness: 110 } });
  const check = spring({ frame: f - delay - 20, fps, config: { damping: 12 } });
  return (
    <div
      style={{
        display: "flex",
        gap: 26,
        marginBottom: 30,
        opacity: s,
        transform: `translateX(${(1 - s) * -40}px)`,
      }}
    >
      <div
        style={{
          width: 84,
          height: 84,
          borderRadius: 24,
          background: TEAL,
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 44,
          flexShrink: 0,
          boxShadow: "0 12px 24px rgba(14,124,134,0.3)",
          position: "relative",
        }}
      >
        {n}
        <div
          style={{
            position: "absolute",
            right: -10,
            bottom: -10,
            width: 38,
            height: 38,
            borderRadius: 999,
            background: ACCENT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${check})`,
            color: INK,
            fontWeight: 700,
            fontSize: 22,
          }}
        >
          ✓
        </div>
      </div>
      <div
        style={{
          flex: 1,
          background: CARD,
          borderRadius: 26,
          padding: "26px 32px",
          boxShadow: "0 18px 36px rgba(11,31,36,0.08)",
        }}
      >
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 40,
            color: INK,
            letterSpacing: -0.5,
          }}
        >
          {title}
        </div>
        <div
          style={{ marginTop: 8, fontFamily: BODY, fontSize: 28, color: MUTED, lineHeight: 1.35 }}
        >
          {body}
        </div>
      </div>
    </div>
  );
};

const Scene4: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chip = spring({ frame: f, fps, config: { damping: 16 } });
  const title = spring({ frame: f - 6, fps, config: { damping: 16 } });
  return (
    <AbsoluteFill style={{ padding: "200px 70px 0", fontFamily: BODY }}>
      <div
        style={{
          opacity: chip,
          transform: `translateY(${(1 - chip) * -20}px)`,
          display: "inline-flex",
          alignSelf: "flex-start",
          gap: 12,
          background: INK,
          color: CREAM,
          padding: "14px 24px",
          borderRadius: 999,
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        Step 3 · Injection steps
      </div>
      <div
        style={{
          marginTop: 32,
          fontFamily: DISPLAY,
          fontSize: 76,
          fontWeight: 700,
          color: INK,
          letterSpacing: -2,
          lineHeight: 1.05,
          opacity: title,
          transform: `translateY(${(1 - title) * 20}px)`,
        }}
      >
        Guided from vial to skin.
      </div>
      <div style={{ marginTop: 46 }}>
        <StepItem
          n={1}
          title="Swab the vial"
          body="Wipe the rubber stopper with an alcohol pad."
          delay={16}
        />
        <StepItem
          n={2}
          title="Draw 10 units"
          body="Pull to the exact mark shown by the calculator."
          delay={38}
        />
        <StepItem
          n={3}
          title="Rotate injection site"
          body="DoseRoutine tracks your last site automatically."
          delay={60}
        />
        <StepItem
          n={4}
          title="Log the dose"
          body="Tap once — reminders and vial count update."
          delay={82}
        />
      </div>
    </AbsoluteFill>
  );
};

// ---------- SCENE 5: Outro ----------
const Scene5: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 14 } });
  const s2 = spring({ frame: f - 12, fps, config: { damping: 16 } });
  const s3 = spring({ frame: f - 26, fps, config: { damping: 18 } });
  return (
    <AbsoluteFill
      style={{
        padding: "0 80px",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: DISPLAY,
      }}
    >
      <div
        style={{
          width: 220,
          height: 220,
          borderRadius: 56,
          background: TEAL,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 40px 80px rgba(14,124,134,0.4)",
          transform: `scale(${s})`,
          opacity: s,
        }}
      >
        <div style={{ color: "white", fontSize: 140, fontWeight: 700, lineHeight: 1 }}>+</div>
      </div>
      <div
        style={{
          marginTop: 60,
          fontSize: 128,
          fontWeight: 700,
          color: INK,
          letterSpacing: -3,
          opacity: s2,
          transform: `translateY(${(1 - s2) * 30}px)`,
        }}
      >
        DoseRoutine
      </div>
      <div
        style={{
          marginTop: 24,
          fontFamily: BODY,
          fontSize: 38,
          color: MUTED,
          textAlign: "center",
          opacity: s3,
          transform: `translateY(${(1 - s3) * 20}px)`,
        }}
      >
        The peptide & medication tracker
        <br />
        built for real protocols.
      </div>
      <div
        style={{
          marginTop: 70,
          background: INK,
          color: CREAM,
          padding: "26px 48px",
          borderRadius: 999,
          fontFamily: BODY,
          fontSize: 32,
          fontWeight: 600,
          opacity: s3,
        }}
      >
        Available on the App Store
      </div>
    </AbsoluteFill>
  );
};

// ---------- Main ----------
export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <PersistentBG />
      <Sequence from={0} durationInFrames={120}>
        <Scene1 />
      </Sequence>
      <Sequence from={120} durationInFrames={240}>
        <Scene2 />
      </Sequence>
      <Sequence from={360} durationInFrames={180}>
        <Scene3 />
      </Sequence>
      <Sequence from={540} durationInFrames={150}>
        <Scene4 />
      </Sequence>
      <Sequence from={690} durationInFrames={60}>
        <Scene5 />
      </Sequence>
    </AbsoluteFill>
  );
};
