
import * as THREE from "three";

export interface EnemyConfig {
  maxHealth: number;
  moveSpeed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  radius: number;
  height: number;
  color: THREE.ColorRepresentation;
}

const DEFAULT_CONFIG: EnemyConfig = {
  maxHealth: 100,
  moveSpeed: 2,
  damage: 10,
  attackRange: 1.5,
  attackCooldown: 1,
  radius: 0.45,
  height: 1.2,
  color: 0xc64b58,
};

export class Enemy {
  public readonly mesh: THREE.Group;
  public readonly maxHealth: number;

  private readonly config: EnemyConfig;
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  private currentHealth: number;
  private attackTimer = 0;
  private destroyed = false;
  private isDisposed = false;

  private healthBarFill!: THREE.Mesh;
  private healthBarFillMaterial!: THREE.MeshBasicMaterial;

  constructor(config: Partial<EnemyConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    this.maxHealth = this.config.maxHealth;
    this.currentHealth = this.maxHealth;

    this.mesh = new THREE.Group();
    this.mesh.name = "Enemy";

    this.createModel();
    this.createHealthBar();
  }

  private createModel(): void {
    // Cuerpo principal.
    const bodyGeometry = new THREE.IcosahedronGeometry(
      this.config.radius,
      1,
    );

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.config.color,
      roughness: 0.8,
      metalness: 0.1,
    });

    this.geometries.push(bodyGeometry);
    this.materials.push(bodyMaterial);

    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.name = "EnemyBody";
    body.position.y = this.config.height * 0.45;
    body.scale.set(1, 1.15, 0.9);
    body.castShadow = true;
    body.receiveShadow = true;

    this.mesh.add(body);

    // Núcleo luminoso para identificar al enemigo.
    const coreGeometry = new THREE.SphereGeometry(
      this.config.radius * 0.28,
      8,
      8,
    );

    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffb4a3,
    });

    this.geometries.push(coreGeometry);
    this.materials.push(coreMaterial);

    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.name = "EnemyCore";
    core.position.set(
      0,
      this.config.height * 0.48,
      -this.config.radius * 0.78,
    );

    this.mesh.add(core);
  }

  private createHealthBar(): void {
    const barWidth = 1.2;
    const barHeight = 0.12;
    const barY = this.config.height + 0.45;

    const backgroundGeometry = new THREE.PlaneGeometry(
      barWidth,
      barHeight,
    );

    const backgroundMaterial = new THREE.MeshBasicMaterial({
      color: 0x301c21,
      depthTest: false,
      side: THREE.DoubleSide,
    });

    this.geometries.push(backgroundGeometry);
    this.materials.push(backgroundMaterial);

    const background = new THREE.Mesh(
      backgroundGeometry,
      backgroundMaterial,
    );

    background.name = "EnemyHealthBarBackground";
    background.position.y = barY;
    background.renderOrder = 10;

    this.mesh.add(background);

    const fillGeometry = new THREE.PlaneGeometry(
      barWidth,
      barHeight,
    );

    this.healthBarFillMaterial = new THREE.MeshBasicMaterial({
      color: 0x42d878,
      depthTest: false,
      side: THREE.DoubleSide,
    });

    this.geometries.push(fillGeometry);
    this.materials.push(this.healthBarFillMaterial);

    this.healthBarFill = new THREE.Mesh(
      fillGeometry,
      this.healthBarFillMaterial,
    );

    this.healthBarFill.name = "EnemyHealthBarFill";
    this.healthBarFill.position.set(0, barY, 0.01);
    this.healthBarFill.renderOrder = 11;

    this.mesh.add(this.healthBarFill);

    this.updateHealthBar();
  }

  /**
   * Avanza hacia el objetivo y ataca cuando está a distancia.
   * Devuelve el daño que debe recibir el objetivo durante este fotograma.
   */
  public update(
    delta: number,
    targetPosition: THREE.Vector3,
  ): number {
    if (this.destroyed || this.isDisposed) {
      return 0;
    }

    this.attackTimer = Math.max(0, this.attackTimer - delta);

    const dx = targetPosition.x - this.mesh.position.x;
    const dz = targetPosition.z - this.mesh.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance <= this.config.attackRange) {
      if (this.attackTimer <= 0) {
        this.attackTimer = this.config.attackCooldown;
        return this.config.damage;
      }

      return 0;
    }

    if (distance > 0.0001) {
      const movement = Math.min(
        this.config.moveSpeed * delta,
        distance - this.config.attackRange,
      );

      this.mesh.position.x += (dx / distance) * movement;
      this.mesh.position.z += (dz / distance) * movement;

      // Orienta el enemigo hacia su objetivo.
      this.mesh.rotation.y = Math.atan2(dx, dz);
    }

    return 0;
  }

  /**
   * Aplica daño. Devuelve true si el enemigo muere con este impacto.
   */
  public takeDamage(amount: number): boolean {
    if (
      this.destroyed ||
      this.isDisposed ||
      amount <= 0
    ) {
      return false;
    }

    this.currentHealth = Math.max(
      0,
      this.currentHealth - amount,
    );

    this.updateHealthBar();

    if (this.currentHealth <= 0) {
      this.destroyed = true;
      return true;
    }

    return false;
  }

  private updateHealthBar(): void {
    if (!this.healthBarFill) {
      return;
    }

    const healthRatio =
      this.maxHealth > 0
        ? this.currentHealth / this.maxHealth
        : 0;

    this.healthBarFill.scale.x = healthRatio;

    // Mantiene el borde izquierdo de la barra en su sitio.
    this.healthBarFill.position.x =
      -0.6 * (1 - healthRatio);

    if (healthRatio > 0.6) {
      this.healthBarFillMaterial.color.set(0x42d878);
    } else if (healthRatio > 0.3) {
      this.healthBarFillMaterial.color.set(0xf0c44f);
    } else {
      this.healthBarFillMaterial.color.set(0xe84b4b);
    }
  }

  public getHealth(): number {
    return this.currentHealth;
  }

  public getHealthRatio(): number {
    return this.maxHealth > 0
      ? this.currentHealth / this.maxHealth
      : 0;
  }

  public isDead(): boolean {
    return this.destroyed;
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  public setPosition(position: THREE.Vector3): void {
    this.mesh.position.copy(position);
  }

  public dispose(): void {
    if (this.isDisposed) {
      return;
    }

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
