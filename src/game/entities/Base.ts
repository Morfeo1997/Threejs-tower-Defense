
import * as THREE from "three";

export interface BaseConfig {
  maxHealth: number;
  width: number;
  height: number;
  depth: number;
  color: THREE.ColorRepresentation;
}

const DEFAULT_CONFIG: BaseConfig = {
  maxHealth: 1000,
  width: 4,
  height: 2.5,
  depth: 4,
  color: 0x71838d,
};

export class Base {
  public readonly mesh: THREE.Group;

  public readonly maxHealth: number;

  private readonly config: BaseConfig;
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  private currentHealth: number;
  private destroyed = false;
  private isDisposed = false;

  private healthBarFill!: THREE.Mesh;
  private healthBarFillMaterial!: THREE.MeshBasicMaterial;

  constructor(config: Partial<BaseConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.maxHealth = this.config.maxHealth;
    this.currentHealth = this.maxHealth;

    this.mesh = new THREE.Group();
    this.mesh.name = "MainBase";

    this.createModel();
    this.createHealthBar();
  }

  private createModel(): void {
    // Plataforma inferior.
    const platformGeometry = new THREE.BoxGeometry(
      this.config.width + 1,
      0.35,
      this.config.depth + 1,
    );
    this.geometries.push(platformGeometry);

    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0x303a42,
      roughness: 0.8,
      metalness: 0.3,
    });
    this.materials.push(platformMaterial);

    const platform = new THREE.Mesh(
      platformGeometry,
      platformMaterial,
    );

    platform.position.y = 0.175;
    platform.castShadow = true;
    platform.receiveShadow = true;
    platform.name = "BasePlatform";

    this.mesh.add(platform);

    // Estructura principal.
    const buildingGeometry = new THREE.BoxGeometry(
      this.config.width,
      this.config.height,
      this.config.depth,
    );
    this.geometries.push(buildingGeometry);

    const buildingMaterial = new THREE.MeshStandardMaterial({
      color: this.config.color,
      roughness: 0.65,
      metalness: 0.25,
    });
    this.materials.push(buildingMaterial);

    const building = new THREE.Mesh(
      buildingGeometry,
      buildingMaterial,
    );

    building.position.y = 0.35 + this.config.height / 2;
    building.castShadow = true;
    building.receiveShadow = true;
    building.name = "BaseBuilding";

    this.mesh.add(building);

    // Torre de comunicaciones.
    const antennaGeometry = new THREE.CylinderGeometry(
      0.12,
      0.2,
      1.8,
      6,
    );
    this.geometries.push(antennaGeometry);

    const antennaMaterial = new THREE.MeshStandardMaterial({
      color: 0x9eafb8,
      metalness: 0.7,
      roughness: 0.3,
    });
    this.materials.push(antennaMaterial);

    const antenna = new THREE.Mesh(
      antennaGeometry,
      antennaMaterial,
    );

    antenna.position.set(
      0,
      0.35 + this.config.height + 0.9,
      0,
    );
    antenna.castShadow = true;
    antenna.name = "CommunicationsAntenna";

    this.mesh.add(antenna);

    // Luz de señalización en la parte superior.
    const beaconGeometry = new THREE.SphereGeometry(0.22, 8, 8);
    this.geometries.push(beaconGeometry);

    const beaconMaterial = new THREE.MeshBasicMaterial({
      color: 0x48e5a2,
    });
    this.materials.push(beaconMaterial);

    const beacon = new THREE.Mesh(
      beaconGeometry,
      beaconMaterial,
    );

    beacon.position.set(
      0,
      0.35 + this.config.height + 1.9,
      0,
    );
    beacon.name = "BaseBeacon";

    this.mesh.add(beacon);
  }

  private createHealthBar(): void {
    const barWidth = 3;
    const barHeight = 0.18;
    const barY = 0.35 + this.config.height + 2.5;

    const backgroundGeometry = new THREE.PlaneGeometry(
      barWidth,
      barHeight,
    );
    backgroundGeometry.rotateX(-Math.PI / 4);
    this.geometries.push(backgroundGeometry);

    const backgroundMaterial = new THREE.MeshBasicMaterial({
      color: 0x301c21,
      side: THREE.DoubleSide,
      depthTest: false,
    });
    this.materials.push(backgroundMaterial);

    const background = new THREE.Mesh(
      backgroundGeometry,
      backgroundMaterial,
    );

    background.position.set(0, barY, 0);
    background.renderOrder = 10;
    background.name = "BaseHealthBarBackground";

    this.mesh.add(background);

    const fillGeometry = new THREE.PlaneGeometry(
      barWidth,
      barHeight,
    );
    fillGeometry.rotateX(-Math.PI / 4);
    this.geometries.push(fillGeometry);

    this.healthBarFillMaterial = new THREE.MeshBasicMaterial({
      color: 0x42d878,
      side: THREE.DoubleSide,
      depthTest: false,
    });
    this.materials.push(this.healthBarFillMaterial);

    this.healthBarFill = new THREE.Mesh(
      fillGeometry,
      this.healthBarFillMaterial,
    );

    this.healthBarFill.position.set(0, barY + 0.005, 0);
    this.healthBarFill.renderOrder = 11;
    this.healthBarFill.name = "BaseHealthBarFill";

    this.mesh.add(this.healthBarFill);
  }

  /**
   * Aplica daño a la base.
   * Devuelve true si la base acaba de ser destruida.
   */
  public takeDamage(amount: number): boolean {
    if (this.destroyed || this.isDisposed || amount <= 0) {
      return false;
    }

    this.currentHealth = Math.max(
      0,
      this.currentHealth - amount,
    );

    this.updateHealthBar();

    if (this.currentHealth === 0) {
      this.destroyed = true;
      return true;
    }

    return false;
  }

  private updateHealthBar(): void {
    const healthRatio = this.currentHealth / this.maxHealth;

    // La geometría original mide 3 unidades de ancho.
    // Ajustamos su escala y posición para conservar el borde izquierdo.
    this.healthBarFill.scale.x = healthRatio;
    this.healthBarFill.position.x = -1.5 * (1 - healthRatio);

    if (healthRatio > 0.6) {
      this.healthBarFillMaterial.color.setHex(0x42d878);
    } else if (healthRatio > 0.3) {
      this.healthBarFillMaterial.color.setHex(0xf0c541);
    } else {
      this.healthBarFillMaterial.color.setHex(0xe94b4b);
    }
  }

  public getHealth(): number {
    return this.currentHealth;
  }

  public getHealthRatio(): number {
    return this.currentHealth / this.maxHealth;
  }

  public isDestroyed(): boolean {
    return this.destroyed;
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position;
  }

  public setPosition(position: THREE.Vector3): void {
    this.mesh.position.copy(position);
  }

  public dispose(): void {
    if (this.isDisposed) return;

    this.isDisposed = true;

    for (const geometry of this.geometries) {
      geometry.dispose();
    }

    for (const material of this.materials) {
      material.dispose();
    }

    this.mesh.clear();
  }
}
