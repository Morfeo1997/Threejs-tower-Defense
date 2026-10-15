
import * as THREE from "three";
import { Building } from "../entities/Building";
import type {
  BuildingType,
  BuildingVariant,
  EconomySystem,
} from "./EconomySystem";

export interface BuildSite {
  id: string;
  position: THREE.Vector3;
  type: BuildingType;
  variant: BuildingVariant;
}

export type BuildResult =
  | { success: true; building: Building }
  | {
      success: false;
      reason:
        | "not-day"
        | "too-far"
        | "occupied"
        | "insufficient-credits"
        | "invalid-site"
        | "already-built";
    };

export interface BuildingSystemConfig {
  interactionDistance: number;
  siteRadius: number;
}

const DEFAULT_CONFIG: BuildingSystemConfig = {
  interactionDistance: 2.5,
  siteRadius: 1.5,
};

export class BuildingSystem {
  private readonly scene: THREE.Scene;
  private readonly economy: EconomySystem;
  private readonly config: BuildingSystemConfig;

  private readonly sites = new Map<string, BuildSite>();
  private readonly buildings = new Map<string, Building>();

  private isDay = true;

  constructor(
    scene: THREE.Scene,
    economy: EconomySystem,
    config: Partial<BuildingSystemConfig> = {},
  ) {
    this.scene = scene;
    this.economy = economy;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public registerBuildSite(site: BuildSite): boolean {
    if (this.sites.has(site.id) || this.buildings.has(site.id)) {
      return false;
    }

    this.sites.set(site.id, {
      ...site,
      position: site.position.clone(),
    });

    return true;
  }

  public unregisterBuildSite(siteId: string): void {
    this.sites.delete(siteId);
  }

  public setDayPhase(isDay: boolean): void {
    this.isDay = isDay;
  }

  public getNearbyBuildSite(
    playerPosition: THREE.Vector3,
  ): BuildSite | null {
    let closestSite: BuildSite | null = null;
    let closestDistance = this.config.interactionDistance;

    for (const site of this.sites.values()) {
      if (this.buildings.has(site.id)) {
        continue;
      }

      const distance = this.getGroundDistance(
        playerPosition,
        site.position,
      );

      if (distance <= closestDistance) {
        closestDistance = distance;
        closestSite = site;
      }
    }

    return closestSite;
  }

  public buildAt(
    siteId: string,
    playerPosition: THREE.Vector3,
  ): BuildResult {
    if (!this.isDay) {
      return { success: false, reason: "not-day" };
    }

    const site = this.sites.get(siteId);

    if (!site) {
      return { success: false, reason: "invalid-site" };
    }

    if (this.buildings.has(siteId)) {
      return { success: false, reason: "already-built" };
    }

    const distance = this.getGroundDistance(
      playerPosition,
      site.position,
    );

    if (distance > this.config.interactionDistance) {
      return { success: false, reason: "too-far" };
    }

    if (this.isOccupied(site)) {
      return { success: false, reason: "occupied" };
    }

    const price = this.economy.getBuildingPrice(
      site.type,
      site.variant,
    );

    if (!this.economy.canAfford(price)) {
      return {
        success: false,
        reason: "insufficient-credits",
      };
    }

    // Cobrar antes de crear el edificio evita construir sin pagar.
    if (!this.economy.spendCredits(price)) {
      return {
        success: false,
        reason: "insufficient-credits",
      };
    }

    try {
      const building = new Building(this.scene, {
        type: site.type,
        variant: site.variant,
        position: site.position,
      });

      this.buildings.set(siteId, building);

      return { success: true, building };
    } catch (error) {
      // Reembolsar si la creación falla.
      this.economy.addCredits(price);
      throw error;
    }
  }

  public getBuilding(siteId: string): Building | null {
    return this.buildings.get(siteId) ?? null;
  }

  public getBuildings(): Building[] {
    return Array.from(this.buildings.values());
  }

  public getBuildSites(): BuildSite[] {
    return Array.from(this.sites.values()).map((site) => ({
      ...site,
      position: site.position.clone(),
    }));
  }

  public removeBuilding(siteId: string): boolean {
    const building = this.buildings.get(siteId);

    if (!building) {
      return false;
    }

    building.dispose();
    this.buildings.delete(siteId);

    return true;
  }

  public dispose(): void {
    for (const building of this.buildings.values()) {
      building.dispose();
    }

    this.buildings.clear();
    this.sites.clear();
  }

  private getGroundDistance(
    a: THREE.Vector3,
    b: THREE.Vector3,
  ): number {
    const dx = a.x - b.x;
    const dz = a.z - b.z;

    return Math.sqrt(dx * dx + dz * dz);
  }

  private isOccupied(site: BuildSite): boolean {
    for (const building of this.buildings.values()) {
      if (
        this.getGroundDistance(
          building.getPosition(),
          site.position,
        ) < this.config.siteRadius * 2
      ) {
        return true;
      }
    }

    return false;
  }
}
