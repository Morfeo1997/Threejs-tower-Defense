
import type { GamePhase, GameState } from "../GameState";

export interface TurnSystemCallbacks {
  onPhaseChange?: (phase: GamePhase) => void;
  onNightStarted?: (day: number) => void;
  onDayStarted?: (day: number) => void;
  onVictory?: () => void;
  onDefeat?: () => void;
}

export class TurnSystem {
  private state: GameState;
  private readonly callbacks: TurnSystemCallbacks;

  constructor(
    initialState: GameState,
    callbacks: TurnSystemCallbacks = {},
  ) {
    this.state = { ...initialState };
    this.callbacks = callbacks;
  }

  public getState(): GameState {
    return { ...this.state };
  }

  public getPhase(): GamePhase {
    return this.state.phase;
  }

  public getDay(): number {
    return this.state.day;
  }

  public isDay(): boolean {
    return this.state.phase === "day";
  }

  public isNight(): boolean {
    return this.state.phase === "night";
  }

  /**
   * Inicia la noche únicamente si la partida está en fase de día.
   */
  public activateNightTurn(): boolean {
    if (!this.isDay()) return false;

    this.setPhase("night");
    this.callbacks.onNightStarted?.(this.state.day);

    return true;
  }

  /**
   * Avanza al siguiente día cuando la oleada ha sido eliminada.
   * Si se completó la última jornada, declara la victoria.
   */
  public completeNightTurn(): void {
    if (!this.isNight()) return;

    if (this.state.day >= this.state.totalDays) {
      this.setPhase("victory");
      this.callbacks.onVictory?.();
      return;
    }

    this.state.day += 1;
    this.setPhase("day");
    this.callbacks.onDayStarted?.(this.state.day);
  }

  /**
   * Declara la derrota si la base ha sido destruida.
   */
  public declareDefeat(): void {
    if (
      this.state.phase === "victory" ||
      this.state.phase === "defeat"
    ) {
      return;
    }

    this.setPhase("defeat");
    this.callbacks.onDefeat?.();
  }

  /**
   * Actualiza el estado y notifica el cambio de fase.
   */
  private setPhase(phase: GamePhase): void {
    if (this.state.phase === phase) return;

    this.state.phase = phase;
    this.callbacks.onPhaseChange?.(phase);
  }

  /**
   * Actualiza datos de la partida sin cambiar la fase.
   */
  public updateGameData(
    data: Partial<Pick<GameState, "credits" | "civiliansAlive">>,
  ): void {
    Object.assign(this.state, data);
  }
}
