import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { fade } from "@remotion/transitions/fade";
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
const TEAL_DEEP = "#0A4E55";
const INK = "#0B1F24";
const CREAM = "#F5F1E8";
const MUTED = "#6B7C80";
const CORAL = "#F97316";
const AMBER = "#F59E0B";

const BG: React.CSSProperties = {
  background: `radial-gradient(120% 80% at 50% 0%, #ECE6D6 0%, ${CREAM} 55%, #E6DFCA 100%)`,
};

const Blob: React.FC<{ x: number; y: number; size: number; delay: number; opacity?: number }> = ({
  x,
  y,
  size,
  delay,
  opacity = 0.07,
}) => {
  const f = useCurrentFrame();
  const drift = Math.sin((f + delay) / 50) * 26;
  const scale = interpolate(f, [delay, delay + 80], [0.75, 1], {
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
      }}
    />
  );
};

const PersistentBG: React.FC = () => (
  <AbsoluteFill style={BG}>
    <Blob x={-160} y={140} size={420} delay={0} />
    <Blob x={820} y={420} size={260} delay={30} opacity={0.05} />
    <Blob x={720} y={1460} size={340} delay={60} opacity={0.06} />
    <Blob x={-120} y={1280} size={300} delay={90} opacity={0.045} />
  </AbsoluteFill>
);

const Rise: React.FC<{
  delay: number;
  children: React.ReactNode;
  y?: number;
  damping?: number;
  style?: React.CSSProperties;
}> = ({ delay, children, y = 44, damping = 16, style }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping, stiffness: 95 } });
  return (
    <div style={{ opacity: s, transform: `translateY(${(1 - s) * y}px)`, ...style }}>
      {children}
    </div>
  );
};

const ICO_PATHS: Record<string, React.ReactNode> = {
  pill: (
    <>
      <rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-45 12 12)" />
      <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" />
    </>
  ),
  warn: (
    <>
      <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
  chart: (
    <>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </>
  ),
  calc: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="11" x2="8" y2="11.01" />
      <line x1="12" y1="11" x2="12" y2="11.01" />
      <line x1="16" y1="11" x2="16" y2="11.01" />
      <line x1="8" y1="16" x2="12" y2="16" />
    </>
  ),
  droplet: <path d="M12 2.7 6.5 9.4a7 7 0 1 0 11 0Z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </>
  ),
  book: (
    <>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22Z" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </>
  ),
  spark: (
    <>
      <path d="M12 2.5 14 9l6.5 2-6.5 2-2 6.5-2-6.5L3.5 11 10 9Z" />
    </>
  ),
  camera: (
    <>
      <path d="M3 8h3.5L8.5 5h7l2 3H21v12H3Z" />
      <circle cx="12" cy="13.5" r="4" />
    </>
  ),
  up: (
    <>
      <line x1="12" y1="20" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
};

const Ico: React.FC<{ name: string; size: number; color: string }> = ({ name, size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {ICO_PATHS[name] ?? null}
  </svg>
);

const Badge: React.FC<{ label: string; tone?: "teal" | "coral" }> = ({ label, tone = "teal" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 13 } });
  const bg = tone === "coral" ? CORAL : TEAL;
  return (
    <div
      style={{
        display: "inline-flex",
        alignSelf: "flex-start",
        alignItems: "center",
        gap: 16,
        background: bg,
        color: "white",
        padding: "18px 32px",
        borderRadius: 999,
        fontFamily: BODY,
        fontWeight: 700,
        fontSize: 30,
        letterSpacing: 1.5,
        opacity: s,
        transform: `translateY(${(1 - s) * -46}px)`,
        boxShadow: `0 22px 44px ${bg}55`,
      }}
    >
      <span style={{ width: 14, height: 14, borderRadius: 999, background: "white" }} />
      {label}
    </div>
  );
};

