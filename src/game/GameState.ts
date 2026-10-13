
export type GamePhase = "day" | "night" | "victory" | "defeat";

export interface GameState {
  day: number;
  totalDays: number;
  phase: GamePhase;
  credits: number;
  civiliansAlive: number;
}

export function createInitialGameState(): GameState {
  return {
    day: 1,
    totalDays: 4,
    phase: "day",
    credits: 0,
    civiliansAlive: 0,
  };
}
