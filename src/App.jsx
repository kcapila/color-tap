import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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
  const [playerName, setPlayerName] = useState("");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [targetColor, setTargetColor] = useState(null);
  const [buttons, setButtons] = useState([]);
  const [timeLeft, setTimeLeft] = useState(1);
  const [feedback, setFeedback] = useState(null);
  const [streak, setStreak] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const startTimeRef = useRef(null);
  const animFrameRef = useRef(null);
  // Use a ref to track the final score so the useEffect always gets the right value
  const finalScoreRef = useRef(0);

  const fetchLeaderboard = async () => {
    setLoadingBoard(true);
    const { data } = await supabase
      .from("leaderboard")
      .select("name, score")
      .order("score", { ascending: false })
      .limit(10);
    if (data) setLeaderboard(data);
    setLoadingBoard(false);
  };

  const nextRound = useCallback((currentScore) => {
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
        setPhase("gameover");
      }
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const startGame = () => {
    setScore(0);
    setStreak(0);
    setFeedback(null);
    finalScoreRef.current = 0;
    setPhase("playing");
    nextRound(0);
  };

  const handleTap = (color) => {
    if (phase !== "playing") return;
    cancelAnimationFrame(animFrameRef.current);

    if (color.name === targetColor.name) {
      const newScore = score + 1;
      const newStreak = streak + 1;
      setScore(newScore);
      setStreak(newStreak);
      finalScoreRef.current = newScore; // keep ref in sync
      setHighScore(h => Math.max(h, newScore));
      setFeedback("correct");
      setTimeout(() => {
        setFeedback(null);
        nextRound(newScore);
      }, 180);
    } else {
      setPhase("gameover");
    }
  };

  // FIX: use finalScoreRef instead of score state to avoid stale closure
  useEffect(() => {
    if (phase === "gameover") {
      const savedScore = finalScoreRef.current;
      const savedName = playerName;
      (async () => {
        if (savedName.trim() && savedScore > 0) {
          await supabase.from("leaderboard").insert({ name: savedName, score: savedScore });
        }
        await fetchLeaderboard();
        setPhase("leaderboard");
      })();
    }
  }, [phase]);

  useEffect(() => {
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const timerColor = timeLeft > 0.5 ? "#3BFF7A" : timeLeft > 0.25 ? "#FFE03B" : "#FF3B3B";

  const rankIcon = (i) => {
    if (i === 0) return "🥇";
    if (i === 1) return "🥈";
    if (i === 2) return "🥉";
    return `${i + 1}.`;
  };

  const rankColor = (i) => {
    if (i === 0) return "#FFE03B";
    if (i === 1) return "#aaa";
    if (i === 2) return "#cd7f32";
    return "#444";
  };

  return (
    <div style={{
      minHeight: "100vh",
      width: "100vw",
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

      <div style={{ width: "100%", maxWidth: 480, padding: "0 24px", boxSizing: "border-box", position: "relative", zIndex: 1 }}>

        {/* MENU */}
        {phase === "menu" && (
          <div style={{ textAlign: "center", animation: "fadeIn 0.5s ease" }}>
            <div style={{ fontSize: 12, letterSpacing: 8, color: "#555", marginBottom: 8 }}>ARCADE</div>
            <div style={{
              fontSize: 52, fontWeight: 900, letterSpacing: 4,
              background: "linear-gradient(135deg, #FF3B3B, #FFE03B, #3BFF7A, #3B8BFF)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              marginBottom: 4, lineHeight: 1,
            }}>COLOR<br />TAP</div>
            <div style={{ color: "#444", fontSize: 11, letterSpacing: 3, marginBottom: 40 }}>v2.0</div>

            <div style={{ color: "#666", fontSize: 13, marginBottom: 32, lineHeight: 1.8 }}>
              A color word will appear.<br />
              Tap the button that <span style={{ color: "#FFE03B" }}>matches the word</span>.<br />
              Be fast — time runs out!
            </div>

            {/* Name input */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: "#555", fontSize: 11, letterSpacing: 3, marginBottom: 8 }}>YOUR NAME</div>
              <input
                value={playerName}
                onChange={e => setPlayerName(e.target.value.slice(0, 12).toUpperCase())}
                onKeyDown={e => e.key === "Enter" && playerName.trim() && startGame()}
                placeholder="ENTER NAME"
                maxLength={12}
                style={{
                  background: "#111",
                  border: `1px solid ${playerName.trim() ? "#555" : "#333"}`,
                  color: "#fff",
                  fontFamily: "inherit",
                  fontSize: 18,
                  letterSpacing: 4,
                  padding: "12px 16px",
                  width: "100%",
                  boxSizing: "border-box",
                  textAlign: "center",
                  outline: "none",
                  borderRadius: 4,
                  transition: "border 0.2s",
                }}
              />
            </div>

            <button
              onClick={() => playerName.trim() && startGame()}
              style={{
                background: playerName.trim() ? "#3BFF7A" : "transparent",
                border: `2px solid ${playerName.trim() ? "#3BFF7A" : "#333"}`,
                color: playerName.trim() ? "#000" : "#333",
                padding: "16px 0",
                fontSize: 16,
                letterSpacing: 4,
                cursor: playerName.trim() ? "pointer" : "default",
                fontFamily: "inherit",
                fontWeight: 900,
                transition: "all 0.15s",
                marginBottom: 12,
                display: "block",
                width: "100%",
                borderRadius: 4,
              }}
            >START</button>

            <button
              onClick={() => { fetchLeaderboard(); setPhase("leaderboard"); }}
              style={{
                background: "transparent",
                border: "1px solid #222",
                color: "#555",
                padding: "12px 0",
                fontSize: 12,
                letterSpacing: 4,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
                width: "100%",
                borderRadius: 4,
              }}
            >🏆 LEADERBOARD</button>
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
              filter: feedback === "correct" ? "brightness(2)" : "none",
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
                  height: 100,
                  cursor: "pointer",
                  fontSize: 15,
                  fontWeight: 900,
                  letterSpacing: 3,
                  color: "#000",
                  fontFamily: "inherit",
                  boxShadow: `0 4px 20px ${color.hex}44`,
                  transition: "transform 0.08s",
                  WebkitTapHighlightColor: "transparent",
                }}
                  onMouseDown={e => { e.currentTarget.style.transform = "scale(0.95)"; }}
                  onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
                  onTouchStart={e => { e.currentTarget.style.transform = "scale(0.95)"; }}
                  onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; }}
                >
                  {color.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SAVING (brief transition state) */}
        {phase === "gameover" && (
          <div style={{ textAlign: "center", animation: "fadeIn 0.4s ease" }}>
            <div style={{ fontSize: 11, letterSpacing: 6, color: "#FF3B3B", marginBottom: 12 }}>GAME OVER</div>
            <div style={{ fontSize: 72, fontWeight: 900, color: "#fff", marginBottom: 4 }}>{finalScoreRef.current}</div>
            <div style={{ color: "#555", fontSize: 13, letterSpacing: 3, marginTop: 16 }}>SAVING SCORE...</div>
          </div>
        )}

        {/* LEADERBOARD */}
        {phase === "leaderboard" && (
          <div style={{ textAlign: "center", animation: "fadeIn 0.4s ease" }}>
            <div style={{ fontSize: 11, letterSpacing: 6, color: "#FFE03B", marginBottom: 4 }}>🏆 LEADERBOARD</div>
            <div style={{ color: "#333", fontSize: 11, letterSpacing: 2, marginBottom: 28 }}>TOP 10</div>

            {loadingBoard ? (
              <div style={{ color: "#444", letterSpacing: 3, fontSize: 12, marginBottom: 32 }}>LOADING...</div>
            ) : leaderboard.length === 0 ? (
              <div style={{ color: "#444", letterSpacing: 3, fontSize: 12, marginBottom: 32 }}>NO SCORES YET</div>
            ) : (
              <div style={{ marginBottom: 28 }}>
                {leaderboard.map((entry, i) => (
                  <div key={i} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    marginBottom: 6,
                    background: entry.name === playerName ? "#1a1a08" : "#0f0f0f",
                    border: `1px solid ${entry.name === playerName ? "#FFE03B44" : "#1a1a1a"}`,
                    borderRadius: 6,
                  }}>
                    <span style={{ color: rankColor(i), fontWeight: 900, fontSize: 14, width: 28, textAlign: "left" }}>
                      {rankIcon(i)}
                    </span>
                    <span style={{
                      color: entry.name === playerName ? "#FFE03B" : "#777",
                      letterSpacing: 2, fontSize: 13, flex: 1, textAlign: "left", paddingLeft: 8
                    }}>
                      {entry.name}
                    </span>
                    <span style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}>{entry.score}</span>
                  </div>
                ))}
              </div>
            )}

            {finalScoreRef.current > 0 && (
              <div style={{ marginBottom: 20, padding: 12, background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 6 }}>
                <div style={{ color: "#444", fontSize: 10, letterSpacing: 3, marginBottom: 4 }}>YOUR SCORE</div>
                <div style={{ color: "#fff", fontSize: 32, fontWeight: 900 }}>{finalScoreRef.current}</div>
              </div>
            )}

            <button onClick={startGame} style={{
              background: "#3BFF7A",
              border: "none",
              color: "#000",
              padding: "16px 0",
              fontSize: 16,
              letterSpacing: 4,
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 900,
              borderRadius: 4,
              width: "100%",
              marginBottom: 12,
            }}>PLAY AGAIN</button>

            <button onClick={() => setPhase("menu")} style={{
              background: "transparent", border: "none", color: "#444",
              fontSize: 12, letterSpacing: 3, cursor: "pointer",
              fontFamily: "inherit",
            }}>MENU</button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { from { opacity: 0.7; } to { opacity: 1; } }
        button:focus { outline: none; }
        button:focus-visible { outline: none; }
        input::placeholder { color: #333; }
      `}</style>
    </div>
  );
}