// ---------- SCENE 1: HOOK ----------
const Scene1: React.FC = () => {
  const f = useCurrentFrame();
  const pulse = 1 + Math.sin(f / 12) * 0.012;
  return (
    <AbsoluteFill style={{ padding: "250px 88px 0", fontFamily: DISPLAY, color: INK }}>
      <Badge label="DOSEROUTINE" />
      <div
        style={{
          marginTop: 84,
          fontSize: 118,
          lineHeight: 1.0,
          fontWeight: 700,
          letterSpacing: -3.5,
        }}
      >
        <Rise delay={6}>Your longevity</Rise>
        <Rise delay={16}>stack deserves</Rise>
        <Rise delay={28} style={{ marginTop: 10 }}>
          <span
            style={{
              display: "inline-block",
              background: CORAL,
              color: "white",
              padding: "6px 24px 14px",
              borderRadius: 20,
              transform: `rotate(-1.5deg) scale(${pulse})`,
            }}
          >
            more than a
          </span>
        </Rise>
        <Rise delay={40}>
          <span style={{ color: TEAL }}>notes app.</span>
        </Rise>
      </div>
      <Rise
        delay={60}
        style={{
          marginTop: 62,
          fontFamily: BODY,
          fontSize: 42,
          lineHeight: 1.35,
          color: MUTED,
          maxWidth: 840,
        }}
      >
        Here&apos;s everything DoseRoutine tracks for you.
      </Rise>
    </AbsoluteFill>
  );
};

// ---------- SCENE 2: TRACK ----------
const FeatureCard: React.FC<{
  icon: string;
  title: string;
  sub: string;
  delay: number;
  accent?: string;
}> = ({ icon, title, sub, delay, accent = TEAL }) => (
  <Rise
    delay={delay}
    y={32}
    damping={18}
    style={{
      background: "white",
      borderRadius: 30,
      padding: "30px 34px",
      display: "flex",
      alignItems: "center",
      gap: 26,
      marginBottom: 24,
      boxShadow: "0 18px 38px rgba(11,31,36,0.08)",
    }}
  >
    <div
      style={{
        width: 82,
        height: 82,
        flexShrink: 0,
        borderRadius: 24,
        background: `${accent}16`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ico name={icon} size={42} color={accent} />
    </div>
    <div>
      <div
        style={{
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 48,
          color: INK,
          letterSpacing: -1,
        }}
      >
        {title}
      </div>
      <div style={{ fontFamily: BODY, fontSize: 29, color: MUTED, marginTop: 6 }}>{sub}</div>
    </div>
  </Rise>
);

const Scene2: React.FC = () => (
  <AbsoluteFill style={{ padding: "240px 80px 0", fontFamily: DISPLAY, color: INK }}>
    <Rise delay={0} style={{ fontSize: 86, fontWeight: 700, letterSpacing: -3 }}>
      1. Track <span style={{ color: TEAL }}>everything.</span>
    </Rise>
    <Rise
      delay={10}
      style={{
        marginTop: 20,
        marginBottom: 56,
        fontFamily: BODY,
        fontSize: 34,
        color: MUTED,
        maxWidth: 860,
      }}
    >
      Supplements, peptides, TRT, prescriptions — one schedule.
    </Rise>
    <FeatureCard icon="pill" title="Multi-time dosing" delay={22} sub="AM, PM, cycles, off-days" />
    <FeatureCard
      icon="clock"
      title="Smart reminders"
      delay={34}
      sub="Timezone-safe, never double-fires"
    />
    <FeatureCard icon="droplet" title="Vial & inventory" delay={46} sub="Know before you run out" />
    <FeatureCard
      icon="camera"
      title="Injection site map"
      delay={58}
      sub="Rotate sites automatically"
    />
  </AbsoluteFill>
);

// ---------- SCENE 3: THE SAFETY LAYER ----------
const Scene3: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const warn = spring({ frame: f - 42, fps, config: { damping: 11, stiffness: 130 } });
  const shake = f > 42 && f < 72 ? Math.sin((f - 42) / 1.6) * 5 * (1 - (f - 42) / 30) : 0;
  return (
    <AbsoluteFill style={{ padding: "270px 88px 0", fontFamily: DISPLAY, color: INK }}>
      <Rise
        delay={0}
        style={{ fontSize: 86, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05 }}
      >
        2. Catch what you&apos;d <span style={{ color: CORAL }}>miss.</span>
      </Rise>
      <Rise
        delay={12}
        style={{
          marginTop: 22,
          fontFamily: BODY,
          fontSize: 36,
          color: MUTED,
          maxWidth: 860,
          lineHeight: 1.35,
        }}
      >
        Every new compound is checked against your whole stack.
      </Rise>
      <div
        style={{
          marginTop: 70,
          background: "#FFF3EC",
          border: `4px solid ${CORAL}`,
          borderRadius: 30,
          padding: "36px 38px",
          opacity: warn,
          transform: `translateY(${(1 - warn) * 30}px) translateX(${shake}px)`,
          boxShadow: `0 24px 50px ${CORAL}33`,
        }}
      >
        <div
          style={{
            fontFamily: BODY,
            fontWeight: 700,
            fontSize: 28,
            color: CORAL,
            letterSpacing: 2,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Ico name="warn" size={30} color={CORAL} />
          INTERACTION FOUND
        </div>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 48,
            color: INK,
            marginTop: 14,
            lineHeight: 1.15,
          }}
        >
          Zinc blocks magnesium absorption. Space them 2 hours apart.
        </div>
      </div>
      <Rise
        delay={72}
        y={26}
        style={{
          marginTop: 44,
          display: "flex",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        {["Timing conflicts", "Duplicate actives", "Cycle overlap"].map((t) => (
          <div
            key={t}
            style={{
              background: "white",
              borderRadius: 999,
              padding: "18px 30px",
              fontFamily: BODY,
              fontWeight: 600,
              fontSize: 28,
              color: TEAL_DEEP,
              boxShadow: "0 12px 26px rgba(11,31,36,0.07)",
            }}
          >
            {t}
          </div>
        ))}
      </Rise>
    </AbsoluteFill>
  );
};

// ---------- SCENE 4: TWEAK / DATA ----------
const Bar: React.FC<{ h: number; delay: number; color: string }> = ({ h, delay, color }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 17, stiffness: 90 } });
  return (
    <div
      style={{
        width: 74,
        height: h * s,
        borderRadius: 18,
        background: color,
        alignSelf: "flex-end",
      }}
    />
  );
};

