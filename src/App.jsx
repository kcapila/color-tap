import { useState, useEffect, useCallback, useRef } from "react";

const COLORS = [
  { name: "RED", hex: "#FF3B3B", dark: "#CC0000" },
  { name: "BLUE", hex: "#3B8BFF", dark: "#0055CC" },
  { name: "GREEN", hex: "#3BFF7A", dark: "#00CC44" },
  { name: "YELLOW", hex: "#FFE03B", dark: "#CCA800" },
];

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function getRandomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

const INITIAL_TIME = 3000;
const MIN_TIME = 700;
const SPEED_DECREMENT = 80;

export default function ColorTap() {
  const [phase, setPhase] = useState("menu");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [targetColor, setTargetColor] = useState(null);
  const [buttons, setButtons] = useState([]);
  const [timeLeft, setTimeLeft] = useState(1);
  const [feedback, setFeedback] = useState(null);
  const [streak, setStreak] = useState(0);
  const startTimeRef = useRef(null);
  const animFrameRef = useRef(null);

  const nextRound = useCallback((currentScore, currentStreak) => {
    const newTime = Math.max(MIN_TIME, INITIAL_TIME - currentScore * SPEED_DECREMENT);
    setTargetColor(getRandomColor());
    setButtons(shuffle(COLORS));
    setTimeLeft(1);
    startTimeRef.current = performance.now();

    const tick = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const remaining = Math.max(0, 1 - elapsed / newTime);
      setTimeLeft(remaining);
      if (remaining > 0) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        setFeedback("wrong");
        setPhase("gameover");
      }
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const startGame = () => {
    setScore(0);
    setStreak(0);
    setFeedback(null);
    setPhase("playing");
    nextRound(0, 0);
  };

  const handleTap = (color) => {
    if (phase !== "playing") return;
    cancelAnimationFrame(animFrameRef.current);

    if (color.name === targetColor.name) {
      const newScore = score + 1;
      const newStreak = streak + 1;
      setScore(newScore);
      setStreak(newStreak);
      setHighScore(h => Math.max(h, newScore));
      setFeedback("correct");
      setTimeout(() => {
        setFeedback(null);
        nextRound(newScore, newStreak);
      }, 180);
    } else {
      setFeedback("wrong");
      setPhase("gameover");
    }
  };

  useEffect(() => {
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const timerColor = timeLeft > 0.5 ? "#3BFF7A" : timeLeft > 0.25 ? "#FFE03B" : "#FF3B3B";

  return (
    <div style={{
      minHeight: "100vh",
      width: "100vw",         /* FIX: force full viewport width */
      background: "#0a0a0f",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Courier New', monospace",
      userSelect: "none",
      overflow: "hidden",
      position: "relative",
      boxSizing: "border-box",
    }}>
      {/* Scanline overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 10,
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
      }} />

      {/* Grid background */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      {/* FIX: removed maxWidth, use full width with padding */}
      <div style={{ width: "100%", padding: "0 24px", boxSizing: "border-box", position: "relative", zIndex: 1 }}>

        {/* MENU */}
        {phase === "menu" && (
          <div style={{ textAlign: "center", animation: "fadeIn 0.5s ease" }}>
            <div style={{ fontSize: 12, letterSpacing: 8, color: "#555", marginBottom: 8 }}>ARCADE</div>
            <div style={{
              fontSize: 52, fontWeight: 900, letterSpacing: 4,
              background: "linear-gradient(135deg, #FF3B3B, #FFE03B, #3BFF7A, #3B8BFF)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              marginBottom: 4, lineHeight: 1,
            }}>COLOR<br/>TAP</div>
            <div style={{ color: "#444", fontSize: 11, letterSpacing: 3, marginBottom: 48 }}>v1.0</div>

            <div style={{ color: "#666", fontSize: 13, marginBottom: 40, lineHeight: 1.8 }}>
              A color word will appear.<br/>
              Tap the button that <span style={{ color: "#FFE03B" }}>matches the word</span>.<br/>
              Be fast — time runs out!
            </div>

            {highScore > 0 && (
              <div style={{ marginBottom: 24, color: "#555", fontSize: 13, letterSpacing: 2 }}>
                BEST: <span style={{ color: "#FFE03B" }}>{highScore}</span>
              </div>
            )}

            <button onClick={startGame} style={{
              background: "transparent",
              border: "2px solid #3BFF7A",
              color: "#3BFF7A",
              padding: "16px 48px",
              fontSize: 16,
              letterSpacing: 4,
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 700,
              transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.target.style.background = "#3BFF7A"; e.target.style.color = "#000"; }}
              onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#3BFF7A"; }}
            >START</button>
          </div>
        )}

        {/* PLAYING */}
        {phase === "playing" && targetColor && (
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32, alignItems: "center" }}>
              <div>
                <div style={{ color: "#444", fontSize: 10, letterSpacing: 3 }}>SCORE</div>
                <div style={{ color: "#fff", fontSize: 28, fontWeight: 900 }}>{score}</div>
              </div>
              {streak >= 3 && (
                <div style={{ color: "#FFE03B", fontSize: 12, letterSpacing: 2, animation: "pulse 0.5s infinite alternate" }}>
                  🔥 ×{streak}
                </div>
              )}
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#444", fontSize: 10, letterSpacing: 3 }}>BEST</div>
                <div style={{ color: "#555", fontSize: 28, fontWeight: 900 }}>{highScore}</div>
              </div>
            </div>

            <div style={{ height: 6, background: "#1a1a1a", borderRadius: 3, marginBottom: 40, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3,
                width: `${timeLeft * 100}%`,
                background: timerColor,
                transition: "background 0.3s",
                boxShadow: `0 0 10px ${timerColor}`,
              }} />
            </div>

            <div style={{
              fontSize: 56, fontWeight: 900, letterSpacing: 6,
              color: targetColor.hex,
              textShadow: `0 0 30px ${targetColor.hex}88, 0 0 60px ${targetColor.hex}44`,
              marginBottom: 48,
              filter: feedback === "correct" ? "brightness(2)" : feedback === "wrong" ? "brightness(0.3)" : "none",
              transition: "filter 0.15s",
            }}>
              {targetColor.name}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {buttons.map((color) => (
                <button key={color.name} onClick={() => handleTap(color)} style={{
                  background: color.hex,
                  border: "none",
                  borderRadius: 8,
                  height: 100,       /* FIX: taller buttons for mobile */
                  cursor: "pointer",
                  fontSize: 15,
                  fontWeight: 900,
                  letterSpacing: 3,
                  color: "#000",
                  fontFamily: "inherit",
                  boxShadow: `0 4px 20px ${color.hex}44`,
                  transition: "transform 0.08s, box-shadow 0.08s",
                  WebkitTapHighlightColor: "transparent",
                }}
                  onMouseDown={e => { e.target.style.transform = "scale(0.95)"; }}
                  onMouseUp={e => { e.target.style.transform = "scale(1)"; }}
                  onTouchStart={e => { e.currentTarget.style.transform = "scale(0.95)"; }}
                  onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; }}
                >
                  {color.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* GAME OVER */}
        {phase === "gameover" && (
          <div style={{ textAlign: "center", animation: "fadeIn 0.4s ease" }}>
            <div style={{ fontSize: 11, letterSpacing: 6, color: "#FF3B3B", marginBottom: 12 }}>GAME OVER</div>
            <div style={{ fontSize: 72, fontWeight: 900, color: "#fff", marginBottom: 4 }}>{score}</div>
            <div style={{ color: "#444", fontSize: 12, letterSpacing: 4, marginBottom: 8 }}>FINAL SCORE</div>

            {score >= highScore && score > 0 && (
              <div style={{ color: "#FFE03B", fontSize: 13, letterSpacing: 3, marginBottom: 24, animation: "pulse 0.6s infinite alternate" }}>
                ★ NEW BEST ★
              </div>
            )}
            {(score < highScore || score === 0) && (
              <div style={{ color: "#444", fontSize: 13, letterSpacing: 2, marginBottom: 24 }}>
                BEST: {highScore}
              </div>
            )}

            {targetColor && (
              <div style={{ marginBottom: 40, padding: "16px", border: "1px solid #1f1f1f", borderRadius: 8 }}>
                <div style={{ color: "#444", fontSize: 11, letterSpacing: 3, marginBottom: 8 }}>THE WORD WAS</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: targetColor.hex, letterSpacing: 4 }}>
                  {targetColor.name}
                </div>
              </div>
            )}

            <button onClick={startGame} style={{
              background: "#FF3B3B",
              border: "none",
              color: "#fff",
              padding: "16px 48px",
              fontSize: 16,
              letterSpacing: 4,
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 900,
              borderRadius: 4,
              transition: "all 0.15s",
            }}
              onMouseEnter={e => e.target.style.background = "#CC0000"}
              onMouseLeave={e => e.target.style.background = "#FF3B3B"}
            >RETRY</button>

            <div>
              <button onClick={() => setPhase("menu")} style={{
                background: "transparent", border: "none", color: "#444",
                marginTop: 16, fontSize: 12, letterSpacing: 3, cursor: "pointer",
                fontFamily: "inherit",
              }}>MENU</button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { from { opacity: 0.7; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
