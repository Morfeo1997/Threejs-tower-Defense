
import { useEffect, useRef } from "react";
import { Game } from "./game/Game";

function App() {
  const gameContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = gameContainerRef.current;

    if (!container) return;

    const game = new Game(container);
    game.start();

    return () => {
      game.dispose();
    };
  }, []);

  return (
    <main className="game-container">
      <div
        ref={gameContainerRef}
        className="game-canvas"
      />
    </main>
  );
}

export default App;
