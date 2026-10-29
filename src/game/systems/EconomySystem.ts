
export type BuildingType = "house" | "tower" | "shelter" | "armory";
export type BuildingVariant = "basic" | "advanced";

export type UpgradeType = "house" | "tower" | "shelter" | "armory";

export interface BuildingPrices {
  house: {
    basic: number;
    advanced: number;
  };
  tower: {
    basic: number;
    advanced: number;
  };
  shelter: {
    basic: number;
    advanced: number;
  };
  armory: {
    basic: number;
    advanced: number;
  };
}

export interface EconomyConfig {
  dailyPayment: number;
  creditsPerCivilian: number;
  initialCredits: number;
  buildingPrices: BuildingPrices;
  upgradeCosts: {
    house: number;
    tower: number;
    shelter: number;
    armory: number;
  };
}

export interface DailyIncome {
  day: number;
  federationPayment: number;
  civilianPayment: number;
  civiliansAlive: number;
  total: number;
}

const DEFAULT_CONFIG: EconomyConfig = {
  dailyPayment: 40,
  creditsPerCivilian: 20,
  initialCredits: 0,

  buildingPrices: {
    house: {
      basic: 50,
      advanced: 70,
    },
    tower: {
      basic: 60,
      advanced: 90,
    },
    shelter: {
      basic: 45,
      advanced: 65,
    },
    armory: {
      basic: 80,
      advanced: 110,
    },
  },

  // Costes provisionales de mejora de edificios.
  upgradeCosts: {
    house: 30,
    tower: 40,
    shelter: 25,
    armory: 50,
  },
};

export class EconomySystem {
  private credits: number;
  private readonly config: EconomyConfig;
  private readonly paidDays = new Set<number>();

  constructor(config: Partial<EconomyConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,

      buildingPrices: {
        house: {
          ...DEFAULT_CONFIG.buildingPrices.house,
          ...config.buildingPrices?.house,
        },
        tower: {
          ...DEFAULT_CONFIG.buildingPrices.tower,
          ...config.buildingPrices?.tower,
        },
        shelter: {
          ...DEFAULT_CONFIG.buildingPrices.shelter,
          ...config.buildingPrices?.shelter,
        },
        armory: {
          ...DEFAULT_CONFIG.buildingPrices.armory,
          ...config.buildingPrices?.armory,
        },
      },

      upgradeCosts: {
        ...DEFAULT_CONFIG.upgradeCosts,
        ...config.upgradeCosts,
      },
    };

    this.credits = this.config.initialCredits;
  }

  public getCredits(): number {
    return this.credits;
  }

  public canAfford(amount: number): boolean {
    return (
      Number.isFinite(amount) &&
      amount >= 0 &&
      this.credits >= amount
    );
  }

  /**
   * Añade créditos. No admite cantidades negativas.
   */
  public addCredits(amount: number): boolean {
    if (!Number.isFinite(amount) || amount < 0) {
      return false;
    }

    this.credits += amount;
    return true;
  }

  /**
   * Descuenta créditos si hay saldo suficiente.
   */
  public spendCredits(amount: number): boolean {
    if (!Number.isFinite(amount) || amount < 0) {
      return false;
    }

    if (!this.canAfford(amount)) {
      return false;
    }

    this.credits -= amount;
    return true;
  }

  /**
   * Devuelve el precio de construcción de una variante.
   */
  public getBuildingPrice(
    type: BuildingType,
    variant: BuildingVariant,
  ): number {
    return this.config.buildingPrices[type][variant];
  }

  /**
   * Compra una construcción si el saldo alcanza.
   */
  public purchaseBuilding(
    type: BuildingType,
    variant: BuildingVariant,
  ): boolean {
    const price = this.getBuildingPrice(type, variant);
    return this.spendCredits(price);
  }

  /**
   * Devuelve el coste de mejorar un edificio existente.
   */
  public getUpgradeCost(type: UpgradeType): number {
    return this.config.upgradeCosts[type];
  }

  /**
   * Paga una recompensa al comenzar un nuevo día.
   * Cada jornada solo puede pagarse una vez.
   */
  public collectDailyIncome(
    day: number,
    civiliansAlive: number,
  ): DailyIncome | null {
    if (
      !Number.isInteger(day) ||
      day < 1 ||
      !Number.isInteger(civiliansAlive) ||
      civiliansAlive < 0 ||
      this.paidDays.has(day)
    ) {
      return null;
    }

    const federationPayment = this.config.dailyPayment;
    const civilianPayment =
      civiliansAlive * this.config.creditsPerCivilian;

    const total = federationPayment + civilianPayment;

    this.credits += total;
    this.paidDays.add(day);

    return {
      day,
      federationPayment,
      civilianPayment,
      civiliansAlive,
      total,
    };
  }

  /**
   * Reinicia la economía para una nueva partida.
   */
  public reset(): void {
    this.credits = this.config.initialCredits;
    this.paidDays.clear();
  }
}