const Scene4: React.FC = () => {
  const f = useCurrentFrame();
  const heights = [120, 180, 150, 240, 300, 270, 360];
  return (
    <AbsoluteFill style={{ padding: "250px 80px 0", fontFamily: DISPLAY, color: INK }}>
      <Rise
        delay={0}
        style={{ fontSize: 86, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05 }}
      >
        3. Then <span style={{ color: TEAL }}>tweak it</span> with data.
      </Rise>
      <Rise
        delay={10}
        style={{
          marginTop: 20,
          fontFamily: BODY,
          fontSize: 34,
          color: MUTED,
          maxWidth: 860,
        }}
      >
        Daily check-ins turn into trends you can actually act on.
      </Rise>
      <div
        style={{
          marginTop: 66,
          background: "white",
          borderRadius: 34,
          padding: "40px 40px 34px",
          boxShadow: "0 22px 46px rgba(11,31,36,0.09)",
        }}
      >
        <div
          style={{
            fontFamily: BODY,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 2,
            color: MUTED,
          }}
        >
          ENERGY · LAST 7 DAYS
        </div>
        <div
          style={{
            display: "flex",
            gap: 20,
            height: 380,
            alignItems: "flex-end",
            marginTop: 30,
          }}
        >
          {heights.map((h, i) => (
            <Bar
              key={i}
              h={h}
              delay={20 + i * 5}
              color={i === 6 ? CORAL : `${TEAL}${i > 3 ? "" : "99"}`}
            />
          ))}
        </div>
        <div
          style={{
            marginTop: 26,
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 40,
            color: TEAL_DEEP,
            opacity: interpolate(f, [64, 84], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          <Ico name="up" size={36} color={AMBER} />
          +38% since you moved creatine to AM
        </div>
      </div>
      <Rise
        delay={90}
        y={26}
        style={{
          marginTop: 40,
          display: "flex",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        {["Sleep", "Mood", "Libido", "Recovery", "Focus"].map((t) => (
          <div
            key={t}
            style={{
              background: `${TEAL}12`,
              borderRadius: 999,
              padding: "16px 28px",
              fontFamily: BODY,
              fontWeight: 600,
              fontSize: 27,
              color: TEAL_DEEP,
            }}
          >
            {t}
          </div>
        ))}
      </Rise>
    </AbsoluteFill>
  );
};

// ---------- SCENE 5: THE TOOLKIT ----------
const Tile: React.FC<{ icon: string; label: string; delay: number; accent: string }> = ({
  icon,
  label,
  delay,
  accent,
}) => (
  <Rise
    delay={delay}
    y={40}
    damping={14}
    style={{
      background: "white",
      borderRadius: 30,
      padding: "38px 26px",
      textAlign: "center",
      boxShadow: "0 18px 36px rgba(11,31,36,0.08)",
    }}
  >
    <div style={{ display: "flex", justifyContent: "center" }}>
      <Ico name={icon} size={56} color={accent} />
    </div>
    <div
      style={{
        fontFamily: DISPLAY,
        fontWeight: 700,
        fontSize: 36,
        color: INK,
        marginTop: 20,
        lineHeight: 1.15,
        letterSpacing: -0.5,
      }}
    >
      {label}
    </div>
  </Rise>
);

const Scene5: React.FC = () => (
  <AbsoluteFill style={{ padding: "240px 74px 0", fontFamily: DISPLAY, color: INK }}>
    <Rise delay={0} style={{ fontSize: 86, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05 }}>
      4. Plus the <span style={{ color: CORAL }}>nerd tools.</span>
    </Rise>
    <div
      style={{
        marginTop: 66,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 26,
      }}
    >
      <Tile icon="calc" label="Reconstitution calculator" delay={14} accent={TEAL} />
      <Tile icon="droplet" label="Blood work tracker" delay={22} accent={CORAL} />
      <Tile icon="book" label="500+ compound library" delay={30} accent={TEAL} />
      <Tile icon="spark" label="AI protocol coach" delay={38} accent={AMBER} />
      <Tile icon="target" label="Goal-based stacks" delay={46} accent={TEAL} />
      <Tile icon="chart" label="Clinician-ready export" delay={54} accent={CORAL} />
    </div>
  </AbsoluteFill>
);

// ---------- SCENE 6: CTA ----------
const Scene6: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f - 8, fps, config: { damping: 11, stiffness: 120 } });
  const pulse = 1 + Math.sin(f / 9) * 0.02;
  return (
    <AbsoluteFill
      style={{
        padding: "0 88px",
        fontFamily: DISPLAY,
        color: "white",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        background: `linear-gradient(165deg, ${TEAL} 0%, ${TEAL_DEEP} 100%)`,
      }}
    >
      <Rise
        delay={0}
        style={{ fontFamily: BODY, fontSize: 34, fontWeight: 700, letterSpacing: 4, opacity: 0.85 }}
      >
        ONE APP. WHOLE PROTOCOL.
      </Rise>
      <div
        style={{
          marginTop: 40,
          fontSize: 128,
          fontWeight: 700,
          letterSpacing: -5,
          lineHeight: 0.95,
          opacity: pop,
          transform: `scale(${0.8 + pop * 0.2})`,
          color: "#FFD9A8",
        }}
      >
        DoseRoutine
      </div>
      <Rise
        delay={24}
        style={{ fontSize: 60, fontWeight: 700, letterSpacing: -1.5, marginTop: 26 }}
      >
        Stop guessing your stack.
      </Rise>
      <Rise
        delay={40}
        style={{
          marginTop: 66,
          background: CORAL,
          padding: "34px 62px",
          borderRadius: 999,
          fontFamily: BODY,
          fontWeight: 700,
          fontSize: 46,
          transform: `scale(${pulse})`,
          boxShadow: "0 26px 60px rgba(0,0,0,0.28)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 16 }}>
          Link in bio
          <Ico name="up" size={40} color="white" />
        </span>
      </Rise>
      <Rise
        delay={54}
        style={{ marginTop: 42, fontFamily: BODY, fontSize: 34, opacity: 0.8, letterSpacing: 1 }}
      >
        doseroutine.com
      </Rise>
    </AbsoluteFill>
  );
};

const T = (frames: number) => springTiming({ config: { damping: 200 }, durationInFrames: frames });

export const FeaturesVideo: React.FC = () => (
  <AbsoluteFill style={{ background: CREAM }}>
    <PersistentBG />
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={150}>
        <Scene1 />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={T(22)}
      />
      <TransitionSeries.Sequence durationInFrames={170}>
        <Scene2 />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={T(20)}
      />
      <TransitionSeries.Sequence durationInFrames={165}>
        <Scene3 />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={T(20)}
      />
      <TransitionSeries.Sequence durationInFrames={180}>
        <Scene4 />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={T(20)}
      />
      <TransitionSeries.Sequence durationInFrames={155}>
        <Scene5 />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={T(18)} />
      <TransitionSeries.Sequence durationInFrames={150}>
        <Scene6 />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);

// 150+170+165+180+155+150 = 970 - (22+20+20+20+18) = 870
export const FEATURES_DURATION = 870;
