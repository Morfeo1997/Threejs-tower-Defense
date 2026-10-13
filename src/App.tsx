import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Sun,
  Moon,
  Coins,
  Users,
} from "lucide-react";

import { Game } from "./game/Game";
import {
  createInitialGameState,
  type GameState,
} from "./game/GameState";

function App() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>(
    createInitialGameState,
  );

  useEffect(() => {
    const container = gameContainerRef.current;
    if (!container) return;

    const game = new Game(container, setGameState);
    game.start();

    return () => game.dispose();
  }, []);

  const isDay = gameState.phase === "day";

  return (
    <main className="game-container">
      <div ref={gameContainerRef} className="game-canvas" />

      <header className="game-hud">
        <div className="hud-day">
          <CalendarDays size={19} />
          <span>
            DÍA {gameState.day} / {gameState.totalDays}
          </span>
        </div>

        <div
          className={`hud-phase ${isDay ? "phase-day" : "phase-night"}`}
          title={isDay ? "Día" : "Noche"}
        >
          {isDay ? <Sun size={23} /> : <Moon size={23} />}
        </div>

        <div className="hud-resources">
          <div className="hud-resource hud-credits">
            <Coins size={19} />
            <span>{gameState.credits}</span>
          </div>

          <div className="hud-resource hud-civilians">
            <Users size={19} />
            <span>{gameState.civiliansAlive}</span>
          </div>
        </div>
      </header>
    </main>
  );
}

export default App;

