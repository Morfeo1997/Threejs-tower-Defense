
export interface EnemySpawnConfig {
  /** Vida máxima del enemigo. */
  maxHealth: number;

  /** Velocidad de movimiento. */
  moveSpeed: number;

  /** Daño que inflige a la base. */
  damage: number;

  /** Radio aproximado del enemigo. */
  radius: number;

  /** Altura del modelo. */
  height: number;

  /** Indica si es el jefe de la oleada final. */
  isBoss: boolean;
}

export interface WaveConfig {
  day: number;
  enemyCount: number;
  boss: EnemySpawnConfig | null;
}

const DEFAULT_ENEMY: EnemySpawnConfig = {
  maxHealth: 100,
  moveSpeed: 2,
  damage: 10,
  radius: 0.45,
  height: 1.2,
  isBoss: false,
};

const FINAL_BOSS: EnemySpawnConfig = {
  maxHealth: 500,
  moveSpeed: 1.5,
  damage: 40,
  radius: 1.1,
  height: 2.5,
  isBoss: true,
};

const WAVE_SIZES: readonly number[] = [5, 10, 15, 15];

export class WaveSystem {
  private readonly totalDays: number;

  constructor(totalDays = 4) {
    this.totalDays = Math.max(1, Math.floor(totalDays));
  }

  /**
   * Devuelve la configuración de la oleada para un día.
   * Los días fuera del rango válido no tienen oleada.
   */
  public getWaveConfig(day: number): WaveConfig | null {
    if (
      !Number.isInteger(day) ||
      day < 1 ||
      day > this.totalDays
    ) {
      return null;
    }

    const enemyCount = WAVE_SIZES[day - 1] ?? 15;
    const isFinalDay = day === this.totalDays;

    return {
      day,
      enemyCount,
      boss: isFinalDay ? { ...FINAL_BOSS } : null,
    };
  }

  /**
   * Devuelve los parámetros de un enemigo normal.
   */
  public getDefaultEnemyConfig(): EnemySpawnConfig {
    return { ...DEFAULT_ENEMY };
  }

  /**
   * Indica si el día corresponde a la oleada final.
   */
  public isFinalWave(day: number): boolean {
    return day === this.totalDays;
  }

  public getTotalDays(): number {
    return this.totalDays;
  }
}
