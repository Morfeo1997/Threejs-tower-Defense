
import * as THREE from "three";
import type {
  BuildingType,
  BuildingVariant,
} from "../systems/EconomySystem";

export interface BuildingConfig {
  type: BuildingType;
  variant: BuildingVariant;
  position: THREE.Vector3;
}

export class Building {
  private readonly scene: THREE.Scene;
  private readonly config: BuildingConfig;
  private readonly mesh: THREE.Group;

  private static readonly COLORS = {
    house: {
      basic: 0x8c9b9e,
      advanced: 0x4eafb5,
    },
    tower: {
      basic: 0x697b91,
      advanced: 0x9b82d4,
    },
  };

  constructor(scene: THREE.Scene, config: BuildingConfig) {
    this.scene = scene;
    this.config = {
      ...config,
      position: config.position.clone(),
    };

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.config.position);

    if (this.config.type === "house") {
      this.createHouse();
    } else {
      this.createTower();
    }

    this.scene.add(this.mesh);
  }

  private createHouse(): void {
    const advanced = this.config.variant === "advanced";
    const color = Building.COLORS.house[this.config.variant];

    // Cuerpo principal de la casa.
    this.addBox(
      2.2,
      advanced ? 1.8 : 1.5,
      2.2,
      color,
      0,
      (advanced ? 1.8 : 1.5) / 2,
      0,
    );

    // Techo.
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(
        advanced ? 1.75 : 1.6,
        advanced ? 1.2 : 1,
        4,
      ),
      new THREE.MeshStandardMaterial({
        color: advanced ? 0x344d63 : 0x46545c,
        roughness: 0.8,
      }),
    );

    roof.rotation.y = Math.PI / 4;
    roof.position.set(
      0,
      (advanced ? 1.8 : 1.5) + (advanced ? 0.6 : 0.5),
      0,
    );

    roof.castShadow = true;
    roof.receiveShadow = true;
    this.mesh.add(roof);

    // Puerta frontal.
    this.addBox(
      0.45,
      0.8,
      0.08,
      0x382f35,
      0,
      0.4,
      1.14,
    );

    // Las casas avanzadas incorporan una chimenea.
    if (advanced) {
      this.addBox(
        0.35,
        0.8,
        0.35,
        0x58636b,
        0.65,
        2.1,
        -0.35,
      );
    }
  }

  private createTower(): void {
    const advanced = this.config.variant === "advanced";
    const color = Building.COLORS.tower[this.config.variant];

    // Base de la torre.
    const baseHeight = advanced ? 2.6 : 2;
    const baseRadius = advanced ? 0.85 : 0.7;

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(
        baseRadius * 0.85,
        baseRadius,
        baseHeight,
        8,
      ),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.75,
        metalness: 0.15,
      }),
    );

    base.position.y = baseHeight / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    this.mesh.add(base);

    // Plataforma superior.
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(
        advanced ? 1.15 : 0.95,
        advanced ? 1.15 : 0.95,
        0.3,
        8,
      ),
      new THREE.MeshStandardMaterial({
        color: advanced ? 0xc5b3ef : 0x9ba9b4,
        roughness: 0.6,
        metalness: 0.25,
      }),
    );

    platform.position.y = baseHeight + 0.1;
    platform.castShadow = true;
    platform.receiveShadow = true;
    this.mesh.add(platform);

    // Núcleo luminoso de la torre avanzada.
    if (advanced) {
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0x8cecff,
          emissive: 0x36bde8,
          emissiveIntensity: 1.5,
          roughness: 0.3,
        }),
      );

      core.position.y = baseHeight + 0.65;
      this.mesh.add(core);
    }
  }

  private addBox(
    width: number,
    height: number,
    depth: number,
    color: THREE.ColorRepresentation,
    x: number,
    y: number,
    z: number,
  ): void {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.8,
      }),
    );

    box.position.set(x, y, z);
    box.castShadow = true;
    box.receiveShadow = true;

    this.mesh.add(box);
  }

  public getType(): BuildingType {
    return this.config.type;
  }

  public getVariant(): BuildingVariant {
    return this.config.variant;
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  public getMesh(): THREE.Group {
    return this.mesh;
  }

  public dispose(): void {
    this.scene.remove(this.mesh);

    this.mesh.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();

        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        for (const material of materials) {
          material.dispose();
        }
      }
    });
  }
}
