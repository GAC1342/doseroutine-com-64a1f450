import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
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

const BG: React.CSSProperties = {
  background: `radial-gradient(120% 80% at 50% 0%, #ECE6D6 0%, ${CREAM} 55%, #E6DFCA 100%)`,
};

const Bubble: React.FC<{
  x: number;
  y: number;
  size: number;
  delay: number;
  opacity?: number;
}> = ({ x, y, size, delay, opacity = 0.07 }) => {
  const f = useCurrentFrame();
  const drift = Math.sin((f + delay) / 45) * 22;
  const scale = interpolate(f, [delay, delay + 70], [0.7, 1], {
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
    <Bubble x={-140} y={180} size={380} delay={0} />
    <Bubble x={800} y={120} size={240} delay={25} opacity={0.05} />
    <Bubble x={760} y={1500} size={320} delay={50} opacity={0.06} />
    <Bubble x={-100} y={1380} size={280} delay={75} opacity={0.045} />
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
    <div
      style={{
        opacity: s,
        transform: `translateY(${(1 - s) * y}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

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

// Inline vector icons — the render container has no emoji font.
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
  unlock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="8" r="6" />
      <path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5" />
    </>
  ),
  chart: (
    <>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </>
  ),
  gift: (
    <>
      <rect x="2" y="9" width="20" height="4" rx="1" />
      <path d="M4 13v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
      <line x1="12" y1="9" x2="12" y2="22" />
      <path d="M12 9C12 9 10.5 2 7.5 2a2.5 2.5 0 0 0 0 7Z" />
      <path d="M12 9c0 0 1.5-7 4.5-7a2.5 2.5 0 0 1 0 7Z" />
    </>
  ),
  up: (
    <>
      <line x1="12" y1="20" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
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

// ---------- SCENE 1: HOOK ----------
const Scene1: React.FC = () => {
  const f = useCurrentFrame();
  const pulse = 1 + Math.sin(f / 12) * 0.012;
  return (
    <AbsoluteFill style={{ padding: "250px 88px 0", fontFamily: DISPLAY, color: INK }}>
      <Badge label="DOSEROUTINE" />
      <div
        style={{
          marginTop: 86,
          fontSize: 122,
          lineHeight: 1.0,
          fontWeight: 700,
          letterSpacing: -3.5,
        }}
      >
        <Rise delay={6}>You can get</Rise>
        <Rise delay={16}>
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
            paid experience
          </span>
        </Rise>
        <Rise delay={30} style={{ marginTop: 14 }}>
          testing apps
        </Rise>
        <Rise delay={42}>
          <span style={{ color: TEAL }}>before they launch.</span>
        </Rise>
      </div>
      <Rise
        delay={62}
        style={{
          marginTop: 66,
          fontFamily: BODY,
          fontSize: 42,
          lineHeight: 1.35,
          color: MUTED,
          maxWidth: 830,
        }}
      >
        Most people have no idea it&apos;s this easy.
      </Rise>
    </AbsoluteFill>
  );
};

// ---------- SCENE 2: WHAT THE APP DOES ----------
const PillRow: React.FC<{ name: string; sub: string; delay: number }> = ({ name, sub, delay }) => (
  <Rise
    delay={delay}
    y={26}
    damping={20}
    style={{
      background: "white",
      borderRadius: 26,
      padding: "26px 32px",
      display: "flex",
      alignItems: "center",
      gap: 24,
      boxShadow: "0 14px 30px rgba(11,31,36,0.07)",
      marginBottom: 20,
    }}
  >
    <div
      style={{
        width: 60,
        height: 60,
        borderRadius: 18,
        background: `${TEAL}18`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 32,
      }}
    >
      <Ico name="pill" size={32} color={TEAL} />
    </div>
    <div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 44, color: INK }}>{name}</div>
      <div style={{ fontFamily: BODY, fontSize: 26, color: MUTED, marginTop: 4 }}>{sub}</div>
    </div>
  </Rise>
);

const Scene2: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const warn = spring({ frame: f - 62, fps, config: { damping: 11, stiffness: 130 } });
  const shake = f > 62 && f < 92 ? Math.sin((f - 62) / 1.6) * 5 * (1 - (f - 62) / 30) : 0;
  return (
    <AbsoluteFill style={{ padding: "230px 88px 0", fontFamily: DISPLAY, color: INK }}>
      <Rise
        delay={0}
        style={{ fontSize: 84, fontWeight: 700, letterSpacing: -2.5, lineHeight: 1.05 }}
      >
        It&apos;s called <span style={{ color: TEAL }}>DoseRoutine</span>.
      </Rise>
      <Rise
        delay={12}
        style={{
          marginTop: 26,
          fontFamily: BODY,
          fontSize: 38,
          color: MUTED,
          lineHeight: 1.35,
          maxWidth: 860,
          marginBottom: 56,
        }}
      >
        Track your supplements and peptides — and get told when two of them shouldn&apos;t be taken
        together.
      </Rise>
      <PillRow name="Magnesium glycinate" sub="400 mg · nightly" delay={26} />
      <PillRow name="Zinc picolinate" sub="30 mg · nightly" delay={38} />
      <div
        style={{
          marginTop: 18,
          background: "#FFF3EC",
          border: `4px solid ${CORAL}`,
          borderRadius: 30,
          padding: "34px 36px",
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
            fontSize: 46,
            color: INK,
            marginTop: 12,
            lineHeight: 1.15,
          }}
        >
          Zinc blocks magnesium absorption. Space them 2 hours apart.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- SCENE 3: THE JOB ----------
const BigStat: React.FC<{ value: string; label: string; delay: number }> = ({
  value,
  label,
  delay,
}) => (
  <Rise delay={delay} y={50} damping={13} style={{ textAlign: "center" }}>
    <div
      style={{
        fontFamily: DISPLAY,
        fontWeight: 700,
        fontSize: 168,
        lineHeight: 0.9,
        letterSpacing: -6,
        color: TEAL,
      }}
    >
      {value}
    </div>
    <div
      style={{
        fontFamily: BODY,
        fontSize: 34,
        color: MUTED,
        marginTop: 14,
        fontWeight: 600,
        letterSpacing: 1,
      }}
    >
      {label}
    </div>
  </Rise>
);

const Scene3: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ padding: "290px 88px 0", fontFamily: DISPLAY, color: INK }}>
      <Rise
        delay={0}
        style={{ fontSize: 96, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02 }}
      >
        I need testers.
      </Rise>
      <div
        style={{
          marginTop: 110,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <BigStat value="20" label="PEOPLE" delay={14} />
        <BigStat value="14" label="DAYS" delay={26} />
      </div>
      <Rise
        delay={44}
        style={{
          marginTop: 120,
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 76,
          lineHeight: 1.1,
          letterSpacing: -2,
        }}
      >
        You just&hellip; <span style={{ color: CORAL }}>use the app.</span>
      </Rise>
      <Rise
        delay={58}
        style={{
          marginTop: 28,
          fontFamily: BODY,
          fontSize: 40,
          color: MUTED,
          opacity: interpolate(f, [58, 80], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        That&apos;s the whole job.
      </Rise>
    </AbsoluteFill>
  );
};

// ---------- SCENE 4: WHAT YOU GET ----------
const Perk: React.FC<{ icon: string; title: string; sub: string; delay: number }> = ({
  icon,
  title,
  sub,
  delay,
}) => (
  <Rise
    delay={delay}
    y={34}
    damping={18}
    style={{
      background: "white",
      borderRadius: 30,
      padding: "34px 36px",
      display: "flex",
      alignItems: "center",
      gap: 28,
      marginBottom: 26,
      boxShadow: "0 18px 38px rgba(11,31,36,0.08)",
    }}
  >
    <div
      style={{
        width: 84,
        height: 84,
        flexShrink: 0,
        borderRadius: 24,
        background: `${TEAL}14`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 42,
      }}
    >
      <Ico name={icon} size={44} color={TEAL} />
    </div>
    <div>
      <div
        style={{
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 50,
          color: INK,
          letterSpacing: -1,
        }}
      >
        {title}
      </div>
      <div style={{ fontFamily: BODY, fontSize: 30, color: MUTED, marginTop: 6 }}>{sub}</div>
    </div>
  </Rise>
);

const Scene4: React.FC = () => (
  <AbsoluteFill style={{ padding: "250px 80px 0", fontFamily: DISPLAY, color: INK }}>
    <Rise delay={0} style={{ fontSize: 88, fontWeight: 700, letterSpacing: -3, marginBottom: 66 }}>
      What you get:
    </Rise>
    <Perk icon="unlock" title="Premium, free" sub="Full Pro access the entire test" delay={12} />
    <Perk icon="award" title="Your name in credits" sub="Founding tester, permanently" delay={26} />
    <Perk
      icon="chart"
      title="Real beta experience"
      sub="Something actual for your résumé"
      delay={40}
    />
    <Perk
      icon="gift"
      title="3 months Pro after"
      sub="Finish 14 days, we send your code"
      delay={54}
    />
  </AbsoluteFill>
);

// ---------- SCENE 5: CTA ----------
const Scene5: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f - 10, fps, config: { damping: 10, stiffness: 120 } });
  const pulse = 1 + Math.sin(f / 9) * 0.02;
  return (
    <AbsoluteFill
      style={{
        padding: "0 88px",
        fontFamily: DISPLAY,
        color: "white",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(165deg, ${TEAL} 0%, ${TEAL_DEEP} 100%)`,
      }}
    >
      <Rise
        delay={0}
        style={{ fontFamily: BODY, fontSize: 34, fontWeight: 700, letterSpacing: 4, opacity: 0.85 }}
      >
        FIRST ROUND ONLY
      </Rise>
      <div
        style={{
          marginTop: 44,
          fontSize: 240,
          fontWeight: 700,
          letterSpacing: -10,
          lineHeight: 0.9,
          opacity: pop,
          transform: `scale(${0.7 + pop * 0.3})`,
          color: "#FFD9A8",
        }}
      >
        20
      </div>
      <Rise delay={22} style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2, marginTop: 12 }}>
        spots. That&apos;s it.
      </Rise>
      <Rise
        delay={38}
        style={{
          marginTop: 70,
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
        delay={52}
        style={{
          marginTop: 44,
          fontFamily: BODY,
          fontSize: 34,
          opacity: 0.8,
          letterSpacing: 1,
        }}
      >
        doseroutine.com/closed-testing
      </Rise>
    </AbsoluteFill>
  );
};

const T = (frames: number) => springTiming({ config: { damping: 200 }, durationInFrames: frames });

export const TesterVideo: React.FC = () => (
  <AbsoluteFill style={{ background: CREAM }}>
    <PersistentBG />
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={160}>
        <Scene1 />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={T(22)}
      />
      <TransitionSeries.Sequence durationInFrames={175}>
        <Scene2 />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={T(20)}
      />
      <TransitionSeries.Sequence durationInFrames={150}>
        <Scene3 />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={T(20)}
      />
      <TransitionSeries.Sequence durationInFrames={165}>
        <Scene4 />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={T(18)} />
      <TransitionSeries.Sequence durationInFrames={150}>
        <Scene5 />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);

// total = 160+175+150+165+150 - (22+20+20+18) = 800 - 80 = 720
export const TESTER_DURATION = 720;
